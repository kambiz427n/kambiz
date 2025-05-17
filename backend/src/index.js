const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const deviceRoutes = require('./routes/device');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/ticket');
const reportsRoutes = require('./routes/reports');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const bcrypt = require('bcrypt');

dotenv.config();

// بررسی اینکه JWT_SECRET تنظیم شده باشد
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  console.error('Please create a .env file in the root of the project and add JWT_SECRET=your_secret_key');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// مدت زمان مجاز برای هر درخواست (60 ثانیه)
app.use((req, res, next) => {
  req.setTimeout(60000);
  next();
});

// Serve uploads statically
app.use('/uploads', express.static('uploads'));

// روت دستگاه‌ها
app.use('/api/devices', deviceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reports', reportsRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

// مدیریت نگاشت userId به socketId
const userSockets = new Map();
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // رویداد ثبت کاربر
  socket.on('register', (userId) => {
    userSockets.set(userId, socket.id);
    socket.on('disconnect', () => {
      userSockets.delete(userId);
    });
  });
  
  // رویداد درخواست ورود
  socket.on('login_request', async (data) => {
    console.log('Login request received via socket:', data.email);
    const { email, password } = data;
    
    try {
      // یافتن کاربر بر اساس ایمیل
      const user = await User.findOne({ email });
      
      // اگر کاربر وجود نداشت یا رمز عبور اشتباه بود
      if (!user || !(await bcrypt.compare(password, user.password))) {
        console.log('Invalid credentials for:', email);
        return socket.emit('login_response', {
          success: false,
          message: 'نام کاربری یا رمز عبور اشتباه است'
        });
      }
      
      // ایجاد توکن JWT
      const token = jwt.sign(
        { id: user._id, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log('Login successful for:', email);
      
      // ارسال پاسخ موفق به کاربر
      socket.emit('login_response', {
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            allowedDeviceTypes: user.allowedDeviceTypes || []
          }
        }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      socket.emit('login_response', {
        success: false,
        message: 'خطای سرور رخ داد. لطفاً دوباره تلاش کنید'
      });
    }
  });
});
app.set('userSockets', userSockets);

// اتصال به دیتابیس
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');
  // اجرای سرور
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch((err) => {
  console.error('DB connection error:', err);
}); 