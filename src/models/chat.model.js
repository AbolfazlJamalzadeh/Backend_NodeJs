const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    userAvatar: {
      type: String,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastUserActivity: {
      type: Date,
      default: Date.now
    },
    lastAgentActivity: {
      type: Date,
      default: null
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    agentName: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'closed'],
      default: 'pending'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date,
      default: null
    },
    userInfo: {
      browser: String,
      os: String,
      ip: String,
      lastOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
      },
      totalOrders: {
        type: Number,
        default: 0
      },
      totalSpent: {
        type: Number,
        default: 0
      },
      registeredSince: Date,
      currentPage: String
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ['user', 'agent', 'system'],
          required: true
        },
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        senderName: {
          type: String
        },
        content: {
          type: String,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        isRead: {
          type: Boolean,
          default: false
        },
        attachments: [
          {
            url: String,
            type: String,
            name: String,
            size: Number
          }
        ]
      }
    ],
    tags: [String],
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: String,
      submittedAt: Date
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Index for fast searching
chatSchema.index({ user: 1 });
chatSchema.index({ agent: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ 'userInfo.ip': 1 });
chatSchema.index({ createdAt: 1 });

// Method to add a new message
chatSchema.methods.addMessage = function (messageData) {
  this.messages.push(messageData);
  
  // Update last activity timestamp
  if (messageData.sender === 'user') {
    this.lastUserActivity = Date.now();
  } else if (messageData.sender === 'agent') {
    this.lastAgentActivity = Date.now();
  }
  
  // If chat is pending and an agent replies, change status to active
  if (this.status === 'pending' && messageData.sender === 'agent') {
    this.status = 'active';
  }
  
  return this.save();
};

// Method to assign an agent
chatSchema.methods.assignAgent = function (agentId, agentName) {
  this.agent = agentId;
  this.agentName = agentName;
  this.status = 'active';
  
  // Add system message about agent assignment
  this.messages.push({
    sender: 'system',
    content: `${agentName} پیوست به گفتگو`,
    timestamp: Date.now()
  });
  
  return this.save();
};

// Method to mark messages as read
chatSchema.methods.markMessagesAsRead = function (userType) {
  const oppositeType = userType === 'user' ? 'agent' : 'user';
  
  this.messages.forEach(message => {
    if (message.sender === oppositeType && !message.isRead) {
      message.isRead = true;
    }
  });
  
  return this.save();
};

// Method to end chat
chatSchema.methods.endChat = function (reason = '') {
  this.status = 'closed';
  this.endedAt = Date.now();
  this.isActive = false;
  
  // Add system message about chat ending
  let message = 'گفتگو به پایان رسید';
  if (reason) {
    message += `: ${reason}`;
  }
  
  this.messages.push({
    sender: 'system',
    content: message,
    timestamp: Date.now()
  });
  
  return this.save();
};

// Method to get unread messages count
chatSchema.methods.getUnreadCount = function (userType) {
  const oppositeType = userType === 'user' ? 'agent' : 'user';
  
  return this.messages.filter(message => 
    message.sender === oppositeType && !message.isRead
  ).length;
};

// Static method to get active chats count for an agent
chatSchema.statics.getActiveChatsCount = async function (agentId) {
  return await this.countDocuments({
    agent: agentId,
    status: 'active'
  });
};

// Static method to get pending chats count
chatSchema.statics.getPendingChatsCount = async function () {
  return await this.countDocuments({ status: 'pending' });
};

// Method to add rating to chat
chatSchema.methods.addRating = function (score, feedback = '') {
  if (score < 1 || score > 5) {
    throw new Error('امتیاز باید بین 1 تا 5 باشد');
  }
  
  this.rating = {
    score,
    feedback,
    submittedAt: Date.now()
  };
  
  return this.save();
};

module.exports = mongoose.model('Chat', chatSchema); 