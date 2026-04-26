const { body, param } = require('express-validator');

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const createTaskValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 120 }).withMessage('Title must be 3–120 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description max 500 characters'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
];

const updateTaskValidator = [
  param('id').isUUID().withMessage('Invalid task ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 120 }).withMessage('Title must be 3–120 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description max 500 characters'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
];

const taskIdValidator = [
  param('id').isUUID().withMessage('Invalid task ID'),
];

module.exports = { createTaskValidator, updateTaskValidator, taskIdValidator };
