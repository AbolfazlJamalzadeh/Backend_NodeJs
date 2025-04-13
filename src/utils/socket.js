const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const Chat = require('../models/chat.model');
const User = require('../models/user.model');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user by ID
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      return next(new Error('Authentication error: ' + error.message));
    }
  });

  // Connection event
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.fullName} (${socket.user.role})`);
    
    // Join rooms based on user role
    if (['admin', 'manager', 'support'].includes(socket.user.role)) {
      socket.join('admin-room');
    }
    
    // Join user's personal room
    socket.join(`user-${socket.user._id}`);
    
    // Handle chat message
    socket.on('chat-message', async (data) => {
      try {
        const { chatId, content, attachments = [] } = data;
        
        if (!chatId || (!content && (!attachments || attachments.length === 0))) {
          socket.emit('error', { message: 'پیام یا شناسه چت نامعتبر است' });
          return;
        }
        
        // Find the chat
        const chat = await Chat.findById(chatId);
        
        if (!chat) {
          socket.emit('error', { message: 'گفتگو یافت نشد' });
          return;
        }
        
        // Check if user is authorized to send message
        if (chat.user.toString() !== socket.user._id.toString() && 
            (!chat.agent || chat.agent.toString() !== socket.user._id.toString()) &&
            !['admin', 'manager'].includes(socket.user.role)) {
          socket.emit('error', { message: 'دسترسی غیر مجاز' });
          return;
        }
        
        // Check if chat is closed
        if (chat.status === 'closed') {
          socket.emit('error', { message: 'گفتگو بسته شده است' });
          return;
        }
        
        // Create message object
        const message = {
          sender: chat.user.toString() === socket.user._id.toString() ? 'user' : 'agent',
          senderId: socket.user._id,
          senderName: socket.user.fullName,
          content,
          timestamp: Date.now(),
          attachments: attachments || []
        };
        
        // Add message to the chat
        await chat.addMessage(message);
        
        // If agent is replying and hasn't been assigned yet, assign them
        if (message.sender === 'agent' && 
            (!chat.agent || chat.agent.toString() !== socket.user._id.toString())) {
          await chat.assignAgent(socket.user._id, socket.user.fullName);
        }
        
        // Emit the message to the appropriate rooms
        if (message.sender === 'user') {
          // User sent a message, send to all agents and the user
          io.to('admin-room').emit('chat-message', { chatId, message });
          // Also emit a notification to admins
          io.to('admin-room').emit('chat-notification', { 
            type: 'new-message',
            chatId: chat._id,
            userName: chat.userName,
            userAvatar: chat.userAvatar,
            message: content.substring(0, 50) + (content.length > 50 ? '...' : '')
          });
        } else {
          // Agent sent a message, send to the specific user and all agents
          io.to(`user-${chat.user}`).emit('chat-message', { chatId, message });
          io.to('admin-room').emit('chat-message', { chatId, message });
        }
        
      } catch (error) {
        console.error('Socket error in chat-message:', error);
        socket.emit('error', { message: 'خطا در ارسال پیام' });
      }
    });
    
    // Handle joining a specific chat room
    socket.on('join-chat', async (chatId) => {
      try {
        // Find the chat
        const chat = await Chat.findById(chatId);
        
        if (!chat) {
          socket.emit('error', { message: 'گفتگو یافت نشد' });
          return;
        }
        
        // Check if user is authorized to join the chat
        if (chat.user.toString() !== socket.user._id.toString() && 
            (!chat.agent || chat.agent.toString() !== socket.user._id.toString()) &&
            !['admin', 'manager'].includes(socket.user.role)) {
          socket.emit('error', { message: 'دسترسی غیر مجاز' });
          return;
        }
        
        // Join the chat room
        socket.join(`chat-${chatId}`);
        
        console.log(`User ${socket.user.fullName} joined chat ${chatId}`);
        
        // Mark messages as read
        if (['admin', 'manager', 'support'].includes(socket.user.role) || 
            (chat.agent && chat.agent.toString() === socket.user._id.toString())) {
          await chat.markMessagesAsRead('agent');
        } else {
          await chat.markMessagesAsRead('user');
        }
        
        // Notify the room that user joined
        io.to(`chat-${chatId}`).emit('user-joined', {
          chatId,
          user: {
            id: socket.user._id,
            name: socket.user.fullName,
            role: socket.user.role
          }
        });
        
      } catch (error) {
        console.error('Socket error in join-chat:', error);
        socket.emit('error', { message: 'خطا در پیوستن به گفتگو' });
      }
    });
    
    // Handle leaving a chat room
    socket.on('leave-chat', (chatId) => {
      socket.leave(`chat-${chatId}`);
      console.log(`User ${socket.user.fullName} left chat ${chatId}`);
      
      // Notify the room that user left
      io.to(`chat-${chatId}`).emit('user-left', {
        chatId,
        user: {
          id: socket.user._id,
          name: socket.user.fullName,
          role: socket.user.role
        }
      });
    });
    
    // Handle typing indicator
    socket.on('typing', (data) => {
      const { chatId, isTyping } = data;
      
      // Broadcast to everyone in the chat room except the sender
      socket.to(`chat-${chatId}`).emit('typing', {
        chatId,
        user: {
          id: socket.user._id,
          name: socket.user.fullName
        },
        isTyping
      });
    });
    
    // Handle chat status changes
    socket.on('chat-status-change', async (data) => {
      try {
        const { chatId, status, reason } = data;
        
        // Find the chat
        const chat = await Chat.findById(chatId);
        
        if (!chat) {
          socket.emit('error', { message: 'گفتگو یافت نشد' });
          return;
        }
        
        // Check if user is authorized to change status
        if (chat.user.toString() !== socket.user._id.toString() && 
            (!chat.agent || chat.agent.toString() !== socket.user._id.toString()) &&
            !['admin', 'manager'].includes(socket.user.role)) {
          socket.emit('error', { message: 'دسترسی غیر مجاز' });
          return;
        }
        
        // Update chat status
        if (status === 'closed') {
          await chat.endChat(reason);
        } else if (status === 'active' && chat.status === 'pending') {
          if (['admin', 'manager', 'support'].includes(socket.user.role)) {
            await chat.assignAgent(socket.user._id, socket.user.fullName);
          }
        }
        
        // Notify all users in the chat room
        io.to(`chat-${chatId}`).emit('chat-status-change', {
          chatId,
          status,
          updatedBy: {
            id: socket.user._id,
            name: socket.user.fullName,
            role: socket.user.role
          }
        });
        
        // Notify admins
        io.to('admin-room').emit('chat-notification', {
          type: 'status-change',
          chatId: chat._id,
          userName: chat.userName,
          status
        });
        
      } catch (error) {
        console.error('Socket error in chat-status-change:', error);
        socket.emit('error', { message: 'خطا در تغییر وضعیت گفتگو' });
      }
    });
    
    // Handle new chat creation
    socket.on('new-chat', async (data) => {
      try {
        // Only users can create chats
        if (['admin', 'manager', 'support'].includes(socket.user.role)) {
          socket.emit('error', { message: 'فقط کاربران عادی می‌توانند گفتگوی جدید ایجاد کنند' });
          return;
        }
        
        // Check for existing active chat
        const existingChat = await Chat.findOne({
          user: socket.user._id,
          status: { $ne: 'closed' }
        });
        
        if (existingChat) {
          socket.emit('new-chat', { 
            success: true, 
            message: 'گفتگوی فعال موجود است',
            chatId: existingChat._id,
            isNewChat: false
          });
          
          // Join the chat room
          socket.join(`chat-${existingChat._id}`);
          return;
        }
        
        // Create a new chat
        const { currentPage, browser, os } = data;
        
        const chat = await Chat.create({
          user: socket.user._id,
          userName: socket.user.fullName,
          userEmail: socket.user.email,
          userAvatar: socket.user.avatar,
          userInfo: {
            browser,
            os,
            ip: socket.handshake.address,
            registeredSince: socket.user.createdAt,
            currentPage
          },
          messages: [
            {
              sender: 'system',
              content: 'گفتگوی پشتیبانی شروع شد. لطفا چند لحظه منتظر بمانید تا یکی از همکاران ما به شما پاسخ دهد.',
              timestamp: Date.now()
            }
          ]
        });
        
        // Join the chat room
        socket.join(`chat-${chat._id}`);
        
        // Notify the user
        socket.emit('new-chat', { 
          success: true, 
          message: 'گفتگو با موفقیت ایجاد شد',
          chatId: chat._id,
          isNewChat: true
        });
        
        // Notify admins
        io.to('admin-room').emit('chat-notification', {
          type: 'new-chat',
          chatId: chat._id,
          userName: chat.userName,
          userAvatar: chat.userAvatar,
          userEmail: chat.userEmail
        });
        
      } catch (error) {
        console.error('Socket error in new-chat:', error);
        socket.emit('error', { message: 'خطا در ایجاد گفتگوی جدید' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.fullName}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO
}; 