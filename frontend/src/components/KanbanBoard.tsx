import React, { useState } from 'react';
import { Calendar, Filter, Plus, Search, Trash2, User as UserIcon } from 'lucide-react';
import { Task, TaskPriority, TaskStatus, User } from '../types';
import { TaskModal } from './TaskModal';

interface KanbanBoardProps {
  tasks: Task[];
  projectId: number;
  currentUser: User | null;
  onUpdateStatus: (taskId: number, newStatus: TaskStatus) => void;
  onCreateTask: (task: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  priorityFilter: string;
  setPriorityFilter: (p: string) => void;
}

const COLUMNS: { id: TaskStatus; label: string; dotColor: string }[] = [
  { id: 'TODO', label: 'To Do', dotColor: 'bg-slate-400' },
  { id: 'IN_PROGRESS', label: 'In Progress', dotColor: 'bg-emerald-500' },
  { id: 'DONE', label: 'Completed', dotColor: 'bg-emerald-600' },
];

const PRIORITY_BADGES: Record<TaskPriority, { badge: string }> = {
  LOW: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#242424] dark:text-slate-400 dark:border-[#3c3c3c]',
  },
  MEDIUM: {
    badge: 'bg-slate-100 text-emerald-700 border-slate-200 dark:bg-[#242424] dark:text-emerald-400 dark:border-emerald-800/40',
  },
  HIGH: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-[#242424] dark:text-amber-400 dark:border-amber-800/40',
  },
  URGENT: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-[#242424] dark:text-rose-400 dark:border-rose-800/40',
  },
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  projectId,
  currentUser,
  onUpdateStatus,
  onCreateTask,
  onDeleteTask,
  searchQuery,
  setSearchQuery,
  priorityFilter,
  setPriorityFilter,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [mobileActiveColumn, setMobileActiveColumn] = useState<TaskStatus>('TODO');

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const renderColumn = (col: typeof COLUMNS[0]) => {
    const colTasks = filteredTasks.filter((t) => t.status === col.id);

    return (
      <div
        key={col.id}
        className="bg-slate-100/70 dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#333333] rounded-2xl p-3.5 sm:p-4 flex flex-col min-h-[450px] transition-colors"
      >
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-[#333333]">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{col.label}</h3>
          </div>
          <span className="px-2 py-0.5 bg-white dark:bg-[#2b2b2b] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#3c3c3c] rounded-full font-mono text-xs">
            {colTasks.length}
          </span>
        </div>

        {/* Task Cards */}
        <div className="space-y-3 flex-1 overflow-y-auto">
          {colTasks.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-xs text-slate-400 dark:text-slate-600 border border-dashed border-slate-300 dark:border-[#333333] rounded-xl">
              No tasks in {col.label}
            </div>
          ) : (
            colTasks.map((task) => {
              const badgeStyle = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.MEDIUM;
              const canDelete = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
              const canMove =
                currentUser?.role === 'ADMIN' ||
                currentUser?.role === 'MANAGER' ||
                task.assignee_id === currentUser?.id;

              return (
                <div
                  key={task.id}
                  className="group bg-white dark:bg-[#2b2b2b] hover:bg-slate-50 dark:hover:bg-[#333333] border border-slate-200/90 dark:border-[#3c3c3c] hover:border-slate-300 dark:hover:border-[#4d4d4d] rounded-xl p-3.5 shadow-sm transition-all duration-150"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${badgeStyle.badge}`}
                    >
                      {task.priority}
                    </span>

                    {canDelete && (
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-[#242424] transition opacity-70 group-hover:opacity-100"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1 leading-snug">
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-[#383838]">
                    <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {task.assignee ? task.assignee.full_name : 'Unassigned'}
                      </span>
                    </div>

                    {task.due_date && (
                      <div className="flex items-center gap-1 text-[11px] font-mono shrink-0">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                  </div>

                  {/* Move Task Buttons */}
                  {canMove && (
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-[#383838] flex flex-wrap items-center justify-between gap-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Move:
                      </span>
                      <div className="flex items-center gap-1">
                        {COLUMNS.filter((c) => c.id !== task.status).map((target) => (
                          <button
                            key={target.id}
                            onClick={() => onUpdateStatus(task.id, target.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-[#242424] dark:hover:bg-[#383838] text-slate-700 dark:text-slate-300 transition"
                          >
                            → {target.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search bar */}
          <div className="relative flex-1 max-w-full sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks by keyword..."
              className="w-full pl-9 pr-3.5 py-2 sm:py-1.5 bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition shadow-sm"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] rounded-xl px-3 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer w-full"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Mobile Column Segmented Control (shown only on mobile < md) */}
      <div className="flex md:hidden items-center justify-between bg-white dark:bg-[#242424] border border-slate-200 dark:border-[#3c3c3c] rounded-xl p-1 mb-4 shadow-sm">
        {COLUMNS.map((col) => {
          const count = filteredTasks.filter((t) => t.status === col.id).length;
          const isActive = mobileActiveColumn === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setMobileActiveColumn(col.id)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>{col.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-[#333333]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile View: Render only the active column */}
      <div className="block md:hidden">
        {renderColumn(COLUMNS.find((c) => c.id === mobileActiveColumn)!)}
      </div>

      {/* Desktop View: Render 3 Columns side-by-side */}
      <div className="hidden md:grid md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => renderColumn(col))}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={async (data) => {
          await onCreateTask(data);
        }}
        initialData={editingTask}
        projectId={projectId}
      />
    </div>
  );
};
