import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axiosConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We ideally should have a /me endpoint, but we can parse role from JWT or store user in localstorage for now.
    // For simplicity, we'll restore user info from localStorage if present.
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('auth/login/', { email, password });
    localStorage.setItem('access', res.data.access);
    localStorage.setItem('refresh', res.data.refresh);
    
    // In a real app, decode JWT for role or call /me endpoint. We assume role comes in login response or we decode JWT.
    // Since simplejwt doesn't include custom claims by default without custom serializer, 
    // let's do a simple jwt decode on frontend:
    const tokenParts = res.data.access.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      const loggedUser = {
        id: payload.user_id,
        email,
        role: payload.role || 'Employee',
        name: payload.name || email,
        department_id: payload.department_id ?? null,
      };
      setUser(loggedUser);
      localStorage.setItem('user', JSON.stringify(loggedUser));
    }
  };

  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
