import Joi from 'joi';
export declare const passwordSchema: any;
export declare const jwtSecretSchema: any;
export declare const databaseUrlSchema: any;
export declare const baseEnvironmentSchema: any;
export declare const userServiceEnvironmentSchema: any;
export declare const productServiceEnvironmentSchema: any;
export declare const cartServiceEnvironmentSchema: any;
export declare const orderServiceEnvironmentSchema: any;
export declare const apiGatewayEnvironmentSchema: any;
export declare const emailSchema: any;
export declare const usernameSchema: any;
export declare const phoneSchema: any;
export declare const uuidSchema: any;
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
export declare const rateLimitSchema: any;
export declare const fileUploadSchema: any;
export declare const schemas: {
    password: any;
    jwtSecret: any;
    databaseUrl: any;
    email: any;
    username: any;
    phone: any;
    uuid: any;
    rateLimit: any;
    fileUpload: any;
    environment: {
        base: any;
        userService: any;
        productService: any;
        cartService: any;
        orderService: any;
        apiGateway: any;
    };
};
//# sourceMappingURL=validation.d.ts.map