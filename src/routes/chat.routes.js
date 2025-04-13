const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { 
  startChat, 
  getCurrentChat, 
  getChatHistory, 
  sendMessage, 
  getActiveChats, 
  getChatById, 
  assignChat, 
  closeChat, 
  rateChat, 
  getChatStats,
  addNote
} = require('../controllers/chat.controller');

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Live chat support system
 */

/**
 * @swagger
 * /api/chat/start:
 *   post:
 *     summary: Start a new support chat session
 *     description: Begin a new chat session with customer support
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPage:
 *                 type: string
 *                 description: The page user is currently viewing
 *               browser:
 *                 type: string
 *                 description: User's browser information
 *               os:
 *                 type: string
 *                 description: User's operating system
 *     responses:
 *       201:
 *         description: Chat session started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 *       200:
 *         description: User already has an active chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 *       401:
 *         description: Not authorized
 */
router.post('/start', protect, startChat);

/**
 * @swagger
 * /api/chat/current:
 *   get:
 *     summary: Get user's current active chat
 *     description: Retrieves the user's current active chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active chat session found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 *       404:
 *         description: No active chat session found
 *       401:
 *         description: Not authorized
 */
router.get('/current', protect, getCurrentChat);

/**
 * @swagger
 * /api/chat/history:
 *   get:
 *     summary: Get user's chat history
 *     description: Retrieves all previous chat sessions for the user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Chat history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Chat'
 *       401:
 *         description: Not authorized
 */
router.get('/history', protect, getChatHistory);

/**
 * @swagger
 * /api/chat/{id}/messages:
 *   post:
 *     summary: Send a message in a chat
 *     description: Send a new message in an existing chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                     name:
 *                       type: string
 *                     size:
 *                       type: number
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request or chat is closed
 *       404:
 *         description: Chat not found
 *       403:
 *         description: Not authorized to send messages in this chat
 */
router.post('/:id/messages', protect, sendMessage);

/**
 * @swagger
 * /api/chat/active:
 *   get:
 *     summary: Get all active chats (admin only)
 *     description: Retrieves all active chat sessions for admin dashboard
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - name: agent
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by agent ID or 'unassigned' for chats with no agent
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, active]
 *         description: Filter by chat status
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by user name or email
 *     responses:
 *       200:
 *         description: Active chats retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Chat'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not authorized as admin
 */
router.get('/active', protect, authorize('admin', 'manager', 'support'), getActiveChats);

/**
 * @swagger
 * /api/chat/stats:
 *   get:
 *     summary: Get chat statistics (admin only)
 *     description: Retrieves statistics about chat usage for admin dashboard
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalChats:
 *                       type: integer
 *                     activeChats:
 *                       type: integer
 *                     pendingChats:
 *                       type: integer
 *                     closedChats:
 *                       type: integer
 *                     statusBreakdown:
 *                       type: object
 *                     averageResponseTime:
 *                       type: integer
 *                     averageChatDuration:
 *                       type: integer
 *                     averageRating:
 *                       type: object
 *                     topAgents:
 *                       type: array
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not authorized as admin
 */
router.get('/stats', protect, authorize('admin', 'manager'), getChatStats);

/**
 * @swagger
 * /api/chat/{id}:
 *   get:
 *     summary: Get a specific chat by ID
 *     description: Retrieves details of a specific chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Chat retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 *       404:
 *         description: Chat not found
 *       403:
 *         description: Not authorized to view this chat
 */
router.get('/:id', protect, getChatById);

/**
 * @swagger
 * /api/chat/{id}/assign:
 *   put:
 *     summary: Assign chat to an agent (admin only)
 *     description: Assigns a chat session to a specific support agent
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *             properties:
 *               agentId:
 *                 type: string
 *                 description: ID of the agent to assign
 *     responses:
 *       200:
 *         description: Chat assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 *       400:
 *         description: Invalid request or chat is closed
 *       404:
 *         description: Chat or agent not found
 *       403:
 *         description: Not authorized
 */
router.put('/:id/assign', protect, authorize('admin', 'manager'), assignChat);

/**
 * @swagger
 * /api/chat/{id}/close:
 *   put:
 *     summary: Close a chat session
 *     description: Ends an active chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for closing the chat
 *     responses:
 *       200:
 *         description: Chat closed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 *       400:
 *         description: Chat is already closed
 *       404:
 *         description: Chat not found
 *       403:
 *         description: Not authorized to close this chat
 */
router.put('/:id/close', protect, closeChat);

/**
 * @swagger
 * /api/chat/{id}/rate:
 *   put:
 *     summary: Rate a chat session
 *     description: Add a rating and optional feedback to a closed chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - score
 *             properties:
 *               score:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating score (1-5)
 *               feedback:
 *                 type: string
 *                 description: Feedback about the chat experience
 *     responses:
 *       200:
 *         description: Rating submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid rating score
 *       404:
 *         description: Chat not found
 *       403:
 *         description: Only the user can rate a chat
 */
router.put('/:id/rate', protect, rateChat);

/**
 * @swagger
 * /api/chat/{id}/note:
 *   put:
 *     summary: Add note to a chat (admin only)
 *     description: Add an internal note to a chat session (visible only to admins/agents)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *                 description: Internal note content
 *     responses:
 *       200:
 *         description: Note added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 *       400:
 *         description: Note text is required
 *       404:
 *         description: Chat not found
 *       403:
 *         description: Not authorized
 */
router.put('/:id/note', protect, authorize('admin', 'manager', 'support'), addNote);

/**
 * @swagger
 * components:
 *   schemas:
 *     Chat:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string
 *           description: User ID
 *         userName:
 *           type: string
 *         userEmail:
 *           type: string
 *         userAvatar:
 *           type: string
 *         agent:
 *           type: string
 *           description: Agent ID
 *         agentName:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, active, closed]
 *         startedAt:
 *           type: string
 *           format: date-time
 *         endedAt:
 *           type: string
 *           format: date-time
 *         lastUserActivity:
 *           type: string
 *           format: date-time
 *         lastAgentActivity:
 *           type: string
 *           format: date-time
 *         messages:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               sender:
 *                 type: string
 *                 enum: [user, agent, system]
 *               senderId:
 *                 type: string
 *               senderName:
 *                 type: string
 *               content:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               isRead:
 *                 type: boolean
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                     name:
 *                       type: string
 *                     size:
 *                       type: number
 *         userInfo:
 *           type: object
 *           properties:
 *             browser:
 *               type: string
 *             os:
 *               type: string
 *             ip:
 *               type: string
 *             lastOrderId:
 *               type: string
 *             totalOrders:
 *               type: number
 *             totalSpent:
 *               type: number
 *             registeredSince:
 *               type: string
 *               format: date-time
 *             currentPage:
 *               type: string
 *         rating:
 *           type: object
 *           properties:
 *             score:
 *               type: number
 *               minimum: 1
 *               maximum: 5
 *             feedback:
 *               type: string
 *             submittedAt:
 *               type: string
 *               format: date-time
 *         notes:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

module.exports = router; 