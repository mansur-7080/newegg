import { useState, useEffect, useCallback } from 'react';
import { apiService, User, AuthTokens } from '../services/api';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (accessToken && refreshToken) {
          // Verify token and get user data
          const response = await apiService.verifyToken();
          if (response.success && response.data) {
            setAuthState({
              user: response.data.user,
              tokens: {
                accessToken,
                refreshToken,
              },
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setAuthState({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setAuthState({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await apiService.login(credentials);
      
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        setAuthState({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });
        
        toast.success('Muvaffaqiyatli kirildi!');
        return { success: true };
      } else {
        toast.error(response.error?.message || 'Kirish xatosi');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: response.error?.message };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Kirish xatosi';
      toast.error(errorMessage);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (userData: RegisterData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await apiService.register(userData);
      
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        setAuthState({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });
        
        toast.success('Hisob muvaffaqiyatli yaratildi!');
        return { success: true };
      } else {
        toast.error(response.error?.message || 'Ro\'yxatdan o\'tish xatosi');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: response.error?.message };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Ro\'yxatdan o\'tish xatosi';
      toast.error(errorMessage);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      setAuthState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      toast.success('Muvaffaqiyatli chiqildi');
    }
  }, []);

  const updateProfile = useCallback(async (userData: Partial<User>) => {
    try {
      const response = await apiService.updateProfile(userData);
      
      if (response.success && response.data?.user) {
        setAuthState(prev => ({
          ...prev,
          user: response.data.user,
        }));
        
        toast.success('Profil muvaffaqiyatli yangilandi');
        return { success: true };
      } else {
        toast.error(response.error?.message || 'Profil yangilash xatosi');
        return { success: false, error: response.error?.message };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Profil yangilash xatosi';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    user: authState.user,
    tokens: authState.tokens,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    register,
    logout,
    updateProfile,
  };
};