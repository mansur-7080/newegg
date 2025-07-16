import express from 'express';
import multer from 'multer';
import { FileController } from '../controllers/file.controller';

const router = express.Router();
const fileController = new FileController();

// Configure multer for image uploads
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB for images
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * @swagger
 * /api/images/resize:
 *   post:
 *     summary: Upload and resize image
 *     tags: [Images]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               width:
 *                 type: integer
 *               height:
 *                 type: integer
 *               quality:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *     responses:
 *       201:
 *         description: Image resized and uploaded successfully
 */
router.post('/resize', uploadImage.single('image'), fileController.resizeImage.bind(fileController));

/**
 * @swagger
 * /api/images/optimize:
 *   post:
 *     summary: Upload and optimize image
 *     tags: [Images]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               format:
 *                 type: string
 *                 enum: [jpeg, png, webp]
 *               quality:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Image optimized and uploaded successfully
 */
router.post('/optimize', uploadImage.single('image'), fileController.optimizeImage.bind(fileController));

/**
 * @swagger
 * /api/images/thumbnail:
 *   post:
 *     summary: Generate thumbnail from image
 *     tags: [Images]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               size:
 *                 type: integer
 *                 description: Thumbnail size in pixels
 *     responses:
 *       201:
 *         description: Thumbnail generated successfully
 */
router.post('/thumbnail', uploadImage.single('image'), fileController.generateThumbnail.bind(fileController));

/**
 * @swagger
 * /api/images/{id}/metadata:
 *   get:
 *     summary: Get image metadata
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image metadata
 */
router.get('/:id/metadata', fileController.getImageMetadata.bind(fileController));

/**
 * @swagger
 * /api/images/{id}/variants:
 *   get:
 *     summary: Get image variants (different sizes)
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of image variants
 */
router.get('/:id/variants', fileController.getImageVariants.bind(fileController));

export default router;