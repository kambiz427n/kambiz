const Device = require('../models/device');

// ایجاد دستگاه جدید
exports.createDevice = async (req, res) => {
  try {
    console.log('================ CREATE DEVICE REQUEST ================');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    const device = new Device(req.body);
    console.log('Device instance before save:', JSON.stringify(device, null, 2));
    
    await device.save();
    console.log('Device saved successfully:', device._id);
    console.log('=======================================================');
    
    // ارسال رویداد Socket.io برای ایجاد دستگاه جدید
    req.app.get('io').emit('device-updated', device);
    
    res.status(201).json(device);
  } catch (err) {
    console.error('================ CREATE DEVICE ERROR ================');
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error name:', err.name);
    if (err.errors) {
      console.error('Validation errors:', JSON.stringify(err.errors, null, 2));
    }
    console.error('Full error object:', err);
    console.error('=======================================================');
    
    res.status(400).json({ error: err.message });
  }
};

// دریافت همه دستگاه‌ها
exports.getAllDevices = async (req, res) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// دریافت دستگاه با آیدی
exports.getDeviceById = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ویرایش دستگاه
exports.updateDevice = async (req, res) => {
  try {
    console.log('================ UPDATE DEVICE REQUEST ================');
    console.log('Device ID:', req.params.id);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    const device = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    
    console.log('Device updated successfully:', device._id);
    console.log('Updated device:', JSON.stringify(device, null, 2));
    console.log('=======================================================');
    
    // ارسال رویداد Socket.io برای به‌روزرسانی دستگاه
    req.app.get('io').emit('device-updated', device);
    
    res.json(device);
  } catch (err) {
    console.error('================ UPDATE DEVICE ERROR ================');
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error name:', err.name);
    if (err.errors) {
      console.error('Validation errors:', JSON.stringify(err.errors, null, 2));
    }
    console.error('Full error object:', err);
    console.error('=======================================================');
    
    res.status(400).json({ error: err.message });
  }
};

// حذف دستگاه
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    
    // ارسال رویداد Socket.io برای حذف دستگاه
    req.app.get('io').emit('device-deleted', { _id: req.params.id });
    
    res.json({ message: 'Device deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 