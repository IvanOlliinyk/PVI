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
app.use((req, res, next) => {
  // Handle alternate cookie formats
  if (!req.session?.userId && req.cookies) {
    console.log('Session middleware - checking cookies:', req.cookies);
    // Log all cookies to debug
    Object.keys(req.cookies).forEach(key => {
      console.log(`Cookie ${key}:`, req.cookies[key]);
    });
  }

  next();
});
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
  console.log('============================================');
  console.log('SYNC USER REQUEST RECEIVED');
  console.log('Headers:', req.headers);
  console.log('Cookies:', req.cookies);
  console.log('Session ID:', req.sessionID);
  console.log('Session Data:', req.session);
  console.log('Body:', req.body);
  console.log('============================================');

  try {
    const { phpUser } = req.body;

    if (!phpUser || !phpUser.id) {
      console.error('Invalid user data received - missing ID');
      return res.status(400).json({
        success: false,
        message: 'Invalid user data, missing ID',
        debug: {
          receivedBody: req.body
        }
      });
    }

    // Ensure we're working with a string ID (for consistency)
    const phpUserId = String(phpUser.id);

    console.log(`Looking for user with phpUserId: ${phpUserId}`);

    // Simplified: always create/update the user
    let user = await User.findOne({ phpUserId });

    if (!user) {
      console.log(`Creating new user for phpUserId: ${phpUserId}`);
      user = new User({
        phpUserId,
        email: phpUser.email || `user${phpUserId}@example.com`,
        firstname: phpUser.firstname || 'User',
        lastname: phpUser.lastname || phpUserId,
        isOnline: true,
        lastSeen: new Date()
      });
    } else {
      console.log(`Updating existing user: ${user._id}`);
      user.email = phpUser.email || user.email;
      user.firstname = phpUser.firstname || user.firstname;
      user.lastname = phpUser.lastname || user.lastname;
      user.isOnline = true;
      user.lastSeen = new Date();
    }

    // Save the user
    await user.save();
    console.log(`User saved with ID: ${user._id}`);

    // IMPORTANT: Store both IDs in session
    req.session.userId = user._id;
    req.session.phpUserId = phpUserId;
    req.session.userEmail = phpUser.email;
    req.session.userFirstname = phpUser.firstname;
    req.session.userLastname = phpUser.lastname;

    // Force session save and wait for it to complete
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          reject(err);
        } else {
          console.log("Session saved successfully:", req.sessionID);
          resolve();
        }
      });
    });

    console.log('After save - Session data:', req.session);

    // Return success response
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
        saved: true,
        userId: req.session.userId,
        phpUserId: req.session.phpUserId
      }
    });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
  }
});

// Add this endpoint to verify session status
app.get('/api/session-check', (req, res) => {
  console.log('Session check requested - Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Cookies:', req.cookies);

  res.json({
    session: {
      id: req.sessionID,
      exists: !!req.session,
      userId: req.session?.userId || null,
      phpUserId: req.session?.phpUserId || null,
      isAuthenticated: !!(req.session?.userId || req.session?.phpUserId)
    },
    cookies: req.cookies
  });
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

app.post('/api/chat-rooms', async (req, res) => {
  try {
    console.log('Create Chat Room API Called');

    // Authenticate with token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    // Verify token
    const token = authHeader.split(' ')[1];
    let userData;
    try {
      userData = JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Find the user
    const currentUser = await User.findOne({ phpUserId: userData.user_id });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Process request data
    const { name, description, memberIds, isGroup = true } = req.body;

    if (!name || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({
        success: false,
        message: 'Name and memberIds are required'
      });
    }

    // Find all members
    const members = await User.find({
      $or: [
        { phpUserId: { $in: memberIds } },
        { _id: currentUser._id }  // Always include current user
      ]
    });

    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid members found'
      });
    }

    // Create the chat room
    const chatRoom = new ChatRoom({
      name,
      description,
      members: members.map(m => m._id),
      createdBy: currentUser._id,
      isGroup,
      createdAt: new Date()
    });

    await chatRoom.save();

    // Populate members for the response
    await chatRoom.populate('members', 'phpUserId email firstname lastname isOnline lastSeen');

    console.log(`Created new chat room: ${name}`);

    return res.json({
      success: true,
      message: 'Chat room created successfully',
      chatRoom
    });

  } catch (error) {
    console.error('Error creating chat room:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
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

app.get('/api/students', async (req, res) => {
  console.log('=== Students API Called ===');
  console.log('Headers:', req.headers);
  console.log('Cookies:', req.cookies);
  console.log('Session:', req.session);

  try {
    // Check authentication with more detailed logs
    if (!req.session || !req.session.userId) {
      console.log('No userId in session:', req.session);

      if (req.cookies && Object.keys(req.cookies).length > 0) {
        console.log('Has cookies but no session data');
      }

      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        sessionExists: !!req.session,
        sessionId: req.sessionID,
        cookiesFound: Object.keys(req.cookies || {})
      });
    }

    // Simplified: just return any users as students for testing
    const users = await User.find({})
        .select('_id phpUserId email firstname lastname');

    console.log(`Found ${users.length} users to return as students`);

    return res.json({
      success: true,
      students: users.map(user => ({
        user_id: user.phpUserId || user._id,
        firstname: user.firstname || 'User',
        lastname: user.lastname || user._id.toString().substr(-4),
        email: user.email || 'no-email',
        student_group: 'PZ-11' // Default group for testing
      }))
    });
  } catch (error) {
    console.error('Error in students API:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Debug endpoint to see what's in the current session
app.get('/api/debug-session', (req, res) => {
  res.json({
    session: {
      id: req.sessionID,
      cookie: req.session?.cookie,
      userId: req.session?.userId,
      phpUserId: req.session?.phpUserId,
      userEmail: req.session?.userEmail
    },
    cookies: req.cookies
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

app.get('/api/token-students', async (req, res) => {
  try {
    console.log('Token Students API Called');

    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.split(' ')[1];

    // Decode and verify the token
    try {
      const userData = JSON.parse(Buffer.from(token, 'base64').toString());
      console.log('Token decoded successfully:', userData);

      // Basic validation
      if (!userData.user_id || !userData.timestamp) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format'
        });
      }

      // Check if token is not too old (30 minute expiration)
      const tokenAge = Math.floor(Date.now() / 1000) - userData.timestamp;
      if (tokenAge > 1800) {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          tokenAge: tokenAge
        });
      }

      // Find or create this user in MongoDB
      let user = await User.findOne({ phpUserId: userData.user_id });
      if (!user) {
        user = new User({
          phpUserId: userData.user_id,
          email: userData.email || `user${userData.user_id}@example.com`,
          firstname: userData.firstname || 'User',
          lastname: userData.lastname || String(userData.user_id),
          isOnline: true,
          lastSeen: new Date()
        });
        await user.save();
        console.log(`Created new user with phpUserId: ${userData.user_id}`);
      }

      // Get all users as students
      const users = await User.find({})
          .select('_id phpUserId email firstname lastname');

      return res.json({
        success: true,
        students: users.map(u => ({
          user_id: u.phpUserId || u._id,
          firstname: u.firstname || 'User',
          lastname: u.lastname || 'Student',
          email: u.email || 'no-email@example.com',
          student_group: 'PZ-11' // Default group for testing purposes
        }))
      });
    } catch (tokenError) {
      console.error('Token decode error:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token'
      });
    }
  } catch (error) {
    console.error('Error in token students API:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

app.post('/api/add-test-student', async (req, res) => {
  try {
    console.log('Add Test Student API Called');

    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.split(' ')[1];

    // Decode and verify the token
    try {
      const userData = JSON.parse(Buffer.from(token, 'base64').toString());
      console.log('Token decoded successfully:', userData);

      // Check student data in request body
      const studentData = req.body;
      console.log('Received student data:', studentData);

      if (!studentData.phpUserId || !studentData.firstname || !studentData.lastname) {
        return res.status(400).json({
          success: false,
          message: 'Missing required student data'
        });
      }

      // Check if this student already exists (by phpUserId)
      let existingStudent = await User.findOne({ phpUserId: studentData.phpUserId });
      if (existingStudent) {
        console.log(`Student with phpUserId ${studentData.phpUserId} already exists`);
        return res.json({
          success: true,
          message: 'Student already exists',
          user: {
            _id: existingStudent._id,
            phpUserId: existingStudent.phpUserId,
            firstname: existingStudent.firstname,
            lastname: existingStudent.lastname,
            email: existingStudent.email
          }
        });
      }

      // Create new student user
      const newStudent = new User({
        phpUserId: studentData.phpUserId,
        email: studentData.email || `student${studentData.phpUserId}@example.com`,
        firstname: studentData.firstname,
        lastname: studentData.lastname,
        role: studentData.role || 'student',
        isOnline: false,
        lastSeen: new Date()
      });

      await newStudent.save();

      console.log(`Created test student: ${newStudent.firstname} ${newStudent.lastname}`);

      return res.json({
        success: true,
        message: 'Test student created successfully',
        user: {
          _id: newStudent._id,
          phpUserId: newStudent.phpUserId,
          firstname: newStudent.firstname,
          lastname: newStudent.lastname,
          email: newStudent.email
        }
      });
    } catch (tokenError) {
      console.error('Token decode error:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token'
      });
    }
  } catch (error) {
    console.error('Error in add test student API:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

app.post('/api/sync-mysql-student', async (req, res) => {
  try {
    // Authenticate with token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    // Verify token
    const token = authHeader.split(' ')[1];
    let userData;
    try {
      userData = JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Get student data from request
    const studentData = req.body;
    console.log('Syncing MySQL student:', studentData);

    // Check for required fields
    if (!studentData.user_id || !studentData.firstname || !studentData.lastname) {
      return res.status(400).json({
        success: false,
        message: 'Missing required student data'
      });
    }

    // Look for existing student or create new one
    let user = await User.findOne({ phpUserId: studentData.user_id });

    if (!user) {
      user = new User({
        phpUserId: studentData.user_id,
        email: studentData.email || `student${studentData.user_id}@example.com`,
        firstname: studentData.firstname,
        lastname: studentData.lastname,
        role: 'student',
        isOnline: false,
        lastSeen: new Date()
      });
      await user.save();
      console.log(`Created new MongoDB user for MySQL student ID ${studentData.user_id}`);
    } else {
      // Update existing user
      user.firstname = studentData.firstname;
      user.lastname = studentData.lastname;
      user.email = studentData.email || user.email;
      await user.save();
      console.log(`Updated MongoDB user for MySQL student ID ${studentData.user_id}`);
    }

    return res.json({
      success: true,
      message: 'Student synced successfully',
      user: {
        _id: user._id,
        phpUserId: user.phpUserId,
        firstname: user.firstname,
        lastname: user.lastname
      }
    });

  } catch (error) {
    console.error('Error syncing MySQL student:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});
