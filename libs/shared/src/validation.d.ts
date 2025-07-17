import Joi from 'joi';
export declare const passwordSchema: Joi.StringSchema<string>;
export declare const jwtSecretSchema: Joi.StringSchema<string>;
export declare const databaseUrlSchema: Joi.StringSchema<string>;
export declare const baseEnvironmentSchema: Joi.ObjectSchema<any>;
export declare const userServiceEnvironmentSchema: Joi.ObjectSchema<any>;
export declare const productServiceEnvironmentSchema: Joi.ObjectSchema<any>;
export declare const cartServiceEnvironmentSchema: Joi.ObjectSchema<any>;
export declare const orderServiceEnvironmentSchema: Joi.ObjectSchema<any>;
export declare const apiGatewayEnvironmentSchema: Joi.ObjectSchema<any>;
export declare const emailSchema: Joi.StringSchema<string>;
export declare const usernameSchema: Joi.StringSchema<string>;
export declare const phoneSchema: Joi.StringSchema<string>;
export declare const uuidSchema: Joi.StringSchema<string>;
export declare const sanitizeInput: (input: string) => string;
export declare const sanitizeHtml: (html: string) => string;
export declare const validateEnvironment: (schema: Joi.ObjectSchema, env?: Record<string, any>) => any;
export declare const validateRequest: (schema: Joi.Schema, data: any) => any;
export declare class ValidationError extends Error {
    details: Array<{
        field: string;
        message: string;
    }>;
    constructor(message: string, details: Array<{
        field: string;
        message: string;
    }>);
}
export declare const rateLimitSchema: Joi.ObjectSchema<any>;
export declare const fileUploadSchema: Joi.ObjectSchema<any>;
export declare const schemas: {
    password: Joi.StringSchema<string>;
    jwtSecret: Joi.StringSchema<string>;
    databaseUrl: Joi.StringSchema<string>;
    email: Joi.StringSchema<string>;
    username: Joi.StringSchema<string>;
    phone: Joi.StringSchema<string>;
    uuid: Joi.StringSchema<string>;
    rateLimit: Joi.ObjectSchema<any>;
    fileUpload: Joi.ObjectSchema<any>;
    environment: {
        base: Joi.ObjectSchema<any>;
        userService: Joi.ObjectSchema<any>;
        productService: Joi.ObjectSchema<any>;
        cartService: Joi.ObjectSchema<any>;
        orderService: Joi.ObjectSchema<any>;
        apiGateway: Joi.ObjectSchema<any>;
    };
};
//# sourceMappingURL=validation.d.ts.map