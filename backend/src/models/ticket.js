const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: false },
  errorType: { type: String, enum: [
    ...Array.from({ length: 99 }, (_, i) => `error${i + 1}`),
    'manual'
  ], required: true },
  description: { type: String, required: true },
  manualErrorType: { type: String },
  tags: { type: [String], default: [] },
  file: { type: String },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reply: { type: String },
  status: { type: String, enum: [
    'new', 'pending', 'answered', 'resolved', 'confirmed', 'rejected',
    'فعال', 'نیاز به تعمیر', 'آفلاین', 'درحال سرویس', 'نیاز به پول رسانی', 'نیاز به رول', 'اعزام پول رسان'
  ], default: 'new' },
  expert: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  replies: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String },
    file: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema); 