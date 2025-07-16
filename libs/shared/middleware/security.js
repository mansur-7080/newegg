exports.securityMiddleware = () => {
  return (req, res, next) => {
    // Mock security middleware
    next();
  };
};