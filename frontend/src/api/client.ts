import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AuthResponse, BackgroundJob, PaginatedTasks, Project, ProjectAnalytics, Role, Task, User } from '../types';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('taskpulse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Don't retry or trigger refresh flow if request was intentionally aborted
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized with silent token refresh
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/demo-login')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('taskpulse_refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('taskpulse_token');
        localStorage.removeItem('taskpulse_user');
        window.dispatchEvent(new Event('auth_logout'));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<AuthResponse>('/api/auth/refresh', {
          refresh_token: refreshToken,
        });

        localStorage.setItem('taskpulse_token', data.access_token);
        localStorage.setItem('taskpulse_refresh_token', data.refresh_token);
        localStorage.setItem('taskpulse_user', JSON.stringify(data.user));

        processQueue(null);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr as AxiosError);
        localStorage.removeItem('taskpulse_token');
        localStorage.removeItem('taskpulse_refresh_token');
        localStorage.removeItem('taskpulse_user');
        window.dispatchEvent(new Event('auth_logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  demoLogin: async (role: Role) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/demo-login', { role });
    localStorage.setItem('taskpulse_token', data.access_token);
    localStorage.setItem('taskpulse_refresh_token', data.refresh_token);
    localStorage.setItem('taskpulse_user', JSON.stringify(data.user));
    return data;
  },
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('taskpulse_token', data.access_token);
    localStorage.setItem('taskpulse_refresh_token', data.refresh_token);
    localStorage.setItem('taskpulse_user', JSON.stringify(data.user));
    return data;
  },
  logout: () => {
    localStorage.removeItem('taskpulse_token');
    localStorage.removeItem('taskpulse_refresh_token');
    localStorage.removeItem('taskpulse_user');
    window.dispatchEvent(new Event('auth_logout'));
  },
  getMe: async (signal?: AbortSignal) => {
    const { data } = await apiClient.get<User>('/auth/me', { signal });
    return data;
  },
  getUsers: async (signal?: AbortSignal) => {
    const { data } = await apiClient.get<User[]>('/auth/users', { signal });
    return data;
  },
};

export const projectsApi = {
  list: async (signal?: AbortSignal) => {
    const { data } = await apiClient.get<Project[]>('/projects', { signal });
    return data;
  },
  get: async (id: number, signal?: AbortSignal) => {
    const { data } = await apiClient.get<Project>(`/projects/${id}`, { signal });
    return data;
  },
  create: async (payload: { name: string; description?: string }) => {
    const { data } = await apiClient.post<Project>('/projects', payload);
    return data;
  },
  delete: async (id: number) => {
    await apiClient.delete(`/projects/${id}`);
  },
  getAnalytics: async (id: number, signal?: AbortSignal) => {
    const res = await apiClient.get<ProjectAnalytics>(`/projects/${id}/analytics`, { signal });
    const xCache = res.headers['x-cache'] || (res.data.cached ? 'HIT' : 'MISS');
    return { ...res.data, cache_header: xCache };
  },
  clearCache: async (id: number) => {
    const { data } = await apiClient.delete<{ message: string }>(`/projects/${id}/cache`);
    return data;
  },
};

export const tasksApi = {
  list: async (
    projectId: number,
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      assignee_id?: number;
      q?: string;
    },
    signal?: AbortSignal
  ) => {
    const { data } = await apiClient.get<PaginatedTasks>(`/projects/${projectId}/tasks`, {
      params,
      signal,
    });
    return data;
  },
  create: async (projectId: number, task: Partial<Task>) => {
    const { data } = await apiClient.post<Task>(`/projects/${projectId}/tasks`, task);
    return data;
  },
  update: async (taskId: number, updates: Partial<Task>) => {
    const { data } = await apiClient.patch<Task>(`/tasks/${taskId}`, updates);
    return data;
  },
  delete: async (taskId: number) => {
    await apiClient.delete(`/tasks/${taskId}`);
  },
};

export const jobsApi = {
  triggerReport: async (projectId: number) => {
    const { data } = await apiClient.post<BackgroundJob>(`/projects/${projectId}/reports`);
    return data;
  },
  triggerRollover: async (projectId: number) => {
    const { data } = await apiClient.post<BackgroundJob>(`/projects/${projectId}/bulk-rollover`);
    return data;
  },
  getStatus: async (jobId: string, signal?: AbortSignal) => {
    const { data } = await apiClient.get<BackgroundJob>(`/jobs/${jobId}`, { signal });
    return data;
  },
  listProjectJobs: async (projectId: number, signal?: AbortSignal) => {
    const { data } = await apiClient.get<BackgroundJob[]>(`/projects/${projectId}/jobs`, { signal });
    return data;
  },
};
