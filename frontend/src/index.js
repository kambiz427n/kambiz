import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import axios from 'axios';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// تنظیم آدرس پایه API
const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
axios.defaults.baseURL = backendUrl;

// اضافه کردن مدیریت خطای 401
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.log('Token expired or unauthorized. Redirecting to login...');
      // Save unreadChats before clearing sensitive data
      const unreadChats = localStorage.getItem('unreadChats');
      const tourCompleted = localStorage.getItem('tourCompleted');
      const themeMode = localStorage.getItem('themeMode');
      localStorage.removeItem('token');
      localStorage.removeItem('currentUserRole');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUserName');
      localStorage.removeItem('allowedDeviceTypes');
      // Restore saved values
      if (unreadChats) {
        localStorage.setItem('unreadChats', unreadChats);
      }
      if (tourCompleted) {
        localStorage.setItem('tourCompleted', tourCompleted);
      }
      if (themeMode) {
        localStorage.setItem('themeMode', themeMode);
      }
      window.location.href = '/'; // هدایت به صفحه ورود
    }
    return Promise.reject(error);
  }
);

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    
    // اضافه کردن هدرهای CORS
    config.headers['Content-Type'] = 'application/json';
    config.headers['Accept'] = 'application/json';
    
    return config;
  },
  (error) => Promise.reject(error)
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 