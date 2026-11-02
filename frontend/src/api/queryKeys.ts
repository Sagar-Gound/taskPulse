export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    detail: (id: number) => ['projects', id] as const,
    analytics: (id: number) => ['projects', id, 'analytics'] as const,
    tasks: (id: number, filters?: Record<string, unknown>) =>
      ['projects', id, 'tasks', filters || {}] as const,
    jobs: (id: number) => ['projects', id, 'jobs'] as const,
  },
  jobs: {
    detail: (id: string) => ['jobs', id] as const,
  },
  users: {
    all: ['users'] as const,
  },
};

