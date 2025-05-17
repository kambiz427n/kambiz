const mongoose = require('mongoose');

const identifierSchema = new mongoose.Schema({
  serial: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  terminal: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  }
}, { _id: false });

const deviceSchema = new mongoose.Schema({
  identifier: {
    type: identifierSchema,
    required: true
  },
  serialNumber: {
    type: String,
    sparse: true,
  },
  type: {
    type: String,
    enum: ['POS', 'ATM', 'Cashless'],
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  softwareVersion: {
    type: String,
    required: true,
  },
  location: {
    province: { type: String, required: true },
    city: { type: String, required: true },
  },
  merchant: {
    type: String,
    required: true,
  },
  cashStatus: {
    type: String,
    enum: [
      'full', 'empty', 'needs_cash', 'unknown',
      'active', 'needs_service', 'needs_roll',
      'in_service', 'needs_replenishment'
    ],
    required: function() { return this.type === 'ATM'; },
    default: function() { return this.type === 'ATM' ? 'unknown' : undefined; },
  },
}, { timestamps: true });

deviceSchema.pre('validate', function(next) {
  if (!this.identifier || (!this.identifier.serial && !this.identifier.terminal)) {
    this.invalidate('identifier', 'حداقل یکی از سریال یا ترمینال باید وارد شود.');
  }
  
  if (this.identifier && this.identifier.serial) {
    this.serialNumber = this.identifier.serial;
  }
  
  next();
});

module.exports = mongoose.model('Device', deviceSchema); 