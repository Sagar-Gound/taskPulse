import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import { BackgroundJob } from '../types';

export function useJobPoller(jobId: string | null, projectId: number, onComplete?: (job: BackgroundJob) => void) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: jobId ? queryKeys.jobs.detail(jobId) : ['jobs', 'none'],
    queryFn: async ({ signal }) => {
      if (!jobId) return null;
      const data = await jobsApi.getStatus(jobId, signal);
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.analytics(projectId) });
        queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.jobs(projectId) });
        if (onComplete) onComplete(data);
      }
      return data;
    },
    enabled: !!jobId,
    // Poll every 1.5s while active, stop when complete or failed
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1500;
      if (data.status === 'PENDING' || data.status === 'PROCESSING') {
        return 1500;
      }
      return false;
    },
  });
}

