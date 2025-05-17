import React, { useState, useEffect, useContext } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, AppBar, Typography, CssBaseline, IconButton } from '@mui/material';
import { People, Devices, Assignment, Logout, Assessment, Brightness4, Brightness7 } from '@mui/icons-material';
import Badge from '@mui/material/Badge';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import Joyride from 'react-joyride';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import logo from '../assets/images/bamdad.png';
import '../App.css';
import { ThemeContext } from '../App';

const menuItems = [
  { text: 'کاربران', icon: <People />, path: '/dashboard/users' },
  { text: 'دستگاه‌ها', icon: <Devices />, path: '/dashboard/devices' },
  { text: 'تیکت‌ها', icon: <Assignment />, path: '/dashboard/tickets' },
];

// Backend URL for socket connection
const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const drawerWidth = 220;

// Steps for onboarding tour
const steps = [
  { target: '#users', content: 'با این منو می‌توانید کاربران را مدیریت کنید.' },
  { target: '#devices', content: 'در اینجا می‌توانید دستگاه‌ها را مشاهده و ویرایش کنید.' },
  { target: '#tickets', content: 'از این قسمت تیکت‌ها را می‌بینید و ثبت می‌کنید.' },
  { target: '#reports', content: 'در این بخش گزارشات سیستم را مشاهده می‌کنید.' }
];

// Create a custom theme matching the logo's green color
const theme = createTheme({
  palette: {
    primary: {
      main: '#33805c', // رنگ سبز جدید - RGB(51, 128, 92)
      light: '#5ba37f', // نسخه روشن‌تر
      dark: '#24573f', // نسخه تیره‌تر
    },
    secondary: {
      main: '#f5f5f5',
    },
    background: {
      default: '#f8fbf9',
      paper: '#ffffff',
    }
  },
  typography: {
    fontFamily: '"Vazirmatn", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px rgba(51, 128, 92, 0.15)',
          backgroundColor: '#33805c',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: '0 2px 8px rgba(51, 128, 92, 0.25)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(51, 128, 92, 0.3)',
            backgroundColor: '#24573f',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderLeft: '1px solid rgba(51, 128, 92, 0.1)',
        },
      },
    },
  },
  direction: 'rtl',
});

const Dashboard = () => {
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const navigate = useNavigate();
  const userName = localStorage.getItem('currentUserName');
  const userRole = localStorage.getItem('currentUserRole');
  const currentUserId = localStorage.getItem('currentUserId');
  const allowedDeviceTypes = JSON.parse(localStorage.getItem('allowedDeviceTypes') || '[]');
  const { toggleTheme, mode } = useContext(ThemeContext);
  const roleLabels = {
    superadmin: 'سوپرمدیر',
    admin: 'مدیر',
    expert: 'کارشناس',
    agent: 'نماینده',
    acceptor: 'پذیرنده',
  };

  // Start tour on first visit
  useEffect(() => {
    if (!localStorage.getItem('tourCompleted')) {
      setRunTour(true);
    }
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if (['finished', 'skipped'].includes(status)) {
      setRunTour(false);
      localStorage.setItem('tourCompleted', 'true');
    }
  };

  const handleLogout = () => {
    // Save unreadChats and tour status before logout
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
    navigate('/');
  };

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Fetch initial count of new tickets and subscribe to updates
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await axios.get('/api/tickets');
        const tickets = res.data;
        let visible = [];
        if (userRole === 'superadmin' || userRole === 'admin') {
          visible = tickets;
        } else if (["acceptor", "agent"].includes(userRole)) {
          visible = tickets.filter(t => t.creator && t.creator._id === currentUserId);
        } else if (userRole === 'expert') {
          visible = tickets.filter(t => {
            const creatorAllowed = t.creator?.allowedDeviceTypes || [];
            return creatorAllowed.some(type => allowedDeviceTypes.includes(type));
          });
        }
        const count = visible.filter(t => t.status === 'new').length;
        setNewTicketsCount(count);
      } catch (err) {
        console.error('Error fetching tickets count:', err);
      }
    };
    fetchCount();
    const socket = io(backendUrl);
    socket.on('new-ticket', ticket => fetchCount());
    socket.on('status-changed', ticket => fetchCount());
    return () => socket.disconnect();
  }, []);

  return (
    <ThemeProvider theme={muiTheme}>
      <>
        <Joyride
          steps={steps}
          run={runTour}
          continuous
          showSkipButton
          callback={handleJoyrideCallback}
          styles={{ options: { zIndex: 1400 } }}
        />
        <Box sx={{ display: 'flex', direction: 'rtl' }}>
          <CssBaseline />
          <AppBar position="fixed" sx={{ zIndex: 1201 }}>
            <Toolbar>
              <img 
                src={logo} 
                alt="بامداد روشن" 
                style={{ 
                  height: 50, 
                  width: 'auto',
                  marginRight: 16
                }} 
              />
              {isMobile && (
                <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' } }}>
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }} className="dashboard-title">
                داشبورد مدیریتی  
              </Typography>
              {userName && (
                <Typography variant="subtitle1" sx={{ mx: 2 }} className="user-info">
                  {userName} ({roleLabels[userRole] || userRole})
                </Typography>
              )}
              <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
                {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
              <Logout sx={{ cursor: 'pointer', ml: 2 }} onClick={handleLogout} />
            </Toolbar>
          </AppBar>
          <Drawer
            variant={isMobile ? 'temporary' : 'permanent'}
            open={isMobile ? mobileOpen : true}
            onClose={handleDrawerToggle}
            anchor="right"
            ModalProps={{ keepMounted: true }}
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: { xs: '80%', sm: drawerWidth },
                boxSizing: 'border-box',
                right: 0,
                left: 'unset',
                direction: 'rtl'
              },
            }}
          >
            {isMobile && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', p: 1 }}>
                <IconButton onClick={handleDrawerToggle}>
                  <CloseIcon />
                </IconButton>
              </Box>
            )}
            <Toolbar />
            <Box sx={{ overflow: 'auto' }}>
              <List>
                {menuItems.map((item) => {
                  const id = item.path.split('/').pop();
                  return (
                    <ListItem button id={id} key={item.text} component={Link} to={item.path}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {item.path === '/dashboard/tickets' ? (
                          <Badge badgeContent={newTicketsCount} color="error">
                            {item.icon}
                          </Badge>
                        ) : item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.text} className="menu-item-text" />
                    </ListItem>
                  );
                })}
                {['admin', 'superadmin'].includes(userRole) && (
                  <ListItem button id="reports" component={Link} to="/dashboard/reports">
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Assessment />
                    </ListItemIcon>
                    <ListItemText primary="گزارشات" className="menu-item-text" />
                  </ListItem>
                )}
              </List>
            </Box>
          </Drawer>
          <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, bgcolor: 'secondary.main', minHeight: '100vh' }}>
            <Toolbar />
            <Outlet />
          </Box>
        </Box>
      </>
    </ThemeProvider>
  );
};

export default Dashboard; 