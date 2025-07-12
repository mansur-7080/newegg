import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { loginUser, registerUser, logoutUser, verifyToken, updateProfile } from '../store/slices/authSlice';
import { User, AuthTokens, LoginRequest, RegisterRequest } from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserProfile: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { user, tokens, isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (accessToken && refreshToken) {
        try {
          await dispatch(verifyToken()).unwrap();
        } catch (error) {
          // Token is invalid, clear storage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    };

    initializeAuth();
  }, [dispatch]);

  const login = async (credentials: LoginRequest) => {
    try {
      await dispatch(loginUser(credentials)).unwrap();
      return { success: true };
    } catch (error: any) {
      const errorMessage = error || 'Kirish xatosi';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      await dispatch(registerUser(userData)).unwrap();
      return { success: true };
    } catch (error: any) {
      const errorMessage = error || 'Ro\'yxatdan o\'tish xatosi';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success('Muvaffaqiyatli chiqildi');
    } catch (error: any) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };

  const updateUserProfile = async (userData: Partial<User>) => {
    try {
      await dispatch(updateProfile(userData)).unwrap();
      toast.success('Profil muvaffaqiyatli yangilandi');
      return { success: true };
    } catch (error: any) {
      const errorMessage = error || 'Profil yangilash xatosi';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const clearError = () => {
    // This would need to be implemented in the auth slice
    // For now, we'll just clear the error from the context
  };

  const value: AuthContextType = {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateUserProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};