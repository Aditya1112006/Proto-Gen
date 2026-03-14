export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // OpenAI API errors
  if (err.name === 'APIError') {
    return res.status(500).json({
      error: 'LLM service error',
      message: err.message,
      type: 'llm_error'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
      type: 'validation_error'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    type: err.type || 'unknown_error'
  });
};
