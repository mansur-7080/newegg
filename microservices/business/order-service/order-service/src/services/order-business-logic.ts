import { logger } from '../utils/logger';

// Enhanced logger for business logic events
const businessLogger = {
  info: (message: string, meta?: any) => console.log(`[BUSINESS-INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[BUSINESS-ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[BUSINESS-WARN] ${message}`, meta),
  security: (message: string, meta?: any) => console.log(`[SECURITY] ${message}`, meta),
};

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  inventoryStatus: InventoryStatus[];
  paymentStatus: PaymentStatus;
  businessRules: BusinessRuleResult[];
}

export interface InventoryStatus {
  productId: string;
  available: boolean;
  availableQuantity: number;
  requestedQuantity: number;
  warehouseId?: string;
  backorderAvailable: boolean;
}

export interface PaymentStatus {
  isValid: boolean;
  method: string;
  amount: number;
  currency: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface BusinessRuleResult {
  rule: string;
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface OrderBusinessRules {
  maxOrderValue: number;
  maxItemsPerOrder: number;
  minOrderValue: number;
  allowedPaymentMethods: string[];
  restrictedProducts: string[];
  customerLimits: {
    maxOrdersPerDay: number;
    maxOrdersPerMonth: number;
    maxOrderValue: number;
  };
}

export class OrderBusinessLogic {
  private businessRules: OrderBusinessRules;

  constructor() {
    this.businessRules = {
      maxOrderValue: 10000, // $10,000
      maxItemsPerOrder: 50,
      minOrderValue: 10, // $10
      allowedPaymentMethods: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'],
      restrictedProducts: [], // Products that require special approval
      customerLimits: {
        maxOrdersPerDay: 5,
        maxOrdersPerMonth: 50,
        maxOrderValue: 5000, // $5,000 per order
      },
    };
  }

  /**
   * ENHANCED: Validate order creation with comprehensive business rules
   */
  async validateOrderCreation(orderData: any, customerData: any): Promise<OrderValidationResult> {
    const result: OrderValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      inventoryStatus: [],
      paymentStatus: {
        isValid: false,
        method: '',
        amount: 0,
        currency: 'USD',
        riskLevel: 'low',
      },
      businessRules: [],
    };

    try {
      // 1. Basic order validation
      const basicValidation = this.validateBasicOrderData(orderData);
      result.errors.push(...basicValidation.errors);
      result.warnings.push(...basicValidation.warnings);

      // 2. Business rules validation
      const businessRulesValidation = await this.validateBusinessRules(orderData, customerData);
      result.businessRules.push(...businessRulesValidation);

      // 3. Inventory validation
      const inventoryValidation = await this.validateInventory(orderData.items);
      result.inventoryStatus = inventoryValidation;

      // 4. Payment validation
      const paymentValidation = await this.validatePayment(orderData.payment, orderData.totalAmount);
      result.paymentStatus = paymentValidation;

      // 5. Customer limits validation
      const customerLimitsValidation = await this.validateCustomerLimits(orderData.userId, orderData.totalAmount);
      result.errors.push(...customerLimitsValidation.errors);
      result.warnings.push(...customerLimitsValidation.warnings);

      // Determine overall validity
      result.isValid = result.errors.length === 0 && 
                      result.paymentStatus.isValid && 
                      result.inventoryStatus.every(item => item.available);

      businessLogger.info('Order validation completed', {
        orderId: orderData.id,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      });

      return result;
    } catch (error) {
      businessLogger.error('Order validation failed', { error, orderData });
      result.isValid = false;
      result.errors.push('Order validation failed due to system error');
      return result;
    }
  }

  /**
   * Validate basic order data
   */
  private validateBasicOrderData(orderData: any): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!orderData.userId) {
      errors.push('User ID is required');
    }

    if (!orderData.items || orderData.items.length === 0) {
      errors.push('Order must contain at least one item');
    }

    if (orderData.items && orderData.items.length > this.businessRules.maxItemsPerOrder) {
      errors.push(`Order cannot contain more than ${this.businessRules.maxItemsPerOrder} items`);
    }

    // Order value validation
    const totalValue = orderData.items?.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0) || 0;

    if (totalValue < this.businessRules.minOrderValue) {
      errors.push(`Order value must be at least $${this.businessRules.minOrderValue}`);
    }

    if (totalValue > this.businessRules.maxOrderValue) {
      errors.push(`Order value cannot exceed $${this.businessRules.maxOrderValue}`);
    }

    // Item validation
    if (orderData.items) {
      orderData.items.forEach((item: any, index: number) => {
        if (!item.productId) {
          errors.push(`Item ${index + 1}: Product ID is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }
        if (!item.price || item.price <= 0) {
          errors.push(`Item ${index + 1}: Price must be greater than 0`);
        }
        if (item.quantity > 100) {
          warnings.push(`Item ${index + 1}: Large quantity detected (${item.quantity})`);
        }
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(orderData: any, customerData: any): Promise<BusinessRuleResult[]> {
    const results: BusinessRuleResult[] = [];

    // Rule 1: Check for restricted products
    const restrictedItems = orderData.items?.filter((item: any) => 
      this.businessRules.restrictedProducts.includes(item.productId)
    ) || [];

    if (restrictedItems.length > 0) {
      results.push({
        rule: 'RESTRICTED_PRODUCTS',
        passed: false,
        message: `Order contains ${restrictedItems.length} restricted products`,
        severity: 'error',
      });
    } else {
      results.push({
        rule: 'RESTRICTED_PRODUCTS',
        passed: true,
        message: 'No restricted products in order',
        severity: 'info',
      });
    }

    // Rule 2: Check order timing (business hours)
    const currentHour = new Date().getHours();
    if (currentHour < 6 || currentHour > 22) {
      results.push({
        rule: 'BUSINESS_HOURS',
        passed: false,
        message: 'Order placed outside business hours',
        severity: 'warning',
      });
    } else {
      results.push({
        rule: 'BUSINESS_HOURS',
        passed: true,
        message: 'Order placed during business hours',
        severity: 'info',
      });
    }

    // Rule 3: Check customer status
    if (customerData.status === 'suspended') {
      results.push({
        rule: 'CUSTOMER_STATUS',
        passed: false,
        message: 'Customer account is suspended',
        severity: 'error',
      });
    } else {
      results.push({
        rule: 'CUSTOMER_STATUS',
        passed: true,
        message: 'Customer account is active',
        severity: 'info',
      });
    }

    // Rule 4: Check for suspicious patterns
    const totalValue = orderData.items?.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0) || 0;

    if (totalValue > 1000 && orderData.items?.length === 1) {
      results.push({
        rule: 'SUSPICIOUS_PATTERN',
        passed: false,
        message: 'High-value single-item order detected',
        severity: 'warning',
      });
    } else {
      results.push({
        rule: 'SUSPICIOUS_PATTERN',
        passed: true,
        message: 'Order pattern is normal',
        severity: 'info',
      });
    }

    return results;
  }

  /**
   * Validate inventory availability
   */
  private async validateInventory(items: any[]): Promise<InventoryStatus[]> {
    const inventoryStatus: InventoryStatus[] = [];

    // TODO: Integrate with actual inventory service
    // For now, simulate inventory check
    for (const item of items) {
      const available = Math.random() > 0.1; // 90% availability for demo
      const availableQuantity = available ? Math.max(item.quantity, Math.floor(Math.random() * 100)) : 0;

      inventoryStatus.push({
        productId: item.productId,
        available,
        availableQuantity,
        requestedQuantity: item.quantity,
        warehouseId: 'default-warehouse',
        backorderAvailable: available && availableQuantity < item.quantity,
      });
    }

    return inventoryStatus;
  }

  /**
   * Validate payment information
   */
  private async validatePayment(paymentData: any, totalAmount: number): Promise<PaymentStatus> {
    const status: PaymentStatus = {
      isValid: false,
      method: paymentData?.method || '',
      amount: totalAmount,
      currency: 'USD',
      riskLevel: 'low',
    };

    // Validate payment method
    if (!paymentData?.method) {
      return status;
    }

    if (!this.businessRules.allowedPaymentMethods.includes(paymentData.method)) {
      return status;
    }

    // Validate payment amount
    if (paymentData.amount !== totalAmount) {
      return status;
    }

    // Risk assessment
    if (totalAmount > 1000) {
      status.riskLevel = 'high';
    } else if (totalAmount > 500) {
      status.riskLevel = 'medium';
    }

    // Additional payment validation logic here
    status.isValid = true;

    return status;
  }

  /**
   * Validate customer limits
   */
  private async validateCustomerLimits(userId: string, totalAmount: number): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // TODO: Integrate with actual customer service to get order history
    // For now, simulate customer limits check
    const dailyOrders = Math.floor(Math.random() * 10);
    const monthlyOrders = Math.floor(Math.random() * 100);
    const totalSpent = Math.floor(Math.random() * 10000);

    if (dailyOrders >= this.businessRules.customerLimits.maxOrdersPerDay) {
      errors.push('Daily order limit exceeded');
    }

    if (monthlyOrders >= this.businessRules.customerLimits.maxOrdersPerMonth) {
      errors.push('Monthly order limit exceeded');
    }

    if (totalAmount > this.businessRules.customerLimits.maxOrderValue) {
      errors.push('Order value exceeds customer limit');
    }

    if (totalSpent > 5000) {
      warnings.push('Customer has high spending history');
    }

    return { errors, warnings };
  }

  /**
   * ENHANCED: Process order with business logic
   */
  async processOrder(orderData: any, customerData: any): Promise<{
    success: boolean;
    orderId?: string;
    errors: string[];
    warnings: string[];
    requiresApproval: boolean;
  }> {
    try {
      // Validate order
      const validation = await this.validateOrderCreation(orderData, customerData);

      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
          requiresApproval: false,
        };
      }

      // Check if order requires approval
      const requiresApproval = this.checkIfApprovalRequired(validation);

      if (requiresApproval) {
        businessLogger.warn('Order requires approval', {
          orderId: orderData.id,
          reasons: validation.warnings,
        });

        return {
          success: true,
          errors: [],
          warnings: validation.warnings,
          requiresApproval: true,
        };
      }

      // Process order normally
      businessLogger.info('Order processed successfully', {
        orderId: orderData.id,
        totalAmount: orderData.totalAmount,
      });

      return {
        success: true,
        orderId: orderData.id,
        errors: [],
        warnings: validation.warnings,
        requiresApproval: false,
      };
    } catch (error) {
      businessLogger.error('Order processing failed', { error, orderData });
      return {
        success: false,
        errors: ['Order processing failed due to system error'],
        warnings: [],
        requiresApproval: false,
      };
    }
  }

  /**
   * Check if order requires approval
   */
  private checkIfApprovalRequired(validation: OrderValidationResult): boolean {
    // Orders require approval if:
    // 1. High risk payment
    // 2. Suspicious patterns detected
    // 3. High value orders
    // 4. Restricted products

    const highRiskPayment = validation.paymentStatus.riskLevel === 'high';
    const suspiciousPattern = validation.businessRules.some(rule => 
      rule.rule === 'SUSPICIOUS_PATTERN' && !rule.passed
    );
    const highValue = validation.paymentStatus.amount > 2000;
    const restrictedProducts = validation.businessRules.some(rule => 
      rule.rule === 'RESTRICTED_PRODUCTS' && !rule.passed
    );

    return highRiskPayment || suspiciousPattern || highValue || restrictedProducts;
  }

  /**
   * ENHANCED: Validate order status transition
   */
  validateOrderStatusTransition(currentStatus: string, newStatus: string): {
    isValid: boolean;
    message: string;
    requiresApproval: boolean;
  } {
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['PROCESSING', 'CANCELLED'],
      'PROCESSING': ['SHIPPED', 'CANCELLED', 'ON_HOLD'],
      'SHIPPED': ['DELIVERED', 'RETURNED'],
      'DELIVERED': ['COMPLETED', 'RETURNED'],
      'ON_HOLD': ['PROCESSING', 'CANCELLED'],
      'CANCELLED': [], // No further transitions
      'COMPLETED': [], // No further transitions
      'RETURNED': ['REFUNDED'],
      'REFUNDED': [], // No further transitions
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    const isValid = allowedTransitions.includes(newStatus);

    // Special cases requiring approval
    const requiresApproval = newStatus === 'REFUNDED' || 
                           (currentStatus === 'DELIVERED' && newStatus === 'RETURNED');

    return {
      isValid,
      message: isValid ? 'Status transition is valid' : 'Invalid status transition',
      requiresApproval,
    };
  }
}

// Export singleton instance
export const orderBusinessLogic = new OrderBusinessLogic();