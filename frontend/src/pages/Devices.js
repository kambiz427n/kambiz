import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Snackbar
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import { io } from 'socket.io-client';

const deviceTypes = [
  { value: 'POS', label: 'POS' },
  { value: 'ATM', label: 'ATM' },
  { value: 'Cashless', label: 'Cashless' },
];
const cashStatuses = [
  { value: 'full', label: 'پر' },
  { value: 'empty', label: 'خالی' },
  { value: 'needs_cash', label: 'نیاز به پول' },
  { value: 'unknown', label: 'نامشخص' },
];

// لیست کامل استان‌ها و شهرهای ایران
const provinces = [
  { name: 'آذربایجان شرقی', cities: ['تبریز', 'مراغه', 'مرند', 'میانه', 'اهر', 'بناب', 'شبستر', 'سراب', 'هادی‌شهر', 'ملکان', 'بستان‌آباد', 'جلفا', 'آذرشهر', 'هریس', 'کلیبر', 'اسکو', 'ورزقان', 'خدا آفرین', 'چاراویماق'] },
  { name: 'آذربایجان غربی', cities: ['ارومیه', 'خوی', 'میاندوآب', 'مهاباد', 'بوکان', 'سلماس', 'پیرانشهر', 'نقده', 'شاهین‌دژ', 'ماکو', 'سردشت', 'تکاب', 'اشنویه', 'چالدران', 'شوط', 'چایپاره', 'پلدشت'] },
  { name: 'اردبیل', cities: ['اردبیل', 'پارس‌آباد', 'مشگین‌شهر', 'خلخال', 'گرمی', 'بیله‌سوار', 'نمین', 'نیر', 'کوثر', 'سرعین'] },
  { name: 'اصفهان', cities: ['اصفهان', 'کاشان', 'خمینی‌شهر', 'نجف‌آباد', 'لنجان', 'شاهین‌شهر', 'مبارکه', 'فلاورجان', 'آران و بیدگل', 'برخوار', 'شهرضا', 'تیران و کرون', 'سمیرم', 'نائین', 'اردستان', 'دهاقان', 'فریدن', 'فریدون‌شهر', 'چادگان', 'بوئین و میاندشت', 'خور و بیابانک'] },
  { name: 'البرز', cities: ['کرج', 'ساوجبلاغ', 'نظرآباد', 'فردیس', 'اشتهارد', 'طالقان', 'چهارباغ'] },
  { name: 'ایلام', cities: ['ایلام', 'دهلران', 'دره‌شهر', 'آبدانان', 'مهران', 'ملکشاهی', 'چرداول', 'ایوان', 'بدره', 'سیروان', 'هلیلان'] },
  { name: 'بوشهر', cities: ['بوشهر', 'دشتستان', 'دشتی', 'تنگستان', 'کنگان', 'گناوه', 'جم', 'دیلم', 'عسلویه', 'دیر'] },
  { name: 'تهران', cities: ['تهران', 'ری', 'شمیرانات', 'اسلامشهر', 'شهریار', 'قدس', 'ملارد', 'ورامین', 'پاکدشت', 'دماوند', 'رباط‌کریم', 'بهارستان', 'قرچک', 'پردیس', 'فیروزکوه', 'پیشوا', 'بدون بخش'] },
  { name: 'چهارمحال و بختیاری', cities: ['شهرکرد', 'بروجن', 'لردگان', 'فارسان', 'کوهرنگ', 'اردل', 'کیار', 'سامان', 'بن', 'خانمیرزا', 'فلارد'] },
  { name: 'خراسان جنوبی', cities: ['بیرجند', 'قائنات', 'فردوس', 'نهبندان', 'سربیشه', 'طبس', 'درمیان', 'بشرویه', 'خوسف', 'زیرکوه', 'سرایان', 'آرین‌شهر'] },
  { name: 'خراسان رضوی', cities: ['مشهد', 'نیشابور', 'سبزوار', 'تربت‌حیدریه', 'قوچان', 'کاشمر', 'تربت‌جام', 'چناران', 'خواف', 'درگز', 'بردسکن', 'گناباد', 'طرقبه شاندیز', 'سرخس', 'فیروزه', 'رشتخوار', 'خلیل‌آباد', 'مه‌ولات', 'باخرز', 'جوین', 'جغتای', 'زاوه', 'کلات', 'داورزن', 'بینالود'] },
  { name: 'خراسان شمالی', cities: ['بجنورد', 'اسفراین', 'شیروان', 'جاجرم', 'مانه و سملقان', 'فاروج', 'گرمه', 'راز و جرگلان'] },
  { name: 'خوزستان', cities: ['اهواز', 'دزفول', 'آبادان', 'خرمشهر', 'بهبهان', 'شادگان', 'شوشتر', 'اندیمشک', 'ماهشهر', 'ایذه', 'شوش', 'مسجدسلیمان', 'رامهرمز', 'امیدیه', 'رامشیر', 'هندیجان', 'باوی', 'حمیدیه', 'کارون', 'لالی', 'گتوند', 'هفتکل', 'آغاجاری', 'اندیکا'] },
  { name: 'زنجان', cities: ['زنجان', 'ابهر', 'خرمدره', 'ماهنشان', 'طارم', 'ایجرود', 'سلطانیه', 'دندی'] },
  { name: 'سمنان', cities: ['سمنان', 'شاهرود', 'دامغان', 'گرمسار', 'مهدی‌شهر', 'آرادان', 'میامی', 'سرخه'] },
  { name: 'سیستان و بلوچستان', cities: ['زاهدان', 'چابهار', 'ایرانشهر', 'خاش', 'سراوان', 'نیک‌شهر', 'کنارک', 'زهک', 'هیرمند', 'دلگان', 'قصرقند', 'مهرستان', 'سیب و سوران', 'فنوج', 'میرجاوه', 'نیمروز', 'بمپور', 'محمدان'] },
  { name: 'فارس', cities: ['شیراز', 'مرودشت', 'کازرون', 'جهرم', 'لارستان', 'فسا', 'داراب', 'سپیدان', 'ممسنی', 'نی‌ریز', 'استهبان', 'زرین‌دشت', 'آباده', 'اقلید', 'خرامه', 'کوار', 'پاسارگاد', 'رستم', 'سروستان', 'مهر', 'بوانات', 'خنج', 'فراشبند', 'ارسنجان', 'بیضا', 'زرقان'] },
  { name: 'قزوین', cities: ['قزوین', 'البرز', 'آبیک', 'تاکستان', 'بوئین‌زهرا', 'آوج', 'سیردان'] },
  { name: 'قم', cities: ['قم'] },
  { name: 'کردستان', cities: ['سنندج', 'سقز', 'بانه', 'قروه', 'بیجار', 'کامیاران', 'دیواندره', 'مریوان', 'دهگلان', 'سروآباد'] },
  { name: 'کرمان', cities: ['کرمان', 'رفسنجان', 'جیرفت', 'سیرجان', 'بم', 'زرند', 'کهنوج', 'بردسیر', 'عنبرآباد', 'راور', 'شهربابک', 'ریگان', 'فهرج', 'منوجان', 'ارزوئیه', 'قلعه‌گنج', 'انار'] },
  { name: 'کرمانشاه', cities: ['کرمانشاه', 'اسلام‌آباد غرب', 'هرسین', 'سنقر', 'کنگاور', 'سرپل ذهاب', 'قصر شیرین', 'پاوه', 'جوانرود', 'صحنه', 'گیلانغرب', 'روانسر', 'دالاهو', 'ثلاث باباجانی'] },
  { name: 'کهگیلویه و بویراحمد', cities: ['یاسوج', 'گچساران', 'دهدشت', 'دوگنبدان', 'سی‌سخت', 'باشت', 'چرام', 'لنده', 'بهمئی', 'مارگون'] },
  { name: 'گلستان', cities: ['گرگان', 'گنبد کاووس', 'علی‌آباد', 'آق‌قلا', 'کلاله', 'مینودشت', 'آزادشهر', 'بندر ترکمن', 'گمیشان', 'مراوه‌تپه', 'رامیان', 'گالیکش', 'کردکوی', 'بندر گز'] },
  { name: 'گیلان', cities: ['رشت', 'انزلی', 'لاهیجان', 'لنگرود', 'آستارا', 'تالش', 'آستانه اشرفیه', 'رودسر', 'فومن', 'صومعه‌سرا', 'رضوانشهر', 'شفت', 'ماسال', 'املش', 'سیاهکل', 'خمام'] },
  { name: 'لرستان', cities: ['خرم‌آباد', 'بروجرد', 'دورود', 'الیگودرز', 'کوهدشت', 'ازنا', 'پلدختر', 'دلفان', 'سلسله', 'رومشکان', 'چگنی'] },
  { name: 'مازندران', cities: ['ساری', 'بابل', 'آمل', 'قائم‌شهر', 'تنکابن', 'نوشهر', 'بابلسر', 'بهشهر', 'محمودآباد', 'نور', 'چالوس', 'رامسر', 'جویبار', 'سوادکوه', 'عباس‌آباد', 'نکا', 'فریدونکنار', 'سوادکوه شمالی', 'کلاردشت', 'میاندرود', 'گلوگاه'] },
  { name: 'مرکزی', cities: ['اراک', 'ساوه', 'خمین', 'محلات', 'دلیجان', 'شازند', 'تفرش', 'آشتیان', 'زرندیه', 'کمیجان', 'فراهان'] },
  { name: 'هرمزگان', cities: ['بندرعباس', 'بندر لنگه', 'میناب', 'قشم', 'حاجی‌آباد', 'رودان', 'پارسیان', 'جاسک', 'سیریک', 'ابوموسی', 'بشاگرد', 'خمیر'] },
  { name: 'همدان', cities: ['همدان', 'ملایر', 'نهاوند', 'کبودرآهنگ', 'تویسرکان', 'اسدآباد', 'بهار', 'رزن', 'فامنین'] },
  { name: 'یزد', cities: ['یزد', 'میبد', 'اردکان', 'بافق', 'ابرکوه', 'مهریز', 'اشکذر', 'خاتم', 'تفت', 'بهاباد'] },
];

// Backend URL for socket connection
const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    identifier: { serial: '', terminal: '' },
    type: '',
    model: '',
    softwareVersion: '',
    location: { province: '', city: '' },
    merchant: '',
    cashStatus: '',
  });
  const [formError, setFormError] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [filters, setFilters] = useState({
    identifier: '',
    type: '',
    model: '',
    softwareVersion: '',
    location: '', // For province or city
    merchant: '',
    cashStatus: '',
  });
  const [allUsers, setAllUsers] = useState([]);
  const [filteredAcceptors, setFilteredAcceptors] = useState([]);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketDevice, setTicketDevice] = useState(null);
  const [ticketMoneyStatus, setTicketMoneyStatus] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const currentUserRole = localStorage.getItem('currentUserRole');
  const currentUserName = localStorage.getItem('currentUserName');
  const isManager = currentUserRole === 'superadmin' || currentUserRole === 'admin';
  const allowedDeviceTypes = JSON.parse(localStorage.getItem('allowedDeviceTypes') || '[]');

  // Define money status options for non-ATM devices
  const nonAtmMoneyStatusOptions = [
    { value: 'active', label: 'فعال' },
    { value: 'needs_service', label: 'نیاز به تعمیر' },
    { value: 'needs_roll', label: 'نیاز به رول' },
  ];
  // Define money status options for ATM devices
  const atmMoneyStatusOptions = [
    { value: 'in_service', label: 'درحال سرویس' },
    { value: 'needs_replenishment', label: 'نیاز به پول رسانی' },
    { value: 'needs_service', label: 'نیاز به تعمیر' },
    { value: 'needs_roll', label: 'نیاز به رول' },
  ];
  // Combined list for description to Persian status mapping
  const moneyStatusOptions = [
    ...nonAtmMoneyStatusOptions,
    ...atmMoneyStatusOptions
  ];
  // تعریف لیست ترکیبی برای نمایش وضعیت ATM (شامل cashStatuses و atmMoneyStatusOptions)
  const atmDisplayStatuses = [...cashStatuses, ...atmMoneyStatusOptions];

  const fetchDevices = async () => {
    const res = await axios.get('/api/devices');
    setDevices(res.data);
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users'); // Assuming this endpoint exists
      setAllUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      // Optionally, set an error state or show a toast
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchUsers(); // Fetch users on component mount
  }, []);

  // Socket listener: when a dispatch ticket is confirmed, refresh devices
  useEffect(() => {
    const socket = io(backendUrl);
    socket.on('confirm-ticket', (ticket) => {
      // If a dispatch was confirmed, update device list
      fetchDevices();
    });
    
    // Escuchar evento de actualización de dispositivo
    socket.on('device-updated', (device) => {
      console.log('Device updated:', device);
      // Actualizar la lista de dispositivos
      fetchDevices();
    });
    
    // گوش‌دهنده برای رویداد حذف دستگاه
    socket.on('device-deleted', (data) => {
      console.log('Device deleted:', data._id);
      // به‌روزرسانی لیست دستگاه‌ها
      fetchDevices();
      
      // نمایش پیام حذف دستگاه به کاربر
      setSnackbarMessage('یک دستگاه توسط کاربر دیگری حذف شد');
    });
    
    return () => socket.disconnect();
  }, []);

  // Effect to filter acceptors when form.type or allUsers change
  useEffect(() => {
    if (form.type && allUsers.length > 0) {
      let acceptors = [];
      
      // برای همه انواع دستگاه، پذیرندگانی که نوع دستگاه در allowedDeviceTypes آنها وجود دارد
      acceptors = allUsers.filter(user =>
        user.role === 'acceptor' &&
        user.allowedDeviceTypes &&
        user.allowedDeviceTypes.includes(form.type)
      );
      
      setFilteredAcceptors(acceptors);

      // If current merchant is not in the new list of filtered acceptors, reset it
      if (form.merchant && !acceptors.find(acc => acc.name === form.merchant)) {
        setForm(f => ({ ...f, merchant: '' }));
      }

    } else {
      setFilteredAcceptors([]);
      // Also reset merchant if no type is selected
      if (!form.type) {
         setForm(f => ({ ...f, merchant: '' }));
      }
    }
  }, [form.type, allUsers, form.merchant]); // form.merchant added to dependency to re-validate

  const filterDevices = (devicesToFilter) => {
    return devicesToFilter.filter(device => {
      if (filters.identifier &&
        !((device.identifier?.serial && device.identifier.serial.toLowerCase().includes(filters.identifier.toLowerCase())) ||
          (device.identifier?.terminal && device.identifier.terminal.toLowerCase().includes(filters.identifier.toLowerCase())))) {
        return false;
      }
      if (filters.type && device.type && !device.type.toLowerCase().includes(filters.type.toLowerCase())) {
        return false;
      }
      if (filters.model && device.model && !device.model.toLowerCase().includes(filters.model.toLowerCase())) {
        return false;
      }
      if (filters.softwareVersion && device.softwareVersion && !device.softwareVersion.toLowerCase().includes(filters.softwareVersion.toLowerCase())) {
        return false;
      }
      if (filters.location &&
        !((device.location?.province && device.location.province.toLowerCase().includes(filters.location.toLowerCase())) ||
          (device.location?.city && device.location.city.toLowerCase().includes(filters.location.toLowerCase())))) {
        return false;
      }
      if (filters.merchant && device.merchant && !device.merchant.toLowerCase().includes(filters.merchant.toLowerCase())) {
        return false;
      }
      if (filters.cashStatus && device.cashStatus &&
        !(cashStatuses.find(cs => cs.value === device.cashStatus)?.label.toLowerCase().includes(filters.cashStatus.toLowerCase()))) {
        return false;
      }
      return true;
    });
  };

  // فیلتر دستگاه‌ها بر اساس نقش کاربر
  let initiallyVisibleDevices = devices;
  if (currentUserRole === 'superadmin') {
    // سوپرادمین همه دستگاه‌ها را می‌بیند
    initiallyVisibleDevices = devices;
  } else if (currentUserRole === 'admin') {
    // مدیر دستگاه‌های مرتبط با allowedDeviceTypes خود را می‌بیند
    initiallyVisibleDevices = devices.filter(device =>
      device.type && allowedDeviceTypes.includes(device.type)
    );
  } else if (currentUserRole === 'agent' || currentUserRole === 'expert') {
    // نماینده و کارشناس دستگاه‌های مرتبط با allowedDeviceTypes خود را می‌بیند
    initiallyVisibleDevices = devices.filter(device =>
      device.type && allowedDeviceTypes.includes(device.type)
    );
  } else if (currentUserRole === 'acceptor') {
    // پذیرنده فقط دستگاه‌هایی را می‌بیند که merchant آنها با نام کاربری‌اش مطابقت دارد
    initiallyVisibleDevices = devices.filter(device =>
      device.merchant && device.merchant === currentUserName
    );
  }
  const visibleDevices = filterDevices(initiallyVisibleDevices);

  const handleEdit = (device) => {
    setEditId(device._id);
    setForm({
      identifier: {
        serial: device.identifier?.serial || '',
        terminal: device.identifier?.terminal || ''
      },
      type: device.type,
      model: device.model,
      softwareVersion: device.softwareVersion,
      location: { ...device.location },
      merchant: device.merchant,
      cashStatus: device.cashStatus || '',
    });
    setSelectedProvince(device.location?.province || '');
    setSelectedCity(device.location?.city || '');
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('آیا از حذف دستگاه مطمئن هستید؟')) {
      await axios.delete(`/api/devices/${id}`);
      fetchDevices();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.identifier.serial && !form.identifier.terminal) {
      setFormError('حداقل یکی از سریال یا ترمینال باید وارد شود.');
      return;
    }
    try {
      // پی‌لود را با ساختار دقیق مدل ایجاد می‌کنیم
      const payload = {
        type: form.type,
        model: form.model,
        softwareVersion: form.softwareVersion,
        location: {
          province: form.location.province,
          city: form.location.city
        },
        merchant: form.merchant,
        identifier: {}
      };

      // مقادیر را دقیقاً همانطور که کاربر وارد کرده، استفاده می‌کنیم
      if (form.identifier.serial && form.identifier.serial.trim() !== '') {
        payload.identifier.serial = form.identifier.serial.trim();
      }
      
      if (form.identifier.terminal && form.identifier.terminal.trim() !== '') {
        payload.identifier.terminal = form.identifier.terminal.trim();
      }

      // برای دستگاه‌های ATM، وضعیت موجودی را هم اضافه می‌کنیم
      if (form.type === 'ATM') {
        payload.cashStatus = form.cashStatus;
      }

      console.log('Sending payload:', payload); // برای اشکال‌زدایی

      if (editId) {
        await axios.put(`/api/devices/${editId}`, payload);
      } else {
        await axios.post('/api/devices', payload);
      }
      fetchDevices();
      setOpen(false);
      setEditId(null);
      setForm({
        identifier: { serial: '', terminal: '' }, type: '', model: '', softwareVersion: '', location: { province: '', city: '' }, merchant: '', cashStatus: ''
      });
      setSelectedProvince('');
      setSelectedCity('');
    } catch (err) {
      console.error('Error submitting form:', err);
      console.error('Error response:', err.response?.data);
      setFormError(err.response?.data?.error || 'خطا در ثبت دستگاه');
    }
  };

  const handleMoneyStatusChange = async (device, status) => {
    // If status is 'active' or 'in_service', update device directly without ticket dialog
    const skipDialogStatuses = ['active', 'in_service'];
    if (skipDialogStatuses.includes(status)) {
      try {
        // Update cashStatus of the device
        await axios.put(`/api/devices/${device._id}`, { cashStatus: status });
        fetchDevices();
        setSnackbarMessage('وضعیت دستگاه بروزرسانی شد.');
      } catch (err) {
        console.error('Error updating device cashStatus:', err);
        setSnackbarMessage('خطا در بروزرسانی وضعیت دستگاه.');
      }
    } else {
      // For other statuses, open ticket creation dialog
      setTicketDevice(device);
      setTicketMoneyStatus(status);
      setTicketDescription('');
      setTicketDialogOpen(true);
    }
  };

  const submitTicketForMoneyStatus = async () => {
    if (!ticketDescription.trim()) {
      setSnackbarMessage('لطفاً توضیحات را وارد کنید.');
      return;
    }
    try {
      // ارسال تیکت با وضعیت (برچسب فارسی) در فیلد status و توضیحات فقط متن کاربر
      const statusOption = moneyStatusOptions.find(o => o.value === ticketMoneyStatus);
      const statusLabel = statusOption ? statusOption.label : ticketMoneyStatus;
      const payload = {
        device: ticketDevice._id,
        errorType: 'manual',
        description: ticketDescription,
        status: statusLabel,
      };
      await axios.post('/api/tickets', payload);
      // بروزرسانی وضعیت دستگاه در پایگاه و بازخوانی لیست
      await axios.put(`/api/devices/${ticketDevice._id}`, { cashStatus: ticketMoneyStatus });
      fetchDevices();
      setSnackbarMessage('تیکت جدید ثبت شد و وضعیت دستگاه بروزرسانی شد.');
      setTicketDialogOpen(false);
    } catch (err) {
      console.error('Error creating ticket:', err);
      setSnackbarMessage('خطا در ثبت تیکت');
    }
  };

  return (
    <Box p={2}>
      {isManager && (
        <Button variant="contained" color="primary" onClick={() => {
          setOpen(true);
          setEditId(null);
          // Reset form, ensuring type is also reset to trigger acceptor list clearing
          setForm({ identifier: { serial: '', terminal: '' }, type: '', model: '', softwareVersion: '', location: { province: '', city: '' }, merchant: '', cashStatus: '' });
          setSelectedProvince('');
          setSelectedCity('');
          // Explicitly clear filtered acceptors if opening for a new device with no type
          setFilteredAcceptors([]); 
        }}>
          افزودن دستگاه جدید
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editId ? 'ویرایش دستگاه' : 'افزودن دستگاه جدید'}</DialogTitle>
        <DialogContent>
          {formError && <Typography color="error" mb={1}>{formError}</Typography>}
          <form onSubmit={handleSubmit} id="device-form">
            <TextField fullWidth margin="dense" label="شناسه دستگاه (سریال)" value={form.identifier.serial} onChange={e => setForm(f => ({ ...f, identifier: { ...f.identifier, serial: e.target.value } }))} />
            <TextField fullWidth margin="dense" label="شناسه دستگاه (ترمینال)" value={form.identifier.terminal} onChange={e => setForm(f => ({ ...f, identifier: { ...f.identifier, terminal: e.target.value } }))} />
            <TextField fullWidth margin="dense" label="مدل دستگاه" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} required />
            <TextField fullWidth margin="dense" label="نسخه نرم‌افزار" value={form.softwareVersion} onChange={e => setForm(f => ({ ...f, softwareVersion: e.target.value }))} required />
            <TextField select fullWidth margin="dense" label="استان" value={selectedProvince} onChange={e => {
              setSelectedProvince(e.target.value);
              setSelectedCity('');
              setForm(f => ({ ...f, location: { ...f.location, province: e.target.value, city: '' } }));
            }} SelectProps={{ native: true }} required>
              <option value=""></option>
              {provinces.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </TextField>
            <TextField select fullWidth margin="dense" label="شهر" value={selectedCity} onChange={e => {
              setSelectedCity(e.target.value);
              setForm(f => ({ ...f, location: { ...f.location, city: e.target.value } }));
            }} SelectProps={{ native: true }} required disabled={!selectedProvince}>
              <option value=""></option>
              {selectedProvince && provinces.find(p => p.name === selectedProvince)?.cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </TextField>
            <TextField select fullWidth margin="dense" label="نوع دستگاه" value={form.type} onChange={e => {
              setForm(f => ({ ...f, type: e.target.value, merchant: '' })); // Reset merchant when type changes
              // No need to setFilteredAcceptors here, useEffect will handle it
            }} SelectProps={{ native: true }} required>
              <option value=""></option>
              {deviceTypes.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
            </TextField>
            <TextField select fullWidth margin="dense" label="پذیرنده" value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} SelectProps={{ native: true }} required disabled={!form.type || filteredAcceptors.length === 0}>
              <option value=""></option>
              {filteredAcceptors.map(acceptor => (
                <option key={acceptor._id} value={acceptor.name}>{acceptor.name}</option>
              ))}
            </TextField>
            {form.type === 'ATM' && (
              <TextField select fullWidth margin="dense" label="وضعیت" value={form.cashStatus} onChange={e => setForm(f => ({ ...f, cashStatus: e.target.value }))} SelectProps={{ native: true }} required>
                <option value=""></option>
                {cashStatuses.map(cs => <option key={cs.value} value={cs.value}>{cs.label}</option>)}
              </TextField>
            )}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button type="submit" form="device-form" variant="contained" color="primary">{editId ? 'ویرایش' : 'ثبت'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={ticketDialogOpen} onClose={() => setTicketDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ثبت تیکت وضعیت</DialogTitle>
        <DialogContent>
          <Typography mb={2}>وضعیت: {moneyStatusOptions.find(o => o.value === ticketMoneyStatus)?.label}</Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="توضیحات"
            value={ticketDescription}
            onChange={e => setTicketDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTicketDialogOpen(false)}>انصراف</Button>
          <Button onClick={submitTicketForMoneyStatus} variant="contained" color="primary">ثبت تیکت</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={3000}
        message={snackbarMessage}
        onClose={() => setSnackbarMessage('')}
      />
      <Box mt={4}>
        <Typography variant="h6" mb={2} sx={{ textAlign: 'center' }}>لیست دستگاه‌ها</Typography>
        <Box mb={3} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            label="فیلتر شناسه دستگاه"
            variant="outlined"
            size="small"
            value={filters.identifier}
            onChange={(e) => setFilters(prev => ({ ...prev, identifier: e.target.value }))}
            sx={{ flex: '1 1 150px' }}
          />
          <TextField
            label="فیلتر نوع"
            variant="outlined"
            size="small"
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            sx={{ flex: '1 1 100px' }}
          />
          <TextField
            label="فیلتر مدل"
            variant="outlined"
            size="small"
            value={filters.model}
            onChange={(e) => setFilters(prev => ({ ...prev, model: e.target.value }))}
            sx={{ flex: '1 1 100px' }}
          />
          <TextField
            label="فیلتر نسخه نرم‌افزار"
            variant="outlined"
            size="small"
            value={filters.softwareVersion}
            onChange={(e) => setFilters(prev => ({ ...prev, softwareVersion: e.target.value }))}
            sx={{ flex: '1 1 120px' }}
          />
          <TextField
            label="فیلتر موقعیت"
            variant="outlined"
            size="small"
            value={filters.location}
            onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            sx={{ flex: '1 1 120px' }}
          />
          <TextField
            label="فیلتر پذیرنده"
            variant="outlined"
            size="small"
            value={filters.merchant}
            onChange={(e) => setFilters(prev => ({ ...prev, merchant: e.target.value }))}
            sx={{ flex: '1 1 120px' }}
          />
          <TextField
            label="فیلتر وضعیت"
            variant="outlined"
            size="small"
            value={filters.cashStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, cashStatus: e.target.value }))}
            sx={{ flex: '1 1 150px' }}
          />
          <Button
            variant="outlined"
            onClick={() => setFilters({
              identifier: '',
              type: '',
              model: '',
              softwareVersion: '',
              location: '',
              merchant: '',
              cashStatus: '',
            })}
            sx={{ flex: '0 0 auto' }}
          >
            پاک کردن فیلترها
          </Button>
        </Box>
        <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell align="center">شناسه دستگاه</TableCell>
                <TableCell align="center">نوع</TableCell>
                <TableCell align="center">مدل</TableCell>
                <TableCell align="center">نسخه نرم‌افزار</TableCell>
                <TableCell align="center">موقعیت</TableCell>
                <TableCell align="center">پذیرنده</TableCell>
                <TableCell align="center">وضعیت</TableCell>
                {isManager && <TableCell align="center">عملیات</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleDevices.map((device) => (
                <TableRow key={device._id}>
                  <TableCell align="center">{device.identifier?.serial && device.identifier?.terminal
                    ? `${device.identifier.serial} | ${device.identifier.terminal}`
                    : (device.identifier?.serial || device.identifier?.terminal || '-')}
                  </TableCell>
                  <TableCell align="center">{device.type}</TableCell>
                  <TableCell align="center">{device.model}</TableCell>
                  <TableCell align="center">{device.softwareVersion}</TableCell>
                  <TableCell align="center">{device.location?.province} - {device.location?.city}</TableCell>
                  <TableCell align="center">{device.merchant}</TableCell>
                  <TableCell align="center">
                    {isManager || currentUserRole !== 'acceptor' ? (
                      // Managers and non-acceptors see cash status for all device types
                      ['POS', 'Cashless', 'ATM'].includes(device.type)
                        ? (device.type === 'ATM' 
                        ? (atmDisplayStatuses.find(s => s.value === device.cashStatus)?.label || '-')
                            : (nonAtmMoneyStatusOptions.find(s => s.value === device.cashStatus)?.label || '-'))
                        : '-'
                    ) : ['POS', 'Cashless', 'ATM'].includes(device.type) ? (
                      // Acceptors can dynamically set money status for POS, Cashless, and ATM
                      (() => {
                        // choose appropriate options
                        const options = device.type === 'ATM' ? atmMoneyStatusOptions : nonAtmMoneyStatusOptions;
                        return (
                          <TextField
                            select
                            size="small"
                            value={device.cashStatus || ''}
                            onChange={e => handleMoneyStatusChange(device, e.target.value)}
                            SelectProps={{ native: true }}
                          >
                            {options.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </TextField>
                        );
                      })()
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  {isManager && (
                    <TableCell align="center">
                      <IconButton color="primary" onClick={() => handleEdit(device)}><Edit /></IconButton>
                      <IconButton color="error" onClick={() => handleDelete(device._id)}><Delete /></IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
} 