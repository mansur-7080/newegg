import { Router } from 'express';
import { body, query } from 'express-validator';
import { EmailController } from '../controllers/email.controller';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const emailController = new EmailController();

// Test connection
router.get('/test-connection', emailController.testConnection);

// Send test email
router.post(
  '/test',
  [
    body('to').isEmail().withMessage('Valid email is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').optional().isString(),
  ],
  validateRequest,
  emailController.sendTestEmail
);

// Send welcome email
router.post(
  '/welcome',
  [
    body('to').isEmail().withMessage('Valid email is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('verificationUrl').isURL().withMessage('Valid verification URL is required'),
  ],
  validateRequest,
  emailController.sendWelcomeEmail
);

// Send order confirmation
router.post(
  '/order-confirmation',
  [
    body('to').isEmail().withMessage('Valid email is required'),
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('orderNumber').notEmpty().withMessage('Order number is required'),
    body('totalAmount').isNumeric().withMessage('Total amount must be numeric'),
    body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
  ],
  validateRequest,
  emailController.sendOrderConfirmation
);

// Send password reset
router.post(
  '/password-reset',
  [
    body('to').isEmail().withMessage('Valid email is required'),
    body('resetUrl').isURL().withMessage('Valid reset URL is required'),
  ],
  validateRequest,
  emailController.sendPasswordReset
);

// Send bulk emails
router.post(
  '/bulk',
  [
    body('emails').isArray({ min: 1 }).withMessage('Emails array is required'),
    body('emails.*.to').isEmail().withMessage('Each email must have valid to address'),
    body('emails.*.subject').notEmpty().withMessage('Each email must have subject'),
    body('emails.*.template').notEmpty().withMessage('Each email must have template'),
  ],
  validateRequest,
  emailController.sendBulkEmails
);

// Get email statistics
router.get(
  '/stats',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date'),
  ],
  validateRequest,
  emailController.getEmailStats
);

// Get email templates
router.get('/templates', emailController.getEmailTemplates);

export default router;