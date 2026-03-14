export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // OpenAI API errors
  if (err.name === 'APIError') {
    return res.status(500).json({
      success: false,
      error: {
        message: 'LLM service error',
        details: err.message
      }
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        details: err.message
      }
    });
  }

  // Default error - match API spec
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      details: err.type || 'unknown_error'
    }
  });
};
