import { API_ENDPOINTS, config } from '@/config/app-config';
import { authClient } from '@/config/axios';
import { handleApiError } from '@/lib/handle-api-error';
import { AuthState, User, UserRole } from '@/types';

type AuthRole = UserRole | string;

interface AuthPayload {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: User | null;
}

const REFRESH_EARLY_MS = 2 * 60 * 1000;

/**
 * Serviço central de autenticação/sessão da aplicação.
 *
 * Responsabilidades:
 * - normalizar payloads de login/refresh;
 * - persistir sessão no localStorage;
 * - extrair roles de user + JWT para RBAC na UX;
 * - renovar token de forma antecipada e segura.
 */
class AuthService {
  private state: AuthState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
  };

  private refreshPromise: Promise<boolean> | null = null;
  private refreshTimer: number | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private decodeTokenPayload(token: string): Record<string, unknown> | null {
    const [, payload] = token.split('.');
    if (!payload) return null;

    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
      const decoded = atob(padded);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private getTokenExpiration(token: string): number | null {
    const payload = this.decodeTokenPayload(token);
    const exp = payload?.exp;
    if (typeof exp !== 'number') return null;
    return exp * 1000;
  }

  private scheduleTokenRefresh(accessToken: string): void {
    this.clearRefreshTimer();

    const expiresAt = this.getTokenExpiration(accessToken);
    if (!expiresAt) return;

    const refreshAt = Math.max(expiresAt - REFRESH_EARLY_MS, Date.now() + 1000);
    const delay = refreshAt - Date.now();

    this.refreshTimer = window.setTimeout(() => {
      void this.refreshTokens();
    }, delay);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
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
    const payload =
      raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)
        ? ((raw as { data?: AuthPayload }).data ?? {})
        : (raw as AuthPayload);

    return {
      ...payload,
      accessToken: payload?.accessToken ?? payload?.token ?? '',
    };
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem(config.tokenKey);
    const refreshToken = localStorage.getItem(config.refreshTokenKey);
    const userJson = localStorage.getItem(config.userKey);

    if (!token) return;

    this.state = {
      token,
      refreshToken,
      user: userJson ? (JSON.parse(userJson) as User) : this.normalizeUser(null, token),
      isAuthenticated: true,
    };

    this.scheduleTokenRefresh(token);
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

  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  /** Retorna o conjunto efetivo de roles (perfil salvo + claims do token). */
  getRoles(): AuthRole[] {
    const roles = new Set<AuthRole>();
    if (this.state.user?.role) {
      roles.add(String(this.state.user.role).toUpperCase());
    }

    const payloadRoles = this.extractRoles(this.state.token ? this.decodeTokenPayload(this.state.token) : null);
    payloadRoles.forEach((role) => roles.add(String(role).toUpperCase()));

    return Array.from(roles);
  }


  /**
   * Resolve o identificador do ator para ações auditáveis (email > id).
   * TODO: alinhar com contrato único de backend quando houver campo canônico explícito.
   */
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

  hasRole(roles: AuthRole | AuthRole[]): boolean {
    const required = Array.isArray(roles) ? roles : [roles];
    const normalized = required.map((role) => String(role).toUpperCase());
    const currentRoles = this.getRoles();

    return normalized.some((role) => currentRoles.includes(role));
  }

  private setSession(token: string, refreshToken: string | null, user: User | null): void {
    this.state = {
      token,
      refreshToken,
      user,
      isAuthenticated: true,
    };

    localStorage.setItem(config.tokenKey, token);

    if (refreshToken) {
      localStorage.setItem(config.refreshTokenKey, refreshToken);
    } else {
      localStorage.removeItem(config.refreshTokenKey);
    }

    localStorage.setItem(config.userKey, JSON.stringify(user));
    this.scheduleTokenRefresh(token);
  }

  clearToken(): void {
    this.clearRefreshTimer();
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
      const response = await authClient.post<AuthPayload>(API_ENDPOINTS.LOGIN, { email, password });
      const payload = this.normalizeAuthPayload(response.data);

      if (!payload.accessToken) {
        return { success: false, message: 'Resposta inválida do servidor' };
      }

      const user = this.normalizeUser(payload.user ?? null, payload.accessToken);
      this.setSession(payload.accessToken, payload.refreshToken ?? payload.refresh_token ?? null, user);

      return { success: true };
    } catch (error) {
      const apiError = handleApiError(error);
      return { success: false, message: apiError.message };
    }
  }

  /**
   * Executa refresh com deduplicação de chamadas concorrentes.
   *
   * @returns `true` quando token foi renovado com sucesso.
   */
  async refreshTokens(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    if (!this.state.refreshToken) return false;

    this.refreshPromise = (async () => {
      try {
        const response = await authClient.post<AuthPayload>(API_ENDPOINTS.REFRESH, {
          refreshToken: this.state.refreshToken,
        });

        const payload = this.normalizeAuthPayload(response.data);
        if (!payload.accessToken) {
          throw new Error('Token refresh response invalid');
        }

        const user = this.normalizeUser(payload.user ?? this.state.user, payload.accessToken);
        this.setSession(
          payload.accessToken,
          payload.refreshToken ?? payload.refresh_token ?? this.state.refreshToken,
          user
        );

        return true;
      } catch {
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
        await authClient.post(API_ENDPOINTS.LOGOUT, this.state.refreshToken ? { refreshToken: this.state.refreshToken } : undefined, {
          headers: this.state.token ? { Authorization: `Bearer ${this.state.token}` } : undefined,
        });
      }
    } finally {
      this.clearToken();
    }
  }
}

export const authService = new AuthService();
export const hasRole = (roles: AuthRole | AuthRole[]) => authService.hasRole(roles);
