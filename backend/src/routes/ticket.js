const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

console.log('Initializing ticket routes...');

// اطمینان از وجود دایرکتوری آپلود
const uploadDir = path.join(__dirname, '../../uploads');
console.log('Upload directory path:', uploadDir);

if (!fs.existsSync(uploadDir)) {
  console.log('Upload directory does not exist. Creating it...');
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Upload directory created successfully.');
} else {
  console.log('Upload directory already exists.');
}

// تنظیمات ذخیره فایل
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Multer destination called for file:', file.originalname);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    console.log('Multer filename called for file:', file.originalname);
    // استفاده از تایم استمپ برای جلوگیری از تداخل نام فایل‌ها
    const timestamp = Date.now();
    // حذف فاصله‌ها و کاراکترهای خاص از نام فایل
    const sanitizedName = file.originalname.replace(/\s+/g, '_').replace(/[^\w\-_.]/g, '');
    const fileName = `${timestamp}-${sanitizedName}`;
    console.log('Generated filename:', fileName);
    cb(null, fileName);
  }
});

// فیلتر فایل‌های مجاز
const fileFilter = (req, file, cb) => {
  console.log('File filter checking file:', file.originalname, 'Mimetype:', file.mimetype);
  
  // انواع فایل‌های مجاز
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 
    'application/pdf', 
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    console.log('File type accepted');
    cb(null, true);
  } else {
    console.log('File type rejected');
    cb(new Error(`نوع فایل ${file.mimetype} مجاز نیست. فقط تصاویر، PDF، Word، Excel و متن ساده پذیرفته می‌شوند.`), false);
  }
};

// تنظیمات آپلودر
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // حداکثر 10 مگابایت
  }
});

// میدلور بررسی درخواست قبل از آپلود
const logRequestDetails = (req, res, next) => {
  console.log('=== INCOMING FILE UPLOAD REQUEST ===');
  console.log('Request method:', req.method);
  console.log('Request path:', req.path);
  console.log('Content-Type header:', req.headers['content-type']);
  console.log('Request body fields:', Object.keys(req.body));
  console.log('Request has file:', req.file ? 'Yes' : 'No');
  next();
};

// میدلور مدیریت خطای آپلود
const handleUploadError = (req, res, next) => {
  console.log('Starting file upload middleware for request');
  
  // اضافه کردن میانور بررسی درخواست
  logRequestDetails(req, res, () => {
    return upload.single('file')(req, res, (err) => {
      console.log('Multer middleware completed');
      
      if (err instanceof multer.MulterError) {
        // خطای مولتر
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'حجم فایل بیش از حد مجاز است (حداکثر 10 مگابایت)' });
        }
        return res.status(400).json({ error: `خطا در آپلود فایل: ${err.message}` });
      } else if (err) {
        // سایر خطاها
        console.error('Non-Multer error:', err);
        return res.status(400).json({ error: err.message });
      }
      
      // بدون خطا
      console.log('File upload successful:', req.file ? req.file.filename : 'No file uploaded');
      next();
    });
  });
};

// ایجاد تیکت جدید
router.post('/', auth, handleUploadError, ticketController.createTicket);
// دریافت همه تیکت‌ها
router.get('/', auth, ticketController.getAllTickets);
// دریافت تیکت با آیدی
router.get('/:id', auth, ticketController.getTicketById);
// ثبت پاسخ توسط کارشناس
router.post('/:id/reply', auth, ticketController.replyTicket);
// تایید تیکت توسط پذیرنده/نماینده
router.post('/:id/confirm', auth, ticketController.confirmTicket);
// افزودن پیام (متن یا فایل) به گفتگو
router.post('/:id/add-reply', auth, handleUploadError, ticketController.addReply);
// تغییر وضعیت به در حال بررسی توسط کارشناس
router.post('/:id/pending', auth, ticketController.setPending);
// تغییر وضعیت به برطرف شد توسط کارشناس
router.post('/:id/resolved', auth, ticketController.setResolved);
// تغییر وضعیت به رد شده توسط پذیرنده/نماینده
router.post('/:id/rejected', auth, ticketController.setRejected);
// dispatch replenisher for ATM tickets
router.post('/:id/dispatch', auth, ticketController.dispatchReplenisher);

module.exports = router; 