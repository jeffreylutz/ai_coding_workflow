import { authService } from './auth-service';
import type { AuthState } from './types';

function createAuthUI(container: HTMLElement): { show: () => void; hide: () => void } {
  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay';

  // Build form using DOM methods to avoid innerHTML
  const authContainer = document.createElement('div');
  authContainer.className = 'auth-container';

  const title = document.createElement('h2');
  title.id = 'auth-title';
  title.textContent = 'Login';

  const form = document.createElement('form');
  form.id = 'auth-form';

  const usernameInput = document.createElement('input');
  usernameInput.type = 'text';
  usernameInput.id = 'auth-username';
  usernameInput.placeholder = 'Username';
  usernameInput.required = true;
  usernameInput.autocomplete = 'username';

  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.id = 'auth-password';
  passwordInput.placeholder = 'Password';
  passwordInput.required = true;
  passwordInput.autocomplete = 'current-password';

  const errorP = document.createElement('p');
  errorP.id = 'auth-error';
  errorP.style.color = 'red';
  errorP.style.display = 'none';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.id = 'auth-submit';
  submitBtn.textContent = 'Login';

  form.append(usernameInput, passwordInput, errorP, submitBtn);

  const toggleP = document.createElement('p');
  toggleP.id = 'auth-toggle';

  authContainer.append(title, form, toggleP);
  overlay.appendChild(authContainer);

  // Styles
  overlay.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:1000;';

  authContainer.style.cssText =
    'background:#1a1a2e;padding:2rem;border-radius:8px;min-width:300px;color:#fff;font-family:sans-serif;';

  const inputStyle =
    'display:block;width:100%;padding:0.5rem;margin:0.5rem 0;box-sizing:border-box;border:1px solid #444;border-radius:4px;background:#16213e;color:#fff;';
  usernameInput.style.cssText = inputStyle;
  passwordInput.style.cssText = inputStyle;

  submitBtn.style.cssText =
    'display:block;width:100%;padding:0.5rem;margin-top:1rem;background:#0f3460;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:1rem;';

  container.appendChild(overlay);

  let isLoginMode = true;

  function buildToggleContent(): void {
    toggleP.textContent = '';
    const text = isLoginMode ? "Don't have an account? " : 'Already have an account? ';
    const linkText = isLoginMode ? 'Sign up' : 'Login';
    toggleP.appendChild(document.createTextNode(text));
    const switchLink = document.createElement('a');
    switchLink.href = '#';
    switchLink.id = 'auth-switch';
    switchLink.textContent = linkText;
    switchLink.addEventListener('click', (e) => {
      e.preventDefault();
      isLoginMode = !isLoginMode;
      title.textContent = isLoginMode ? 'Login' : 'Sign Up';
      submitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
      passwordInput.autocomplete = isLoginMode ? 'current-password' : 'new-password';
      buildToggleContent();
      errorP.style.display = 'none';
    });
    toggleP.appendChild(switchLink);
  }

  buildToggleContent();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    const username = usernameInput.value;
    const password = passwordInput.value;
    const result = isLoginMode
      ? await authService.login(username, password)
      : await authService.register(username, password);
    if (!result.success) {
      errorP.textContent = result.error;
      errorP.style.display = 'block';
      submitBtn.disabled = false;
    }
  });

  function show(): void {
    usernameInput.value = '';
    passwordInput.value = '';
    errorP.style.display = 'none';
    errorP.textContent = '';
    submitBtn.disabled = false;
    isLoginMode = true;
    passwordInput.autocomplete = 'current-password';
    title.textContent = 'Login';
    submitBtn.textContent = 'Login';
    buildToggleContent();
    overlay.style.display = 'flex';
  }

  function hide(): void {
    overlay.style.display = 'none';
  }

  return { show, hide };
}

function createLogoutButton(container: HTMLElement): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = 'Logout';
  btn.id = 'logout-btn';
  btn.style.cssText =
    'position:fixed;top:10px;right:10px;z-index:999;padding:0.4rem 1rem;background:#0f3460;color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:sans-serif;';
  btn.addEventListener('click', () => authService.logout());
  btn.style.display = 'none';
  container.appendChild(btn);
  return btn;
}

export function initAuth(appContainer: HTMLElement): void {
  const authUI = createAuthUI(document.body);
  const logoutBtn = createLogoutButton(document.body);

  authService.onAuthChange((state: AuthState) => {
    if (state.isAuthenticated) {
      authUI.hide();
      logoutBtn.style.display = 'block';
      appContainer.style.display = '';
    } else {
      authUI.show();
      logoutBtn.style.display = 'none';
      appContainer.style.display = 'none';
    }
  });

  authService.restoreSession();

  if (!authService.getState().isAuthenticated) {
    authUI.show();
    appContainer.style.display = 'none';
  }
}
