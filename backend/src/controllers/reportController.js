const Ticket = require('../models/ticket');
const Device = require('../models/device');

// گزارش تعداد تیکت‌ها بر اساس وضعیت
exports.ticketsReport = async (req, res) => {
  try {
    const data = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);
    res.json(data);
  } catch (err) {
    console.error('Error in ticketsReport:', err);
    res.status(500).json({ error: err.message });
  }
};

// گزارش تعداد دستگاه‌ها بر اساس نوع
exports.devicesReport = async (req, res) => {
  try {
    const data = await Device.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } }
    ]);
    res.json(data);
  } catch (err) {
    console.error('Error in devicesReport:', err);
    res.status(500).json({ error: err.message });
  }
};

// گزارش عملکرد هر کارشناس و نماینده
exports.performanceReport = async (req, res) => {
  try {
    // تعداد تیکت‌هایی که پاسخ داده شده (status: 'answered') گروه‌بندی بر اساس کارشناس
    const experts = await Ticket.aggregate([
      { $match: { status: 'answered' } },
      { $group: { _id: '$expert', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.name', count: 1, role: '$user.role', _id: 0 } }
    ]);
    // تعداد تیکت‌های ایجاد شده توسط نمایندگان (agent)
    const agents = await Ticket.aggregate([
      { $group: { _id: '$creator', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.role': 'agent' } },
      { $project: { name: '$user.name', count: 1, role: '$user.role', _id: 0 } }
    ]);
    res.json({ experts, agents });
  } catch (err) {
    console.error('Error in performanceReport:', err);
    res.status(500).json({ error: err.message });
  }
};

// گزارش میانگین زمان پاسخ و رفع مشکل
exports.avgTimeReport = async (req, res) => {
  try {
    // میانگین زمان پاسخ (tickets with status 'answered')
    const resp = await Ticket.aggregate([
      { $match: { status: 'answered' } },
      { $group: { _id: null, avgResponse: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } } } },
      { $project: { _id: 0, avgResponse: 1 } }
    ]);
    // میانگین زمان رفع مشکل (tickets with status 'resolved')
    const resl = await Ticket.aggregate([
      { $match: { status: 'resolved' } },
      { $group: { _id: null, avgResolution: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } } } },
      { $project: { _id: 0, avgResolution: 1 } }
    ]);
    const avgResponse = resp[0]?.avgResponse || 0;
    const avgResolution = resl[0]?.avgResolution || 0;
    res.json({ avgResponse, avgResolution });
  } catch (err) {
    console.error('Error in avgTimeReport:', err);
    res.status(500).json({ error: err.message });
  }
}; 