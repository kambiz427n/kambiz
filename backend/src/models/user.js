const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'expert', 'agent', 'acceptor'],
    required: true,
  },
  allowedDeviceTypes: [{
    type: String,
    enum: ['POS', 'ATM', 'Cashless'],
  }],
  password: {
    type: String,
    required: true,
  },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

module.exports = mongoose.model('User', userSchema); 