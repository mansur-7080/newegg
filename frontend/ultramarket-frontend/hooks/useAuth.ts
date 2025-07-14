import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  role: 'ADMIN' | 'CUSTOMER' | 'VENDOR';
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role?: 'CUSTOMER' | 'VENDOR';
}

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Custom hook for authentication
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Cookie names
  const TOKEN_COOKIE = 'ultramarket_token';
  const REFRESH_TOKEN_COOKIE = 'ultramarket_refresh_token';
  const USER_COOKIE = 'ultramarket_user';

  // Axios instance with interceptors
  const authApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add token
  authApi.interceptors.request.use(
    (config) => {
      const token = authState.token || Cookies.get(TOKEN_COOKIE);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for token refresh
  authApi.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as any;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = Cookies.get(REFRESH_TOKEN_COOKIE);
          if (refreshToken) {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { token, user } = response.data;
            
            // Update tokens
            Cookies.set(TOKEN_COOKIE, token, { expires: 7 });
            Cookies.set(USER_COOKIE, JSON.stringify(user), { expires: 7 });

            setAuthState((prev) => ({
              ...prev,
              token,
              user,
              isAuthenticated: true,
            }));

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return authApi(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, logout user
          logout();
        }
      }

      return Promise.reject(error);
    }
  );

  // Initialize auth state from cookies
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = Cookies.get(TOKEN_COOKIE);
        const userCookie = Cookies.get(USER_COOKIE);

        if (token && userCookie) {
          const user = JSON.parse(userCookie);
          setAuthState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Xatolik yuz berdi',
        });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await authApi.post<AuthResponse>('/auth/login', credentials);
      const { user, token, refreshToken } = response.data;

      // Store tokens in cookies
      const cookieOptions = credentials.rememberMe ? { expires: 30 } : { expires: 1 };
      Cookies.set(TOKEN_COOKIE, token, cookieOptions);
      Cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);
      Cookies.set(USER_COOKIE, JSON.stringify(user), cookieOptions);

      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      toast.success(`Xush kelibsiz, ${user.firstName}!`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Kirish jarayonida xatolik yuz berdi';
      
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [authApi]);

  // Register function
  const register = useCallback(async (data: RegisterData): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await authApi.post<AuthResponse>('/auth/register', data);
      const { user, token, refreshToken } = response.data;

      // Store tokens in cookies
      Cookies.set(TOKEN_COOKIE, token, { expires: 7 });
      Cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, { expires: 7 });
      Cookies.set(USER_COOKIE, JSON.stringify(user), { expires: 7 });

      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      toast.success('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Ro\'yxatdan o\'tishda xatolik yuz berdi';
      
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [authApi]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Call logout endpoint if available
      if (authState.token) {
        await authApi.post('/auth/logout');
      }
    } catch (error) {
      // Ignore logout errors, clear local state anyway
      console.error('Logout error:', error);
    } finally {
      // Clear all auth data
      Cookies.remove(TOKEN_COOKIE);
      Cookies.remove(REFRESH_TOKEN_COOKIE);
      Cookies.remove(USER_COOKIE);

      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      toast.success('Muvaffaqiyatli chiqtingiz');
    }
  }, [authState.token, authApi]);

  // Update user profile
  const updateProfile = useCallback(async (updateData: Partial<User>): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await authApi.put<{ user: User }>('/auth/profile', updateData);
      const { user } = response.data;

      // Update user in cookies
      Cookies.set(USER_COOKIE, JSON.stringify(user), { expires: 7 });

      setAuthState((prev) => ({
        ...prev,
        user,
        isLoading: false,
        error: null,
      }));

      toast.success('Profil muvaffaqiyatli yangilandi');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Profil yangilanishida xatolik yuz berdi';
      
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [authApi]);

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      await authApi.put('/auth/password', {
        currentPassword,
        newPassword,
      });

      setAuthState((prev) => ({ ...prev, isLoading: false, error: null }));
      toast.success('Parol muvaffaqiyatli o\'zgartirildi');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Parol o\'zgartirishda xatolik yuz berdi';
      
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [authApi]);

  // Verify email
  const verifyEmail = useCallback(async (token: string): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await authApi.post<{ user: User }>('/auth/verify-email', { token });
      const { user } = response.data;

      // Update user in cookies
      Cookies.set(USER_COOKIE, JSON.stringify(user), { expires: 7 });

      setAuthState((prev) => ({
        ...prev,
        user,
        isLoading: false,
        error: null,
      }));

      toast.success('Email muvaffaqiyatli tasdiqlandi');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Email tasdiqlashda xatolik yuz berdi';
      
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [authApi]);

  // Forgot password
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      await authApi.post('/auth/forgot-password', { email });

      setAuthState((prev) => ({ ...prev, isLoading: false, error: null }));
      toast.success('Parolni tiklash havolasi emailingizga yuborildi');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Parolni tiklashda xatolik yuz berdi';
      
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [authApi]);

  // Reset password
  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      await authApi.post('/auth/reset-password', { token, newPassword });

      setAuthState((prev) => ({ ...prev, isLoading: false, error: null }));
      toast.success('Parol muvaffaqiyatli tiklandi');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Parolni tiklashda xatolik yuz berdi';
      
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [authApi]);

  // Check if user has specific role
  const hasRole = useCallback((role: string): boolean => {
    return authState.user?.role === role;
  }, [authState.user?.role]);

  // Check if user is admin
  const isAdmin = useCallback((): boolean => {
    return hasRole('ADMIN');
  }, [hasRole]);

  // Check if user is vendor
  const isVendor = useCallback((): boolean => {
    return hasRole('VENDOR');
  }, [hasRole]);

  return {
    // State
    ...authState,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    verifyEmail,
    forgotPassword,
    resetPassword,
    
    // Helpers
    hasRole,
    isAdmin,
    isVendor,
    
    // API instance for authenticated requests
    authApi,
  };
};