const prisma = require('../config/prisma');
const { sendSuccess, sendError, sendCreated } = require('../utils/response.utils');

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new task
 * @access  Private
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, status } = req.body;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'PENDING',
        userId: req.user.id,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return sendCreated(res, { task }, 'Task created successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/tasks
 * @desc    Get tasks — admin sees all, user sees own
 * @access  Private
 */
const getTasks = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(req.user.role !== 'ADMIN' ? { userId: req.user.id } : {}),
      ...(status ? { status } : {}),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.task.count({ where }),
    ]);

    return sendSuccess(res, {
      tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Tasks fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/tasks/:id
 * @desc    Get a single task
 * @access  Private
 */
const getTask = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!task) return sendError(res, 'Task not found', 404);

    // Only owner or admin can view
    if (task.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return sendError(res, 'Forbidden', 403);
    }

    return sendSuccess(res, { task }, 'Task fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/v1/tasks/:id
 * @desc    Update a task
 * @access  Private
 */
const updateTask = async (req, res, next) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return sendError(res, 'Task not found', 404);

    if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return sendError(res, 'Forbidden', 403);
    }

    const { title, description, status } = req.body;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return sendSuccess(res, { task }, 'Task updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/v1/tasks/:id
 * @desc    Delete a task
 * @access  Private
 */
const deleteTask = async (req, res, next) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return sendError(res, 'Task not found', 404);

    if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return sendError(res, 'Forbidden', 403);
    }

    await prisma.task.delete({ where: { id: req.params.id } });

    return sendSuccess(res, {}, 'Task deleted successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/v1/tasks/stats
 * @desc    Get task stats for current user (or all if admin)
 * @access  Private
 */
const getStats = async (req, res, next) => {
  try {
    const where = req.user.role !== 'ADMIN' ? { userId: req.user.id } : {};

    const stats = await prisma.task.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const formatted = {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    stats.forEach(({ status, _count }) => {
      formatted[status] = _count.status;
    });

    return sendSuccess(res, { stats: formatted }, 'Stats fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = { createTask, getTasks, getTask, updateTask, deleteTask, getStats };
