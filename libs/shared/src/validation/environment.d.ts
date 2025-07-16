/**
 * UltraMarket Environment Validation
 * Comprehensive validation for all microservices environment variables
 */
import Joi from 'joi';
declare const baseEnvironmentSchema: Joi.ObjectSchema<any>;
declare const databaseEnvironmentSchema: Joi.ObjectSchema<any>;
declare const redisEnvironmentSchema: Joi.ObjectSchema<any>;
declare const jwtEnvironmentSchema: Joi.ObjectSchema<any>;
declare const messageQueueEnvironmentSchema: Joi.ObjectSchema<any>;
declare const externalServicesEnvironmentSchema: Joi.ObjectSchema<any>;
export declare const serviceEnvironmentSchemas: {
    'auth-service': Joi.ObjectSchema<any>;
    'user-service': Joi.ObjectSchema<any>;
    'product-service': Joi.ObjectSchema<any>;
    'order-service': Joi.ObjectSchema<any>;
    'payment-service': Joi.ObjectSchema<any>;
    'cart-service': Joi.ObjectSchema<any>;
    'notification-service': Joi.ObjectSchema<any>;
    'search-service': Joi.ObjectSchema<any>;
    'api-gateway': Joi.ObjectSchema<any>;
    'pc-builder-service': Joi.ObjectSchema<any>;
    'dynamic-pricing-service': Joi.ObjectSchema<any>;
    'analytics-service': Joi.ObjectSchema<any>;
    'inventory-service': Joi.ObjectSchema<any>;
    'review-service': Joi.ObjectSchema<any>;
    'shipping-service': Joi.ObjectSchema<any>;
};
export declare function validateEnvironment(serviceName: string, env?: Record<string, string | undefined>): {
    error?: string;
    value?: Record<string, unknown>;
};
export declare function createEnvironmentValidator(serviceName: string): (req: unknown, res: unknown, next: () => void) => void;
export declare function validateEnvironmentOnStartup(serviceName: string): void;
export { baseEnvironmentSchema, databaseEnvironmentSchema, redisEnvironmentSchema, jwtEnvironmentSchema, messageQueueEnvironmentSchema, externalServicesEnvironmentSchema, };
declare const _default: {
    validateEnvironment: typeof validateEnvironment;
    validateEnvironmentOnStartup: typeof validateEnvironmentOnStartup;
    createEnvironmentValidator: typeof createEnvironmentValidator;
    serviceEnvironmentSchemas: {
        'auth-service': Joi.ObjectSchema<any>;
        'user-service': Joi.ObjectSchema<any>;
        'product-service': Joi.ObjectSchema<any>;
        'order-service': Joi.ObjectSchema<any>;
        'payment-service': Joi.ObjectSchema<any>;
        'cart-service': Joi.ObjectSchema<any>;
        'notification-service': Joi.ObjectSchema<any>;
        'search-service': Joi.ObjectSchema<any>;
        'api-gateway': Joi.ObjectSchema<any>;
        'pc-builder-service': Joi.ObjectSchema<any>;
        'dynamic-pricing-service': Joi.ObjectSchema<any>;
        'analytics-service': Joi.ObjectSchema<any>;
        'inventory-service': Joi.ObjectSchema<any>;
        'review-service': Joi.ObjectSchema<any>;
        'shipping-service': Joi.ObjectSchema<any>;
    };
};
export default _default;
//# sourceMappingURL=environment.d.ts.map