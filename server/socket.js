const Message = require('./models/Message');
const Chat = require('./models/Chat');

module.exports = function(io) {
  // Keep track of online users
  const onlineUsers = {};

  // Зберігаємо таймери відключення щоб мати змогу їх відміняти
  const disconnectTimers = {};

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // User joins with their ID
    socket.on('user_connected', (userId) => {
      if (userId) {
        // Скасовуємо таймер відключення, якщо він був встановлений
        if (disconnectTimers[userId]) {
          console.log(`Cancelling disconnect timer for user ${userId}`);
          clearTimeout(disconnectTimers[userId]);
          delete disconnectTimers[userId];
        }

        // Store user's socket ID
        onlineUsers[userId] = socket.id;
        socket.userId = userId;

        // Broadcast user's online status
        io.emit('user_status', { userId, status: 'online' });

        // Send currently online users to the newly connected user
        socket.emit('online_users', Object.keys(onlineUsers));

        // Send new chat notifications for any chats created while user was offline
        notifyNewChats(userId, socket);
      }
    });

    // Додаємо обробник для явного запиту статусів
    socket.on('request_user_statuses', () => {
      socket.emit('online_users', Object.keys(onlineUsers));
    });

    // User joins a specific chat room
    socket.on('join_chat', (chatId) => {
      if (chatId) {
        socket.join(chatId);
        console.log(`User ${socket.userId || socket.id} joined chat ${chatId}`);
      }
    });

    // User sends a message
    socket.on('chat_message', async (msgData) => {
      try {
        const { chat_id, sender, content } = msgData;

        if (!chat_id || !sender || !content) {
          return socket.emit('error', { message: 'Invalid message data' });
        }

        // Create and save the message to database
        const message = new Message({
          chat_id,
          sender,
          content,
          read: false,
          createdAt: new Date()
        });

        await message.save();

        // Broadcast the message to everyone in the chat room
        io.to(chat_id).emit('chat_message', {
          _id: message._id,
          chat_id,
          sender,
          content,
          read: false,
          createdAt: message.createdAt
        });

        // Get all chat members to notify them individually
        let chat;
        try {
          chat = await Chat.findById(chat_id);
        } catch (err) {
          console.error('Error finding chat:', err);
        }

        if (chat && Array.isArray(chat.members)) {
          // Notify each member who is online but not in the chat room
          chat.members.forEach(memberId => {
            const memberSocketId = onlineUsers[memberId];
            if (memberSocketId && memberId !== sender) {
              io.to(memberSocketId).emit('new_message_notification', {
                chat_id,
                sender,
                message: content.substring(0, 30) + (content.length > 30 ? '...' : '')
              });
            }
          });
        } else {
          // Fallback to old behavior if chat not found
          io.emit('new_message_notification', {
            chat_id,
            sender,
            message: content.substring(0, 30) + (content.length > 30 ? '...' : '')
          });
        }

        console.log(`Message sent in chat ${chat_id} by ${sender}`);
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // User is typing
    socket.on('typing', (data) => {
      const { chat_id, user } = data;
      socket.to(chat_id).emit('typing', { user, chat_id });
    });

    // Mark messages as read
    socket.on('mark_read', async (data) => {
      try {
        const { chat_id, userId } = data;

        if (!chat_id || !userId) {
          return socket.emit('error', { message: 'Invalid data for marking messages as read' });
        }

        // Update messages in database
        await Message.updateMany(
          {
            chat_id,
            sender: { $ne: userId },
            read: false
          },
          { read: true }
        );

        // Notify other users that messages have been read
        socket.to(chat_id).emit('messages_read', { chat_id, by: userId });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // New chat created notification
    socket.on('new_chat_created', async (chatData) => {
      try {
        const { chatId, members } = chatData;
        console.log(`New chat ${chatId} created with members:`, members);

        // First validate the chat exists
        const chat = await Chat.findById(chatId);
        if (!chat) {
          console.error(`Chat ${chatId} not found in database`);
          return;
        }

        // Notify all members who are currently online
        members.forEach(memberId => {
          const memberSocketId = onlineUsers[memberId];
          if (memberSocketId) {
            // If member is online, send immediate notification
            console.log(`Notifying online member ${memberId} about new chat ${chatId}`);
            io.to(memberSocketId).emit('new_chat', { chatId });
          } else {
            // If member is offline, they'll receive notification via notifyNewChats when they connect
            console.log(`Member ${memberId} is offline, will be notified on reconnection`);
          }
        });
      } catch (error) {
        console.error('Error in new_chat_created:', error);
      }
    });

    // Members added to chat notification
    socket.on('members_added_to_chat', async (data) => {
      try {
        const { chatId, newMembers } = data;
        console.log(`Adding members to chat ${chatId}:`, newMembers);

        // Notify new members about the chat
        newMembers.forEach(memberId => {
          const memberSocketId = onlineUsers[memberId];
          if (memberSocketId) {
            io.to(memberSocketId).emit('new_chat', { chatId });
          }
        });
      } catch (error) {
        console.error('Error notifying new members:', error);
      }
    });

    // User disconnected
    socket.on('disconnect', () => {
      if (socket.userId) {
        const userId = socket.userId;

        // Встановлюємо таймер, щоб не змінювати статус користувача відразу
        disconnectTimers[userId] = setTimeout(() => {
          // Перевіряємо, чи користувач справді офлайн (не переподключився за час таймера)
          if (onlineUsers[userId] === socket.id) {
            // Видаляємо з онлайн користувачів
            delete onlineUsers[userId];

            // Транслюємо статус офлайн
            io.emit('user_status', { userId: userId, status: 'offline' });
            console.log(`User ${userId} marked as offline after disconnect timeout`);
          }

          // Видаляємо таймер
          delete disconnectTimers[userId];
        }, 5000); // 5 секунд затримки перед встановленням статусу "offline"
      }
      console.log('User disconnected:', socket.id);
    });
  });

  // Function to notify user of new chats on connection
  async function notifyNewChats(userId, socket) {
    try {
      // Find all chats where this user is a member (userId as string)
      const userChats = await Chat.find({ members: String(userId) });
      if (userChats.length > 0) {
        console.log(`User ${userId} is a member of ${userChats.length} chats. Initial load on client handles display.`);
        // The client's initial loadChats() call is now responsible for fetching these.
        // No need to emit 'new_chat' for each existing chat here, as it causes multiple reloads.
        // userChats.forEach(chat => {
        //   socket.emit('new_chat', { chatId: chat._id });
        // });
      } else {
        console.log(`No existing chats found for user ${userId} to notify about upon connection.`);
      }
    } catch (error) {
      console.error(`Error in notifyNewChats for user ${userId}:`, error);
    }
  }
};
