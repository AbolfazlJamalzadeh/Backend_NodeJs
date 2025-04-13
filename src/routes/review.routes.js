const express = require('express');
const {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  approveReview,
  replyToReview,
  reportReview,
  likeReview,
  dislikeReview,
  getMyReviews,
  getProductReviews
} = require('../controllers/review.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Product reviews management
 */

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get all reviews
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: "Page number (default: 1)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: "Number of items per page (default: 10)"
 *       - in: query
 *         name: product
 *         schema:
 *           type: string
 *         description: Filter by product ID
 *       - in: query
 *         name: approved
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by approval status (admin only)
 *       - in: query
 *         name: verified
 *         schema:
 *           type: string
 *           enum: ['true']
 *         description: Filter by verified purchase
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3, 4, 5]
 *         description: Filter by rating
 *     responses:
 *       200:
 *         description: List of reviews
 *   post:
 *     summary: Create new review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product
 *               - rating
 *               - comment
 *             properties:
 *               product:
 *                 type: string
 *                 description: Product ID
 *               rating:
 *                 type: integer
 *                 enum: [1, 2, 3, 4, 5]
 *                 description: Rating (1 to 5)
 *               title:
 *                 type: string
 *                 description: Review title
 *               comment:
 *                 type: string
 *                 description: Review text
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     alt:
 *                       type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Product not found
 */
router.route('/')
  .get(getReviews)
  .post(protect, createReview);

/**
 * @swagger
 * /api/reviews/me:
 *   get:
 *     summary: Get my reviews
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: "Page number (default: 1)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: "Number of items per page (default: 10)"
 *     responses:
 *       200:
 *         description: List of my reviews
 */
router.route('/me').get(protect, getMyReviews);

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Get review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review details
 *       404:
 *         description: Review not found
 *   put:
 *     summary: Update review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 enum: [1, 2, 3, 4, 5]
 *                 description: Rating (1 to 5)
 *               title:
 *                 type: string
 *                 description: Review title
 *               comment:
 *                 type: string
 *                 description: Review text
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     alt:
 *                       type: string
 *               isApproved:
 *                 type: boolean
 *                 description: Approval status (admin only)
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Review not found
 *   delete:
 *     summary: Delete review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Review not found
 */
router.route('/:id')
  .get(getReviewById)
  .put(protect, updateReview)
  .delete(protect, deleteReview);

/**
 * @swagger
 * /api/reviews/{id}/approve:
 *   put:
 *     summary: Approve review (admin only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review approved successfully
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Review not found
 */
router.route('/:id/approve').put(protect, authorize('admin', 'manager'), approveReview);

/**
 * @swagger
 * /api/reviews/{id}/reply:
 *   put:
 *     summary: Reply to review (admin only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *                 description: Reply text
 *     responses:
 *       200:
 *         description: Reply submitted successfully
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Review not found
 */
router.route('/:id/reply').put(protect, authorize('admin', 'manager'), replyToReview);

/**
 * @swagger
 * /api/reviews/{id}/report:
 *   put:
 *     summary: Report inappropriate review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Report reason
 *     responses:
 *       200:
 *         description: Report submitted successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Review not found
 */
router.route('/:id/report').put(protect, reportReview);

/**
 * @swagger
 * /api/reviews/{id}/like:
 *   put:
 *     summary: Like review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Like submitted successfully
 *       404:
 *         description: Review not found
 */
router.route('/:id/like').put(protect, likeReview);

/**
 * @swagger
 * /api/reviews/{id}/dislike:
 *   put:
 *     summary: Dislike review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Dislike submitted successfully
 *       404:
 *         description: Review not found
 */
router.route('/:id/dislike').put(protect, dislikeReview);

module.exports = router; 