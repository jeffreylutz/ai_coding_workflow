import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initAuth } from './auth-ui';
import type { AuthState } from './types';

const mockAuthService = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getState: vi.fn().mockReturnValue({ isAuthenticated: false, currentUser: null }),
  onAuthChange: vi.fn().mockReturnValue(() => {}),
  restoreSession: vi.fn(),
}));

vi.mock('./auth-service', () => ({
  authService: mockAuthService,
}));

beforeEach(() => {
  document.body.textContent = '';
  vi.clearAllMocks();
  mockAuthService.getState.mockReturnValue({ isAuthenticated: false, currentUser: null });
  mockAuthService.login.mockResolvedValue({ success: true, error: null, user: null });
  mockAuthService.register.mockResolvedValue({ success: true, error: null, user: null });
  mockAuthService.onAuthChange.mockReturnValue(() => {});
});

function setup() {
  const appContainer = document.createElement('div');
  appContainer.id = 'app';
  document.body.appendChild(appContainer);
  initAuth(appContainer);
  return {
    appContainer,
    overlay: document.getElementById('auth-overlay')!,
    form: document.getElementById('auth-form')! as HTMLFormElement,
    usernameInput: document.getElementById('auth-username')! as HTMLInputElement,
    passwordInput: document.getElementById('auth-password')! as HTMLInputElement,
    submitBtn: document.getElementById('auth-submit')! as HTMLButtonElement,
    errorP: document.getElementById('auth-error')! as HTMLParagraphElement,
    title: document.getElementById('auth-title')! as HTMLElement,
    toggleP: document.getElementById('auth-toggle')!,
    switchLink: document.getElementById('auth-switch')! as HTMLAnchorElement,
    logoutBtn: document.getElementById('logout-btn')! as HTMLButtonElement,
  };
}

describe('initAuth DOM construction', () => {
  it('creates auth overlay in document body', () => {
    const { overlay } = setup();
    expect(overlay).not.toBeNull();
    expect(overlay.parentElement).toBe(document.body);
  });

  it('creates form with username and password inputs', () => {
    const { usernameInput, passwordInput } = setup();
    expect(usernameInput.type).toBe('text');
    expect(passwordInput.type).toBe('password');
    expect(usernameInput.required).toBe(true);
    expect(passwordInput.required).toBe(true);
  });

  it('creates logout button hidden by default', () => {
    const { logoutBtn } = setup();
    expect(logoutBtn).not.toBeNull();
    expect(logoutBtn.style.display).toBe('none');
  });

  it('sets initial title and button to Login', () => {
    const { title, submitBtn } = setup();
    expect(title.textContent).toBe('Login');
    expect(submitBtn.textContent).toBe('Login');
  });

  it('sets autocomplete attributes correctly in login mode', () => {
    const { usernameInput, passwordInput } = setup();
    expect(usernameInput.autocomplete).toBe('username');
    expect(passwordInput.autocomplete).toBe('current-password');
  });
});

describe('form mode toggling', () => {
  it('switches to Sign Up mode when switch link is clicked', () => {
    const { switchLink, title, submitBtn, passwordInput } = setup();
    switchLink.click();
    expect(title.textContent).toBe('Sign Up');
    expect(submitBtn.textContent).toBe('Sign Up');
    expect(passwordInput.autocomplete).toBe('new-password');
  });

  it('switches back to Login mode when switch link is clicked twice', () => {
    const { title, submitBtn, passwordInput } = setup();
    document.getElementById('auth-switch')!.click();
    const newSwitch = document.getElementById('auth-switch')!;
    newSwitch.click();
    expect(title.textContent).toBe('Login');
    expect(submitBtn.textContent).toBe('Login');
    expect(passwordInput.autocomplete).toBe('current-password');
  });

  it('hides error message when toggling mode', () => {
    const { switchLink, errorP } = setup();
    errorP.style.display = 'block';
    errorP.textContent = 'Some error';
    switchLink.click();
    expect(errorP.style.display).toBe('none');
  });
});

describe('form submission', () => {
  it('calls authService.login on submit in login mode', async () => {
    const { form, usernameInput, passwordInput } = setup();
    usernameInput.value = 'alice';
    passwordInput.value = 'password1';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(mockAuthService.login).toHaveBeenCalledWith('alice', 'password1'));
  });

  it('calls authService.register on submit in sign up mode', async () => {
    const { form, usernameInput, passwordInput } = setup();
    document.getElementById('auth-switch')!.click();
    usernameInput.value = 'alice';
    passwordInput.value = 'password1';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() =>
      expect(mockAuthService.register).toHaveBeenCalledWith('alice', 'password1'),
    );
  });

  it('disables submit button during async submission', async () => {
    let resolveLogin!: (value: unknown) => void;
    mockAuthService.login.mockReturnValue(
      new Promise((r) => {
        resolveLogin = r;
      }),
    );
    const { form, usernameInput, passwordInput, submitBtn } = setup();
    usernameInput.value = 'alice';
    passwordInput.value = 'password1';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(submitBtn.disabled).toBe(true));
    resolveLogin({ success: true, error: null, user: null });
  });

  it('re-enables submit button on failed login', async () => {
    mockAuthService.login.mockResolvedValue({
      success: false,
      error: 'Invalid credentials',
      user: null,
    });
    const { form, usernameInput, passwordInput, submitBtn } = setup();
    usernameInput.value = 'alice';
    passwordInput.value = 'wrong';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(submitBtn.disabled).toBe(false));
  });

  it('shows error message on failed login', async () => {
    mockAuthService.login.mockResolvedValue({
      success: false,
      error: 'Invalid credentials',
      user: null,
    });
    const { form, usernameInput, passwordInput, errorP } = setup();
    usernameInput.value = 'alice';
    passwordInput.value = 'wrong';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(errorP.style.display).toBe('block'));
    expect(errorP.textContent).toBe('Invalid credentials');
  });

  it('prevents duplicate submission when button is already disabled', async () => {
    let loginCallCount = 0;
    mockAuthService.login.mockImplementation(() => {
      loginCallCount++;
      return new Promise(() => {});
    });
    const { form, usernameInput, passwordInput, submitBtn } = setup();
    usernameInput.value = 'alice';
    passwordInput.value = 'password1';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(submitBtn.disabled).toBe(true));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await Promise.resolve();
    expect(loginCallCount).toBe(1);
  });
});

describe('show() credential clearing', () => {
  it('clears username and password inputs on show', () => {
    let authChangeCallback!: (state: AuthState) => void;
    mockAuthService.onAuthChange.mockImplementation((cb: (state: AuthState) => void) => {
      authChangeCallback = cb;
      return () => {};
    });
    const { usernameInput, passwordInput } = setup();
    usernameInput.value = 'leftover';
    passwordInput.value = 'secret';
    authChangeCallback({ isAuthenticated: false, currentUser: null });
    expect(usernameInput.value).toBe('');
    expect(passwordInput.value).toBe('');
  });

  it('resets to login mode on show', () => {
    let authChangeCallback!: (state: AuthState) => void;
    mockAuthService.onAuthChange.mockImplementation((cb: (state: AuthState) => void) => {
      authChangeCallback = cb;
      return () => {};
    });
    const { title, submitBtn } = setup();
    document.getElementById('auth-switch')!.click();
    authChangeCallback({ isAuthenticated: false, currentUser: null });
    expect(title.textContent).toBe('Login');
    expect(submitBtn.textContent).toBe('Login');
  });

  it('clears error message on show', () => {
    let authChangeCallback!: (state: AuthState) => void;
    mockAuthService.onAuthChange.mockImplementation((cb: (state: AuthState) => void) => {
      authChangeCallback = cb;
      return () => {};
    });
    const { errorP } = setup();
    errorP.style.display = 'block';
    errorP.textContent = 'Old error';
    authChangeCallback({ isAuthenticated: false, currentUser: null });
    expect(errorP.style.display).toBe('none');
    expect(errorP.textContent).toBe('');
  });

  it('re-enables submit button on show', () => {
    let authChangeCallback!: (state: AuthState) => void;
    mockAuthService.onAuthChange.mockImplementation((cb: (state: AuthState) => void) => {
      authChangeCallback = cb;
      return () => {};
    });
    const { submitBtn } = setup();
    submitBtn.disabled = true;
    authChangeCallback({ isAuthenticated: false, currentUser: null });
    expect(submitBtn.disabled).toBe(false);
  });
});

describe('onAuthChange listener behavior', () => {
  it('hides overlay and shows logout button when authenticated', () => {
    let authChangeCallback!: (state: AuthState) => void;
    mockAuthService.onAuthChange.mockImplementation((cb: (state: AuthState) => void) => {
      authChangeCallback = cb;
      return () => {};
    });
    const { overlay, logoutBtn, appContainer } = setup();
    authChangeCallback({
      isAuthenticated: true,
      currentUser: { id: '1', username: 'alice', createdAt: 1 },
    });
    expect(overlay.style.display).toBe('none');
    expect(logoutBtn.style.display).toBe('block');
    expect(appContainer.style.display).toBe('');
  });

  it('shows overlay and hides logout button when not authenticated', () => {
    let authChangeCallback!: (state: AuthState) => void;
    mockAuthService.onAuthChange.mockImplementation((cb: (state: AuthState) => void) => {
      authChangeCallback = cb;
      return () => {};
    });
    const { overlay, logoutBtn, appContainer } = setup();
    authChangeCallback({
      isAuthenticated: true,
      currentUser: { id: '1', username: 'alice', createdAt: 1 },
    });
    authChangeCallback({ isAuthenticated: false, currentUser: null });
    expect(overlay.style.display).toBe('flex');
    expect(logoutBtn.style.display).toBe('none');
    expect(appContainer.style.display).toBe('none');
  });

  it('calls restoreSession during initAuth', () => {
    setup();
    expect(mockAuthService.restoreSession).toHaveBeenCalledOnce();
  });

  it('shows auth overlay when not authenticated after init', () => {
    const { overlay, appContainer } = setup();
    expect(overlay.style.display).toBe('flex');
    expect(appContainer.style.display).toBe('none');
  });

  it('logout button calls authService.logout', () => {
    const { logoutBtn } = setup();
    logoutBtn.click();
    expect(mockAuthService.logout).toHaveBeenCalledOnce();
  });
});
