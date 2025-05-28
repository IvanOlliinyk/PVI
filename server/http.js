const express = require('express');
const Message = require('./models/Message');
const Chat = require('./models/Chat');
const router = express.Router();

// Get all messages
router.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post a new message
router.post('/messages', async (req, res) => {
  try {
    const { chat_id, sender, content } = req.body;

    if (!chat_id) {
      return res.status(400).json({ success: false, message: 'Chat ID is required' });
    }

    // Verify chat exists
    const chat = await Chat.findById(chat_id);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    const message = new Message({
      chat_id,
      sender,
      content,
      read: false
    });

    await message.save();
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get all chats
router.get('/chats', async (req, res) => {
  try {
    const userId = req.query.userId;
    let query = {};

    // If userId is provided, filter chats where the user is a member
    if (userId) {
      query = { members: String(userId) };
    }

    const chats = await Chat.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: chats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get a single chat by ID
router.get('/chats/:chatId', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }
    res.json({ success: true, data: chat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new chat
router.post('/chats', async (req, res) => {
  try {
    const { name, members } = req.body;
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Members are required' });
    }
    // Ensure all member IDs are strings and unique
    const membersStr = Array.from(new Set(members.map(m => String(m))));
    const chat = new Chat({ name, members: membersStr });
    await chat.save();
    res.status(201).json({ success: true, data: chat });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Add members to a chat
router.post('/chats/:id/members', async (req, res) => {
  try {
    const { members } = req.body;
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Members are required' });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Add new members without duplicates, ensure all are strings
    const newMembers = members.map(m => String(m)).filter(m => !chat.members.includes(m));
    chat.members = [...chat.members, ...newMembers];

    await chat.save();
    res.json({ success: true, data: chat });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get messages for a specific chat
router.get('/chats/:chatId/messages', async (req, res) => {
  try {
    const messages = await Message.find({
      chat_id: req.params.chatId
    }).sort({ createdAt: 1 });

    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark messages as read
router.put('/chats/:chatId/read', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Update all unread messages in this chat where the sender is not the current user
    const result = await Message.updateMany(
      {
        chat_id: req.params.chatId,
        sender: { $ne: userId },
        read: false
      },
      { read: true }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} messages marked as read`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get unread message count for a user
router.get('/messages/unread/:userId', async (req, res) => {
  try {
    // First get all chats that the user is a member of
    const chats = await Chat.find({ members: req.params.userId });
    const chatIds = chats.map(chat => chat._id.toString());

    // Then count all unread messages in those chats where the user is not the sender
    const unreadCount = await Message.countDocuments({
      chat_id: { $in: chatIds },
      sender: { $ne: req.params.userId },
      read: false
    });

    res.json({ success: true, count: unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
