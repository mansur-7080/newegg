import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ReviewController } from '../controllers/review.controller';
import { authMiddleware, optionalAuth, requireAdmin } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const reviewController = new ReviewController();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Product review management
 */

/**
 * @swagger
 * /api/v1/reviews/product/{productId}:
 *   get:
 *     summary: Get reviews for a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating, helpful, recent]
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get(
  '/product/:productId',
  optionalAuth,
  param('productId').isUUID().withMessage('Invalid product ID'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['rating', 'helpful', 'recent']),
  validateRequest,
  reviewController.getProductReviews
);

/**
 * @swagger
 * /api/v1/reviews/{reviewId}:
 *   get:
 *     summary: Get review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review details
 */
router.get(
  '/:reviewId',
  param('reviewId').isUUID().withMessage('Invalid review ID'),
  validateRequest,
  reviewController.getReviewById
);

/**
 * @swagger
 * /api/v1/reviews:
 *   post:
 *     summary: Create a new review
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
 *               - productId
 *               - rating
 *             properties:
 *               productId:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 */
router.post(
  '/',
  authMiddleware,
  body('productId').isUUID().withMessage('Invalid product ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().isString().trim().isLength({ max: 200 }),
  body('comment').optional().isString().trim().isLength({ max: 2000 }),
  validateRequest,
  reviewController.createReview
);

/**
 * @swagger
 * /api/v1/reviews/{reviewId}:
 *   put:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *               title:
 *                 type: string
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 */
router.put(
  '/:reviewId',
  authMiddleware,
  param('reviewId').isUUID().withMessage('Invalid review ID'),
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('title').optional().isString().trim().isLength({ max: 200 }),
  body('comment').optional().isString().trim().isLength({ max: 2000 }),
  validateRequest,
  reviewController.updateReview
);

/**
 * @swagger
 * /api/v1/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 */
router.delete(
  '/:reviewId',
  authMiddleware,
  param('reviewId').isUUID().withMessage('Invalid review ID'),
  validateRequest,
  reviewController.deleteReview
);

/**
 * @swagger
 * /api/v1/reviews/{reviewId}/helpful:
 *   post:
 *     summary: Mark review as helpful
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               helpful:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Helpfulness recorded
 */
router.post(
  '/:reviewId/helpful',
  authMiddleware,
  param('reviewId').isUUID().withMessage('Invalid review ID'),
  body('helpful').isBoolean().withMessage('Helpful must be boolean'),
  validateRequest,
  reviewController.markHelpful
);

/**
 * @swagger
 * /api/v1/reviews/{reviewId}/report:
 *   post:
 *     summary: Report a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
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
 *                 enum: [spam, inappropriate, fake, other]
 *               details:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report submitted
 */
router.post(
  '/:reviewId/report',
  authMiddleware,
  param('reviewId').isUUID().withMessage('Invalid review ID'),
  body('reason').isIn(['spam', 'inappropriate', 'fake', 'other']).withMessage('Invalid reason'),
  body('details').optional().isString().trim().isLength({ max: 500 }),
  validateRequest,
  reviewController.reportReview
);

/**
 * @swagger
 * /api/v1/reviews/{reviewId}/verify:
 *   post:
 *     summary: Verify a review (admin only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review verified
 */
router.post(
  '/:reviewId/verify',
  authMiddleware,
  requireAdmin,
  param('reviewId').isUUID().withMessage('Invalid review ID'),
  validateRequest,
  reviewController.verifyReview
);

/**
 * @swagger
 * /api/v1/reviews/user/{userId}:
 *   get:
 *     summary: Get reviews by user
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of user reviews
 */
router.get(
  '/user/:userId',
  authMiddleware,
  param('userId').isUUID().withMessage('Invalid user ID'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validateRequest,
  reviewController.getUserReviews
);

/**
 * @swagger
 * /api/v1/reviews/stats/{productId}:
 *   get:
 *     summary: Get review statistics for a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review statistics
 */
router.get(
  '/stats/:productId',
  param('productId').isUUID().withMessage('Invalid product ID'),
  validateRequest,
  reviewController.getReviewStats
);

export default router;
