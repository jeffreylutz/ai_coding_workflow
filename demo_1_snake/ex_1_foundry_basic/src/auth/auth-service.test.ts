import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();

  const mockImportKey = vi.fn().mockImplementation(
    (_format: string, keyData: BufferSource, _algo: string, _extractable: boolean, _usages: string[]) => {
      return Promise.resolve({ _keyData: new Uint8Array(keyData as ArrayBuffer) });
    },
  );

  const mockDeriveBits = vi.fn().mockImplementation(
    (params: { salt: BufferSource }, key: { _keyData: Uint8Array }, _bits: number) => {
      const saltBytes = new Uint8Array(params.salt as ArrayBuffer);
      const keyBytes = key._keyData;
      const result = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        result[i] = (keyBytes[i % keyBytes.length] ?? 0) ^ (saltBytes[i % saltBytes.length] ?? 0);
      }
      return Promise.resolve(result.buffer);
    },
  );

  vi.stubGlobal('crypto', {
    subtle: { importKey: mockImportKey, deriveBits: mockDeriveBits },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i;
      return arr;
    },
    randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
  });
});

async function getAuthService() {
  const mod = await import('./auth-service');
  return mod.authService;
}

describe('register', () => {
  it('registers a new user successfully', async () => {
    const authService = await getAuthService();
    const result = await authService.register('alice', 'password1');
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.user).not.toBeNull();
    expect(result.user!.username).toBe('alice');
    expect(result.user!.id).toBeDefined();
    expect(result.user!.createdAt).toBeDefined();
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('salt');
  });

  it('trims username whitespace', async () => {
    const authService = await getAuthService();
    const result = await authService.register('  alice  ', 'password1');
    expect(result.success).toBe(true);
    expect(result.user!.username).toBe('alice');
  });

  it('rejects username shorter than 3 characters', async () => {
    const authService = await getAuthService();
    const result = await authService.register('ab', 'password1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Username must be at least 3 characters');
    expect(result.user).toBeNull();
  });

  it('rejects username shorter than 3 characters after trimming', async () => {
    const authService = await getAuthService();
    const result = await authService.register('  ab  ', 'password1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Username must be at least 3 characters');
  });

  it('rejects password shorter than 4 characters', async () => {
    const authService = await getAuthService();
    const result = await authService.register('alice', 'abc');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Password must be at least 4 characters');
    expect(result.user).toBeNull();
  });

  it('rejects duplicate username case-insensitively', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    const result = await authService.register('ALICE', 'password2');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Username already taken');
  });

  it('stores user in localStorage', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    const stored = JSON.parse(localStorage.getItem('snake_auth_users')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].username).toBe('alice');
  });

  it('saves session in localStorage after registration', async () => {
    const authService = await getAuthService();
    const result = await authService.register('alice', 'password1');
    const sessionId = localStorage.getItem('snake_auth_session');
    expect(sessionId).toBe(result.user!.id);
  });

  it('sets auth state to authenticated after registration', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    const state = authService.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.currentUser!.username).toBe('alice');
  });

  it('notifies listeners on successful registration', async () => {
    const authService = await getAuthService();
    const listener = vi.fn();
    authService.onAuthChange(listener);
    await authService.register('alice', 'password1');
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ isAuthenticated: true }));
  });

  it('does not notify listeners on failed registration', async () => {
    const authService = await getAuthService();
    const listener = vi.fn();
    authService.onAuthChange(listener);
    await authService.register('ab', 'password1');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('login', () => {
  it('logs in with correct credentials', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    authService.logout();
    const result = await authService.login('alice', 'password1');
    expect(result.success).toBe(true);
    expect(result.user!.username).toBe('alice');
  });

  it('login is case-insensitive for username', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    authService.logout();
    const result = await authService.login('ALICE', 'password1');
    expect(result.success).toBe(true);
  });

  it('login trims username whitespace', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    authService.logout();
    const result = await authService.login('  alice  ', 'password1');
    expect(result.success).toBe(true);
  });

  it('rejects login with wrong password', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    authService.logout();
    const result = await authService.login('alice', 'wrongpass');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid username or password');
  });

  it('rejects login with nonexistent username', async () => {
    const authService = await getAuthService();
    const result = await authService.login('nobody', 'password1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid username or password');
  });

  it('saves session in localStorage after login', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    authService.logout();
    await authService.login('alice', 'password1');
    expect(localStorage.getItem('snake_auth_session')).not.toBeNull();
  });

  it('sets auth state to authenticated after login', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    authService.logout();
    await authService.login('alice', 'password1');
    expect(authService.getState().isAuthenticated).toBe(true);
  });
});

describe('logout', () => {
  it('clears auth state on logout', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    authService.logout();
    expect(authService.getState().isAuthenticated).toBe(false);
    expect(authService.getState().currentUser).toBeNull();
  });

  it('removes session from localStorage on logout', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    authService.logout();
    expect(localStorage.getItem('snake_auth_session')).toBeNull();
  });

  it('notifies listeners on logout', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    const listener = vi.fn();
    authService.onAuthChange(listener);
    authService.logout();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ isAuthenticated: false, currentUser: null }),
    );
  });
});

describe('restoreSession', () => {
  it('restores session from localStorage when user exists', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    vi.resetModules();
    const mod = await import('./auth-service');
    mod.authService.restoreSession();
    expect(mod.authService.getState().isAuthenticated).toBe(true);
    expect(mod.authService.getState().currentUser!.username).toBe('alice');
  });

  it('does nothing when no session stored', async () => {
    const authService = await getAuthService();
    authService.restoreSession();
    expect(authService.getState().isAuthenticated).toBe(false);
  });

  it('clears invalid session when userId not found in users', async () => {
    localStorage.setItem('snake_auth_session', 'nonexistent-id');
    const authService = await getAuthService();
    authService.restoreSession();
    expect(authService.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('snake_auth_session')).toBeNull();
  });
});

describe('onAuthChange', () => {
  it('returns unsubscribe function that removes listener', async () => {
    const authService = await getAuthService();
    const listener = vi.fn();
    const unsubscribe = authService.onAuthChange(listener);
    unsubscribe();
    await authService.register('alice', 'password1');
    expect(listener).not.toHaveBeenCalled();
  });

  it('supports multiple listeners', async () => {
    const authService = await getAuthService();
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    authService.onAuthChange(listener1);
    authService.onAuthChange(listener2);
    await authService.register('alice', 'password1');
    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });
});

describe('getState', () => {
  it('returns a copy of state, not the same reference', async () => {
    const authService = await getAuthService();
    const state1 = authService.getState();
    const state2 = authService.getState();
    expect(state1).not.toBe(state2);
    expect(state1).toEqual(state2);
  });

  it('returns a deep copy of currentUser, not the same reference', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    const state1 = authService.getState();
    const state2 = authService.getState();
    expect(state1.currentUser).not.toBe(state2.currentUser);
    expect(state1.currentUser).toEqual(state2.currentUser);
  });

  it('mutating returned currentUser does not affect internal state', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    const state = authService.getState();
    state.currentUser!.username = 'corrupted';
    expect(authService.getState().currentUser!.username).toBe('alice');
  });
});

describe('notifyListeners snapshot isolation', () => {
  it('passes a deep copy to listeners, not the internal state reference', async () => {
    const authService = await getAuthService();
    const receivedStates: { isAuthenticated: boolean; currentUser: { username: string } | null }[] = [];
    authService.onAuthChange((authState) => {
      receivedStates.push(authState);
    });
    await authService.register('alice', 'password1');
    expect(receivedStates).toHaveLength(1);
    expect(receivedStates[0].currentUser).not.toBeNull();
    expect(receivedStates[0].currentUser!.username).toBe('alice');
    // Mutate the received state — should NOT corrupt internal state
    receivedStates[0].currentUser!.username = 'corrupted';
    expect(authService.getState().currentUser!.username).toBe('alice');
  });

  it('each listener receives the same snapshot object per notification', async () => {
    const authService = await getAuthService();
    const received: unknown[] = [];
    authService.onAuthChange((authState) => { received.push(authState); });
    authService.onAuthChange((authState) => { received.push(authState); });
    await authService.register('alice', 'password1');
    expect(received).toHaveLength(2);
    expect(received[0]).toBe(received[1]);
  });
});

describe('generateId fallback', () => {
  it('uses crypto.randomUUID when available', async () => {
    const authService = await getAuthService();
    const result = await authService.register('alice', 'password1');
    expect(result.user!.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('generates valid UUID v4 format when crypto.randomUUID is unavailable', async () => {
    vi.stubGlobal('crypto', {
      subtle: (globalThis.crypto as unknown as { subtle: SubtleCrypto }).subtle,
      getRandomValues: (globalThis.crypto as unknown as { getRandomValues: (arr: Uint8Array) => Uint8Array }).getRandomValues,
      randomUUID: undefined,
    });
    vi.resetModules();
    const mod = await import('./auth-service');
    const result = await mod.authService.register('alice', 'password1');
    expect(result.user!.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('localStorage edge cases', () => {
  it('handles corrupted JSON in localStorage gracefully', async () => {
    localStorage.setItem('snake_auth_users', 'not-valid-json');
    const authService = await getAuthService();
    const result = await authService.register('alice', 'password1');
    expect(result.success).toBe(true);
  });
});

describe('sanitized user in public API', () => {
  it('getState() does not expose passwordHash or salt', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    const state = authService.getState();
    expect(state.currentUser).not.toBeNull();
    expect(state.currentUser!.id).toBeDefined();
    expect(state.currentUser!.username).toBe('alice');
    expect(state.currentUser!.createdAt).toBeDefined();
    expect(state.currentUser).not.toHaveProperty('passwordHash');
    expect(state.currentUser).not.toHaveProperty('salt');
  });

  it('onAuthChange listener does not receive passwordHash or salt', async () => {
    const authService = await getAuthService();
    const receivedStates: unknown[] = [];
    authService.onAuthChange((authState) => { receivedStates.push(authState); });
    await authService.register('alice', 'password1');
    expect(receivedStates).toHaveLength(1);
    const received = receivedStates[0] as { currentUser: Record<string, unknown> };
    expect(received.currentUser).not.toHaveProperty('passwordHash');
    expect(received.currentUser).not.toHaveProperty('salt');
  });

  it('login result does not expose passwordHash or salt', async () => {
    const authService = await getAuthService();
    await authService.register('alice', 'password1');
    authService.logout();
    const result = await authService.login('alice', 'password1');
    expect(result.success).toBe(true);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('salt');
  });

  it('register result does not expose passwordHash or salt', async () => {
    const authService = await getAuthService();
    const result = await authService.register('alice', 'password1');
    expect(result.success).toBe(true);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('salt');
    expect(result.user!.id).toBeDefined();
    expect(result.user!.username).toBe('alice');
    expect(result.user!.createdAt).toBeDefined();
  });
});
