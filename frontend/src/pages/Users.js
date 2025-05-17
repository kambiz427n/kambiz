import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Select, MenuItem, InputLabel, FormControl, Checkbox, ListItemText, OutlinedInput, FormGroup, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';

const roles = [
  { value: 'superadmin', label: 'سوپرمدیر' },
  { value: 'admin', label: 'مدیر' },
  { value: 'expert', label: 'کارشناس' },
  { value: 'agent', label: 'نماینده' },
  { value: 'acceptor', label: 'پذیرنده' },
];
const deviceTypes = [
  { value: 'POS', label: 'POS' },
  { value: 'ATM', label: 'ATM' },
  { value: 'Cashless', label: 'Cashless' },
];

const validationSchema = Yup.object({
  name: Yup.string().required('نام الزامی است'),
  email: Yup.string().email('ایمیل نامعتبر است').required('ایمیل الزامی است'),
  phone: Yup.string().required('شماره تلفن الزامی است'),
  role: Yup.string().required('نقش الزامی است'),
  allowedDeviceTypes: Yup.array().min(1, 'حداقل یک نوع دستگاه را انتخاب کنید'),
  password: Yup.string().min(6, 'حداقل ۶ کاراکتر'),
});

const Users = () => {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    deviceType: ''
  });

  const fetchUsers = async () => {
    const res = await axios.get('/api/users');
    setUsers(res.data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user) => {
    setEditId(user._id);
    formik.setValues({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      allowedDeviceTypes: Array.isArray(user.allowedDeviceTypes) ? user.allowedDeviceTypes : [],
      password: '',
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('آیا از حذف کاربر مطمئن هستید؟')) {
      await axios.delete(`/api/users/${id}`);
      fetchUsers();
    }
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      role: '',
      allowedDeviceTypes: [],
      password: '',
    },
    validationSchema,
    validate: (values) => {
      const errors = {};
      if (!editId && !values.password) {
        errors.password = 'رمز عبور الزامی است';
      }
      return errors;
    },
    onSubmit: async (values, { resetForm }) => {
      setFormError('');
      setSuccessMessage('');
      try {
        const payload = { ...values };
        if (editId && !payload.password) {
          delete payload.password;
        }
        await (editId
          ? axios.put(`/api/users/${editId}`, payload)
          : axios.post('/api/users', payload)
        );
        fetchUsers();
        resetForm();
        setEditId(null);
        setSuccessMessage(editId ? 'کاربر با موفقیت ویرایش شد' : 'کاربر جدید با موفقیت ایجاد شد');
        setTimeout(() => setOpen(false), 1500);
      } catch (err) {
        setFormError(err.response?.data?.error || 'خطا در ثبت کاربر');
      }
    },
  });

  const getCurrentUserRole = () => {
    // فرض: نقش کاربر جاری در localStorage ذخیره شده است
    return localStorage.getItem('currentUserRole');
  };

  const currentUserRole = getCurrentUserRole();
  const currentUserId = localStorage.getItem('currentUserId');

  // فیلتر لیست کاربران بر اساس نقش و allowedDeviceTypes
  let visibleUsers = users;
  if (currentUserRole === 'superadmin') {
    visibleUsers = users;
  } else if (currentUserRole === 'admin') {
    // فقط کاربران expert, agent, acceptor که نوع دستگاه مجاز مشترک دارند و خود مدیر
    const myUser = users.find(u => u._id === currentUserId);
    visibleUsers = users.filter(u =>
      u._id === currentUserId || // خودش
      (
        ['expert', 'agent', 'acceptor'].includes(u.role) &&
        u.allowedDeviceTypes && myUser && myUser.allowedDeviceTypes &&
        u.allowedDeviceTypes.some(type => myUser.allowedDeviceTypes.includes(type))
      )
    );
  } else if (["expert", "agent", "acceptor"].includes(currentUserRole)) {
    visibleUsers = users.filter(u => u._id === currentUserId);
  }

  // اعمال فیلترها روی کاربران قابل مشاهده
  if ((currentUserRole === 'superadmin' || currentUserRole === 'admin') && visibleUsers.length > 0) {
    visibleUsers = visibleUsers.filter(user => {
      // فیلتر بر اساس نام
      if (filters.name && !user.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      
      // فیلتر بر اساس ایمیل
      if (filters.email && !user.email.toLowerCase().includes(filters.email.toLowerCase())) {
        return false;
      }
      
      // فیلتر بر اساس شماره تلفن
      if (filters.phone && !user.phone.includes(filters.phone)) {
        return false;
      }
      
      // فیلتر بر اساس نقش
      if (filters.role && user.role !== filters.role) {
        return false;
      }
      
      // فیلتر بر اساس نوع دستگاه
      if (filters.deviceType && 
          !(user.allowedDeviceTypes && 
            user.allowedDeviceTypes.includes(filters.deviceType))) {
        return false;
      }
      
      return true;
    });
  }

  // منطق ویرایش/حذف
  const canEditOrDeleteUser = (targetUser) => {
    if (!targetUser) return true;
    if (currentUserRole === 'superadmin') return true;
    if (currentUserRole === 'admin') {
      // مدیر باید بتواند اکانت خودش را هم ویرایش کند
      if (targetUser._id === currentUserId) return true;
      
      // فقط کاربران expert, agent, acceptor که allowedDeviceTypes مشترک دارند
      const myUser = users.find(u => u._id === currentUserId);
      return (
        ['expert', 'agent', 'acceptor'].includes(targetUser.role) &&
        targetUser.allowedDeviceTypes && myUser && myUser.allowedDeviceTypes &&
        targetUser.allowedDeviceTypes.some(type => myUser.allowedDeviceTypes.includes(type))
      );
    }
    if (["expert", "agent", "acceptor"].includes(currentUserRole) && targetUser._id === currentUserId) {
      return true;
    }
    return false;
  };

  // منطق غیرفعال بودن فیلدها
  const isFieldDisabled = (fieldName) => {
    if (!editId) return false; // فقط در حالت ویرایش
    const editingUser = users.find(u => u._id === editId);
    if (currentUserRole === 'superadmin') {
      // سوپرادمین در حالت ویرایش خودش نتواند نقش خود را تغییر دهد
      if (editingUser._id === currentUserId && fieldName === 'role') {
        return true;
      }
      return false;
    }
    if (currentUserRole === 'admin') {
      if (editingUser._id === currentUserId) {
        // مدیر روی خودش: نام، نقش، نوع دستگاه مجاز غیرفعال
        return ['name','role','allowedDeviceTypes'].includes(fieldName);
      }
      // روی زیردستان: همه فیلدها فعال به جز رمز عبور (که فقط خودشان می‌توانند تغییر دهند)
      if (['password'].includes(fieldName)) return true;
      return false;
    }
    if (["expert", "agent", "acceptor"].includes(currentUserRole)) {
      // فقط خودش را می‌بیند و فقط رمز عبور فعال است
      return ['name','role','allowedDeviceTypes'].includes(fieldName);
    }
    return false;
  };

  // منطق فعال بودن فیلد رمز عبور
  const isPasswordFieldDisabled = () => {
    if (!editId) return false;
    const editingUser = users.find(u => u._id === editId);
    
    // سوپرادمین می‌تواند رمز همه کاربران از جمله خودش را تغییر دهد
    if (currentUserRole === 'superadmin') {
      return false; // برای همه (از جمله خودش) فعال باشد
    }
    
    // مدیر بتواند رمز عبور زیردستان را هم تغییر دهد
    if (currentUserRole === 'admin') {
      // اگر داره خودش رو ویرایش میکنه فقط خودش بتونه رمزش رو تغییر بده
      if (editingUser._id === currentUserId) {
        return false; // رمز خودش را می‌تواند تغییر دهد
      }
      
      // اگر زیردست را ویرایش می‌کند، رمز را هم بتواند تغییر دهد
      const myUser = users.find(u => u._id === currentUserId);
      return !(
        ['expert', 'agent', 'acceptor'].includes(editingUser.role) &&
        editingUser.allowedDeviceTypes && myUser && myUser.allowedDeviceTypes &&
        editingUser.allowedDeviceTypes.some(type => myUser.allowedDeviceTypes.includes(type))
      );
    }
    
    // برای سایر نقش‌ها، فقط رمز خودشان
    return editingUser._id !== currentUserId;
  };

  // فقط نقش‌های مجاز برای افزودن توسط admin
  const allowedRolesForAdd = currentUserRole === 'admin'
    ? roles.filter(r => ['expert', 'agent', 'acceptor'].includes(r.value))
    : roles;

  useEffect(() => {
    if (formik.values.allowedDeviceTypes && !Array.isArray(formik.values.allowedDeviceTypes)) {
      formik.setFieldValue('allowedDeviceTypes', []);
    }
  }, [formik.values.allowedDeviceTypes]);

  return (
    <Box p={2}>
      <Button variant="contained" color="primary" onClick={() => { setOpen(true); setEditId(null); formik.resetForm(); }}
        disabled={currentUserRole !== 'superadmin' && currentUserRole !== 'admin'}>
        افزودن کاربر جدید
      </Button>
      <Dialog open={open} onClose={() => {setOpen(false); setSuccessMessage('');}} maxWidth="xs" fullWidth>
        <DialogTitle>{editId ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}</DialogTitle>
        <DialogContent>
          {formError && <Typography color="error" mb={1}>{formError}</Typography>}
          {successMessage && <Typography color="success" mb={1} sx={{ color: 'green' }}>{successMessage}</Typography>}
          <form onSubmit={formik.handleSubmit} id="user-form">
            <TextField
              fullWidth
              margin="dense"
              id="name"
              name="name"
              label="نام"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              dir="rtl"
              disabled={isFieldDisabled('name')}
            />
            <TextField
              fullWidth
              margin="dense"
              id="email"
              name="email"
              label="ایمیل"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              dir="rtl"
            />
            <TextField
              fullWidth
              margin="dense"
              id="phone"
              name="phone"
              label="شماره تلفن"
              value={formik.values.phone}
              onChange={formik.handleChange}
              error={formik.touched.phone && Boolean(formik.errors.phone)}
              helperText={formik.touched.phone && formik.errors.phone}
              dir="rtl"
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="role-label">نقش</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={formik.values.role}
                onChange={formik.handleChange}
                error={formik.touched.role && Boolean(formik.errors.role)}
                input={<OutlinedInput label="نقش" />}
                disabled={isFieldDisabled('role')}
              >
                {allowedRolesForAdd.map((role) => (
                  <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel id="device-types-label">نوع دستگاه‌های مجاز</InputLabel>
              <Select
                labelId="device-types-label"
                id="allowedDeviceTypes"
                name="allowedDeviceTypes"
                multiple
                value={formik.values.allowedDeviceTypes}
                onChange={formik.handleChange}
                input={<OutlinedInput label="نوع دستگاه‌های مجاز" />}
                renderValue={(selected) => Array.isArray(selected) ? selected.map(val => deviceTypes.find(dt => dt.value === val)?.label).join(', ') : ''}
                disabled={isFieldDisabled('allowedDeviceTypes')}
              >
                {deviceTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Checkbox checked={formik.values.allowedDeviceTypes.indexOf(type.value) > -1} />
                    <ListItemText primary={type.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              margin="dense"
              id="password"
              name="password"
              label="رمز عبور"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              dir="rtl"
              autoComplete="new-password"
              disabled={isPasswordFieldDisabled()}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button type="submit" form="user-form" variant="contained" color="primary" disabled={!canEditOrDeleteUser(users.find(u => u._id === editId))}>
            {editId ? 'ویرایش' : 'ثبت'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box mt={4}>
        <Typography variant="h6" mb={2} sx={{ textAlign: 'center' }}>لیست کاربران</Typography>
        
        {/* قسمت فیلترها - فقط برای سوپرمدیر و مدیر نمایش داده می‌شود */}
        {(currentUserRole === 'superadmin' || currentUserRole === 'admin') && (
          <Box mb={3} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              label="جستجو در نام"
              variant="outlined"
              size="small"
              value={filters.name}
              onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
              sx={{ flex: '1 1 200px' }}
            />
            <TextField
              label="جستجو در ایمیل"
              variant="outlined"
              size="small"
              value={filters.email}
              onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
              sx={{ flex: '1 1 200px' }}
            />
            <TextField
              label="جستجو در شماره تلفن"
              variant="outlined"
              size="small"
              value={filters.phone}
              onChange={(e) => setFilters(prev => ({ ...prev, phone: e.target.value }))}
              sx={{ flex: '1 1 200px' }}
            />
            <FormControl variant="outlined" size="small" sx={{ flex: '1 1 200px' }}>
              <InputLabel id="role-filter-label">فیلتر نقش</InputLabel>
              <Select
                labelId="role-filter-label"
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                label="فیلتر نقش"
              >
                <MenuItem value="">همه نقش‌ها</MenuItem>
                {roles.map(role => (
                  <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl variant="outlined" size="small" sx={{ flex: '1 1 200px' }}>
              <InputLabel id="device-type-filter-label">فیلتر نوع دستگاه</InputLabel>
              <Select
                labelId="device-type-filter-label"
                value={filters.deviceType}
                onChange={(e) => setFilters(prev => ({ ...prev, deviceType: e.target.value }))}
                label="فیلتر نوع دستگاه"
              >
                <MenuItem value="">همه دستگاه‌ها</MenuItem>
                {deviceTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button 
              variant="outlined" 
              onClick={() => setFilters({ name: '', email: '', phone: '', role: '', deviceType: '' })}
              sx={{ flex: '0 0 auto' }}
            >
              پاک کردن فیلترها
            </Button>
          </Box>
        )}
        
        <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell align="center">نام</TableCell>
                <TableCell align="center">ایمیل</TableCell>
                <TableCell align="center">شماره تلفن</TableCell>
                <TableCell align="center">نقش</TableCell>
                <TableCell align="center">نوع دستگاه‌های مجاز</TableCell>
                <TableCell align="center">تاریخ ایجاد</TableCell>
                <TableCell align="center">عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell align="center">{user.name}</TableCell>
                  <TableCell align="center">{user.email}</TableCell>
                  <TableCell align="center">{user.phone}</TableCell>
                  <TableCell align="center">{roles.find(r => r.value === user.role)?.label}</TableCell>
                  <TableCell align="center">{(user.allowedDeviceTypes || []).map(val => deviceTypes.find(dt => dt.value === val)?.label).join(', ')}</TableCell>
                  <TableCell align="center">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fa-IR') : ''}</TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => handleEdit(user)} disabled={!canEditOrDeleteUser(user)}><Edit /></IconButton>
                    <IconButton color="error" onClick={() => handleDelete(user._id)} disabled={
                      !canEditOrDeleteUser(user) || 
                      ['expert','agent','acceptor'].includes(currentUserRole) || 
                      (currentUserRole === 'admin' && user._id === currentUserId) || // مدیر نتواند خودش را حذف کند
                      (currentUserRole === 'superadmin' && user._id === currentUserId) // سوپرادمین نتواند خودش را حذف کند
                    }><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default Users; 