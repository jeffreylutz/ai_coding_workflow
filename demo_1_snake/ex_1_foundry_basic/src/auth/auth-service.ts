import { User, SafeUser, AuthState, AuthResult, AuthChangeCallback } from './types';

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const passwordBytes = new TextEncoder().encode(password);
  const saltBytes = new TextEncoder().encode(salt);
  const key = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  );
  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  const hex = Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function getStoredUsers(): User[] {
  const data = localStorage.getItem('snake_auth_users');
  if (data === null) return [];
  try {
    return JSON.parse(data) as User[];
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem('snake_auth_users', JSON.stringify(users));
}

function getStoredSession(): string | null {
  return localStorage.getItem('snake_auth_session');
}

function saveSession(userId: string): void {
  localStorage.setItem('snake_auth_session', userId);
}

function clearSession(): void {
  localStorage.removeItem('snake_auth_session');
}

function createAuthService() {
  let state: { isAuthenticated: boolean; currentUser: User | null } = { isAuthenticated: false, currentUser: null };
  let listeners: AuthChangeCallback[] = [];

  function getStateSnapshot(): AuthState {
    if (state.currentUser === null) {
      return { isAuthenticated: state.isAuthenticated, currentUser: null };
    }
    return {
      isAuthenticated: state.isAuthenticated,
      currentUser: {
        id: state.currentUser.id,
        username: state.currentUser.username,
        createdAt: state.currentUser.createdAt,
      },
    };
  }

  function notifyListeners(): void {
    const snapshot = getStateSnapshot();
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function setState(newState: { isAuthenticated: boolean; currentUser: User | null }): void {
    state = newState;
    notifyListeners();
  }

  async function register(username: string, password: string): Promise<AuthResult> {
    try {
      username = username.trim();
      if (username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters', user: null };
      }
      if (password.length < 4) {
        return { success: false, error: 'Password must be at least 4 characters', user: null };
      }
      const users = getStoredUsers();
      if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        return { success: false, error: 'Username already taken', user: null };
      }
      const salt = generateSalt();
      const hash = await hashPassword(password, salt);
      const newUser: User = {
        id: generateId(),
        username,
        passwordHash: hash,
        salt,
        createdAt: Date.now(),
      };
      users.push(newUser);
      saveUsers(users);
      saveSession(newUser.id);
      setState({ isAuthenticated: true, currentUser: newUser });
      return { success: true, error: null, user: { id: newUser.id, username: newUser.username, createdAt: newUser.createdAt } };
    } catch {
      return { success: false, error: 'Registration failed', user: null };
    }
  }

  async function login(username: string, password: string): Promise<AuthResult> {
    try {
      username = username.trim();
      const users = getStoredUsers();
      const foundUser = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
      if (!foundUser) {
        return { success: false, error: 'Invalid username or password', user: null };
      }
      const hash = await hashPassword(password, foundUser.salt);
      if (hash !== foundUser.passwordHash) {
        return { success: false, error: 'Invalid username or password', user: null };
      }
      saveSession(foundUser.id);
      setState({ isAuthenticated: true, currentUser: foundUser });
      return { success: true, error: null, user: { id: foundUser.id, username: foundUser.username, createdAt: foundUser.createdAt } };
    } catch {
      return { success: false, error: 'Login failed', user: null };
    }
  }

  function logout(): void {
    clearSession();
    setState({ isAuthenticated: false, currentUser: null });
  }

  function getState(): AuthState {
    return getStateSnapshot();
  }

  function onAuthChange(callback: AuthChangeCallback): () => void {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter((l) => l !== callback);
    };
  }

  function restoreSession(): void {
    const userId = getStoredSession();
    if (userId === null) return;
    const users = getStoredUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      setState({ isAuthenticated: true, currentUser: user });
    } else {
      clearSession();
    }
  }

  return { register, login, logout, getState, onAuthChange, restoreSession };
}

export const authService = createAuthService();
