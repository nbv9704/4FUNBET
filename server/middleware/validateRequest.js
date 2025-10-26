// server/middleware/validateRequest.js

const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/ErrorCodes');

/**
 * Generic validation middleware using Joi schemas
 * 
 * @param {Object} schema - Joi schema object
 * @param {String} source - Where to validate ('body' | 'query' | 'params')
 * @returns {Function} Express middleware
 * 
 * Usage:
 *   const schema = Joi.object({ betAmount: Joi.number().min(1).required() })
 *   router.post('/bet', validateRequest(schema, 'body'), handler)
 */
const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    if (!data) {
      return next(new AppError(
        ErrorCodes.INVALID_INPUT,
        400,
        `No ${source} data provided`
      ));
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const details = error.details.map(d => d.message).join('; ');
      return next(new AppError(
        ErrorCodes.INVALID_INPUT,
        400,
        `Validation failed: ${details}`,
        { validationErrors: error.details }
      ));
    }

    // Replace original data with validated & sanitized value
    req[source] = value;
    next();
  };
};

module.exports = validateRequest;