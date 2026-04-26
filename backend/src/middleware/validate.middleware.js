const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response.utils');

/**
 * Runs after express-validator chains.
 * If errors exist, responds immediately with 422.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return sendError(res, 'Validation failed', 422, formatted);
  }
  next();
};

module.exports = { validate };
