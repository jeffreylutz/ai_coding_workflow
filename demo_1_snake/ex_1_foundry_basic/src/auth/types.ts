export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export interface SafeUser {
  id: string;
  username: string;
  createdAt: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: SafeUser | null;
}

export interface AuthResult {
  success: boolean;
  error: string | null;
  user: SafeUser | null;
}

export type AuthChangeCallback = (state: AuthState) => void;
