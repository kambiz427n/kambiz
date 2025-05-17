const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/user');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function createSuperadmin() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const email = 'superadmin@example.com';
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Superadmin already exists:', existing.email);
    process.exit(0);
  }

  const password = await bcrypt.hash('SuperSecurePassword123!', 10);
  const superadmin = new User({
    name: 'Super Admin',
    email,
    phone: '09120000000',
    role: 'superadmin',
    password,
    allowedDeviceTypes: ['POS', 'ATM', 'Cashless'],
  });
  await superadmin.save();
  console.log('Superadmin created:', superadmin.email);
  process.exit(0);
}

createSuperadmin().catch(err => {
  console.error('Error creating superadmin:', err);
  process.exit(1);
}); 