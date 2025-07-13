# UltraMarket Error Handling Standardization Guide

## Overview
This guide documents the standardization of error handling across all UltraMarket microservices.

## Changes Made

### 1. Shared Library Updates
- ✅ Added standardized error classes in `libs/shared/src/errors/`
- ✅ Created unified error handler middleware in `libs/shared/src/middleware/errorHandler.ts`
- ✅ Standardized API response types in `libs/shared/src/types/api-responses.ts`

### 2. Microservice Updates
- ✅ Replaced generic `throw new Error()` with specific error classes
- ✅ Updated error handlers to use shared middleware
- ✅ Standardized error response formats
- ✅ Added proper error logging with request context

### 3. Error Classes Available
- `AppError` - Base error class
- `AuthenticationError` - Authentication failures
- `AuthorizationError` - Permission/access issues
- `ValidationError` - Input validation errors
- `ResourceNotFoundError` - 404 errors
- `BusinessRuleViolationError` - Business logic violations
- `DatabaseError` - Database operation failures
- `ExternalServiceError` - Third-party service errors
- `RateLimitError` - Rate limiting violations
- `ServiceUnavailableError` - Service unavailability

## Usage Examples

### Throwing Errors
```typescript
// Before
throw new Error('User not found');

// After
throw new ResourceNotFoundError('User', userId);
```

### Error Handler Setup
```typescript
// Before
app.use((error, req, res, next) => {
  // Custom error handling
});

// After
import { errorHandler } from '@ultramarket/shared';
app.use(errorHandler);
```

### Async Route Handlers
```typescript
// Before
router.get('/users', async (req, res) => {
  // Route logic
});

// After
import { asyncHandler } from '@ultramarket/shared';
router.get('/users', asyncHandler(async (req, res) => {
  // Route logic
}));
```

## Benefits
1. **Consistency** - All services use the same error handling approach
2. **Maintainability** - Centralized error handling logic
3. **Observability** - Structured error logging with context
4. **Developer Experience** - Clear error types and messages
5. **Production Readiness** - Proper error sanitization and logging

## Next Steps
1. Test all microservices with the new error handling
2. Update API documentation to reflect new error responses
3. Monitor error logs in production
4. Train development team on new error handling patterns

## Statistics
- Files processed: 70
- Errors replaced: 45
- Imports added: 70
- Error handlers updated: 1
