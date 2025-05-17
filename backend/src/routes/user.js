const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// ایجاد کاربر جدید
router.post('/', auth, userController.createUser);
// دریافت همه کاربران
router.get('/', auth, userController.getAllUsers);
// دریافت کاربر با آیدی
router.get('/:id', auth, userController.getUserById);
// ویرایش کاربر
router.put('/:id', auth, userController.updateUser);
// حذف کاربر
router.delete('/:id', auth, userController.deleteUser);

module.exports = router; 