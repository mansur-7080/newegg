// Mock logger for demonstration
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta),
};

// Enhanced logger for customer data management
const customerLogger = {
  info: (message: string, meta?: any) => console.log(`[CUSTOMER-INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[CUSTOMER-ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[CUSTOMER-WARN] ${message}`, meta),
  security: (message: string, meta?: any) => console.log(`[SECURITY] ${message}`, meta),
};

export interface CustomerData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: CustomerAddress;
  preferences: CustomerPreferences;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  segment: CustomerSegment;
  lifecycleStage: CustomerLifecycleStage;
  metrics: CustomerMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CustomerPreferences {
  language: string;
  currency: string;
  timezone: string;
  marketingConsent: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  categories: string[];
}

export type CustomerSegment = 
  | 'vip' 
  | 'premium' 
  | 'regular' 
  | 'occasional' 
  | 'new' 
  | 'at_risk' 
  | 'churned';

export type CustomerLifecycleStage = 
  | 'prospect' 
  | 'lead' 
  | 'customer' 
  | 'active_customer' 
  | 'vip_customer' 
  | 'at_risk' 
  | 'churned';

export interface CustomerMetrics {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
  daysSinceLastOrder: number;
  orderFrequency: number;
  returnRate: number;
  lifetimeValue: number;
  acquisitionCost: number;
  retentionScore: number;
}

export interface CustomerValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface CustomerSegmentation {
  segment: CustomerSegment;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

export interface CustomerAnalytics {
  totalCustomers: number;
  segmentDistribution: Record<CustomerSegment, number>;
  lifecycleDistribution: Record<CustomerLifecycleStage, number>;
  averageMetrics: {
    lifetimeValue: number;
    orderFrequency: number;
    retentionRate: number;
  };
  trends: {
    growthRate: number;
    churnRate: number;
    acquisitionRate: number;
  };
}

// Mock database for demonstration
class MockCustomerDatabase {
  private customers: CustomerData[] = [];

  async create(data: any): Promise<CustomerData> {
    const customer: CustomerData = {
      id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      address: data.address,
      preferences: data.preferences || {
        language: 'en',
        currency: 'USD',
        timezone: 'UTC',
        marketingConsent: false,
        emailNotifications: true,
        smsNotifications: false,
        categories: [],
      },
      status: 'active',
      segment: 'new',
      lifecycleStage: 'prospect',
      metrics: {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        daysSinceLastOrder: 0,
        orderFrequency: 0,
        returnRate: 0,
        lifetimeValue: 0,
        acquisitionCost: 0,
        retentionScore: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.customers.push(customer);
    return customer;
  }

  async findById(id: string): Promise<CustomerData | null> {
    return this.customers.find(c => c.id === id) || null;
  }

  async findByEmail(email: string): Promise<CustomerData | null> {
    return this.customers.find(c => c.email === email) || null;
  }

  async update(id: string, data: any): Promise<CustomerData | null> {
    const customer = this.customers.find(c => c.id === id);
    if (customer) {
      Object.assign(customer, data, { updatedAt: new Date() });
      return customer;
    }
    return null;
  }

  async getAll(): Promise<CustomerData[]> {
    return this.customers;
  }
}

export class CustomerDataManager {
  private db: MockCustomerDatabase;

  constructor() {
    this.db = new MockCustomerDatabase();
  }

  /**
   * ENHANCED: Create customer with comprehensive validation
   */
  async createCustomer(customerData: any): Promise<{
    success: boolean;
    customer?: CustomerData;
    errors: string[];
    warnings: string[];
  }> {
    try {
      // 1. Validate customer data
      const validation = this.validateCustomerData(customerData);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      // 2. Check for existing customer
      const existingCustomer = await this.db.findByEmail(customerData.email);
      if (existingCustomer) {
        return {
          success: false,
          errors: ['Customer with this email already exists'],
          warnings: [],
        };
      }

      // 3. Create customer
      const customer = await this.db.create(customerData);

      // 4. Perform initial segmentation
      const segmentation = await this.segmentCustomer(customer);
      await this.db.update(customer.id, { segment: segmentation.segment });

      customerLogger.info('Customer created successfully', {
        customerId: customer.id,
        email: customer.email,
        segment: segmentation.segment,
      });

      return {
        success: true,
        customer,
        errors: [],
        warnings: validation.warnings,
      };
    } catch (error) {
      customerLogger.error('Failed to create customer', { error, customerData });
      return {
        success: false,
        errors: ['Failed to create customer due to system error'],
        warnings: [],
      };
    }
  }

  /**
   * ENHANCED: Update customer with validation and lifecycle management
   */
  async updateCustomer(
    customerId: string, 
    updateData: any
  ): Promise<{
    success: boolean;
    customer?: CustomerData;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const customer = await this.db.findById(customerId);
      if (!customer) {
        return {
          success: false,
          errors: ['Customer not found'],
          warnings: [],
        };
      }

      // Validate update data
      const validation = this.validateCustomerUpdate(updateData);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      // Update customer
      const updatedCustomer = await this.db.update(customerId, updateData);
      if (!updatedCustomer) {
        return {
          success: false,
          errors: ['Failed to update customer'],
          warnings: [],
        };
      }

      // Re-segment customer if significant changes
      if (this.hasSignificantChanges(customer, updatedCustomer)) {
        const segmentation = await this.segmentCustomer(updatedCustomer);
        await this.db.update(customerId, { 
          segment: segmentation.segment,
          lifecycleStage: this.determineLifecycleStage(updatedCustomer),
        });
      }

      customerLogger.info('Customer updated successfully', {
        customerId,
        changes: Object.keys(updateData),
      });

      return {
        success: true,
        customer: updatedCustomer,
        errors: [],
        warnings: validation.warnings,
      };
    } catch (error) {
      customerLogger.error('Failed to update customer', { error, customerId });
      return {
        success: false,
        errors: ['Failed to update customer due to system error'],
        warnings: [],
      };
    }
  }

  /**
   * ENHANCED: Segment customer based on behavior and metrics
   */
  async segmentCustomer(customer: CustomerData): Promise<CustomerSegmentation> {
    const factors: string[] = [];
    let segment: CustomerSegment = 'new';
    let confidence = 0;

    // Calculate customer value
    const customerValue = customer.metrics.lifetimeValue;
    const orderFrequency = customer.metrics.orderFrequency;
    const daysSinceLastOrder = customer.metrics.daysSinceLastOrder;

    // VIP customers
    if (customerValue > 10000 && orderFrequency > 2) {
      segment = 'vip';
      confidence = 95;
      factors.push('High lifetime value', 'High order frequency');
    }
    // Premium customers
    else if (customerValue > 5000 || orderFrequency > 1) {
      segment = 'premium';
      confidence = 85;
      factors.push('Good lifetime value or order frequency');
    }
    // Regular customers
    else if (customerValue > 1000 && daysSinceLastOrder < 90) {
      segment = 'regular';
      confidence = 75;
      factors.push('Moderate value and recent activity');
    }
    // At-risk customers
    else if (daysSinceLastOrder > 180 && customerValue > 0) {
      segment = 'at_risk';
      confidence = 80;
      factors.push('Long time since last order');
    }
    // Churned customers
    else if (daysSinceLastOrder > 365) {
      segment = 'churned';
      confidence = 90;
      factors.push('No activity for over a year');
    }
    // Occasional customers
    else if (customerValue > 0) {
      segment = 'occasional';
      confidence = 70;
      factors.push('Some purchase history');
    }

    const recommendations = this.generateSegmentRecommendations(segment, customer);

    return {
      segment,
      confidence,
      factors,
      recommendations,
    };
  }

  /**
   * ENHANCED: Generate customer analytics
   */
  async generateCustomerAnalytics(): Promise<CustomerAnalytics> {
    const customers = await this.db.getAll();
    
    const analytics: CustomerAnalytics = {
      totalCustomers: customers.length,
      segmentDistribution: {
        vip: 0,
        premium: 0,
        regular: 0,
        occasional: 0,
        new: 0,
        at_risk: 0,
        churned: 0,
      },
      lifecycleDistribution: {
        prospect: 0,
        lead: 0,
        customer: 0,
        active_customer: 0,
        vip_customer: 0,
        at_risk: 0,
        churned: 0,
      },
      averageMetrics: {
        lifetimeValue: 0,
        orderFrequency: 0,
        retentionRate: 0,
      },
      trends: {
        growthRate: 0,
        churnRate: 0,
        acquisitionRate: 0,
      },
    };

    // Calculate distributions
    for (const customer of customers) {
      analytics.segmentDistribution[customer.segment]++;
      analytics.lifecycleDistribution[customer.lifecycleStage]++;
    }

    // Calculate average metrics
    const totalLifetimeValue = customers.reduce((sum, c) => sum + c.metrics.lifetimeValue, 0);
    const totalOrderFrequency = customers.reduce((sum, c) => sum + c.metrics.orderFrequency, 0);
    
    analytics.averageMetrics.lifetimeValue = totalLifetimeValue / customers.length;
    analytics.averageMetrics.orderFrequency = totalOrderFrequency / customers.length;
    analytics.averageMetrics.retentionRate = this.calculateRetentionRate(customers);

    // Calculate trends (simplified)
    analytics.trends.growthRate = this.calculateGrowthRate(customers);
    analytics.trends.churnRate = analytics.segmentDistribution.churned / customers.length;
    analytics.trends.acquisitionRate = analytics.segmentDistribution.new / customers.length;

    customerLogger.info('Customer analytics generated', {
      totalCustomers: analytics.totalCustomers,
      averageLifetimeValue: analytics.averageMetrics.lifetimeValue,
      retentionRate: analytics.averageMetrics.retentionRate,
    });

    return analytics;
  }

  /**
   * ENHANCED: Validate customer data
   */
  private validateCustomerData(data: any): CustomerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields
    if (!data.email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (!data.firstName) {
      errors.push('First name is required');
    }

    if (!data.lastName) {
      errors.push('Last name is required');
    }

    // Email validation
    if (data.email && this.isDisposableEmail(data.email)) {
      warnings.push('Disposable email detected');
    }

    // Phone validation
    if (data.phone && !this.isValidPhone(data.phone)) {
      warnings.push('Phone number format may be invalid');
    }

    // Age validation
    if (data.dateOfBirth) {
      const age = this.calculateAge(data.dateOfBirth);
      if (age < 13) {
        errors.push('Customer must be at least 13 years old');
      } else if (age > 120) {
        warnings.push('Unusual age detected');
      }
    }

    // Address validation
    if (data.address) {
      if (!data.address.street || !data.address.city || !data.address.country) {
        warnings.push('Incomplete address information');
      }
    }

    // Suggestions
    if (!data.phone) {
      suggestions.push('Consider adding phone number for better service');
    }

    if (!data.preferences?.marketingConsent) {
      suggestions.push('Consider enabling marketing communications');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Validate customer update data
   */
  private validateCustomerUpdate(data: any): CustomerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Email validation
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    // Phone validation
    if (data.phone && !this.isValidPhone(data.phone)) {
      warnings.push('Phone number format may be invalid');
    }

    // Status validation
    if (data.status && !['active', 'inactive', 'suspended', 'pending'].includes(data.status)) {
      errors.push('Invalid status value');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Check if customer has significant changes
   */
  private hasSignificantChanges(oldCustomer: CustomerData, newCustomer: CustomerData): boolean {
    const significantFields = ['email', 'status', 'metrics.totalSpent', 'metrics.orderFrequency'];
    
    for (const field of significantFields) {
      const oldValue = this.getNestedValue(oldCustomer, field);
      const newValue = this.getNestedValue(newCustomer, field);
      
      if (oldValue !== newValue) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Determine customer lifecycle stage
   */
  private determineLifecycleStage(customer: CustomerData): CustomerLifecycleStage {
    if (customer.metrics.totalOrders === 0) {
      return 'prospect';
    } else if (customer.metrics.totalOrders === 1) {
      return 'lead';
    } else if (customer.metrics.totalOrders < 5) {
      return 'customer';
    } else if (customer.metrics.lifetimeValue > 5000) {
      return 'vip_customer';
    } else if (customer.metrics.daysSinceLastOrder > 90) {
      return 'at_risk';
    } else {
      return 'active_customer';
    }
  }

  /**
   * Generate segment-specific recommendations
   */
  private generateSegmentRecommendations(segment: CustomerSegment, customer: CustomerData): string[] {
    const recommendations: string[] = [];

    switch (segment) {
      case 'vip':
        recommendations.push(
          'Offer exclusive VIP benefits',
          'Provide dedicated customer service',
          'Send personalized high-value offers'
        );
        break;
      case 'premium':
        recommendations.push(
          'Offer loyalty program benefits',
          'Send targeted promotions',
          'Provide priority customer service'
        );
        break;
      case 'regular':
        recommendations.push(
          'Send regular promotional emails',
          'Offer product recommendations',
          'Encourage repeat purchases'
        );
        break;
      case 'at_risk':
        recommendations.push(
          'Send re-engagement campaigns',
          'Offer special discounts',
          'Conduct customer feedback survey'
        );
        break;
      case 'churned':
        recommendations.push(
          'Send win-back campaigns',
          'Offer significant discounts',
          'Conduct exit interviews'
        );
        break;
      case 'new':
        recommendations.push(
          'Send welcome series',
          'Offer first-purchase discount',
          'Provide onboarding guidance'
        );
        break;
      case 'occasional':
        recommendations.push(
          'Send seasonal promotions',
          'Offer product recommendations',
          'Encourage more frequent purchases'
        );
        break;
    }

    return recommendations;
  }

  /**
   * Calculate retention rate
   */
  private calculateRetentionRate(customers: CustomerData[]): number {
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    return activeCustomers / customers.length;
  }

  /**
   * Calculate growth rate
   */
  private calculateGrowthRate(customers: CustomerData[]): number {
    // Simplified calculation
    const recentCustomers = customers.filter(c => {
      const daysSinceCreation = (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreation <= 30;
    }).length;

    return recentCustomers / customers.length;
  }

  /**
   * Utility methods
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isDisposableEmail(email: string): boolean {
    const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
    const domain = email.split('@')[1];
    return disposableDomains.includes(domain);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Export singleton instance
export const customerDataManager = new CustomerDataManager();