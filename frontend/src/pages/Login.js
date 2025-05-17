import React, { useState, useContext, useEffect, useRef } from 'react';
import { Box, Button, TextField, Typography, Paper, IconButton, ThemeProvider, createTheme, Alert, AlertTitle, Collapse, Modal, Backdrop } from '@mui/material';
import { Brightness4, Brightness7, Close as CloseIcon, ErrorOutline } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import logo from '../assets/images/bamdad.png';
import { ThemeContext } from '../App';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';

// ایجاد اتصال سوکت
const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');

const validationSchema = Yup.object({
  email: Yup.string().email('ایمیل نامعتبر است').required('ایمیل الزامی است'),
  password: Yup.string().required('رمز عبور الزامی است'),
});

// ایجاد یک شناسه برای توست خطا
let toastId = null;

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toggleTheme, mode } = useContext(ThemeContext);
  const formRef = useRef(null);
  const [loginAttempted, setLoginAttempted] = useState(false);

  // استفاده از تم جاری برای ساخت تم Login
  const theme = createTheme({
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
    direction: 'rtl',
  });

  const showErrorToast = (message) => {
    // بستن هر توست خطای قبلی
    if (toastId) {
      toast.dismiss(toastId);
    }
    
    // ایجاد یک توست جدید با سبک ثابت
    toastId = toast.error(message, {
      position: "top-center",
      autoClose: false,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: false,
      progress: undefined,
      closeButton: true,
      theme: 'light',
      style: {
        fontFamily: '"Vazirmatn", "Roboto", "Helvetica", "Arial", sans-serif',
        fontWeight: 'normal',
        fontSize: '16px'
      }
    });
  };

  // اتصال به سوکت هنگام لود صفحه
  useEffect(() => {
    // حذف هر گونه شنونده رویداد قبلی برای جلوگیری از اعلان‌های تکراری
    socket.off('login_response');
    
    // گوش دادن به رویداد پاسخ ورود
    socket.on('login_response', (response) => {
      console.log('Received login response:', response);
      
      if (response.success) {
        // پردازش موفق
        console.log('Login successful:', response.data);
        
        // Save unreadChats before clearing sensitive data
        const unreadChats = localStorage.getItem('unreadChats');
        const tourCompleted = localStorage.getItem('tourCompleted');
        const themeMode = localStorage.getItem('themeMode');
        
        // پاک کردن داده‌های قبلی
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
        
        // ذخیره داده‌های کاربر
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('currentUserRole', response.data.user.role);
        localStorage.setItem('currentUserId', response.data.user.id);
        localStorage.setItem('currentUserName', response.data.user.name);
        localStorage.setItem('allowedDeviceTypes', JSON.stringify(response.data.user.allowedDeviceTypes || []));
        
        // تاخیر کوتاه قبل از هدایت برای اطمینان از ذخیره شدن داده‌ها
        setTimeout(() => {
          window.location.href = '/dashboard/users';
        }, 100);
      } else {
        // خطا در ورود
        showErrorToast(response.message);
      }
      
      setIsLoading(false);
    });

    // پاکسازی هنگام خروج از صفحه
    return () => {
      socket.off('login_response');
      // بستن هر توست فعال هنگام خروج از صفحه
      if (toastId) {
        toast.dismiss(toastId);
      }
    };
  }, []);

  // بهینه‌سازی ارتباط با سرور - استفاده از وب‌سوکت
  const loginUser = async (email, password) => {
    console.log('Sending login request via socket for:', email);
    
    // ارسال درخواست ورود از طریق سوکت
    socket.emit('login_request', { email, password });
    
    // فقط برای رزولو کردن Promise بدون هیچ اقدام دیگری
    return new Promise(resolve => setTimeout(resolve, 100));
  };

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      // جلوگیری از ارسال مجدد فرم
      if (isLoading) return;
      
      setIsLoading(true);
      setLoginAttempted(true);
      
      // بستن هر توست خطای قبلی
      if (toastId) {
        toast.dismiss(toastId);
        toastId = null;
      }
      
      // بررسی اعتبار ورودی‌ها
      if (!values.email || !values.password) {
        showErrorToast('لطفاً ایمیل و رمز عبور را وارد کنید');
        setIsLoading(false);
        setSubmitting(false);
        return;
      }
      
      try {
        await loginUser(values.email, values.password);
        // پاسخ از طریق رویداد login_response در useEffect پردازش می‌شود
        // با این تغییر دیگر نیازی به تنظیم isLoading و setSubmitting در اینجا نیست
        // چون در event listener انجام می‌شود
      } catch (error) {
        // خطای غیرمنتظره
        console.error('Unexpected error during login process:', error);
        showErrorToast('خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید');
        setIsLoading(false);
        setSubmitting(false);
      }
    },
  });

  // Handle form submission with preventDefault
  const handleFormSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!loginAttempted || !isLoading) {
      formik.handleSubmit();
    }
    
    return false;
  };

  return (
    <ThemeProvider theme={theme}>
      {/* Simple toast container with minimal styling */}
      <ToastContainer
        position="top-center"
        rtl={true}
        theme="light"
      />

      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh" 
        bgcolor={mode === 'dark' ? '#121212' : '#edf5f1'}
        sx={{
          backgroundImage: mode === 'dark' 
            ? 'linear-gradient(to bottom right, #121212, #1a2e25)' 
            : 'linear-gradient(to bottom right, #edf5f1, #d6e9df)',
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            width: 350, 
            borderRadius: 2,
            boxShadow: mode === 'dark' 
              ? '0 4px 20px rgba(0, 0, 0, 0.5)' 
              : '0 4px 20px rgba(51, 128, 92, 0.15)'
          }}
        >
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box display="flex" justifyContent="flex-end" width="100%" mb={1}>
              <IconButton onClick={toggleTheme} size="small">
                {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Box>
            <Box sx={{
              position: 'relative',
              width: 120,
              height: 120,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 2,
              '&::before': {
                content: '""',
                position: 'absolute',
                width: '140%',
                height: '140%',
                borderRadius: '50%',
                background: 'none',
                animation: 'none',
              },
            }}>
              <img 
                src={logo} 
                alt="بامداد روشن" 
                style={{ 
                  width: 120, 
                  height: 120, 
                  filter: mode === 'dark' ? 'brightness(0.9) contrast(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                  animation: 'none',
                  position: 'relative',
                  zIndex: 1,
                }} 
              />
            </Box>
            <Typography variant="h5" align="center" sx={{ color: mode === 'dark' ? '#5ba37f' : '#33805c', fontWeight: 'bold' }}>
              ورود به سامانه بامداد روشن
            </Typography>
          </Box>
          
          <form 
            ref={formRef} 
            onSubmit={handleFormSubmit} 
            noValidate
            action="#"
          >
            <TextField
              fullWidth
              id="email"
              name="email"
              label="ایمیل"
              margin="normal"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              dir="rtl"
              disabled={isLoading}
              sx={{
                '& .MuiInputBase-root': {
                  backgroundColor: mode === 'dark' ? '#424242' : '#f8fbf9',
                  borderRadius: 1,
                },
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: mode === 'dark' ? '#5ba37f' : '#33805c',
                  },
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? '#5ba37f' : '#33805c',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: mode === 'dark' ? '#5ba37f' : '#33805c',
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // نگهداری فوکوس در ورود رمز عبور اگر خالی است
                  if (!formik.values.email) {
                    return;
                  }
                  document.getElementById('password').focus();
                }
              }}
            />
            <TextField
              fullWidth
              id="password"
              name="password"
              label="رمز عبور"
              type="password"
              margin="normal"
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              dir="rtl"
              disabled={isLoading}
              sx={{
                '& .MuiInputBase-root': {
                  backgroundColor: mode === 'dark' ? '#424242' : '#f8fbf9',
                  borderRadius: 1,
                },
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: mode === 'dark' ? '#5ba37f' : '#33805c',
                  },
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'dark' ? '#5ba37f' : '#33805c',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: mode === 'dark' ? '#5ba37f' : '#33805c',
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFormSubmit();
                }
              }}
            />
            <Button 
              color="primary" 
              variant="contained" 
              fullWidth 
              type="button"
              onClick={handleFormSubmit}
              disabled={isLoading}
              sx={{ 
                mt: 3,
                mb: 2,
                py: 1.2,
                bgcolor: mode === 'dark' ? '#5ba37f' : '#33805c',
                '&:hover': {
                  bgcolor: mode === 'dark' ? '#4a8d68' : '#24573f'
                },
                borderRadius: 1,
                boxShadow: mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.5)' : '0 2px 8px rgba(51, 128, 92, 0.25)'
              }}
            >
              {isLoading ? 'در حال ورود...' : 'ورود'}
            </Button>
          </form>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default Login; 