exports.errorHandler = (err, req, res, next) => {
  console.error('[ERROR HANDLER]', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
    },
  });
};