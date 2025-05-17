const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

// تعداد تیکت‌ها بر اساس وضعیت
router.get('/tickets', auth, reportController.ticketsReport);

// تعداد دستگاه‌ها بر اساس نوع
router.get('/devices', auth, reportController.devicesReport);

// گزارش عملکرد کارشناسان و نمایندگان
router.get('/performance', auth, reportController.performanceReport);

// گزارش میانگین زمان پاسخ و رفع مشکل
router.get('/time', auth, reportController.avgTimeReport);

module.exports = router; 