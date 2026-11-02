import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, tasksApi } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import { PaginatedTasks, Task, TaskStatus } from '../types';

export function useTasks(
  projectId: number,
  filters: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    assignee_id?: number;
    q?: string;
  }
) {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: queryKeys.projects.tasks(projectId, filters),
    queryFn: ({ signal }) => tasksApi.list(projectId, filters, signal),
    enabled: !!projectId,
    staleTime: 1000 * 30,
  });

  // Optimistic task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, newStatus }: { taskId: number; newStatus: TaskStatus }) =>
      tasksApi.update(taskId, { status: newStatus }),
    onMutate: async ({ taskId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.tasks(projectId, filters) });

      const previousData = queryClient.getQueryData<PaginatedTasks>(
        queryKeys.projects.tasks(projectId, filters)
      );

      // Optimistically update status in TanStack query cache
      if (previousData) {
        queryClient.setQueryData<PaginatedTasks>(queryKeys.projects.tasks(projectId, filters), {
          ...previousData,
          items: previousData.items.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
          ),
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.projects.tasks(projectId, filters),
          context.previousData
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: Partial<Task>) => tasksApi.create(projectId, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => tasksApi.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });

  // Hover prefetching helper for instant navigation
  const prefetchProject = (targetProjectId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects.tasks(targetProjectId, {}),
      queryFn: () => tasksApi.list(targetProjectId, { page: 1, limit: 20 }),
      staleTime: 1000 * 60,
    });
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects.analytics(targetProjectId),
      queryFn: () => projectsApi.getAnalytics(targetProjectId),
      staleTime: 1000 * 60,
    });
  };

  return {
    ...tasksQuery,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    createTask: createTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    prefetchProject,
  };
}

