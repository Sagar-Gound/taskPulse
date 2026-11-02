export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  task_count?: number;
  created_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  assignee_id?: number | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  assignee?: User | null;
}

export interface PaginatedTasks {
  items: Task[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ProjectAnalytics {
  project_id: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  completion_rate: number;
  overdue_count: number;
  priority_distribution: Record<string, number>;
  workload_distribution: Array<{ user: string; count: number }>;
  cached: boolean;
  cache_source: string;
}

export interface BackgroundJob {
  id: string;
  project_id: number;
  triggered_by: number;
  job_type: 'SPRINT_REPORT' | 'BULK_ROLLOVER';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress_percent: number;
  result_data?: {
    generated_at?: string;
    project_id?: number;
    metrics?: {
      total_tasks: number;
      completed_tasks: number;
      in_progress_tasks: number;
      todo_tasks: number;
      high_priority_tasks: number;
      sprint_velocity_percent: number;
    };
    summary?: string;
    tasks_rolled_over?: number;
    message?: string;
  } | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

