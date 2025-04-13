const express = require('express');
const {
  createTicket,
  getTickets,
  getTicket,
  updateTicket,
  addReply,
  closeTicket,
  reopenTicket,
  getMyTickets
} = require('../controllers/ticket.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Protect all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Support ticket management
 */

/**
 * @swagger
 * /api/tickets/me:
 *   get:
 *     summary: Get current user's tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's tickets
 *       401:
 *         description: Not authorized
 */
router.get('/me', getMyTickets);

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Create a new support ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Ticket subject
 *               message:
 *                 type: string
 *                 description: Ticket message
 *               department:
 *                 type: string
 *                 enum: [technical, billing, general]
 *                 default: general
 *                 description: Department the ticket is for
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *                 description: Ticket priority
 *               orderId:
 *                 type: string
 *                 description: Related order ID (if applicable)
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 */
router.post('/', createTicket);

/**
 * @swagger
 * /api/tickets/{id}:
 *   get:
 *     summary: Get a ticket by ID
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket details
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Ticket not found
 */
router.get('/:id', getTicket);

/**
 * @swagger
 * /api/tickets/{id}/reply:
 *   post:
 *     summary: Add a reply to a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Reply message
 *     responses:
 *       200:
 *         description: Reply added successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Ticket not found
 */
router.post('/:id/reply', addReply);

/**
 * @swagger
 * /api/tickets/{id}/close:
 *   put:
 *     summary: Close a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket closed successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Ticket not found
 */
router.put('/:id/close', closeTicket);

/**
 * @swagger
 * /api/tickets/{id}/reopen:
 *   put:
 *     summary: Reopen a closed ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket reopened successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Ticket not found
 */
router.put('/:id/reopen', reopenTicket);

// Admin routes
/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Get all tickets (admin only)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (open, closed)
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by priority (low, medium, high)
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department (technical, billing, general)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by subject or ticket ID
 *     responses:
 *       200:
 *         description: List of tickets
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 */
router.get('/', authorize('admin', 'manager'), getTickets);

/**
 * @swagger
 * /api/tickets/{id}:
 *   put:
 *     summary: Update a ticket (admin only)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, closed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               assignedTo:
 *                 type: string
 *                 description: User ID of admin/manager to assign ticket to
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Ticket not found
 */
router.put('/:id', authorize('admin', 'manager'), updateTicket);

module.exports = router; 