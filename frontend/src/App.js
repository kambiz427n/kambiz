import React, { useState, useMemo, createContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Users from './pages/Users';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Tickets from './pages/Tickets';
import Reports from './pages/Reports';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// ایجاد Context برای تم
export const ThemeContext = createContext({
  toggleTheme: () => {},
  mode: 'light',
});

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('currentUserRole');
  if (!token || !role || (allowedRoles && !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  // دریافت حالت تم از localStorage یا استفاده از حالت پیش‌فرض روشن
  const [mode, setMode] = useState(
    localStorage.getItem('themeMode') || 'light'
  );

  // ذخیره تم در localStorage هنگام تغییر
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // تابع تغییر تم
  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // ساخت تم بر اساس حالت انتخاب شده
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#33805c',
            light: mode === 'dark' ? '#5ba37f' : '#5ba37f',
            dark: mode === 'dark' ? '#1e4d37' : '#24573f',
          },
          secondary: {
            main: mode === 'dark' ? '#424242' : '#f5f5f5',
          },
          background: {
            default: mode === 'dark' ? '#121212' : '#f8fbf9',
            paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
          text: {
            primary: mode === 'dark' ? '#e0e0e0' : '#333333',
            secondary: mode === 'dark' ? '#aaaaaa' : '#666666',
          },
        },
        typography: {
          fontFamily: '"Vazirmatn", "Roboto", "Helvetica", "Arial", sans-serif',
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'dark' 
                  ? '0 2px 10px rgba(0, 0, 0, 0.5)' 
                  : '0 2px 10px rgba(51, 128, 92, 0.15)',
                backgroundColor: mode === 'dark' ? '#1e4d37' : '#33805c',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
        direction: 'rtl',
      }),
    [mode]
  );

  // ارائه Context برای دسترسی به تابع تغییر تم در تمام کامپوننت‌ها
  const themeContextValue = useMemo(
    () => ({
      toggleTheme,
      mode,
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <ToastContainer theme={mode} />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["superadmin", "admin", "expert", "agent", "acceptor"]}><Dashboard /></ProtectedRoute>}>
              <Route path="users" element={<Users />} />
              <Route path="devices" element={<Devices />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="reports" element={<ProtectedRoute allowedRoles={["superadmin", "admin"]}><Reports /></ProtectedRoute>} />
              {/* صفحات دیگر مانند devices و tickets را اینجا اضافه کن */}
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App; 