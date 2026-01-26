// =====================================================
// AUTH SERVICE - Consisa KB Governance
// =====================================================

import { config } from '@/config/app-config';
import { User, AuthState } from '@/types';
import { mockUser } from '@/data/mock-data';

class AuthService {
  private state: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const token = localStorage.getItem(config.tokenKey);
      const userJson = localStorage.getItem(config.userKey);
      
      if (token && userJson) {
        this.state = {
          token,
          user: JSON.parse(userJson),
          isAuthenticated: true,
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

  getUser(): User | null {
    return this.state.user;
  }

  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  setToken(token: string, user: User): void {
    this.state = {
      token,
      user,
      isAuthenticated: true,
    };
    localStorage.setItem(config.tokenKey, token);
    localStorage.setItem(config.userKey, JSON.stringify(user));
  }

  clearToken(): void {
    this.state = {
      token: null,
      user: null,
      isAuthenticated: false,
    };
    localStorage.removeItem(config.tokenKey);
    localStorage.removeItem(config.userKey);
  }

  // Mock login - TODO: Substituir por chamada real à API
  async login(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock validation
    if (email === 'admin@consisa.com.br' && password === 'admin123') {
      const mockToken = 'mock-jwt-token-' + Date.now();
      this.setToken(mockToken, mockUser);
      return { success: true };
    }

    return { success: false, message: 'Credenciais inválidas' };

    // TODO: Descomentar quando API estiver disponível
    // const response = await apiClient.post<{ token: string; user: User }>(
    //   API_ENDPOINTS.LOGIN,
    //   { email, password }
    // );
    // if (response.success) {
    //   this.setToken(response.data.token, response.data.user);
    // }
    // return response;
  }

  async logout(): Promise<void> {
    // TODO: Chamar endpoint de logout quando API estiver disponível
    // await apiClient.post(API_ENDPOINTS.LOGOUT, {});
    this.clearToken();
  }
}

export const authService = new AuthService();
