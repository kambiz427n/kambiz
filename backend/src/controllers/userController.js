const User = require('../models/user');
const bcrypt = require('bcryptjs');

// ایجاد کاربر جدید
exports.createUser = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const user = new User(data);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// دریافت همه کاربران
exports.getAllUsers = async (req, res) => {
  try {
    const { role, id } = req.user;
    let users;
    if (role === 'superadmin') {
      users = await User.find();
    } else if (role === 'admin') {
      // فقط کاربران expert, agent, acceptor که allowedDeviceTypes مشترک دارند و خود مدیر
      const myUser = await User.findById(id);
      users = await User.find({
        $or: [
          { _id: id }, // خودش
          {
            role: { $in: ['expert', 'agent', 'acceptor'] },
            allowedDeviceTypes: { $in: myUser.allowedDeviceTypes }
          }
        ]
      });
    } else if (["expert", "agent", "acceptor"].includes(role)) {
      users = await User.find({ _id: id });
    } else {
      users = [];
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// دریافت کاربر با آیدی
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ویرایش کاربر
exports.updateUser = async (req, res) => {
  try {
    const { role, id } = req.user;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    // سوپرادمین: همه را می‌تواند ویرایش کند
    if (role === 'superadmin') {
      // سوپر ادمین نمی‌تواند نقش خودش را تغییر دهد
      if (targetUser._id.equals(id) && req.body.role && req.body.role !== 'superadmin') {
        return res.status(403).json({ error: 'سوپرادمین نمی‌تواند نقش خود را تغییر دهد' });
      }
      
      // سوپر ادمین می‌تواند رمز عبور خودش و دیگران را تغییر دهد
      const data = { ...req.body };
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
        console.log('Password will be updated for user (by superadmin):', req.params.id);
      } else {
        delete data.password;
      }
      const user = await User.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
      return res.json(user);
    }
    // ادمین: فقط کاربران expert, agent, acceptor که allowedDeviceTypes مشترک دارند
    if (role === 'admin') {
      const myUser = await User.findById(id);
      const isSubordinate = ['expert', 'agent', 'acceptor'].includes(targetUser.role) &&
        targetUser.allowedDeviceTypes.some(type => myUser.allowedDeviceTypes.includes(type));
      if (targetUser._id.equals(id)) {
        // روی خودش: فقط فیلدهای غیر name, role, allowedDeviceTypes و فقط رمز خودش
        const allowedFields = ['email', 'phone', 'password'];
        const data = {};
        for (const key of allowedFields) {
          if (req.body[key] !== undefined) data[key] = req.body[key];
        }
        if (data.password) {
          data.password = await bcrypt.hash(data.password, 10);
        } else {
          delete data.password;
        }
        const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        return res.json(user);
      } else if (isSubordinate) {
        // روی زیردستان: همه فیلدها به جز رمز عبور (که فقط خودشان می‌توانند تغییر دهند)
        if (req.body.password) {
          // اجازه بده مدیر رمز عبور زیردستان را تغییر دهد
          const data = { ...req.body };
          if (data.password) {
            // اطمینان از هش شدن رمز عبور
            data.password = await bcrypt.hash(data.password, 10);
            console.log('Password will be updated for subordinate:', req.params.id);
          }
          const user = await User.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
          return res.json(user);
        } else {
          const data = { ...req.body };
          delete data.password;
          const user = await User.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
          return res.json(user);
        }
      } else {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
      }
    }
    // expert/agent/acceptor: فقط خودش و فقط رمز عبور
    if (["expert", "agent", "acceptor"].includes(role)) {
      if (!targetUser._id.equals(id)) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
      }
      const allowedFields = ['password'];
      const data = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      } else {
        delete data.password;
      }
      const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
      return res.json(user);
    }
    return res.status(403).json({ error: 'دسترسی غیرمجاز' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// حذف کاربر
exports.deleteUser = async (req, res) => {
  try {
    const { role, id } = req.user;
    const targetUser = await User.findById(req.params.id);
    
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    
    // مدیر نمی‌تواند خودش را حذف کند
    if (role === 'admin' && targetUser._id.equals(id)) {
      return res.status(403).json({ error: 'مدیر نمی‌تواند اکانت خودش را حذف کند' });
    }
    
    // سوپرادمین هم نمی‌تواند خودش را حذف کند
    if (role === 'superadmin' && targetUser._id.equals(id)) {
      return res.status(403).json({ error: 'سوپرادمین نمی‌تواند اکانت خودش را حذف کند' });
    }
    
    // سوپرادمین: همه را می‌تواند حذف کند بجز خودش
    if (role === 'superadmin') {
      const user = await User.findByIdAndDelete(req.params.id);
      return res.json({ message: 'User deleted' });
    }
    
    // ادمین: فقط کاربران expert, agent, acceptor که allowedDeviceTypes مشترک دارند
    if (role === 'admin') {
      const myUser = await User.findById(id);
      const isSubordinate = ['expert', 'agent', 'acceptor'].includes(targetUser.role) &&
        targetUser.allowedDeviceTypes.some(type => myUser.allowedDeviceTypes.includes(type));
      
      if (isSubordinate) {
        const user = await User.findByIdAndDelete(req.params.id);
        return res.json({ message: 'User deleted' });
      } else {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
      }
    }
    
    return res.status(403).json({ error: 'دسترسی غیرمجاز' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 