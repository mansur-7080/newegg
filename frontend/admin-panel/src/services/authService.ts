import { apiService, ApiResponse } from './api';

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'user';
  avatar?: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  avatar?: string;
}

// Auth Service Class
export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Login
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>('/api/v1/auth/login', credentials);
    
    if (response.success && response.data) {
      // Store tokens
      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      // Store user data
      localStorage.setItem('adminUser', JSON.stringify(response.data.user));
      
      return response.data;
    }
    
    throw new Error(response.error || 'Login failed');
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await apiService.post('/api/v1/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('adminToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('adminUser');
    }
  }

  // Refresh token
  async refreshToken(): Promise<LoginResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<LoginResponse>('/api/v1/auth/refresh', {
      refreshToken,
    });

    if (response.success && response.data) {
      // Update tokens
      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      return response.data;
    }

    throw new Error(response.error || 'Token refresh failed');
  }

  // Get current user
  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<User>('/api/v1/auth/me');
    
    if (response.success && response.data) {
      // Update stored user data
      localStorage.setItem('adminUser', JSON.stringify(response.data));
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to get user data');
  }

  // Forgot password
  async forgotPassword(email: string): Promise<void> {
    const response = await apiService.post('/api/v1/auth/forgot-password', { email });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to send reset email');
    }
  }

  // Reset password
  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    const response = await apiService.post('/api/v1/auth/reset-password', data);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to reset password');
    }
  }

  // Change password
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    const response = await apiService.post('/api/v1/auth/change-password', data);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to change password');
    }
  }

  // Update profile
  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await apiService.put<User>('/api/v1/auth/profile', data);
    
    if (response.success && response.data) {
      // Update stored user data
      localStorage.setItem('adminUser', JSON.stringify(response.data));
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to update profile');
  }

  // Verify token
  async verifyToken(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  // Get stored user
  getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem('adminUser');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  // Get stored token
  getStoredToken(): string | null {
    return localStorage.getItem('adminToken');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getStoredToken() && !!this.getStoredUser();
  }

  // Check user permissions
  hasPermission(permission: string): boolean {
    const user = this.getStoredUser();
    return user?.permissions.includes(permission) || false;
  }

  // Check user role
  hasRole(role: string): boolean {
    const user = this.getStoredUser();
    return user?.role === role;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default authService;