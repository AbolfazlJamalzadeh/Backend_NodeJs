const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
  updatePassword,
  getUserAddresses,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  getAdminStats
} = require('../controllers/user.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Protect all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Not authorized
 */
router.get('/profile', getUserProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               nationalCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Not authorized
 */
router.put('/profile', updateUserProfile);

/**
 * @swagger
 * /api/users/password:
 *   put:
 *     summary: Update password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       401:
 *         description: Invalid current password
 */
router.put('/password', updatePassword);

/**
 * @swagger
 * /api/users/addresses:
 *   get:
 *     summary: Get user's addresses
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's addresses
 *       401:
 *         description: Not authorized
 */
router.get('/addresses', getUserAddresses);

/**
 * @swagger
 * /api/users/addresses:
 *   post:
 *     summary: Add a new address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - province
 *               - city
 *               - address
 *               - postalCode
 *             properties:
 *               title:
 *                 type: string
 *               province:
 *                 type: string
 *               city:
 *                 type: string
 *               address:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               recipientName:
 *                 type: string
 *               recipientPhone:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Address added successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 */
router.post('/addresses', createUserAddress);

/**
 * @swagger
 * /api/users/addresses/{id}:
 *   put:
 *     summary: Update an address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Address ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               province:
 *                 type: string
 *               city:
 *                 type: string
 *               address:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               recipientName:
 *                 type: string
 *               recipientPhone:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Address not found
 */
router.put('/addresses/:id', updateUserAddress);

/**
 * @swagger
 * /api/users/addresses/{id}:
 *   delete:
 *     summary: Delete an address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Address not found
 */
router.delete('/addresses/:id', deleteUserAddress);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get admin statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin statistics
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 */
router.get('/stats', authorize('admin', 'manager'), getAdminStats);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
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
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by user role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email or phone
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 */
router.get('/', authorize('admin', 'manager'), getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: User not found
 */
router.get('/:id', authorize('admin', 'manager'), getUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin, manager]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: User not found
 */
router.put('/:id', authorize('admin', 'manager'), updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: User has orders and cannot be deleted
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: User not found
 */
router.delete('/:id', authorize('admin', 'manager'), deleteUser);

module.exports = router; 