import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { login as loginApi, register as registerApi, fetchMe } from '../services/api';

const AuthContext = createContext();

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await fetchMe();
          if (data.success) {
            setUser(data.user);
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await loginApi(email, password);
      if (data.success) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        toast.success(`Welcome back, ${data.user.name}!`, {
          style: { background: '#111', color: '#39FF14', border: '1px solid #333' }
        });
        return { success: true };
      }
    } catch (error) {
      const msg = error.response?.data?.error?.message || 'Login failed';
      toast.error(msg, {
        style: { background: '#111', color: '#FF6B6B', border: '1px solid #333' }
      });
      return { success: false, message: msg };
    }
  };

  const register = async (name, email, password) => {
    try {
      const data = await registerApi(name, email, password);
      if (data.success) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        toast.success('Account created successfully!', {
          style: { background: '#111', color: '#39FF14', border: '1px solid #333' }
        });
        return { success: true };
      }
    } catch (error) {
      const msg = error.response?.data?.error?.message || 'Registration failed';
      toast.error(msg, {
        style: { background: '#111', color: '#FF6B6B', border: '1px solid #333' }
      });
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast('Logged out', {
      icon: '👋',
      style: { background: '#111', color: '#fff', border: '1px solid #333' }
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
