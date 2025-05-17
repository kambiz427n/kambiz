const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const auth = require('../middleware/auth');

// ایجاد دستگاه جدید
router.post('/', auth, deviceController.createDevice);
// دریافت همه دستگاه‌ها
router.get('/', auth, deviceController.getAllDevices);
// دریافت دستگاه با آیدی
router.get('/:id', auth, deviceController.getDeviceById);
// ویرایش دستگاه
router.put('/:id', auth, deviceController.updateDevice);
// حذف دستگاه
router.delete('/:id', auth, deviceController.deleteDevice);

module.exports = router; 