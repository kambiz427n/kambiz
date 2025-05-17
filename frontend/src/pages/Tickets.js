import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, MenuItem, Select, FormControl, InputLabel, Menu, FormLabel
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import { Edit, Chat, ChatBubble, MoreVert, Close as CloseIcon } from '@mui/icons-material';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';
import { LocalizationProvider } from '@mui/x-date-pickers';
import JalaliAdapter from '@date-io/jalaali';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import fa from 'date-fns/locale/fa-IR';
import moment from 'moment';
import jMoment from 'moment-jalaali';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import Tooltip from '@mui/material/Tooltip';

const errorTypes = [
  ...Array.from({ length: 99 }, (_, i) => ({ value: `error${i + 1}`, label: `خطای ${i + 1}` })),
  { value: 'manual', label: 'سایر/دستی' },
];

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    device: '',
    errorType: '',
    description: '',
    file: null,
    manualErrorType: '',
    tags: [],
  });
  const [formError, setFormError] = useState('');
  const [replyDialog, setReplyDialog] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyTicketId, setReplyTicketId] = useState(null);
  const [replyTicketDeviceType, setReplyTicketDeviceType] = useState('');
  const [manualDevice, setManualDevice] = useState('');
  const [newTicketId, setNewTicketId] = useState(null);
  const socketRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTicket, setChatTicket] = useState(null);
  const [unreadChats, setUnreadChats] = useState(() => {
    const savedUnreadChats = localStorage.getItem('unreadChats');
    return savedUnreadChats ? JSON.parse(savedUnreadChats) : {};
  });
  const chatBoxRef = useRef(null);
  const [selectedStatus, setSelectedStatus] = useState('answered');
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuTicketId, setMenuTicketId] = useState(null);
  const [deviceIdDisplayMode, setDeviceIdDisplayMode] = useState('terminal');
  const [showPieChart, setShowPieChart] = useState(false);
  const [showTagsTooltip, setShowTagsTooltip] = useState(false);
  const [filters, setFilters] = useState({
    device: '',
    errorType: '',
    description: '',
    creator: '',
    reply: '',
    status: '',
    tags: '',
    startDate: null,
    endDate: null
  });
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const currentUserRole = localStorage.getItem('currentUserRole');
  const currentUserId = localStorage.getItem('currentUserId');
  const allowedDeviceTypes = JSON.parse(localStorage.getItem('allowedDeviceTypes') || '[]');

  // Get the current user's name directly from localStorage (set during login)
  const userNameFromLocalStorage = localStorage.getItem('currentUserName');

  const fetchDevices = async () => {
    const res = await axios.get('/api/devices');
    setDevices(res.data);
  };

  const fetchTickets = async () => {
    const res = await axios.get('/api/tickets');
    setTickets(res.data);
    
    const unreadState = { ...unreadChats };
    res.data.forEach(ticket => {
      if (!unreadState.hasOwnProperty(ticket._id)) {
        if (ticket.replies && ticket.replies.length > 0) {
          unreadState[ticket._id] = true;
        }
      }
    });
    
    setUnreadChats(unreadState);
  };

  useEffect(() => {
    fetchDevices();
    fetchTickets();
    socketRef.current = io(backendUrl);
    const userId = localStorage.getItem('currentUserId');
    if (userId) {
      socketRef.current.emit('register', userId);
    }
    socketRef.current.on('new-ticket', (ticket) => {
      toast.info('تیکت جدید ثبت شد!', { position: 'top-right', autoClose: 3000 });
      setTickets(prev => [ticket, ...prev]);
      setNewTicketId(ticket._id);
      setTimeout(() => setNewTicketId(null), 5000);
      
      if (ticket.replies && ticket.replies.length > 0) {
        setUnreadChats(prev => ({ ...prev, [ticket._id]: true }));
      }
    });
    socketRef.current.on('reply-ticket', (ticket) => {
      setTickets(prev => prev.map(t => t._id === ticket._id ? ticket : t));
      toast.info('پاسخ جدید برای یک تیکت ثبت شد!', { position: 'top-right', autoClose: 3000 });
    });
    socketRef.current.on('confirm-ticket', (ticket) => {
      setTickets(prev => prev.map(t => t._id === ticket._id ? ticket : t));
      toast.success('تیکت تایید شد و مشکل رفع شده!', { position: 'top-right', autoClose: 3000 });
    });
    socketRef.current.on('ticket-reply', (ticket) => {
      setTickets(prev => prev.map(t => t._id === ticket._id ? ticket : t));
      setChatTicket(prev => (prev && prev._id === ticket._id ? ticket : prev));
      
      setUnreadChats(prev => {
        if (!chatOpen || (chatTicket && chatTicket._id !== ticket._id)) {
          return { ...prev, [ticket._id]: true };
        }
        return prev;
      });
    });
    socketRef.current.on('status-changed', (ticket) => {
      setTickets(prev => prev.map(t => t._id === ticket._id ? ticket : t));
      setChatTicket(prev => (prev && prev._id === ticket._id ? ticket : prev));
    });
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (chatOpen && chatTicket) {
      setUnreadChats(prev => ({ ...prev, [chatTicket._id]: false }));
    }
  }, [chatOpen, chatTicket]);

  useEffect(() => {
    if (chatOpen && chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatTicket, chatOpen]);

  useEffect(() => {
    localStorage.setItem('unreadChats', JSON.stringify(unreadChats));
  }, [unreadChats]);

  useEffect(() => {
    jMoment.loadPersian({
      persian: {
        months: [
          'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 
          'مرداد', 'شهریور', 'مهر', 'آبان', 
          'آذر', 'دی', 'بهمن', 'اسفند'
        ],
        monthsShort: [
          'فرو', 'ارد', 'خرد', 'تیر', 
          'مرد', 'شهر', 'مهر', 'آبا', 
          'آذر', 'دی', 'بهم', 'اسف'
        ],
        weekdays: [
          'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 
          'پنج‌شنبه', 'جمعه', 'شنبه'
        ],
        weekdaysShort: [
          'یک', 'دو', 'سه', 'چهار', 
          'پنج', 'جمعه', 'شنبه'
        ],
        weekdaysMin: [
          'ی', 'د', 'س', 'چ', 
          'پ', 'ج', 'ش'
        ]
      }
    });
  }, []);

  const filterTickets = (tickets) => {
    return tickets.filter(ticket => {
      if (filters.device && 
          !(
            (ticket.device && 
              ((ticket.device.identifier?.serial && ticket.device.identifier.serial.toLowerCase().includes(filters.device.toLowerCase())) || 
              (ticket.device.identifier?.terminal && ticket.device.identifier.terminal.toLowerCase().includes(filters.device.toLowerCase())) || 
              (ticket.device.model && ticket.device.model.toLowerCase().includes(filters.device.toLowerCase())))) ||
            (ticket.manualDevice && ticket.manualDevice.toLowerCase().includes(filters.device.toLowerCase()))
          )) {
        return false;
      }
      
      if (filters.errorType && 
          !(errorTypes.find(et => et.value === ticket.errorType)?.label.toLowerCase().includes(filters.errorType.toLowerCase()) ||
            (ticket.manualErrorType && ticket.manualErrorType.toLowerCase().includes(filters.errorType.toLowerCase())))) {
        return false;
      }
      
      if (filters.description && 
          !(ticket.description && ticket.description.toLowerCase().includes(filters.description.toLowerCase()))) {
        return false;
      }
      
      if (filters.creator && 
          !(ticket.creator?.name && ticket.creator.name.toLowerCase().includes(filters.creator.toLowerCase()))) {
        return false;
      }
      
      if (filters.reply && 
          !(ticket.reply && ticket.reply.toLowerCase().includes(filters.reply.toLowerCase()))) {
        return false;
      }
      
      if (filters.status) {
        const statusMap = {
          'new': 'جدید',
          'pending': 'در حال بررسی',
          'answered': 'پاسخ داده شده',
          'resolved': 'برطرف شد',
          'confirmed': 'تایید شده',
          'rejected': 'رد شده'
        };
        const statusText = statusMap[ticket.status] || ticket.status;
        
        if (!statusText.toLowerCase().includes(filters.status.toLowerCase())) {
          return false;
        }
      }
      
      if (ticket.updatedAt) {
        const ticketDate = new Date(ticket.updatedAt);
        if (filters.startDate && ticketDate < filters.startDate._d) {
          return false;
        }
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate._d);
          endOfDay.setHours(23, 59, 59, 999);
          if (ticketDate > endOfDay) {
            return false;
          }
        }
      }
      
      if (filters.tags && !(ticket.tags && ticket.tags.some(tag =>
        tag.toLowerCase().includes(filters.tags.toLowerCase())
      ))) {
        return false;
      }
      
      return true;
    });
  };

  let visibleTickets = filterTickets(tickets);
  if (currentUserRole === 'superadmin') {
    visibleTickets = filterTickets(tickets);
  } else if (["acceptor", "agent"].includes(currentUserRole)) {
    visibleTickets = filterTickets(tickets.filter(t => t.creator && t.creator._id === currentUserId));
  } else if (currentUserRole === "expert") {
    visibleTickets = filterTickets(tickets.filter(t => {
      const creatorAllowed = t.creator?.allowedDeviceTypes || [];
      return creatorAllowed.some(type => allowedDeviceTypes.includes(type));
    }));
  }

  let devicesForTicketForm = devices;

  // اگر کاربر، پذیرنده باشد، فقط دستگاه‌های مربوط به خودش را ببیند
  if (currentUserRole === 'acceptor' && userNameFromLocalStorage) {
    devicesForTicketForm = devices.filter(
      device => device.merchant && 
      typeof device.merchant === 'string' && 
      device.merchant.toLowerCase() === userNameFromLocalStorage.toLowerCase()
    );
  } else if (currentUserRole === 'agent') {
    devicesForTicketForm = devices.filter(device => 
      device.type && allowedDeviceTypes.includes(device.type)
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submission started');
    
    // اگر در حال بارگذاری هستیم، از ارسال فرم جلوگیری کن
    if (loadingSubmit) {
      console.log('Submission already in progress, ignoring');
      return;
    }
    
    // بررسی اعتبار فرم
    let isValid = true;
    let errors = {};
    
    if (!form.device && !manualDevice) {
      errors.device = 'لطفاً یک دستگاه انتخاب کنید یا مشخصات آن را وارد کنید';
      isValid = false;
    }
    
    if (form.device === 'manual' && !manualDevice) {
      errors.manualDevice = 'لطفاً مشخصات دستگاه را وارد کنید';
      isValid = false;
    }
    
    if (!form.errorType) {
      errors.errorType = 'لطفاً نوع خطا را انتخاب کنید';
      isValid = false;
    }
    
    if (form.errorType === 'manual' && !form.manualErrorType) {
      errors.manualErrorType = 'لطفاً نوع خطا را وارد کنید';
      isValid = false;
    }
    
    if (!form.description) {
      errors.description = 'لطفاً توضیحات را وارد کنید';
      isValid = false;
    }
    
    if (!isValid) {
      console.log('Form validation failed:', errors);
      setFormError(errors);
      return;
    }
    
    console.log('Form validation passed, proceeding with submission');
    
    // نمایش اینکه ارسال در حال انجام است
    setLoadingSubmit(true);
    setFormError('');
    
    try {
      // استفاده از یک فرم‌دیتا جدید برای ارسال با multipart/form-data
      const formData = new FormData();
      
      console.log('Creating form data for submission');
      
      // افزودن فیلدهای اصلی
      if (form.device && form.device !== 'manual') {
        formData.append('device', form.device);
        console.log(`Added device: ${form.device}`);
      }
      
      if (form.device === 'manual' && manualDevice) {
        formData.append('manualDevice', manualDevice);
        console.log(`Added manualDevice: ${manualDevice}`);
      }
      
      // افزودن نوع خطا
      formData.append('errorType', form.errorType);
      console.log(`Added errorType: ${form.errorType}`);
      
      // اگر نوع خطا دستی است، نوع خطای دستی را هم اضافه کن
      if (form.errorType === 'manual' && form.manualErrorType) {
        formData.append('manualErrorType', form.manualErrorType);
        console.log(`Added manualErrorType: ${form.manualErrorType}`);
      }
      
      // افزودن توضیحات
      formData.append('description', form.description);
      console.log(`Added description: ${form.description}`);
      
      // اطمینان از آرایه بودن tags و تبدیل آن به JSON
      let tagsToSend = Array.isArray(form.tags) ? form.tags : [];
      formData.append('tags', JSON.stringify(tagsToSend));
      console.log(`Added tags: ${JSON.stringify(tagsToSend)}`);
      
      // افزودن فایل (اگر موجود باشد)
      if (form.file instanceof File) {
        formData.append('file', form.file);
        console.log(`Added file: ${form.file.name} (${form.file.size} bytes, ${form.file.type})`);
      } else {
        console.log('No file attached');
      }
      
      // ارسال درخواست
      console.log('Sending form data to server...');
      console.log('Form data entries:', [...formData.entries()].map(pair => 
        pair[0] === 'file' && pair[1] instanceof File 
          ? `${pair[0]}: [File: ${pair[1].name}, ${pair[1].type}, ${pair[1].size} bytes]` 
          : `${pair[0]}: ${pair[1]}`
      ));
      
      // استفاده از API Fetch به جای Axios برای اطمینان بیشتر از ارسال به صورت multipart/form-data
      const response = await fetch('/api/tickets', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
        // توجه: عمداً هدر Content-Type تنظیم نشده است تا به صورت خودکار با boundary مناسب تنظیم شود
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در ارسال درخواست');
      }
      
      const data = await response.json();
      console.log('Ticket created successfully:', data);
      
      // به‌روزرسانی لیست تیکت‌ها
      fetchTickets();
      
      // نمایش پیام موفقیت
      toast.success('تیکت با موفقیت ثبت شد');
      
      // بستن مدال و پاک کردن فرم
      setOpen(false);
      setForm({ device: '', errorType: '', description: '', file: null, manualErrorType: '', tags: [] });
      setManualDevice('');
      
    } catch (err) {
      console.error('Error submitting ticket:', err);
      const errorMessage = err.message || 'خطا در ثبت تیکت';
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingSubmit(false);
      console.log('Form submission process completed');
    }
  };

  const handleReply = async () => {
    try {
      await axios.post(`/api/tickets/${replyTicketId}/reply`, { reply: replyText });
      fetchTickets();
      setReplyDialog(false);
      setReplyText('');
      setReplyTicketId(null);
    } catch (err) {
      alert('خطا در ثبت پاسخ');
    }
  };

  const handleConfirmTicket = async (ticketId) => {
    try {
      await axios.post(`/api/tickets/${ticketId}/confirm`);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در تایید تیکت');
    }
  };

  const handleSendReply = async (ticketId, message, file, resetForm) => {
    try {
      const formData = new FormData();
      
      if (message) {
        formData.append('message', message);
      }
      
      if (file instanceof File) {
        console.log('Appending reply file:', file.name, file.type, file.size);
        formData.append('file', file);
      } else {
        console.log('No file to append to reply:', file);
      }
      
      // نمایش محتوای FormData برای دیباگ
      console.log('Reply FormData entries:');
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1] instanceof File ? `[File: ${pair[1].name}, ${pair[1].type}, ${pair[1].size} bytes]` : pair[1]);
      }
      
      // استفاده از fetch به جای axios برای اطمینان بیشتر از ارسال صحیح فایل
      const response = await fetch(`/api/tickets/${ticketId}/add-reply`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
        // توجه: هدر Content-Type عمداً تنظیم نشده تا مرورگر به صورت خودکار با boundary مناسب تنظیم کند
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در ارسال پاسخ');
      }
      
      const data = await response.json();
      console.log('Reply sent successfully:', data);
      
      // بروزرسانی تیکت‌ها
      await fetchTickets();
      
      // خالی کردن فرم پس از ارسال موفق
      resetForm();
      
      // نمایش پیام موفقیت
      toast.success('پیام با موفقیت ارسال شد');
      
    } catch (err) {
      console.error('Error sending reply:', err);
      const errorMessage = err.response?.data?.error || err.message || 'خطا در ارسال پیام';
      toast.error(errorMessage);
    }
  };

  const handleMenuOpen = (event, ticketId) => {
    setAnchorEl(event.currentTarget);
    setMenuTicketId(ticketId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTicketId(null);
  };

  const fetchChatHistory = async (ticketId) => {
    try {
      const res = await axios.get('/api/tickets');
      const tickets = res.data;
      const ticket = tickets.find(t => t._id === ticketId);
      
      if (ticket) {
        setChatTicket(ticket);
      } else {
        toast.error('تیکت مورد نظر یافت نشد');
      }
    } catch (err) {
      toast.error('خطا در بارگذاری تاریخچه چت');
    }
  };

  const handleChatIconClick = (ticketId) => {
    setChatOpen(true);
    fetchChatHistory(ticketId);
    setUnreadChats(prev => ({ ...prev, [ticketId]: false }));
  };

  // استخراج همه وضعیت‌های موجود در تیکت‌ها
  const allStatuses = Array.from(new Set(visibleTickets.map(t => t.status)));

  // تعریف رنگ برای هر وضعیت
  const statusColorMap = {
    'new': '#ffb3ba', // قرمز ملایم
    'pending': '#ffe082', // زرد کم‌رنگ
    'answered': '#90caf9', // آبی ملایم
    'resolved': '#a5d6a7', // سبز ملایم
    'confirmed': '#388e3c', // سبز پررنگ
    'rejected': '#ef9a9a', // قرمز کم‌رنگ
    'اعزام پول رسان': '#bcaaa4', // قهوه‌ای ملایم
    'نیاز به تعمیر': '#ffb74d', // نارنجی ملایم
    'نیاز به رول': '#ce93d8', // بنفش ملایم
    'نیاز به پول رسانی': '#a1887f', // قهوه‌ای روشن و خوانا
  };

  const statusNameMap = {
    new: 'جدید',
    pending: 'در حال بررسی',
    answered: 'پاسخ داده شده',
    resolved: 'برطرف شد',
    confirmed: 'تایید شده',
    rejected: 'رد شده',
    'اعزام پول رسان': 'اعزام پول رسان',
    'نیاز به تعمیر': 'نیاز به تعمیر',
    'نیاز به رول': 'نیاز به رول',
    'نیاز به پول رسانی': 'نیاز به پول رسانی',
  };

  const statusData = allStatuses.map(status => ({
    name: statusNameMap[status] || status,
    value: visibleTickets.filter(t => t.status === status).length
  }));
  const statusColors = allStatuses.map(status => statusColorMap[status] || '#e0e0e0');

  const exportToExcel = () => {
    // تبدیل داده‌ها به فرمت مناسب برای اکسل با شکستن متن‌های طولانی و اعمال فرمت‌های لازم
    const excelData = visibleTickets.map(t => {
      // کارکرد برای شکستن متن‌های طولانی به چند خط
      const wrapText = (text, maxLength = 30) => {
        if (!text || typeof text !== 'string' || text.length <= maxLength) return text;
        
        const lines = [];
        let remainingText = text;
        
        while (remainingText.length > 0) {
            let breakPoint = maxLength;
            
            // تلاش برای شکستن در فضای خالی نزدیک
            let foundBreakPoint = -1;
            for(let i = Math.min(maxLength, remainingText.length - 1); i >= 0; i--){
                if (remainingText.charAt(i) === ' ' || remainingText.charAt(i) === '.' || remainingText.charAt(i) === '،'){
                    foundBreakPoint = i;
                    break;
                }
            }

            if (foundBreakPoint !== -1) {
                breakPoint = foundBreakPoint + 1;
            } else if (remainingText.length > maxLength) { // اگر نقطه شکست مناسبی نبود و متن طولانی‌تر از حداکثر طول بود، به زور بشکنیم
                 breakPoint = maxLength;
            } else { // اگر متن باقی‌مانده کوتاهتر از حداکثر طول بود
                 breakPoint = remainingText.length;
            }

            if (breakPoint <= 0) breakPoint = 1; // اطمینان از حداقل یک کاراکتر برای جلوگیری از حلقه بی‌نهایت

            lines.push(remainingText.substring(0, breakPoint).trim());
            remainingText = remainingText.substring(breakPoint).trim();
        }

        return lines.join('\n');
      };
      
      // مشخصات دستگاه
      const deviceInfo = t.device
        ? `${t.device.model || ''}${t.device.identifier?.serial ? ' | سریال: ' + t.device.identifier.serial : ''}${t.device.identifier?.terminal ? ' | ترمینال: ' + t.device.identifier.terminal : ''}`
        : (t.manualDevice || '-');
        
      // نوع خطا
      const errorTypeInfo = t.errorType === 'manual' ? t.manualErrorType : errorTypes.find(et => et.value === t.errorType)?.label;
      
      // توضیحات با شکستن متن طولانی و حذف [[MANUAL_ERROR_TYPE:...]
      let descriptionText = '';
      if (t.description) { // اطمینان از وجود توضیحات
        descriptionText = t.description.replace(/\\[\\[MANUAL_ERROR_TYPE:.*?\]\\]\\n\\n?/g, '').trim(); // حذف regex با global flag و optional newline
      } else {
        descriptionText = '-'; // اگر توضیحات خالی بود
      }
      
      // برچسب‌ها
      const tagsText = Array.isArray(t.tags)
        ? (t.tags.length > 0 ? t.tags.join(', ') : '-')
        : (typeof t.tags === 'string' && t.tags.trim() !== ''
            ? (() => { try { const arr = JSON.parse(t.tags); return Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : '-'; } catch { return '-'; } })()
            : '-');
      
      // وضعیت فارسی
      const statusText = statusNameMap[t.status] || t.status || '-';

      return {
        'دستگاه': wrapText(deviceInfo, 30),
        'نوع خطا': wrapText(errorTypeInfo, 25),
        'توضیحات': wrapText(descriptionText, 40),
        'فایل': t.file ? (t.file.startsWith('http') ? t.file : backendUrl + t.file) : '-',
        'ثبت‌کننده': t.creator?.name || '-',
        'پاسخ': wrapText(t.reply || '-', 30),
        'وضعیت': statusText,
        'برچسب‌ها': wrapText(tagsText, 25),
        'آخرین به‌روزرسانی': t.updatedAt ? new Date(t.updatedAt).toLocaleString('fa-IR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }) : '-',
      };
    });

    // ایجاد worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // تنظیم عرض ستون‌ها برای بهترین تناسب با محتوا
    const columnWidths = [
      { wch: 30 }, // دستگاه
      { wch: 25 }, // نوع خطا
      { wch: 40 }, // توضیحات
      { wch: 20 }, // فایل
      { wch: 20 }, // ثبت‌کننده
      { wch: 30 }, // پاسخ
      { wch: 15 }, // وضعیت
      { wch: 25 }, // برچسب‌ها
      { wch: 20 }, // آخرین به‌روزرسانی
    ];
    
    // اعمال عرض ستون‌ها
    ws['!cols'] = columnWidths;
    
    // اعمال استایل به هدر
    const headerRow = 0;
    for (let C = 0; C < columnWidths.length; C++) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: headerRow });
        if (!ws[cell_address]) continue;
        ws[cell_address].s = {
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
            fill: { patternType: 'solid', fgColor: { rgb: "4F81BD" } }, // آبی تیره
            border: {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            }
        };
        // برای نمایش صحیح متن به عنوان رشته
         ws[cell_address].t = 's';
      }

    // اعمال استایل به بقیه داده‌ها
    for (let R = 1; R <= excelData.length; R++) { // شروع از ردیف 1 (بعد از هدر)
      for (let C = 0; C < columnWidths.length; C++) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cell_address]) continue;
        
        ws[cell_address].s = {
          alignment: { 
            vertical: 'center', 
            horizontal: 'center',
            wrapText: true
          },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          },
          font: { 
            sz: 10 
          } // اندازه فونت پیش فرض کمتر
        };
        
        // استایل رنگی برای ردیف‌های زوج و فرد
        if (R % 2 === 1) { // ردیف‌های داده فرد
          ws[cell_address].s.fill = {
            patternType: 'solid',
            fgColor: { rgb: "EBF1DE" }, // سبز روشن
          };
        } else { // ردیف‌های داده زوج
          ws[cell_address].s.fill = {
            patternType: 'solid',
            fgColor: { rgb: "F2F2F2" }, // خاکستری روشن
          };
        }
        // برای نمایش صحیح متن به عنوان رشته
         ws[cell_address].t = 's';
      }
    }

    const wb = XLSX.utils.book_new();
    // تنظیم مشخصات workbook
    wb.Props = {
      Title: "گزارش تیکت‌ها",
      Subject: "تیکت‌ها",
      Author: "سیستم مدیریت تیکت",
      CreatedDate: new Date()
    };
    
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    
    // تنظیم شیوه نمایش فایل
    wb.Workbook = {
      Views: [
        { RTL: true } // تنظیم جهت فایل اکسل از راست به چپ
      ]
    };
    
    XLSX.writeFile(wb, 'tickets.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['دستگاه', 'نوع خطا', 'توضیحات', 'وضعیت', 'ثبت‌کننده', 'تاریخ']],
      body: visibleTickets.map(t => [
        t.device
          ? `${t.device.model || ''}${t.device.identifier?.serial ? ' | سریال: ' + t.device.identifier.serial : ''}${t.device.identifier?.terminal ? ' | ترمینال: ' + t.device.identifier.terminal : ''}`
          : (t.manualDevice || '-'),
        t.errorType === 'manual' ? t.manualErrorType : errorTypes.find(et => et.value === t.errorType)?.label,
        t.description,
        t.status,
        t.creator?.name,
        t.updatedAt ? new Date(t.updatedAt).toLocaleString('fa-IR') : '-',
      ])
    });
    doc.save('tickets.pdf');
  };

  return (
    <Box p={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {['acceptor', 'agent'].includes(currentUserRole) && (
          <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
            ثبت تیکت جدید
          </Button>
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            onClick={() => setShowPieChart(true)}
          >
            نمودار
          </Button>
          <Button variant="outlined" onClick={exportToExcel}>خروجی اکسل</Button>
          <Button variant="outlined" onClick={exportToPDF}>خروجی PDF</Button>
        </Box>
      </Box>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>ثبت تیکت جدید</DialogTitle>
        <DialogContent>
          {formError && <Typography color="error" mb={1}>{formError}</Typography>}

          {/* هشدار برای اطمینان از استفاده از فرم‌دیتا */}
     

          <Box component="form" id="new-ticket-form" encType="multipart/form-data" onSubmit={handleSubmit}>
            <TextField select fullWidth margin="dense" label="دستگاه (اختیاری)" value={form.device} onChange={e => { setForm(f => ({ ...f, device: e.target.value })); if (e.target.value !== 'manual') setManualDevice(''); }} SelectProps={{ native: true }}>
              <option value="">بدون دستگاه</option>
              {devicesForTicketForm.map(d => <option key={d._id} value={d._id}>{(d.identifier?.serial && d.identifier?.terminal)
                ? `${d.identifier.serial} | ${d.identifier.terminal}`
                : (d.identifier?.serial || d.identifier?.terminal || '-')
              } - {d.model}</option>)}
              <option value="manual">وارد کردن دستی</option>
            </TextField>
            {form.device === 'manual' && (
              <TextField fullWidth margin="dense" label="شماره سریال یا شناسه دستگاه" value={manualDevice} onChange={e => setManualDevice(e.target.value)} required />
            )}
            <TextField select fullWidth margin="dense" label="نوع خطا" value={form.errorType} onChange={e => setForm(f => ({ ...f, errorType: e.target.value }))} SelectProps={{ native: true }} required>
              <option value=""></option>
              {errorTypes.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
            </TextField>
            {form.errorType === 'manual' && (
              <TextField fullWidth margin="dense" label="نوع خطا (دستی)" value={form.manualErrorType} onChange={e => setForm(f => ({ ...f, manualErrorType: e.target.value }))} required />
            )}
            <TextField fullWidth margin="dense" label="توضیحات" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} multiline rows={3} required />
            
            <Box 
              sx={{ 
                position: 'relative',
                "&:hover": {
                  "& .tags-tooltip": {
                    display: "block"
                  }
                }
              }}
            >
              <Box
                className="tags-tooltip"
                sx={{
                  display: 'none',
                  position: 'absolute',
                  top: '-35px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: '#e3f2fd',
                  color: '#1976d2',
                  border: '1px solid #90caf9',
                  borderRadius: 1,
                  p: 0.8,
                  zIndex: 1000,
                  maxWidth: '260px',
                  fontSize: '0.7rem',
                  textAlign: 'center',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  '&:after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    border: '3px solid transparent',
                    borderTopColor: '#e3f2fd',
                    borderBottomWidth: 0
                  }
                }}
              >
                برای درج برچسب، Enter را بزنید و برای حذف، از ضربدر استفاده کنید
              </Box>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={form.tags}
                onChange={(event, newValue) => setForm(f => ({ ...f, tags: newValue }))}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    margin="dense"
                    label="برچسب‌ها"
                    placeholder="افزودن برچسب"
                    fullWidth
                  />
                )}
              />
            </Box>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormLabel>فایل پیوست</FormLabel>
              <Box>
                <input 
                  type="file" 
                  name="file"
                  id="ticket-file-upload"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const selectedFile = e.target.files?.[0] || null;
                    console.log('Selected file for ticket:', selectedFile);
                    console.log('File type:', selectedFile?.type);
                    console.log('File size:', selectedFile?.size);
                    setForm(f => ({ ...f, file: selectedFile }));
                  }} 
                  accept="image/*, application/pdf, .doc, .docx, .xls, .xlsx, .txt" 
                />
                <label htmlFor="ticket-file-upload">
                  <Button variant="outlined" component="span" size="small">
                    {form.file ? 'تغییر فایل' : 'انتخاب فایل'}
                  </Button>
                </label>
                
                {form.file && (
                  <Box sx={{ mt: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="primary">
                        فایل انتخاب شده: {form.file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        حجم: {Math.round(form.file.size / 1024)} کیلوبایت | نوع: {form.file.type || 'نامشخص'}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setForm(f => ({ ...f, file: null }))}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button 
            type="submit" 
            form="new-ticket-form" 
            variant="contained" 
            color="primary" 
            disabled={loadingSubmit}
          >
            {loadingSubmit ? 'در حال ارسال...' : 'ثبت'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={replyDialog} onClose={() => setReplyDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>ثبت پاسخ</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="پاسخ" value={replyText} onChange={e => setReplyText(e.target.value)} multiline rows={3} />
          <FormControl fullWidth margin="dense">
            <InputLabel id="status-label">وضعیت</InputLabel>
            <Select
              labelId="status-label"
              value={selectedStatus}
              label="وضعیت"
              onChange={e => setSelectedStatus(e.target.value)}
            >
              <MenuItem value="pending">در حال بررسی</MenuItem>
              <MenuItem value="answered">پاسخ داده شده</MenuItem>
              <MenuItem value="resolved">برطرف شد</MenuItem>
              {replyTicketDeviceType === 'ATM' && <MenuItem value="اعزام پول رسان">اعزام پول رسان</MenuItem>}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialog(false)}>انصراف</Button>
          <Button onClick={async () => {
            if (selectedStatus === 'pending') {
              await axios.post(`/api/tickets/${replyTicketId}/pending`);
            } else if (selectedStatus === 'answered') {
              await axios.post(`/api/tickets/${replyTicketId}/reply`, { reply: replyText });
            } else if (selectedStatus === 'resolved') {
              await axios.post(`/api/tickets/${replyTicketId}/resolved`);
            } else if (selectedStatus === 'اعزام پول رسان') {
              await axios.post(`/api/tickets/${replyTicketId}/dispatch`);
            }
            fetchTickets();
            setReplyDialog(false);
            setReplyText('');
            setReplyTicketId(null);
            setReplyTicketDeviceType('');
          }} variant="contained" color="primary">ثبت پاسخ</Button>
        </DialogActions>
      </Dialog>
      <Box mt={4}>
        <Typography variant="h6" mb={2} sx={{ textAlign: 'center' }}>لیست تیکت‌ها</Typography>
        <Box mb={3} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, flexGrow: 1, alignItems: 'center' }}>
            <Select
              value={deviceIdDisplayMode}
              onChange={e => setDeviceIdDisplayMode(e.target.value)}
              size="small"
              sx={{ minWidth: 160, order: -1 }}
            >
              <MenuItem value="terminal">فقط ترمینال</MenuItem>
              <MenuItem value="serial">فقط سریال</MenuItem>
              <MenuItem value="both">نمایش سریال و ترمینال</MenuItem>
            </Select>
            <TextField
              label="فیلتر دستگاه"
              variant="outlined"
              size="small"
              value={filters.device}
              onChange={(e) => setFilters(prev => ({ ...prev, device: e.target.value }))}
              sx={{ flex: '1 1 150px' }}
            />
            <TextField
              label="فیلتر نوع خطا"
              variant="outlined"
              size="small"
              value={filters.errorType}
              onChange={(e) => setFilters(prev => ({ ...prev, errorType: e.target.value }))}
              sx={{ flex: '1 1 150px' }}
            />
            <TextField
              label="فیلتر توضیحات"
              variant="outlined"
              size="small"
              value={filters.description}
              onChange={(e) => setFilters(prev => ({ ...prev, description: e.target.value }))}
              sx={{ flex: '1 1 150px' }}
            />
            <TextField
              label="فیلتر ثبت‌کننده"
              variant="outlined"
              size="small"
              value={filters.creator}
              onChange={(e) => setFilters(prev => ({ ...prev, creator: e.target.value }))}
              sx={{ flex: '1 1 150px' }}
            />
            <TextField
              label="فیلتر پاسخ"
              variant="outlined"
              size="small"
              value={filters.reply}
              onChange={(e) => setFilters(prev => ({ ...prev, reply: e.target.value }))}
              sx={{ flex: '1 1 150px' }}
            />
            <TextField
              label="فیلتر وضعیت"
              variant="outlined"
              size="small"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              sx={{ flex: '1 1 150px' }}
            />
            <TextField
              label="فیلتر برچسب"
              variant="outlined"
              size="small"
              value={filters.tags}
              onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
              sx={{ flex: '1 1 150px' }}
            />
            <LocalizationProvider 
              dateAdapter={JalaliAdapter} 
              adapterLocale={fa}
              localeText={{
                okButtonLabel: 'تایید',
                cancelButtonLabel: 'انصراف',
                todayButtonLabel: 'امروز',
                clearButtonLabel: 'پاک کردن',
                previousMonth: 'ماه قبل',
                nextMonth: 'ماه بعد'
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, flex: '1 1 380px', alignItems: 'center', direction: 'rtl' }}>
                <DatePicker
                  label="از تاریخ"
                  value={filters.startDate}
                  onChange={(newValue) => setFilters(prev => ({ ...prev, startDate: newValue }))}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      size="small" 
                      sx={{ 
                        width: '180px', 
                        '& .MuiInputLabel-root': { 
                          right: 20, 
                          left: 'auto', 
                          transformOrigin: 'right',
                          fontSize: '0.85rem'
                        },
                        '& .MuiInputLabel-shrink': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                          backgroundColor: 'white',
                          padding: '0 5px',
                          borderRadius: '3px',
                          color: '#1976d2'
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#bdbdbd'
                        },
                        '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#1976d2'
                        }
                      }}
                      inputProps={{
                        ...params.inputProps,
                        style: { textAlign: 'right', direction: 'rtl', paddingRight: '25px' }
                      }}
                    />
                  )}
                />
                <DatePicker
                  label="تا تاریخ"
                  value={filters.endDate}
                  onChange={(newValue) => setFilters(prev => ({ ...prev, endDate: newValue }))}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      size="small" 
                      sx={{ 
                        width: '180px', 
                        '& .MuiInputLabel-root': { 
                          right: 20, 
                          left: 'auto', 
                          transformOrigin: 'right',
                          fontSize: '0.85rem'
                        },
                        '& .MuiInputLabel-shrink': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                          backgroundColor: 'white',
                          padding: '0 5px',
                          borderRadius: '3px',
                          color: '#1976d2'
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#bdbdbd'
                        },
                        '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#1976d2'
                        }
                      }}
                      inputProps={{
                        ...params.inputProps,
                        style: { textAlign: 'right', direction: 'rtl', paddingRight: '25px' }
                      }}
                    />
                  )}
                />
              </Box>
            </LocalizationProvider>
            <Button 
              variant="outlined" 
              onClick={() => setFilters({ 
                device: '', 
                errorType: '', 
                description: '', 
                creator: '', 
                reply: '', 
                status: '', 
                tags: '',
                startDate: null, 
                endDate: null 
              })}
              sx={{ flex: '0 0 auto' }}
            >
              پاک کردن فیلترها
            </Button>
          </Box>
        </Box>
        <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell align="center">دستگاه</TableCell>
                <TableCell align="center">نوع خطا</TableCell>
                <TableCell align="center">توضیحات</TableCell>
                <TableCell align="center">فایل</TableCell>
                <TableCell align="center">ثبت‌کننده</TableCell>
                <TableCell align="center">پاسخ</TableCell>
                <TableCell align="center">وضعیت</TableCell>
                <TableCell align="center">برچسب‌ها</TableCell>
                <TableCell align="center">آخرین به‌روزرسانی</TableCell>
                {(currentUserRole === 'expert' || currentUserRole === 'acceptor' || currentUserRole === 'agent') && (
                  <TableCell align="center" sx={{ width: 120, minWidth: 80, maxWidth: 140 }}>عملیات</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleTickets.map((ticket) => (
                <TableRow key={ticket._id}
                  style={
                    statusColorMap[ticket.status]
                      ? { background: statusColorMap[ticket.status], color: ticket.status === 'confirmed' ? '#fff' : undefined }
                      : ticket.status === 'نیاز به رول' ? { background: '#ce93d8', color: '#6a1b9a' }
                      : {}
                  }
                >
                  <TableCell align="center">{ticket.device ? (
                    deviceIdDisplayMode === 'both'
                      ? (ticket.device.identifier && ticket.device.identifier.serial && ticket.device.identifier.terminal
                          ? JSON.stringify(ticket.device.identifier)
                          : (ticket.device.identifier?.serial || ticket.device.identifier?.terminal || '-'))
                      : deviceIdDisplayMode === 'serial'
                        ? (ticket.device.identifier?.serial || '-')
                        : (ticket.device.identifier?.terminal || '-')
                    + ' - ' + ticket.device.model
                  ) : (ticket.manualDevice || '-')}</TableCell>
                  <TableCell align="center">
                    {(() => {
                      if (ticket.errorType === 'manual' && ticket.manualErrorType) {
                        return ticket.manualErrorType;
                      }
                      return errorTypes.find(et => et.value === ticket.errorType)?.label;
                    })()}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={(() => {
                      if (ticket.errorType === 'error1' && ticket.description && ticket.description.includes('[[MANUAL_ERROR_TYPE:')) {
                        let description = ticket.description;
                        description = description.replace(/\\[\\[MANUAL_ERROR_TYPE:.*?\]\\]\\n\\n?/g, '').trim();
                        return description;
                      }
                      return ticket.description || '';
                    })()} arrow>
                      <span style={{ display: 'inline-block', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'top', direction: 'rtl' }}>
                        {(() => {
                          let desc = '';
                          if (ticket.errorType === 'error1' && ticket.description && ticket.description.includes('[[MANUAL_ERROR_TYPE:')) {
                            desc = ticket.description.replace(/\[\[MANUAL_ERROR_TYPE:.*?\]\]\n\n/, '');
                          } else {
                            desc = ticket.description || '';
                          }
                          return desc.length > 40 ? desc.slice(0, 40) + '...' : desc;
                        })()}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    {ticket.file ? (
                      isImageFile(ticket.file) ? (
                        <Tooltip 
                          title={
                            <Box 
                              component="img" 
                              src={ticket.file.startsWith('http') ? ticket.file : backendUrl + ticket.file} 
                              alt="پیش‌نمایش تصویر" 
                              sx={{ maxWidth: 300, maxHeight: 200 }}
                            />
                          }
                          sx={{ 
                            '& .MuiTooltip-tooltip': { 
                              backgroundColor: 'transparent',
                              maxWidth: 350,
                              p: 1,
                              border: '1px solid #ccc',
                              borderRadius: 1,
                              boxShadow: 3
                            }
                          }}
                          arrow
                          placement="top"
                          enterDelay={700}
                          leaveDelay={300}
                        >
                          <a href={ticket.file.startsWith('http') ? ticket.file : backendUrl + ticket.file} target="_blank" rel="noopener noreferrer">
                            دانلود تصویر
                          </a>
                        </Tooltip>
                      ) : (
                        <a href={ticket.file.startsWith('http') ? ticket.file : backendUrl + ticket.file} target="_blank" rel="noopener noreferrer">
                          دانلود فایل
                        </a>
                      )
                    ) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    {ticket.creator ? (
                      <Tooltip title={[
                        `نام: ${ticket.creator.name || '-'}`, 
                        ticket.creator.email ? `ایمیل: ${ticket.creator.email}` : null,
                        ticket.creator.phone ? `شماره تلفن: ${ticket.creator.phone}` : null,
                        ticket.creator.role ? `نقش: ${ticket.creator.role}` : null
                      ].filter(Boolean).join('\n')} arrow>
                        <span>{ticket.creator.name || '-'}</span>
                      </Tooltip>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="center">{ticket.reply || '-'}</TableCell>
                  <TableCell align="center">
                    <StatusLabel status={ticket.status} />
                  </TableCell>
                  <TableCell align="center">
                    {Array.isArray(ticket.tags)
                      ? (ticket.tags.length > 0 ? ticket.tags.join(', ') : '-')
                      : (typeof ticket.tags === 'string' && ticket.tags.trim() !== ''
                          ? (() => { try { const arr = JSON.parse(ticket.tags); return Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : '-'; } catch { return '-'; } })()
                          : '-')}
                  </TableCell>
                  <TableCell align="center">
                    {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString('fa-IR', {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric'
                    }) : '-'}
                  </TableCell>
                  {(currentUserRole === 'expert' || currentUserRole === 'acceptor' || currentUserRole === 'agent') && (
                    <TableCell align="center" sx={{ width: 120, minWidth: 80, maxWidth: 140 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {currentUserRole === 'expert' && (
                          <Button size="small" color="info" variant="outlined" onClick={() => {
                            setReplyDialog(true);
                            setReplyTicketId(ticket._id);
                            setReplyText(ticket.reply || '');
                            setReplyTicketDeviceType(ticket.device?.type || '');
                          }}>
                            ثبت پاسخ
                          </Button>
                        )}
                        <IconButton 
                          color={unreadChats[ticket._id] ? 'error' : 'default'} 
                          onClick={() => handleChatIconClick(ticket._id)}
                        >
                          {unreadChats[ticket._id] ? <ChatBubble /> : <Chat />}
                        </IconButton>
                        {(["acceptor", "agent"].includes(currentUserRole) && (ticket.status === 'resolved' || ticket.status === 'اعزام پول رسان') && ticket.creator?._id === currentUserId) && (
                          <>
                            <IconButton onClick={e => handleMenuOpen(e, ticket._id)}>
                              <MoreVert />
                            </IconButton>
                            <Menu
                              anchorEl={anchorEl}
                              open={Boolean(anchorEl) && menuTicketId === ticket._id}
                              onClose={handleMenuClose}
                              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                            >
                              <Button
                                variant="text"
                                color="success"
                                size="small"
                                onClick={async () => {
                                  await handleConfirmTicket(ticket._id);
                                  handleMenuClose();
                                }}
                                sx={{ width: '100%', justifyContent: 'flex-start', color: 'green' }}
                              >
                                {ticket.status === 'resolved' ? 'تایید رفع مشکل' : 'تایید پول‌رسانی'}
                              </Button>
                              <Button
                                variant="text"
                                color="error"
                                size="small"
                                onClick={async () => {
                                  await axios.post(`/api/tickets/${ticket._id}/rejected`);
                                  handleMenuClose();
                                }}
                                sx={{ width: '100%', justifyContent: 'flex-start', color: 'red' }}
                              >
                                {ticket.status === 'resolved' ? 'رد مشکل' : 'رد پول‌رسانی'}
                              </Button>
                            </Menu>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <Dialog open={chatOpen} onClose={() => setChatOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>گفتگو درباره تیکت</DialogTitle>
        <DialogContent>
          {chatTicket && (
            <Box sx={{ bgcolor: '#f5f5f5', borderRadius: 2, p: 2, mt: 1 }}>
              <Typography variant="subtitle2" mb={1}>گفتگو:</Typography>
              <Box sx={{ maxHeight: 300, overflowY: 'auto', mb: 1 }} ref={chatBoxRef}>
                {chatTicket.replies && chatTicket.replies.length > 0 ? chatTicket.replies
                  .slice()
                  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                  .map((reply, idx) => (
                    <Box key={idx} sx={{ mb: 1, textAlign: reply.sender?._id === currentUserId ? 'right' : 'left' }}>
                      <Typography variant="caption" color="text.secondary">
                        {reply.sender?.name} ({reply.sender?.role}) - {new Date(reply.createdAt).toLocaleString('fa-IR')}
                      </Typography>
                      <Box>
                        {reply.message && <Typography variant="body2" sx={{ display: 'inline', mx: 1 }}>{reply.message}</Typography>}
                        {reply.file && (
                          isImageFile(reply.file) ? (
                            <Tooltip 
                              title={
                                <Box 
                                  component="img" 
                                  src={reply.file.startsWith('http') ? reply.file : backendUrl + reply.file} 
                                  alt="پیش‌نمایش تصویر" 
                                  sx={{ maxWidth: 300, maxHeight: 200 }}
                                />
                              }
                              sx={{ 
                                '& .MuiTooltip-tooltip': { 
                                  backgroundColor: 'transparent',
                                  maxWidth: 350,
                                  p: 1,
                                  border: '1px solid #ccc',
                                  borderRadius: 1,
                                  boxShadow: 3
                                }
                              }}
                              arrow
                              placement="top"
                              enterDelay={700}
                              leaveDelay={300}
                            >
                              <a href={reply.file.startsWith('http') ? reply.file : backendUrl + reply.file} target="_blank" rel="noopener noreferrer">
                                دانلود تصویر
                              </a>
                            </Tooltip>
                          ) : (
                            <a href={reply.file.startsWith('http') ? reply.file : backendUrl + reply.file} target="_blank" rel="noopener noreferrer">
                              دانلود فایل
                            </a>
                          )
                        )}
                      </Box>
                    </Box>
                  )) : <Typography variant="body2" color="text.secondary">پیامی وجود ندارد.</Typography>}
              </Box>
              <ReplyForm ticketId={chatTicket._id} onSend={(...args) => handleSendReply(...args, () => fetchTickets())} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChatOpen(false)}>بستن</Button>
        </DialogActions>
      </Dialog>
      {/* Pie Chart Dialog */}
      <Dialog open={showPieChart} onClose={() => setShowPieChart(false)} maxWidth="sm">
        <DialogTitle sx={{ textAlign: 'center' }}>نمودار وضعیت تیکت‌ها</DialogTitle>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 250 }}>
          {statusData.length > 0 ? (
            <PieChart width={350} height={220}>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          ) : (
            <Typography>داده‌ای برای نمایش نمودار وجود ندارد.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPieChart(false)}>بستن</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ReplyForm({ ticketId, onSend }) {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  
  const resetForm = () => { 
    setMessage(''); 
    setFile(null);
    setFileName('');
  };
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    
    if (selectedFile) {
      console.log('Selected file in ReplyForm:', selectedFile.name, selectedFile.type, selectedFile.size);
      setFile(selectedFile);
      setFileName(selectedFile.name);
    } else {
      console.log('No file selected in ReplyForm');
      setFile(null);
      setFileName('');
    }
  };
  
  const canSend = message.trim() !== '' || !!file;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (canSend) {
      console.log('Sending file in ReplyForm:', file ? `${file.name} (${file.size} bytes)` : 'No file');
      onSend(ticketId, message, file, resetForm);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TextField size="small" placeholder="پیام..." value={message} onChange={e => setMessage(e.target.value)} />
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1 }}>
        <input 
          type="file" 
          id={`file-upload-${ticketId}`}
          name="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="image/*, application/pdf, .doc, .docx, .xls, .xlsx, .txt"
        />
        <label htmlFor={`file-upload-${ticketId}`}>
          <Button component="span" variant="outlined" size="small">
            {fileName ? 'تغییر فایل' : 'انتخاب فایل'}
          </Button>
        </label>
        
        {fileName && (
          <>
            <Typography variant="caption" sx={{ ml: 1 }}>
              {fileName}
            </Typography>
            <IconButton size="small" onClick={() => { setFile(null); setFileName(''); }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        )}
        
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={!canSend}
          sx={{ ml: 'auto' }}
        >
          ارسال
        </Button>
      </Box>
    </form>
  );
}

function StatusLabel({ status }) {
  const map = {
    new: { text: 'جدید', color: '#ffb3ba' },
    pending: { text: 'در حال بررسی', color: '#ffe082' },
    answered: { text: 'پاسخ داده شده', color: '#90caf9' },
    resolved: { text: 'برطرف شد', color: '#a5d6a7' },
    confirmed: { text: 'تایید شده', color: '#388e3c' },
    rejected: { text: 'رد شده', color: '#ef9a9a' },
    'اعزام پول رسان': { text: 'اعزام پول رسان', color: '#bcaaa4' },
    'نیاز به تعمیر': { text: 'نیاز به تعمیر', color: '#ffb74d' },
    'نیاز به رول': { text: 'نیاز به رول', color: '#ce93d8' },
    'نیاز به پول رسانی': { text: 'نیاز به پول رسانی', color: '#a1887f' },
  };
  const item = map[status] || { text: status, color: '#e0e0e0' };
  return <span style={{ background: item.color, padding: '2px 8px', borderRadius: 8 }}>{item.text}</span>;
}

function isImageFile(url) {
  if (!url) return false;
  
  // تشخیص نوع فایل از URL آن
  const fileExtension = url.split('.').pop().toLowerCase();
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  
  return imageExtensions.includes(fileExtension);
} 