# UltraMarket Error Handling Guide

## Overview
This guide provides comprehensive information about the standardized error handling system implemented across all UltraMarket microservices.

## Error Classes

### AppError (Base Class)
- **Status Code**: 500
- **Usage**: Generic application errors
- **Example**: `throw new AppError('Database connection failed', 500)`

### ResourceNotFoundError
- **Status Code**: 404
- **Usage**: When requested resource doesn't exist
- **Example**: `throw new ResourceNotFoundError('User not found')`

### ValidationError
- **Status Code**: 400
- **Usage**: Input validation failures
- **Example**: `throw new ValidationError('Email is required')`

### AuthorizationError
- **Status Code**: 401
- **Usage**: Authentication failures
- **Example**: `throw new AuthorizationError('Invalid credentials')`

### ForbiddenError
- **Status Code**: 403
- **Usage**: Authorization failures
- **Example**: `throw new ForbiddenError('Insufficient permissions')`

### BusinessRuleViolationError
- **Status Code**: 409
- **Usage**: Business logic violations
- **Example**: `throw new BusinessRuleViolationError('Product out of stock')`

## Standardized Error Response Format

All error responses follow this consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "path": "/api/users/123",
    "requestId": "req-123456"
  }
}
```

## Best Practices

### 1. Use Specific Error Classes
❌ Don't: `throw new Error('User not found')`
✅ Do: `throw new ResourceNotFoundError('User not found')`

### 2. Provide Clear Error Messages
❌ Don't: `throw new ValidationError('Invalid input')`
✅ Do: `throw new ValidationError('Email address is required')`

### 3. Handle Database Errors Properly
```typescript
try {
  const user = await User.findById(id);
  if (!user) {
    throw new ResourceNotFoundError('User not found');
  }
  return user;
} catch (error) {
  if (error instanceof AppError) {
    throw error;
  }
  throw new AppError('Database operation failed', 500);
}
```

### 4. Validate Input Data
```typescript
if (!email || !email.includes('@')) {
  throw new ValidationError('Valid email address is required');
}
```

### 5. Check Authorization
```typescript
if (!user.hasPermission('delete_product')) {
  throw new ForbiddenError('Insufficient permissions to delete product');
}
```

## Error Codes

| Code | Description | Status Code |
|------|-------------|-------------|
| VALIDATION_ERROR | Input validation failed | 400 |
| UNAUTHORIZED | Authentication required | 401 |
| FORBIDDEN | Insufficient permissions | 403 |
| NOT_FOUND | Resource not found | 404 |
| CONFLICT | Business rule violation | 409 |
| INTERNAL_SERVER_ERROR | Server error | 500 |

## Logging

All errors are automatically logged with structured information:
- Error details (name, message, stack)
- Request information (method, path, user agent)
- Timestamp and request ID
- Error code and status code

## Testing Error Handling

```typescript
describe('Error Handling', () => {
  it('should return 404 for non-existent resource', async () => {
    const response = await request(app)
      .get('/api/users/999999')
      .expect(404);
    
    expect(response.body).toMatchObject({
      success: false,
      error: {
        message: 'User not found',
        code: 'NOT_FOUND',
        statusCode: 404
      }
    });
  });
});
```

## Migration Checklist

- [ ] Replace all `throw new Error()` with specific error classes
- [ ] Standardize all error response formats
- [ ] Add proper error imports to all files
- [ ] Implement consistent validation error handling
- [ ] Update error logging to use structured format
- [ ] Test all error scenarios
- [ ] Update API documentation with error responses
