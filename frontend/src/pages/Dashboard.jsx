import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const STATUS_OPTIONS = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase().replace('_', '_')}`}
    style={{ fontSize: '0.7rem' }}>
    {status.replace('_', ' ')}
  </span>
);

const StatCard = ({ label, value, color }) => (
  <div className="glass-card" style={{ padding: '1.25rem 1.5rem', flex: 1, minWidth: 120 }}>
    <div style={{ fontSize: '1.75rem', fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</div>
    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
  </div>
);

export default function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  // Task form state
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'PENDING' });
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 8 });
      if (filterStatus) params.set('status', filterStatus);
      const [taskRes, statsRes] = await Promise.all([
        api.get(`/tasks?${params}`),
        api.get('/tasks/stats'),
      ]);
      setTasks(taskRes.data.data.tasks);
      setPagination(taskRes.data.data.pagination);
      setStats(statsRes.data.data.stats);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const openCreate = () => {
    setEditingTask(null);
    setTaskForm({ title: '', description: '', status: 'PENDING' });
    setShowForm(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setTaskForm({ title: task.title, description: task.description || '', status: task.status });
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, taskForm);
        toast.success('Task updated!');
      } else {
        await api.post('/tasks', taskForm);
        toast.success('Task created!');
      }
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors?.length) errors.forEach((e) => toast.error(e.message));
      else toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/tasks/${deleteId}`);
      toast.success('Task deleted');
      setDeleteId(null);
      fetchTasks();
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('See you soon!');
    navigate('/login');
  };

  return (
    <>
      <div className="dots-bg" />
      <div className="mesh-bg" />

      <div style={{ minHeight: '100vh', padding: '0' }}>
        {/* ── Navbar ── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(6,6,15,0.8)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          padding: '0 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 60,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, boxShadow: '0 0 12px rgba(139,92,246,0.4)',
            }}>⚡</div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>DevNek3D</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 34, height: 34,
                background: 'var(--gradient)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 600,
              }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user?.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              {isAdmin && <span className="badge badge-admin" style={{ fontSize: '0.65rem', marginLeft: 4 }}>Admin</span>}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
          </div>
        </nav>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

          {/* ── Header ── */}
          <div className="fade-in" style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem', fontWeight: 700, marginBottom: 4 }}>
              {isAdmin ? '👑 Admin Dashboard' : '📋 My Tasks'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {isAdmin ? 'You have full visibility of all tasks across all users.' : 'Manage your personal task board.'}
            </p>
          </div>

          {/* ── Stats ── */}
          <div className="fade-in" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            <StatCard label="Pending"     value={stats.PENDING}     color="var(--warning)" />
            <StatCard label="In Progress" value={stats.IN_PROGRESS} color="var(--info)" />
            <StatCard label="Completed"   value={stats.COMPLETED}   color="var(--success)" />
            <StatCard label="Cancelled"   value={stats.CANCELLED}   color="var(--error)" />
          </div>

          {/* ── Toolbar ── */}
          <div className="fade-in" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <select
              className="input"
              style={{ width: 'auto', minWidth: 160 }}
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>

            <button className="btn btn-ghost btn-sm" onClick={fetchTasks}>↻ Refresh</button>

            <div style={{ marginLeft: 'auto' }}>
              <button className="btn btn-primary" onClick={openCreate}>
                + New Task
              </button>
            </div>
          </div>

          {/* ── Task List ── */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <div className="spinner" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass-card fade-in" style={{
              padding: '4rem 2rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>No tasks found.</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
                Create your first task
              </button>
            </div>
          ) : (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map((task) => (
                <div key={task.id} className="glass-card" style={{
                  padding: '1.125rem 1.5rem',
                  display: 'flex', alignItems: 'center', gap: 16,
                  transition: 'border-color 0.2s, background 0.2s',
                  cursor: 'default',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.description}
                      </div>
                    )}
                    {isAdmin && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        👤 {task.user?.name} ({task.user?.email})
                      </div>
                    )}
                  </div>

                  <StatusBadge status={task.status} />

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>
                    {new Date(task.updatedAt).toLocaleDateString()}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(task)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(task.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {page} / {pagination.totalPages}
              </span>
              <button className="btn btn-ghost btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Task Form Modal ── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: 460, padding: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 20 }}>
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
            <form onSubmit={handleFormSubmit}>
              <div className="input-group">
                <label className="input-label" htmlFor="task-title">Title *</label>
                <input
                  id="task-title"
                  className="input"
                  placeholder="Task title..."
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  maxLength={120}
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="task-desc">Description</label>
                <textarea
                  id="task-desc"
                  className="input"
                  placeholder="Optional description..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                  maxLength={500}
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="task-status">Status</label>
                <select
                  id="task-status"
                  className="input"
                  value={taskForm.status}
                  onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={formLoading}>
                  {formLoading ? '...' : editingTask ? 'Save changes' : 'Create task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={(e) => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: 360, padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗑️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, marginBottom: 8 }}>Delete task?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 20 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
