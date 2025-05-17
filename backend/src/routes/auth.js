const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// مسیر login غیرفعال شده است - اکنون از طریق وب‌سوکت انجام می‌شود
// router.post('/login', authController.login);
 
module.exports = router; 