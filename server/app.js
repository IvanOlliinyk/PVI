// Додайте правильне налаштування CORS:


const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost", "http://localhost:80", "http://localhost:8080"],
    methods: ["GET", "POST"],
    credentials: true
  }
});
app.use(cors({
  origin: function(origin, callback) {
    // Дозволяємо всі локальні з'єднання
    const allowedOrigins = [
      'http://localhost',
      'http://127.0.0.1',
      undefined, // Для локальних файлів та інструментів розробника
      'http://localhost:63342' // PhpStorm вбудований сервер часто використовує цей порт
    ];

    // Перевіряємо, чи запит походить з дозволеного джерела
    // Для розробки можна дозволити будь-яке джерело
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Переконайтеся, що ці рядки також присутні:
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Middleware
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost", "http://localhost:80", "http://localhost:8080"],
  credentials: true
}));
app.use(express.json());

// MongoDB підключення з обробкою помилок
mongoose.connect('mongodb://localhost:27017/pvi_messages', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((error) => {
  console.error('❌ MongoDB connection error:', error);
});

// Сесії з таким самим ключем як у PHP
app.use(session({
  secret: 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  name: 'PHPSESSID', // Використовуємо той самий ключ що і PHP
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/pvi_messages'
  }),
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 години
    sameSite: 'lax'
  }
}));

// Схеми MongoDB (залишаються без змін)
const userSchema = new mongoose.Schema({
  phpUserId: { type: Number, required: true, unique: true },
  email: { type: String, required: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  socketId: String
});

const chatRoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  isGroup: { type: Boolean, default: true }
});

const messageSchema = new mongoose.Schema({
  chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isRead: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }]
});

const User = mongoose.model('User', userSchema);
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
const Message = mongoose.model('Message', messageSchema);

// Допоміжна функція для синхронізації користувача
const syncUserFromPHP = async (phpUserData) => {
  try {
    let user = await User.findOne({ phpUserId: phpUserData.id });

    if (!user) {
      user = new User({
        phpUserId: phpUserData.id,
        email: phpUserData.email,
        firstname: phpUserData.firstname,
        lastname: phpUserData.lastname
      });
    } else {
      user.email = phpUserData.email;
      user.firstname = phpUserData.firstname;
      user.lastname = phpUserData.lastname;
    }

    await user.save();
    return user;
  } catch (error) {
    console.error('Error syncing user from PHP:', error);
    return null;
  }
};

// Middleware для перевірки авторизації
const authenticateUser = (req, res, next) => {
  console.log('Auth check - Session data:', req.session);
  console.log('Auth check - Cookies:', req.cookies);

  // Check both userId (MongoDB ID) and phpUserId (from PHP session)
  if (!req.session.userId && !req.session.phpUserId) {
    // First, check if we have PHPSESSID cookie but just haven't synced yet
    if (req.cookies.PHPSESSID) {
      console.log('Found PHP session cookie but no user data - may need sync');
      return res.status(401).json({
        success: false,
        message: 'Session exists but user data not synced',
        action: 'Please sync user data first by calling /api/sync-user',
        debug: {
          sessionId: req.session.id,
          hasPhpSessionCookie: !!req.cookies.PHPSESSID
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
      debug: {
        sessionId: req.session.id,
        sessionData: req.session,
        cookies: req.cookies
      }
    });
  }
  next();
};

// API маршрути

// Тестовий маршрут
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Node.js server is running',
    session: req.session,
    cookies: req.cookies
  });
});

// Синхронізація користувача з PHP
// Оновлений обробник для синхронізації користувачів
app.post('/api/sync-user', async (req, res) => {
  console.log('Sync-user request received');
  console.log('Headers:', req.headers);
  console.log('Cookies:', req.cookies);
  console.log('Body:', req.body);

  try {
    const { phpUser } = req.body;

    if (!phpUser || !phpUser.id) {
      console.error('Invalid user data received');
      return res.status(400).json({
        success: false,
        message: 'Invalid user data, missing ID'
      });
    }

    // Перевірка, чи існує користувач
    let user = await User.findOne({ phpUserId: phpUser.id });

    if (!user) {
      console.log('Creating new user with phpUserId:', phpUser.id);
      // Створюємо нового користувача
      user = new User({
        phpUserId: phpUser.id,
        email: phpUser.email || 'no-email@example.com',
        firstname: phpUser.firstname || 'User',
        lastname: phpUser.lastname || String(phpUser.id),
        isOnline: true,
        lastSeen: new Date()
      });
    } else {
      console.log('Updating existing user:', user._id);
      // Оновлюємо існуючого користувача
      user.email = phpUser.email || user.email;
      user.firstname = phpUser.firstname || user.firstname;
      user.lastname = phpUser.lastname || user.lastname;
      user.isOnline = true;
      user.lastSeen = new Date();
    }

    // Зберігаємо користувача
    await user.save();

    // Зберігаємо дані в сесії
    req.session.userId = user._id;
    req.session.phpUserId = phpUser.id;
    req.session.userEmail = phpUser.email;
    req.session.userFirstname = phpUser.firstname;
    req.session.userLastname = phpUser.lastname;

    // Зберігаємо сесію і чекаємо завершення
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('User synced and session saved:', req.session);

    // Повертаємо успішну відповідь
    res.json({
      success: true,
      message: 'User synchronized successfully',
      user: {
        _id: user._id,
        phpUserId: user.phpUserId,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname
      },
      session: {
        id: req.sessionID,
        cookie: req.session.cookie
      }
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Отримання списку користувачів
app.get('/api/users', authenticateUser, async (req, res) => {
  try {
    const users = await User.find({}, 'phpUserId email firstname lastname isOnline lastSeen');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Створення нового чату
app.post('/api/sync-user', async (req, res) => {
  console.log('=== Sync-user request received ===');
  console.log('Headers:', req.headers);
  console.log('Cookies:', req.cookies);
  console.log('Body:', req.body);

  try {
    const { phpUser } = req.body;

    if (!phpUser || !phpUser.id) {
      console.error('Invalid user data received');
      return res.status(400).json({
        success: false,
        message: 'Invalid user data, missing ID'
      });
    }

    // Конвертуємо phpUser.id у рядок, оскільки у MongoDB очікується саме такий формат
    const phpUserId = String(phpUser.id);

    console.log(`Looking for user with phpUserId: ${phpUserId}`);

    // Пошук користувача за PHP ID
    let user = await User.findOne({ phpUserId });

    if (!user) {
      console.log('Creating new user with phpUserId:', phpUserId);
      // Створюємо нового користувача
      user = new User({
        phpUserId,
        email: phpUser.email || `user${phpUserId}@example.com`,
        firstname: phpUser.firstname || 'User',
        lastname: phpUser.lastname || phpUserId,
        isOnline: true,
        lastSeen: new Date()
      });
    } else {
      console.log('Updating existing user:', user._id);
      // Оновлюємо існуючого користувача
      user.email = phpUser.email || user.email;
      user.firstname = phpUser.firstname || user.firstname;
      user.lastname = phpUser.lastname || user.lastname;
      user.isOnline = true;
      user.lastSeen = new Date();
    }

    // Зберігаємо користувача
    await user.save();
    console.log(`User saved with ID: ${user._id}`);

    // Зберігаємо дані в сесії
    req.session.userId = user._id;
    req.session.phpUserId = phpUserId;
    req.session.userEmail = phpUser.email;
    req.session.userFirstname = phpUser.firstname;
    req.session.userLastname = phpUser.lastname;

    // Зберігаємо сесію
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
      }

      // Повертаємо успішну відповідь
      res.json({
        success: true,
        message: 'User synchronized successfully',
        user: {
          _id: user._id,
          phpUserId: user.phpUserId,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname
        },
        session: {
          id: req.sessionID,
          cookie: req.session.cookie
        }
      });
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Отримання чат-кімнат користувача
app.get('/api/chat-rooms', authenticateUser, async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find({
      members: req.session.userId
    }).populate('members', 'phpUserId email firstname lastname isOnline lastSeen')
      .populate('createdBy', 'phpUserId email firstname lastname')
      .sort({ createdAt: -1 });

    res.json({ success: true, chatRooms });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Отримання повідомлень чату
app.get('/api/chat-rooms/:roomId/messages', authenticateUser, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom || !chatRoom.members.includes(req.session.userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const messages = await Message.find({ chatRoom: roomId })
      .populate('sender', 'phpUserId email firstname lastname isOnline')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// WebSocket обробка (залишається без змін)
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user-online', async (userData) => {
    try {
      if (userData && userData.phpUserId) {
        const user = await User.findOne({ phpUserId: userData.phpUserId });
        if (user) {
          user.isOnline = true;
          user.socketId = socket.id;
          user.lastSeen = new Date();
          await user.save();

          socket.userId = user._id;
          socket.phpUserId = userData.phpUserId;

          socket.broadcast.emit('user-status-change', {
            phpUserId: userData.phpUserId,
            isOnline: true,
            lastSeen: user.lastSeen
          });
        }
      }
    } catch (error) {
      console.error('User online error:', error);
    }
  });

  socket.on('join-room', async (roomId) => {
    try {
      if (!socket.userId) return;

      const chatRoom = await ChatRoom.findById(roomId);
      if (chatRoom && chatRoom.members.includes(socket.userId)) {
        socket.join(roomId);
        console.log(`User ${socket.phpUserId} joined room ${roomId}`);
      }
    } catch (error) {
      console.error('Join room error:', error);
    }
  });

  socket.on('send-message', async (data) => {
    try {
      if (!socket.userId) return;

      const { roomId, content } = data;

      const chatRoom = await ChatRoom.findById(roomId);
      if (!chatRoom || !chatRoom.members.includes(socket.userId)) {
        return;
      }

      const message = new Message({
        chatRoom: roomId,
        sender: socket.userId,
        content: content.trim()
      });

      await message.save();
      await message.populate('sender', 'phpUserId email firstname lastname isOnline');

      io.to(roomId).emit('new-message', {
        _id: message._id,
        chatRoom: message.chatRoom,
        sender: message.sender,
        content: message.content,
        timestamp: message.timestamp
      });

    } catch (error) {
      console.error('Send message error:', error);
    }
  });

  socket.on('disconnect', async () => {
    try {
      if (socket.userId) {
        const user = await User.findById(socket.userId);
        if (user) {
          user.isOnline = false;
          user.lastSeen = new Date();
          user.socketId = null;
          await user.save();

          socket.broadcast.emit('user-status-change', {
            phpUserId: socket.phpUserId,
            isOnline: false,
            lastSeen: user.lastSeen
          });
        }
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }

    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

app.get('/api/health-check', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    nodejs_version: process.version,
    session: req.session ? {
      exists: !!req.session,
      id: req.sessionID,
      userId: req.session.userId || null,
      phpUserId: req.session.phpUserId || null
    } : null,
    cookies: req.cookies
  });
});

app.get('/api/students', async (req, res) => {
  try {
    // Перевіряємо авторизацію
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Необхідна авторизація для доступу до списку студентів'
      });
    }

    console.log('Getting students list. User ID:', req.session.userId);

    // Отримуємо всіх користувачів з типом "student" або всіх, якщо тип не вказано
    const students = await User.find({
      $or: [
        { role: 'student' },
        { role: { $exists: false } }
      ]
    }).select('_id phpUserId email firstname lastname');

    return res.json({
      success: true,
      students: students
    });
  } catch (error) {
    console.error('Error getting students:', error);
    return res.status(500).json({
      success: false,
      message: 'Помилка при завантаженні списку студентів',
      error: error.message
    });
  }
});