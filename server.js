const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'cryptoSecret123';

const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const { encrypt, decrypt } = require('./utils/cryptoUtils');

// إعداد multer لتخزين الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // حد 5 ميغابايت للملفات
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt|png|jpg|jpeg|gif|wav|mp3/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('نوع الملف غير مدعوم. يُسمح فقط بـ PDF, DOC, TXT, PNG, JPG, JPEG, GIF, WAV, MP3.'));
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/node_modules', express.static('node_modules'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect('mongodb://localhost:27017/cryptochat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ تم الاتصال بقاعدة بيانات MongoDB');

  // إنشاء حساب الإداري إذا لم يكن موجودًا
  const adminEmail = 'ferdousadmin@gmail.com';
  const adminPassword = 'ferdousadmin';
  const admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const newAdmin = new User({
      name: 'Ferdous Admin',
      email: adminEmail,
      password: adminPassword, // التشفير يتم تلقائيًا بواسطة userSchema.pre('save')
      isAdmin: true,
    });
    await newAdmin.save();
    console.log('✅ تم إنشاء حساب الإداري بنجاح: ferdousadmin@gmail.com');
  } else {
    console.log('✅ الحساب الإداري موجود بالفعل.');
  }
}).catch(err => {
  console.error('❌ فشل الاتصال بMongoDB:', err);
});

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || name.trim().length < 2) return res.status(400).json({ message: 'الاسم مطلوب ويجب أن يكون أكثر من حرفين.' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'البريد الإلكتروني غير صالح.' });
  if (!password || password.length < 5) return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 5 أحرف على الأقل.' });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'البريد الإلكتروني مسجل بالفعل.' });
    const newUser = new User({ name, email, password }); // التشفير يتم تلقائيًا في userSchema.pre('save')
    await newUser.save();
    res.json({ message: 'تم التسجيل بنجاح!' });
  } catch (err) {
    console.error('❌ خطأ في التسجيل:', err);
    res.status(500).json({ message: 'خطأ في الخادم.' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'البريد الإلكتروني غير صالح.' });
  if (!password || password.length < 5) return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 5 أحرف على الأقل.' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'المستخدم غير موجود.' });
    const isMatch = await user.verifyPassword(password); // استخدام الطريقة من User.js
    if (!isMatch) return res.status(401).json({ message: 'كلمة المرور غير صحيحة.' });
    const token = jwt.sign({ userId: user._id, name: user.name }, SECRET_KEY, { expiresIn: '2h' });
    res.json({ message: 'تم تسجيل الدخول بنجاح!', token, userId: user._id });
  } catch (err) {
    console.error('❌ خطأ في تسجيل الدخول:', err);
    res.status(500).json({ message: 'خطأ في الخادم.' });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.log('❌ لا توكن في الطلب');
    return res.status(401).json({ message: '❌ لا يوجد توكن. الدخول مرفوض.' });
  }
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.log('❌ خطأ في التوثيق:', err.message);
      return res.status(403).json({ message: '❌ توكن غير صالح أو منتهي.' });
    }
    req.user = user;
    next();
  });
}

function authenticateAdmin(req, res, next) {
  authenticateToken(req, res, async () => {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin || user.email !== 'ferdousadmin@gmail.com') {
      return res.status(403).json({ message: '❌ صلاحيات إدارية مطلوبة.' });
    }
    next();
  });
}

app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ message: '✅ تم الوصول إلى الصفحة المحمية!', user });
  } catch (err) {
    console.error('❌ خطأ في /profile:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر.' });
  }
});

app.put('/profile', authenticateToken, async (req, res) => {
  const { name, password, profilePicture } = req.body;
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود.' });
    if (name) user.name = name;
    if (password) user.password = password; // التشفير يتم تلقائيًا في userSchema.pre('save')
    if (profilePicture) user.profilePicture = profilePicture;
    await user.save();
    res.json({ message: 'تم تحديث الملف الشخصي بنجاح!' });
  } catch (err) {
    console.error('❌ خطأ في تحديث الملف الشخصي:', err);
    res.status(500).json({ message: 'خطأ في الخادم.' });
  }
});

app.post('/user', authenticateToken, async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email }).select('name profilePicture');
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
    res.json({ userId: user._id, name: user.name, profilePicture: user.profilePicture });
  } catch (err) {
    console.error('❌ خطأ في البحث عن المستخدم:', err);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

app.post('/conversations', async (req, res) => {
  const { user1Id, user2Id } = req.body;
  try {
    const existing = await Conversation.findOne({
      participants: { $all: [user1Id, user2Id], $size: 2 }
    });
    if (existing) return res.json({ message: 'المحادثة موجودة مسبقًا', conversation: existing });
    const key = crypto.randomBytes(32).toString('hex');
    const newConversation = new Conversation({
      participants: [user1Id, user2Id],
      encryptionKey: key
    });
    await newConversation.save();
    res.status(201).json({ message: '✅ تم إنشاء المحادثة!', conversation: newConversation });
  } catch (err) {
    console.error('❌ خطأ في إنشاء المحادثة:', err);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

app.post('/group-conversations', authenticateToken, async (req, res) => {
  const { participantIds, groupName } = req.body;
  try {
    if (!Array.isArray(participantIds) || participantIds.length < 2) {
      return res.status(400).json({ message: 'يجب اختيار ما لا يقل عن مستخدمين اثنين لإنشاء مجموعة.' });
    }

    const userId = req.user.userId;
    const updatedParticipantIds = [...new Set([...participantIds, userId])]; // إزالة التكرارات وإضافة المستخدم الحالي

    const objectIdParticipants = updatedParticipantIds.map(id => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`معرف مستخدم غير صالح: ${id}`);
      }
      return new mongoose.Types.ObjectId(id);
    });

    const users = await User.find({ _id: { $in: objectIdParticipants } });
    if (users.length !== objectIdParticipants.length) {
      return res.status(400).json({ message: 'بعض المستخدمين غير موجودين.' });
    }

    const existing = await Conversation.findOne({
      participants: { $all: objectIdParticipants, $size: objectIdParticipants.length },
      groupName
    });

    if (existing) {
      return res.status(400).json({ message: 'مجموعة بهذا الاسم موجودة بالفعل.' });
    }

    const key = crypto.randomBytes(32).toString('hex');
    const newConversation = new Conversation({
      participants: objectIdParticipants,
      encryptionKey: key,
      groupName: groupName || `Group_${Date.now()}`
    });
    await newConversation.save();

    res.status(201).json({ message: '✅ تم إنشاء المجموعة بنجاح!', conversation: newConversation });
  } catch (err) {
    console.error('❌ خطأ في إنشاء المجموعة:', err.message);
    res.status(500).json({ message: 'خطأ في الخادم: ' + err.message });
  }
});

app.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.userId,
    }).populate('participants', 'name email profilePicture');
    res.json(conversations);
  } catch (err) {
    console.error('❌ خطأ في جلب المحادثات:', err);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

app.delete('/conversations/:conversationId', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const userId = req.user.userId;
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });
    if (!conversation) return res.status(404).json({ message: 'المحادثة غير موجودة أو ليست متاحة لك' });
    const messages = await Message.find({ conversationId });
    messages.forEach(msg => {
      if (msg.file) {
        const filePath = path.join(__dirname, msg.file);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      if (msg.voice) {
        const voicePath = path.join(__dirname, msg.voice);
        if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);
      }
    });
    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);
    res.json({ message: 'تم حذف المحادثة بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في حذف المحادثة:', err);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

app.delete('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user.userId;
    const message = await Message.findById(messageId);
    if (!message) {
      console.log(`❌ الرسالة ${messageId} غير موجودة`);
      return res.status(404).json({ message: 'الرسالة غير موجودة' });
    }
    if (message.sender.toString() !== userId) {
      console.log(`❌ محاولة حذف رسالة لغير المرسل: ${messageId}`);
      return res.status(403).json({ message: 'غير مسموح حذف رسالة مستخدم آخر' });
    }
    if (message.file) {
      const filePath = path.join(__dirname, message.file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (message.voice) {
      const voicePath = path.join(__dirname, message.voice);
      if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);
    }
    await Message.findByIdAndDelete(messageId);
    console.log(`✅ تم حذف الرسالة ${messageId} بنجاح`);
    res.json({ message: 'تم حذف الرسالة بنجاح' });
  } catch (err) {
    console.error('❌ خطأ في حذف الرسالة:', err);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

app.put('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const { text, image } = req.body;
    const userId = req.user.userId;
    const message = await Message.findById(messageId);
    if (!message) {
      console.log(`❌ الرسالة ${messageId} غير موجودة`);
      return res.status(404).json({ message: 'الرسالة غير موجودة' });
    }
    if (message.sender.toString() !== userId) {
      console.log(`❌ محاولة تعديل رسالة لغير المرسل: ${messageId}`);
      return res.status(403).json({ message: 'غير مسموح تعديل رسالة مستخدم آخر' });
    }
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) return res.status(404).json({ message: 'المحادثة غير موجودة' });
    if (text) message.text = encrypt(text, conversation.encryptionKey); // استخدام الدالة من cryptoUtils.js
    if (image) message.image = image;
    await message.save();
    console.log(`✅ تم تعديل الرسالة ${messageId} بنجاح`);
    res.json({ message: 'تم تعديل الرسالة بنجاح', updatedMessage: { text: text || message.text, image: message.image } });
  } catch (err) {
    console.error('❌ خطأ في تعديل الرسالة:', err);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let users = {};
let activeCalls = new Map();

io.on('connection', socket => {
  console.log('👤 مستخدم متصل:', socket.id);
  socket.on('join', token => {
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        console.error('❌ خطأ في التوثيق:', err.message);
        return socket.emit('error', { message: '❌ توكن غير صالح أو منتهي.' });
      }
      users[user.userId] = socket.id;
      socket.userId = user.userId;
      console.log('📥 المستخدم انضم:', user.userId);
    });
  });

  socket.on('send-message', ({ senderId, receiverIds, message, image, file, voice }) => {
    console.log('📩 إرسال رسالة من:', senderId, 'إلى:', receiverIds);
    receiverIds.forEach(receiverId => {
      const receiverSocketId = users[receiverId];
      if (receiverSocketId && receiverId !== senderId) {
        io.to(receiverSocketId).emit('receive-message', {
          senderId,
          message,
          image,
          file,
          voice
        });
        console.log('✅ تم إرسال الرسالة إلى:', receiverId);
      } else {
        console.log('🚫 المستخدم غير متصل:', receiverId);
      }
    });
  });

  socket.on('call-offer', (data) => {
    const receiverSocketId = users[data.target];
    const callKey = [data.sender, data.target].sort().join('-');

    if (activeCalls.has(callKey)) {
      console.log('🚫 مكالمة نشطة بالفعل بين:', data.sender, 'و', data.target);
      socket.emit('error', { message: 'مكالمة نشطة بالفعل مع هذا المستخدم.' });
      return;
    }

    if (receiverSocketId) {
      console.log('📞 إرسال عرض مكالمة من:', data.sender, 'إلى:', data.target);
      activeCalls.set(callKey, true);
      io.to(receiverSocketId).emit('call-offer', data);
    } else {
      console.log('🚫 المستخدم غير متصل لتلقي عرض المكالمة:', data.target);
      socket.emit('error', { message: 'المستخدم المستهدف غير متصل.' });
      socket.emit('end-call', { target: data.sender, sender: data.target });
    }
  });

  socket.on('call-answer', (data) => {
    const receiverSocketId = users[data.target];
    if (receiverSocketId) {
      console.log('📞 إرسال إجابة مكالمة من:', data.sender, 'إلى:', data.target);
      io.to(receiverSocketId).emit('call-answer', data);
    } else {
      console.log('🚫 المستخدم غير متصل لتلقي إجابة المكالمة:', data.target);
      socket.emit('end-call', { target: data.sender, sender: data.target });
    }
  });

  socket.on('ice-candidate', (data) => {
    const receiverSocketId = users[data.target];
    if (receiverSocketId && data.candidate) {
      console.log('📡 إرسال ICE candidate من:', data.sender, 'إلى:', data.target, 'Candidate:', JSON.stringify(data.candidate));
      io.to(receiverSocketId).emit('ice-candidate', { candidate: data.candidate, target: data.target, sender: data.sender });
    } else {
      console.log('🚫 المستخدم غير متصل أو مرشح ICE غير صالح:', data.target);
    }
  });

  socket.on('end-call', (data) => {
    const receiverSocketId = users[data.target];
    const callKey = [data.sender, data.target].sort().join('-');

    activeCalls.delete(callKey);

    if (receiverSocketId) {
      console.log('📴 إرسال طلب إنهاء مكالمة من:', data.sender, 'إلى:', data.target);
      io.to(receiverSocketId).emit('end-call', data);
    } else {
      console.log('🚫 المستخدم غير متصل لتلقي طلب إنهاء المكالمة:', data.target);
    }
  });

  socket.on('disconnect', () => {
    console.log('👋 مستخدم خرج:', socket.id);
    const userId = socket.userId;
    if (userId) {
      delete users[userId];
      console.log('✅ تم إزالة المستخدم:', userId);
      for (let [callKey, _] of activeCalls) {
        const [user1, user2] = callKey.split('-');
        if (user1 === userId || user2 === userId) {
          activeCalls.delete(callKey);
          const otherUserId = user1 === userId ? user2 : user1;
          const otherSocketId = users[otherUserId];
          if (otherSocketId) {
            io.to(otherSocketId).emit('end-call', { target: otherUserId, sender: userId });
            console.log(`📴 أنهيت مكالمة بين ${userId} و ${otherUserId} بسبب انقطاع الاتصال`);
          }
        }
      }
    }
  });
});

http.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`);
});

// إدارة المستخدمين (محددة للإداري)
app.get('/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'name email');
    res.json(users);
  } catch (err) {
    console.error('❌ خطأ في جلب المستخدمين:', err);
    res.status(500).json({ message: 'خطأ في الخادم.' });
  }
});

app.post('/admin/users', authenticateAdmin, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: '❌ جميع الحقول مطلوبة.' });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: '❌ البريد الإلكتروني مستخدم بالفعل.' });
    const user = new User({
      name,
      email,
      password, // التشفير يتم تلقائيًا في userSchema.pre('save')
      isAdmin: false,
    });
    await user.save();
    res.status(201).json({ message: '✅ تم إضافة المستخدم بنجاح!', user: { name, email } });
  } catch (err) {
    console.error('❌ خطأ في إضافة المستخدم:', err);
    res.status(500).json({ message: 'خطأ في الخادم.' });
  }
});

app.delete('/admin/users/:userId', authenticateAdmin, async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: '❌ معرف المستخدم غير صالح.' });
  }
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: '❌ المستخدم غير موجود.' });
    if (user.email === 'ferdousadmin@gmail.com') {
      return res.status(403).json({ message: '❌ لا يمكن حذف الحساب الإداري.' });
    }
    await User.deleteOne({ _id: userId });
    res.json({ message: '✅ تم حذف المستخدم بنجاح!' });
  } catch (err) {
    console.error('❌ خطأ في حذف المستخدم:', err);
    res.status(500).json({ message: 'خطأ في الخادم.' });
  }
});

app.post('/messages', authenticateToken, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'voice', maxCount: 1 }
]), async (req, res) => {
  const { conversationId, text, image } = req.body;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'المحادثة غير موجودة' });
    const filePath = req.files['file'] ? `/uploads/${req.files['file'][0].filename}` : null;
    const voicePath = req.files['voice'] ? `/uploads/${req.files['voice'][0].filename}` : null;
    const message = new Message({
      conversationId,
      sender: req.user.userId,
      text: text || null, // Store encrypted text as is
      image,
      file: filePath,
      voice: voicePath
    });
    await message.save();
    res.status(201).json({ message: 'تم إرسال الرسالة', messageId: message._id });
  } catch (err) {
    console.error('❌ خطأ في حفظ الرسالة:', err);
    if (req.files['file']) {
      const filePath = path.join(__dirname, 'uploads', req.files['file'][0].filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (req.files['voice']) {
      const voicePath = path.join(__dirname, 'uploads', req.files['voice'][0].filename);
      if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);
    }
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

app.get('/messages/:conversationId', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
    }).populate('sender', 'name');
    res.json(messages); // Return raw encrypted messages
  } catch (err) {
    console.error('❌ خطأ في جلب الرسائل:', err);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

app.post('/verify-password', authenticateToken, async (req, res) => {
  const { password } = req.body;
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود.' });
    const isMatch = await user.verifyPassword(password); // استخدام الطريقة من User.js
    if (isMatch) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة.' });
    }
  } catch (err) {
    console.error('❌ خطأ في التحقق من كلمة المرور:', err);
    res.status(500).json({ message: 'خطأ في الخادم.' });
  }
});