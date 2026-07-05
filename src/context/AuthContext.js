import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/profile/');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login/', { username, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return { success: true };
    } catch (error) {
      if (error.response?.data?.needs_verification) {
        return { 
          success: false, 
          error: error.response.data 
        };
      }
      return { 
        success: false, 
        error: error.response?.data || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register/', userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || 'Registration failed' };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      await api.post('/auth/verify-otp/', { email, otp });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data || 'Verification failed' };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await api.post('/auth/forgot-password/', { email });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || 'Failed to send reset email' };
    }
  };

  const resetPassword = async (email, resetToken, newPassword, confirmPassword) => {
    try {
      await api.post('/auth/reset-password/', { 
        email, 
        reset_token: resetToken,
        new_password: newPassword, 
        confirm_password: confirmPassword 
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data || 'Failed to reset password' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    setUser, // Add this to allow updating user context
    loading,
    login,
    register,
    verifyOTP,
    forgotPassword,
    resetPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};