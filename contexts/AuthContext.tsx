import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Credentials - in einer echten Anwendung würden diese auf einem Server gespeichert
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'Gßßgl3de123!';
const SESSION_KEY = 'admin_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 Stunden

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Prüfe ob eine gültige Session existiert
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (sessionData) {
      try {
        const { timestamp } = JSON.parse(sessionData);
        const now = Date.now();
        
        // Prüfe ob Session noch gültig ist (8 Stunden)
        if (now - timestamp < SESSION_DURATION) {
          setIsAuthenticated(true);
        } else {
          // Session abgelaufen
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      const sessionData = {
        timestamp: Date.now(),
        user: username
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
