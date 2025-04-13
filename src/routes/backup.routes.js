const express = require('express');
const {
  backupProducts,
  backupUsers,
  backupOrders,
  backupCategories,
  backupReviews,
  createFullBackup,
  restoreProducts,
  restoreUsers,
  restoreOrders,
  restoreCategories,
  restoreReviews,
  restoreFullBackup
} = require('../controllers/backup.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Backup
 *   description: Data backup operations (admin only)
 */

/**
 * @swagger
 * /api/backup/products:
 *   get:
 *     summary: Backup all products
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Products backup created successfully
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
 *                   properties:
 *                     jsonFile:
 *                       type: string
 *                       description: URL to download the JSON backup file
 *                     csvFile:
 *                       type: string
 *                       description: URL to download the CSV backup file
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/products', protect, authorize('admin'), backupProducts);

/**
 * @swagger
 * /api/backup/users:
 *   get:
 *     summary: Backup all users (excluding sensitive data)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users backup created successfully
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
 *                   properties:
 *                     jsonFile:
 *                       type: string
 *                       description: URL to download the JSON backup file
 *                     csvFile:
 *                       type: string
 *                       description: URL to download the CSV backup file
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/users', protect, authorize('admin'), backupUsers);

/**
 * @swagger
 * /api/backup/orders:
 *   get:
 *     summary: Backup all orders
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders backup created successfully
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
 *                   properties:
 *                     jsonFile:
 *                       type: string
 *                       description: URL to download the JSON backup file
 *                     csvFile:
 *                       type: string
 *                       description: URL to download the CSV backup file
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/orders', protect, authorize('admin'), backupOrders);

/**
 * @swagger
 * /api/backup/categories:
 *   get:
 *     summary: Backup all categories
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories backup created successfully
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
 *                   properties:
 *                     jsonFile:
 *                       type: string
 *                       description: URL to download the JSON backup file
 *                     csvFile:
 *                       type: string
 *                       description: URL to download the CSV backup file
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/categories', protect, authorize('admin'), backupCategories);

/**
 * @swagger
 * /api/backup/reviews:
 *   get:
 *     summary: Backup all reviews
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reviews backup created successfully
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
 *                   properties:
 *                     jsonFile:
 *                       type: string
 *                       description: URL to download the JSON backup file
 *                     csvFile:
 *                       type: string
 *                       description: URL to download the CSV backup file
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/reviews', protect, authorize('admin'), backupReviews);

/**
 * @swagger
 * /api/backup/full:
 *   get:
 *     summary: Create a complete backup of all data
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full backup created successfully
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
 *                   properties:
 *                     zipFile:
 *                       type: string
 *                       description: URL to download the complete backup as a ZIP file
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/full', protect, authorize('admin'), createFullBackup);

/**
 * @swagger
 * /api/backup/restore/products:
 *   post:
 *     summary: Restore products from backup file
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - backup
 *             properties:
 *               backup:
 *                 type: string
 *                 format: binary
 *                 description: JSON backup file of products
 *     responses:
 *       200:
 *         description: Products restored successfully
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
 *                   properties:
 *                     totalProcessed:
 *                       type: integer
 *                     restoredCount:
 *                       type: integer
 *                     updatedCount:
 *                       type: integer
 *                     errorCount:
 *                       type: integer
 *                     countBefore:
 *                       type: integer
 *                     countAfter:
 *                       type: integer
 *       400:
 *         description: Invalid backup file or error in restoration
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post('/restore/products', protect, authorize('admin'), restoreProducts);

/**
 * @swagger
 * /api/backup/restore/users:
 *   post:
 *     summary: Restore users from backup file
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - backup
 *             properties:
 *               backup:
 *                 type: string
 *                 format: binary
 *                 description: JSON backup file of users
 *     responses:
 *       200:
 *         description: Users restored successfully
 *       400:
 *         description: Invalid backup file or error in restoration
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post('/restore/users', protect, authorize('admin'), restoreUsers);

/**
 * @swagger
 * /api/backup/restore/orders:
 *   post:
 *     summary: Restore orders from backup file
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - backup
 *             properties:
 *               backup:
 *                 type: string
 *                 format: binary
 *                 description: JSON backup file of orders
 *     responses:
 *       200:
 *         description: Orders restored successfully
 *       400:
 *         description: Invalid backup file or error in restoration
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post('/restore/orders', protect, authorize('admin'), restoreOrders);

/**
 * @swagger
 * /api/backup/restore/categories:
 *   post:
 *     summary: Restore categories from backup file
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - backup
 *             properties:
 *               backup:
 *                 type: string
 *                 format: binary
 *                 description: JSON backup file of categories
 *     responses:
 *       200:
 *         description: Categories restored successfully
 *       400:
 *         description: Invalid backup file or error in restoration
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post('/restore/categories', protect, authorize('admin'), restoreCategories);

/**
 * @swagger
 * /api/backup/restore/reviews:
 *   post:
 *     summary: Restore reviews from backup file
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - backup
 *             properties:
 *               backup:
 *                 type: string
 *                 format: binary
 *                 description: JSON backup file of reviews
 *     responses:
 *       200:
 *         description: Reviews restored successfully
 *       400:
 *         description: Invalid backup file or error in restoration
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post('/restore/reviews', protect, authorize('admin'), restoreReviews);

/**
 * @swagger
 * /api/backup/restore/full:
 *   post:
 *     summary: Restore full backup from ZIP file
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - backup
 *             properties:
 *               backup:
 *                 type: string
 *                 format: binary
 *                 description: ZIP file containing complete backup
 *     responses:
 *       200:
 *         description: Full backup restored successfully
 *       400:
 *         description: Invalid backup file or error in restoration
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post('/restore/full', protect, authorize('admin'), restoreFullBackup);

module.exports = router; 