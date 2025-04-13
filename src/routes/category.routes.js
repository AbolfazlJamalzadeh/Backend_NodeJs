const express = require('express');
const {
  getCategories,
  getCategory,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  updatePositions,
} = require('../controllers/category.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: parent
 *         schema:
 *           type: string
 *         description: Parent category ID (or 'null' for top-level)
 *       - in: query
 *         name: level
 *         schema:
 *           type: number
 *         description: Category level (1, 2, 3, etc.)
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/', getCategories);

/**
 * @swagger
 * /api/categories/tree:
 *   get:
 *     summary: Get category tree structure
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Hierarchical tree of categories
 */
router.get('/tree', getCategoryTree);

/**
 * @swagger
 * /api/categories/slug/{slug}:
 *   get:
 *     summary: Get category by slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         schema:
 *           type: string
 *         required: true
 *         description: Category slug
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get('/slug/:slug', getCategoryBySlug);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get('/:id', getCategory);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parent:
 *                 type: string
 *                 description: Parent category ID
 *               position:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               image:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                   alt:
 *                     type: string
 *               metaTitle:
 *                 type: string
 *               metaDescription:
 *                 type: string
 *               metaKeywords:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 */
router.post('/', protect, authorize('admin', 'manager'), createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parent:
 *                 type: string
 *                 description: Parent category ID
 *               position:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               image:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                   alt:
 *                     type: string
 *               metaTitle:
 *                 type: string
 *               metaDescription:
 *                 type: string
 *               metaKeywords:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Category not found
 */
router.put('/:id', protect, authorize('admin', 'manager'), updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete category with subcategories
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Category not found
 */
router.delete('/:id', protect, authorize('admin', 'manager'), deleteCategory);

/**
 * @swagger
 * /api/categories/positions:
 *   put:
 *     summary: Update category positions
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - positions
 *             properties:
 *               positions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - _id
 *                     - position
 *                   properties:
 *                     _id:
 *                       type: string
 *                     position:
 *                       type: number
 *     responses:
 *       200:
 *         description: Positions updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 */
router.put('/positions', protect, authorize('admin', 'manager'), updatePositions);

module.exports = router; 