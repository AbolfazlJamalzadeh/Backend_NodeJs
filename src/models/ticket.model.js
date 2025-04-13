const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: [true, 'موضوع تیکت الزامی است'],
      trim: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'inProgress', 'closed', 'resolved'],
      default: 'open',
    },
    department: {
      type: String,
      enum: ['sales', 'support', 'technical', 'billing', 'other'],
      default: 'support',
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ['user', 'admin'],
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        message: {
          type: String,
          required: true,
        },
        attachments: [
          {
            url: String,
            filename: String,
            filesize: Number,
            filetype: String,
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
      },
    ],
    isUserWaiting: {
      type: Boolean,
      default: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    lastMessageBy: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    satisfaction: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: String,
      submittedAt: Date,
    },
    tags: [String],
    closedAt: Date,
    reopenedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Update lastUpdated on new messages
ticketSchema.pre('save', function (next) {
  if (this.isModified('messages')) {
    this.lastUpdated = Date.now();
    
    // Set lastMessageBy to the sender of the last message
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage) {
      this.lastMessageBy = lastMessage.sender;
      
      // Set isUserWaiting based on who sent the last message
      this.isUserWaiting = lastMessage.sender === 'admin';
    }
  }
  next();
});

// Add message to ticket
ticketSchema.methods.addMessage = function (sender, userId, message, attachments = []) {
  this.messages.push({
    sender,
    userId,
    message,
    attachments,
    createdAt: new Date(),
    isRead: false,
  });
  
  // Update ticket status if it was closed
  if (this.status === 'closed') {
    this.status = 'open';
    this.reopenedCount += 1;
  }
  
  return this;
};

// Mark all admin messages as read by user
ticketSchema.methods.markAdminMessagesAsRead = function () {
  this.messages.forEach((message) => {
    if (message.sender === 'admin') {
      message.isRead = true;
    }
  });
  
  return this;
};

// Mark all user messages as read by admin
ticketSchema.methods.markUserMessagesAsRead = function () {
  this.messages.forEach((message) => {
    if (message.sender === 'user') {
      message.isRead = true;
    }
  });
  
  return this;
};

// Close ticket
ticketSchema.methods.closeTicket = function (resolution = 'resolved') {
  this.status = 'closed';
  this.closedAt = new Date();
  
  return this;
};

// Rate ticket satisfaction
ticketSchema.methods.rateSatisfaction = function (rating, feedback = '') {
  if (rating < 1 || rating > 5) {
    throw new Error('امتیاز باید بین 1 تا 5 باشد');
  }
  
  this.satisfaction = {
    rating,
    feedback,
    submittedAt: new Date(),
  };
  
  return this;
};

// Assign ticket to staff member
ticketSchema.methods.assignTo = function (staffId) {
  this.assignedTo = staffId;
  this.status = 'inProgress';
  
  return this;
};

// Get unread messages count
ticketSchema.methods.getUnreadMessagesCount = function (userType = 'user') {
  return this.messages.filter(
    message => !message.isRead && message.sender !== userType
  ).length;
};

// Create indexes
ticketSchema.index({ user: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('Ticket', ticketSchema); 