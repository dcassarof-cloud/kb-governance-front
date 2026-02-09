// =====================================================
// AUTH SERVICE - Consisa KB Governance
// =====================================================

import { API_ENDPOINTS, config } from '@/config/app-config';
import { User, AuthState, UserRole } from '@/types';

type AuthRole = UserRole | string;

interface AuthPayload {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: User | null;
}

class AuthService {
  private state: AuthState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
  };
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private buildUrl(endpoint: string): string {
    const base = (config.apiBaseUrl || '').trim().replace(/\/+$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  private decodeTokenPayload(token: string): Record<string, unknown> | null {
    const [, payload] = token.split('.');
    if (!payload) return null;
    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '=');
      const decoded = atob(padded);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch (error) {
      console.warn('Error decoding token payload:', error);
      return null;
    }
  }

  private extractRoles(payload: Record<string, unknown> | null): AuthRole[] {
    if (!payload) return [];
    const roles =
      (payload.roles as AuthRole[]) ??
      (payload.authorities as AuthRole[]) ??
      (payload.permissions as AuthRole[]) ??
      (payload.role as AuthRole) ??
      [];
    if (Array.isArray(roles)) {
      return roles.map((role) => String(role).toUpperCase());
    }
    return [String(roles).toUpperCase()];
  }

  private normalizeUser(user: User | null | undefined, token: string): User | null {
    const payload = this.decodeTokenPayload(token);
    const [roleFromToken] = this.extractRoles(payload);
    if (user) {
      return {
        ...user,
        role: (user.role || roleFromToken || 'VIEWER') as UserRole,
      };
    }

    if (!payload) return null;
    const id = String(payload.sub ?? payload.userId ?? payload.id ?? '');
    const email = String(payload.email ?? payload.mail ?? '');
    const name = String(payload.name ?? payload.fullName ?? email ?? id ?? '');

    return {
      id: id || email || 'unknown',
      email: email || '',
      name: name || email || 'Usuário',
      role: (roleFromToken || 'VIEWER') as UserRole,
    };
  }

  private normalizeAuthPayload(raw: unknown): Required<Pick<AuthPayload, 'accessToken'>> & AuthPayload {
    const payload = (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>))
      ? (raw as { data?: AuthPayload }).data ?? {}
      : (raw as AuthPayload);
    const accessToken = payload?.accessToken ?? payload?.token ?? '';

    return {
      ...payload,
      accessToken,
    };
  }

  private loadFromStorage(): void {
    try {
      const token = localStorage.getItem(config.tokenKey);
      const refreshToken = localStorage.getItem(config.refreshTokenKey);
      const userJson = localStorage.getItem(config.userKey);

      if (token) {
        this.state = {
          token,
          refreshToken,
          user: userJson ? JSON.parse(userJson) : this.normalizeUser(null, token),
          isAuthenticated: Boolean(token),
        };
      }
    } catch (error) {
      console.error('Error loading auth state from storage:', error);
      this.clearToken();
    }
  }

  getToken(): string | null {
    return this.state.token;
  }

  getAccessToken(): string | null {
    return this.state.token;
  }

  getRefreshToken(): string | null {
    return this.state.refreshToken;
  }

  getUser(): User | null {
    return this.state.user;
  }

  getRoles(): AuthRole[] {
    const roles = new Set<AuthRole>();
    if (this.state.user?.role) {
      roles.add(String(this.state.user.role).toUpperCase());
    }
    const payloadRoles = this.extractRoles(this.state.token ? this.decodeTokenPayload(this.state.token) : null);
    payloadRoles.forEach((role) => roles.add(String(role).toUpperCase()));
    return Array.from(roles);
  }

  hasRole(roles: AuthRole | AuthRole[]): boolean {
    const required = Array.isArray(roles) ? roles : [roles];
    const normalized = required.map((role) => String(role).toUpperCase());
    const currentRoles = this.getRoles();
    return normalized.some((role) => currentRoles.includes(role));
  }

  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  getActorIdentifier(): string | null {
    if (this.state.user?.email) return this.state.user.email;
    if (this.state.user?.id) return this.state.user.id;
    const payload = this.state.token ? this.decodeTokenPayload(this.state.token) : null;
    const email = payload?.email ?? payload?.mail;
    if (typeof email === 'string' && email.trim()) return email;
    const sub = payload?.sub ?? payload?.userId ?? payload?.id;
    if (typeof sub === 'string' && sub.trim()) return sub;
    return null;
  }

  setTokens(token: string, refreshToken: string | null, user: User | null): void {
    this.state = {
      token,
      refreshToken,
      user: user ?? null,
      isAuthenticated: true,
    };
    localStorage.setItem(config.tokenKey, token);
    if (refreshToken) {
      localStorage.setItem(config.refreshTokenKey, refreshToken);
    } else {
      localStorage.removeItem(config.refreshTokenKey);
    }
    localStorage.setItem(config.userKey, JSON.stringify(user));
  }

  clearToken(): void {
    this.state = {
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    };
    localStorage.removeItem(config.tokenKey);
    localStorage.removeItem(config.refreshTokenKey);
    localStorage.removeItem(config.userKey);
  }

  async login(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(this.buildUrl(API_ENDPOINTS.LOGIN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const message = (error as { message?: string })?.message ?? 'Credenciais inválidas';
        return { success: false, message };
      }

      const data = await response.json().catch(() => ({}));
      const payload = this.normalizeAuthPayload(data);
      if (!payload.accessToken) {
        return { success: false, message: 'Resposta inválida do servidor' };
      }

      const normalizedUser = this.normalizeUser(payload.user ?? null, payload.accessToken);
      this.setTokens(
        payload.accessToken,
        payload.refreshToken ?? payload.refresh_token ?? null,
        normalizedUser
      );
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao autenticar';
      return { success: false, message };
    }
  }

  async refreshTokens(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    if (!this.state.refreshToken) return false;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(this.buildUrl(API_ENDPOINTS.REFRESH), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.state.refreshToken }),
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json().catch(() => ({}));
        const payload = this.normalizeAuthPayload(data);
        if (!payload.accessToken) {
          throw new Error('Token refresh response invalid');
        }

        const normalizedUser = this.normalizeUser(payload.user ?? this.state.user, payload.accessToken);
        this.setTokens(
          payload.accessToken,
          payload.refreshToken ?? payload.refresh_token ?? this.state.refreshToken,
          normalizedUser
        );
        return true;
      } catch (error) {
        console.warn('Refresh token failed:', error);
        this.clearToken();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async logout(): Promise<void> {
    try {
      if (this.state.token || this.state.refreshToken) {
        await fetch(this.buildUrl(API_ENDPOINTS.LOGOUT), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.state.token ? { Authorization: `Bearer ${this.state.token}` } : {}),
          },
          body: this.state.refreshToken ? JSON.stringify({ refreshToken: this.state.refreshToken }) : undefined,
        });
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      this.clearToken();
    }
  }
}

export const authService = new AuthService();
export const hasRole = (roles: AuthRole | AuthRole[]) => authService.hasRole(roles);
