import { Request, Response, NextFunction } from 'express';
import { StoreService, CreateStoreData, UpdateStoreData, StoreFilters } from '../services/store.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler, createError } from '../middleware/error.middleware';
import { validationResult, body, param, query } from 'express-validator';

const storeService = new StoreService();

export class StoreController {
  // Create store validation
  static createStoreValidation = [
    body('name').notEmpty().withMessage('Store name is required'),
    body('slug').notEmpty().withMessage('Store slug is required'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description too long'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
    body('website').optional().isURL().withMessage('Invalid website URL'),
  ];

  // Update store validation
  static updateStoreValidation = [
    param('id').isUUID().withMessage('Invalid store ID'),
    body('name').optional().notEmpty().withMessage('Store name cannot be empty'),
    body('slug').optional().notEmpty().withMessage('Store slug cannot be empty'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description too long'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
    body('website').optional().isURL().withMessage('Invalid website URL'),
    body('commission').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission must be between 0 and 100'),
  ];

  // Get store validation
  static getStoreValidation = [
    param('id').isUUID().withMessage('Invalid store ID'),
  ];

  // Create new store
  createStore = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const storeData: CreateStoreData = {
      ...req.body,
      ownerId: req.user.id,
    };

    const store = await storeService.createStore(storeData);

    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      data: store,
    });
  });

  // Get all stores
  getStores = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const filters: StoreFilters = {
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      isVerified: req.query.isVerified === 'true' ? true : req.query.isVerified === 'false' ? false : undefined,
      ownerId: req.query.ownerId as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    };

    const result = await storeService.getStores(filters);

    res.status(200).json({
      success: true,
      message: 'Stores retrieved successfully',
      data: result,
    });
  });

  // Get store by ID
  getStoreById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const { id } = req.params;
    const store = await storeService.getStoreById(id);

    if (!store) {
      throw createError('Store not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Store retrieved successfully',
      data: store,
    });
  });

  // Get store by slug
  getStoreBySlug = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    
    if (!slug) {
      throw createError('Store slug is required', 400);
    }

    const store = await storeService.getStoreBySlug(slug);

    if (!store) {
      throw createError('Store not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Store retrieved successfully',
      data: store,
    });
  });

  // Update store
  updateStore = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const { id } = req.params;
    const updateData: UpdateStoreData = req.body;

    // Check if user owns the store or is admin
    const existingStore = await storeService.getStoreById(id);
    if (!existingStore) {
      throw createError('Store not found', 404);
    }

    if (existingStore.ownerId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      throw createError('Insufficient permissions', 403);
    }

    const store = await storeService.updateStore(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Store updated successfully',
      data: store,
    });
  });

  // Delete store
  deleteStore = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const { id } = req.params;

    // Check if user owns the store or is admin
    const existingStore = await storeService.getStoreById(id);
    if (!existingStore) {
      throw createError('Store not found', 404);
    }

    if (existingStore.ownerId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      throw createError('Insufficient permissions', 403);
    }

    await storeService.deleteStore(id);

    res.status(200).json({
      success: true,
      message: 'Store deleted successfully',
    });
  });

  // Verify store (Admin only)
  verifyStore = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      throw createError('Admin access required', 403);
    }

    const { id } = req.params;
    const store = await storeService.verifyStore(id);

    res.status(200).json({
      success: true,
      message: 'Store verified successfully',
      data: store,
    });
  });

  // Get store statistics
  getStoreStats = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const { id } = req.params;

    // Check if user owns the store or is admin
    const existingStore = await storeService.getStoreById(id);
    if (!existingStore) {
      throw createError('Store not found', 404);
    }

    if (existingStore.ownerId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      throw createError('Insufficient permissions', 403);
    }

    const stats = await storeService.getStoreStats(id);

    res.status(200).json({
      success: true,
      message: 'Store statistics retrieved successfully',
      data: stats,
    });
  });

  // Get my stores (for authenticated user)
  getMyStores = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const filters: StoreFilters = {
      ownerId: req.user.id,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    };

    const result = await storeService.getStores(filters);

    res.status(200).json({
      success: true,
      message: 'My stores retrieved successfully',
      data: result,
    });
  });
}