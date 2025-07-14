import { Request } from 'express';
export interface User {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    passwordHash?: string;
    role: UserRole;
    isActive: boolean;
    isEmailVerified: boolean;
    isPhoneVerified?: boolean;
    loginAttempts?: number;
    mfaEnabled?: boolean;
    authProvider: AuthProvider;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: UserRole;
    };
}
export declare enum UserRole {
    CUSTOMER = "CUSTOMER",
    SELLER = "SELLER",
    ADMIN = "ADMIN",
    SUPER_ADMIN = "SUPER_ADMIN"
}
export declare enum AuthProvider {
    LOCAL = "LOCAL",
    GOOGLE = "GOOGLE",
    FACEBOOK = "FACEBOOK",
    APPLE = "APPLE",
    GITHUB = "GITHUB"
}
export interface Product {
    id: string;
    sku: string;
    name: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    category: string;
    subcategory?: string;
    brand: string;
    images: string[];
    variants?: ProductVariant[];
    stock: number;
    sellerId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ProductVariant {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    attributes: Record<string, any>;
}
export interface Order {
    id: string;
    orderNumber: string;
    userId: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    status: OrderStatus;
    shippingAddress: Address;
    billingAddress: Address;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    trackingNumber?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    variantId?: string;
    price: number;
    quantity: number;
    total: number;
}
export declare enum OrderStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    PROCESSING = "PROCESSING",
    SHIPPED = "SHIPPED",
    DELIVERED = "DELIVERED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED"
}
export declare enum PaymentMethod {
    CREDIT_CARD = "CREDIT_CARD",
    DEBIT_CARD = "DEBIT_CARD",
    PAYPAL = "PAYPAL",
    STRIPE = "STRIPE",
    BANK_TRANSFER = "BANK_TRANSFER",
    CASH_ON_DELIVERY = "CASH_ON_DELIVERY"
}
export interface Address {
    id?: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault?: boolean;
}
export interface Cart {
    id: string;
    userId: string;
    items: CartItem[];
    subtotal: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CartItem {
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
    product?: Product;
}
export interface Payment {
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionId?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface Review {
    id: string;
    productId: string;
    userId: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
    isVerifiedPurchase: boolean;
    helpful: number;
    notHelpful: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ApiError;
    message?: string;
}
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
}
export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
export interface UserResponse {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    role: UserRole;
    isActive: boolean;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    authProvider: AuthProvider;
    createdAt: Date;
    updatedAt: Date;
}
export interface Event<T = any> {
    id: string;
    type: string;
    timestamp: Date;
    data: T;
    metadata?: Record<string, any>;
}
export interface SearchQuery {
    query: string;
    filters?: Record<string, any>;
    pagination?: PaginationParams;
}
export interface SearchResult<T> {
    items: T[];
    totalCount: number;
    facets?: Record<string, FacetBucket[]>;
}
export interface FacetBucket {
    key: string;
    count: number;
}
//# sourceMappingURL=types.d.ts.map