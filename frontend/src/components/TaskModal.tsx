import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, UserCheck, X } from 'lucide-react';
import { authApi } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import { Task, TaskPriority, TaskStatus } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Partial<Task>) => Promise<void>;
  initialData?: Task | null;
  projectId: number;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<TaskStatus>(initialData?.status || 'TODO');
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(
    initialData?.due_date ? initialData.due_date.split('T')[0] : ''
  );
  const [assigneeId, setAssigneeId] = useState<number | undefined>(
    initialData?.assignee_id || undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: users } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: ({ signal }) => authApi.getUsers(signal),
    staleTime: 1000 * 60 * 5,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        description: description || null,
        status,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignee_id: assigneeId || null,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 transition-colors">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-[#383838]">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {initialData ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#242424] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement Redis cache-aside telemetry"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#242424] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe technical implementation details, AC, or notes..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#242424] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#242424] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#242424] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  Assignee
                </span>
              </label>
              <select
                value={assigneeId || ''}
                onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#242424] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="">Unassigned</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Due Date
                </span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#242424] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#383838]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#242424] dark:hover:bg-[#333333] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
