const Ticket = require('../models/ticket');
const Device = require('../models/device');
const User = require('../models/user');
const path = require('path');
const fs = require('fs');

// ثبت تیکت جدید
exports.createTicket = async (req, res) => {
  try {
    console.log('=== CREATE TICKET REQUEST ===');
    console.log('BODY:', JSON.stringify(req.body, null, 2));
    console.log('FILE:', req.file ? JSON.stringify(req.file, null, 2) : 'No file uploaded');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    const { device, errorType, description, status, tags } = req.body;
    
    // parse free-form tags JSON
    let parsedTags = [];
    if (tags) {
      try {
        if (Array.isArray(tags)) {
          parsedTags = tags;
        } else if (typeof tags === 'string') {
          const parsed = JSON.parse(tags);
          parsedTags = Array.isArray(parsed) ? parsed : [];
        } else {
          parsedTags = [];
        }
      } catch (e) {
        console.error('Error parsing tags:', e);
        parsedTags = [];
      }
    }
    
    // بررسی و ذخیره فایل
    let file = null;
    if (req.file) {
      console.log('File received successfully:', req.file.filename);
      file = `/uploads/${req.file.filename}`;
      
      // بررسی اینکه آیا فایل واقعاً وجود دارد
      const filePath = path.join(__dirname, '../../uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        console.log('File exists at path:', filePath);
        
        // بررسی اندازه فایل
        const stats = fs.statSync(filePath);
        console.log('File size:', stats.size, 'bytes');
      } else {
        console.error('File not found at path:', filePath);
      }
    } else {
      console.log('No file was uploaded with this request');
    }
    
    // ایجاد تیکت
    const ticket = new Ticket({
      device: device || undefined,
      errorType,
      description,
      tags: parsedTags,
      status: status || undefined,
      file,
      creator: req.user.id,
      manualDevice: req.body.manualDevice || undefined,
      manualErrorType: req.body.manualErrorType || undefined,
    });
    
    // ذخیره تیکت
    const savedTicket = await ticket.save();
    console.log('Ticket saved successfully:', savedTicket._id);
    console.log('Ticket file field:', savedTicket.file);
    
    // Populate ticket for emit
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('device')
      .populate('creator', 'name role allowedDeviceTypes email phone');
      
    // Emit new-ticket event
    req.app.get('io').emit('new-ticket', populatedTicket);
    
    // پاسخ به کلاینت
    res.status(201).json(ticket);
  } catch (err) {
    console.error('TICKET CREATE ERROR:', err);
    res.status(400).json({ error: err.message });
  }
};

// دریافت همه تیکت‌ها (با populate)
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('device')
      .populate('creator', 'name role allowedDeviceTypes email phone')
      .populate('replies.sender', 'name role');
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// دریافت تیکت با آیدی
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('device')
      .populate('creator', 'name role allowedDeviceTypes email phone')
      .populate('replies.sender', 'name role');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ثبت پاسخ توسط کارشناس
exports.replyTicket = async (req, res) => {
  console.log('REPLY ENDPOINT BODY:', req.body);
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.reply = req.body.reply;
    ticket.status = 'answered';
    ticket.expert = req.user.id;
    await ticket.save();
    // ارسال رویداد WebSocket برای پاسخ جدید
    const populatedTicketForReply = await Ticket.findById(ticket._id)
      .populate('device')
      .populate('creator', 'name role allowedDeviceTypes email phone');
    // ارسال رویداد WebSocket فقط به ثبت‌کننده تیکت
    const userSockets = req.app.get('userSockets');
    const creatorId = populatedTicketForReply.creator?._id?.toString();
    if (creatorId && userSockets.has(creatorId)) {
      const socketId = userSockets.get(creatorId);
      req.app.get('io').to(socketId).emit('reply-ticket', populatedTicketForReply);
    }
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// تایید تیکت توسط پذیرنده/نماینده
exports.confirmTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    // فقط ثبت‌کننده تیکت (پذیرنده/نماینده) اجازه تایید دارد
    if (ticket.creator.toString() !== req.user.id) {
      return res.status(403).json({ error: 'شما اجازه تایید این تیکت را ندارید' });
    }
    // اگر تیکت در وضعیت اعزام پول رسان بود، بعد از تایید پول‌رسانی، وضعیت پول دستگاه را به 'in_service' بروزرسانی کن
    const wasDispatch = ticket.status === 'اعزام پول رسان';
    ticket.status = 'confirmed';
    await ticket.save();
    if (wasDispatch && ticket.device) {
      await Device.findByIdAndUpdate(ticket.device, { cashStatus: 'in_service' });
    }
    const populatedTicketForConfirm = await Ticket.findById(ticket._id)
      .populate('device')
      .populate('creator', 'name role allowedDeviceTypes email phone');
    // ارسال رویداد WebSocket به همه
    req.app.get('io').emit('confirm-ticket', populatedTicketForConfirm);
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// افزودن پیام (متن یا فایل) به گفتگو
exports.addReply = async (req, res) => {
  try {
    console.log('=== ADD REPLY REQUEST ===');
    console.log('BODY:', JSON.stringify(req.body, null, 2));
    console.log('FILE:', req.file ? JSON.stringify(req.file, null, 2) : 'No file uploaded');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));

    const ticket = await Ticket.findById(req.params.id).populate('replies.sender', 'name role');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    
    // فقط creator یا اولین کارشناس پاسخ‌دهنده مجاز است
    const userId = req.user.id;
    const userRole = req.user.role;
    const isCreator = userId === ticket.creator.toString();
    const isExpert = userRole === 'expert';
    
    // پیدا کردن اولین expert پاسخ‌دهنده
    let expertId = null;
    const firstExpertReply = ticket.replies.find(r => r.sender && r.sender.role === 'expert');
    if (firstExpertReply) {
      expertId = firstExpertReply.sender._id.toString();
    } else if (ticket.expert) {
      expertId = ticket.expert.toString();
    } else if (isExpert) {
      expertId = userId;
    }
    
    const hasExpertReply = ticket.replies.some(r => r.sender && r.sender._id.toString() === userId && r.sender.role === 'expert');
    if (
      !isCreator &&
      !(
        isExpert &&
        (
          !firstExpertReply || // هنوز هیچ کارشناس پیام نداده
          expertId === userId ||     // خودش اولین expert است
          hasExpertReply       // خودش قبلاً پیام داده
        )
      )
    ) {
      return res.status(403).json({ error: 'شما اجازه ارسال پیام در این گفتگو را ندارید' });
    }
    
    // بررسی و ذخیره فایل
    let file = null;
    if (req.file) {
      console.log('Reply file received successfully:', req.file.filename);
      file = `/uploads/${req.file.filename}`;
      
      // بررسی اینکه آیا فایل واقعاً وجود دارد
      const filePath = path.join(__dirname, '../../uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        console.log('Reply file exists at path:', filePath);
        
        // بررسی اندازه فایل
        const stats = fs.statSync(filePath);
        console.log('Reply file size:', stats.size, 'bytes');
      } else {
        console.error('Reply file not found at path:', filePath);
      }
    } else {
      console.log('No file was uploaded with this reply');
    }
    
    if (!req.body.message && !file) {
      return res.status(422).json({ error: 'متن پیام یا فایل الزامی است.' });
    }
    
    const reply = {
      sender: userId,
      message: req.body.message,
      file,
      createdAt: new Date()
    };
    
    console.log('Adding reply to ticket:', reply);
    ticket.replies.push(reply);
    
    const savedTicket = await ticket.save();
    console.log('Ticket updated with reply. Reply count:', savedTicket.replies.length);
    
    const populatedTicketForAddReply = await Ticket.findById(ticket._id)
      .populate('device')
      .populate('creator', 'name role allowedDeviceTypes email phone')
      .populate('replies.sender', 'name role');
      
    // ارسال پیام جدید فقط به creator و کارشناس
    const userSockets = req.app.get('userSockets');
    const creatorId = ticket.creator.toString();
    if (userSockets.has(creatorId)) {
      req.app.get('io').to(userSockets.get(creatorId)).emit('ticket-reply', populatedTicketForAddReply);
    }
    if (expertId && userSockets.has(expertId)) {
      req.app.get('io').to(userSockets.get(expertId)).emit('ticket-reply', populatedTicketForAddReply);
    }
    
    res.json(reply);
  } catch (err) {
    console.error('ADD REPLY ERROR:', err);
    res.status(400).json({ error: err.message });
  }
};

// تغییر وضعیت به در حال بررسی توسط کارشناس
exports.setPending = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.status = 'pending';
    await ticket.save();
    const populatedTicketForPending = await Ticket.findById(ticket._id)
      .populate('device')
      .populate('creator', 'name role allowedDeviceTypes email phone')
      .populate('replies.sender', 'name role');
    req.app.get('io').emit('status-changed', populatedTicketForPending);
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// تغییر وضعیت به برطرف شد توسط کارشناس
exports.setResolved = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.status = 'resolved';
    await ticket.save();
    const populatedTicketForResolved = await Ticket.findById(ticket._id)
      .populate('device')
      .populate('creator', 'name role allowedDeviceTypes email phone')
      .populate('replies.sender', 'name role');
    req.app.get('io').emit('status-changed', populatedTicketForResolved);
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// تغییر وضعیت به رد شده توسط پذیرنده/نماینده
exports.setRejected = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.status = 'rejected';
    await ticket.save();
    const populatedTicketForRejected = await Ticket.findById(ticket._id)
      .populate('device')
      .populate('creator', 'name role allowedDeviceTypes email phone')
      .populate('replies.sender', 'name role');
    req.app.get('io').emit('status-changed', populatedTicketForRejected);
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// dispatch replenisher برای تیکت‌های ATM (اعزام پول رسان)
exports.dispatchReplenisher = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.status = 'اعزام پول رسان';
    await ticket.save();
    const populatedTicketForDispatch = await Ticket.findById(ticket._id)
      .populate('device')
      .populate('creator', 'name role allowedDeviceTypes email phone')
      .populate('replies.sender', 'name role');
    req.app.get('io').emit('status-changed', populatedTicketForDispatch);
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}; 