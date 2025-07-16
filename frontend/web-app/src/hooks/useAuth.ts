import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'user' | 'admin' | 'moderator';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Sahifa yuklanganda tokenni tekshirish
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      validateToken(token);
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Tokenni validatsiya qilish
  const validateToken = async (token: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setAuthState({
          user: userData.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        // Token noto'g'ri
        localStorage.removeItem('authToken');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Session muddati tugagan',
        });
      }
    } catch (error) {
      localStorage.removeItem('authToken');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Tarmoq xatosi',
      });
    }
  };

  // Foydalanuvchini tizimga kiritish
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message || 'Kirishda xatolik',
        }));
        return false;
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Tarmoq xatosi',
      }));
      return false;
    }
  };

  // Foydalanuvchini ro'yxatdan o'tkazish
  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message || 'Ro\'yxatdan o\'tishda xatolik',
        }));
        return false;
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Tarmoq xatosi',
      }));
      return false;
    }
  };

  // Foydalanuvchini tizimdan chiqarish
  const logout = () => {
    localStorage.removeItem('authToken');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  };

  // Parolni tiklash
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          error: data.message || 'Parolni tiklashda xatolik',
        }));
        return false;
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: 'Tarmoq xatosi',
      }));
      return false;
    }
  };

  // Profil ma'lumotlarini yangilash
  const updateProfile = async (updateData: Partial<User>): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      const token = localStorage.getItem('authToken');

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthState(prev => ({
          ...prev,
          user: data.user,
        }));
        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          error: data.message || 'Profilni yangilashda xatolik',
        }));
        return false;
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: 'Tarmoq xatosi',
      }));
      return false;
    }
  };

  // Xatolikni tozalash
  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return {
    // Holat
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,

    // Amallar
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    clearError,
    validateToken,
  };
};

export default useAuth;