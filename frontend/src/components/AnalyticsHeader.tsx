import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock, Database, RefreshCw, Zap } from 'lucide-react';
import { projectsApi } from '../api/client';
import { queryKeys } from '../api/queryKeys';

interface AnalyticsHeaderProps {
  projectId: number;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [isClearing, setIsClearing] = useState(false);

  const { data: analytics, isFetching } = useQuery({
    queryKey: queryKeys.projects.analytics(projectId),
    queryFn: ({ signal }) => projectsApi.getAnalytics(projectId, signal),
    enabled: !!projectId,
    staleTime: 1000 * 15,
  });

  const clearCacheMutation = useMutation({
    mutationFn: () => projectsApi.clearCache(projectId),
    onSuccess: async () => {
      setIsClearing(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.analytics(projectId) });
      setTimeout(() => setIsClearing(false), 600);
    },
  });

  if (!analytics) {
    return (
      <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white dark:bg-[#2b2b2b] rounded-2xl border border-slate-200 dark:border-[#3c3c3c]" />
        ))}
      </div>
    );
  }

  const isHit = analytics.cache_header === 'HIT' || analytics.cached;

  return (
    <div className="mb-6 space-y-3">
      {/* Cache Telemetry Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] rounded-2xl px-4 py-3 shadow-sm transition-colors">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold text-slate-800 dark:text-slate-100">Cache Telemetry:</span>
          <span
            className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border ${
              isHit
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
            }`}
          >
            {isHit ? '⚡ CACHE HIT' : '🔄 CACHE MISS'}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Source: <strong className="text-slate-800 dark:text-slate-200 font-mono">{analytics.cache_source}</strong>
          </span>
          {isFetching && <span className="text-emerald-600 dark:text-emerald-400 text-[11px] animate-pulse">updating...</span>}
        </div>

        <button
          onClick={() => clearCacheMutation.mutate()}
          disabled={clearCacheMutation.isPending || isClearing}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-[#242424] dark:hover:bg-[#333333] border border-slate-200 dark:border-[#3c3c3c] rounded-xl transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin text-emerald-500' : ''}`} />
          <span>Clear Redis Cache</span>
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Completion Rate */}
        <div className="bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{analytics.completion_rate}%</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({analytics.completed_tasks}/{analytics.total_tasks} tasks)
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-[#1c1c1c] rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, analytics.completion_rate)}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Tasks by Status */}
        <div className="bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Sprint Distribution</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-1.5 text-center font-mono text-xs">
            <div className="flex-1 bg-slate-50 dark:bg-[#242424] p-1.5 rounded-lg border border-slate-200 dark:border-[#3c3c3c]">
              <div className="text-[10px] text-slate-500">TODO</div>
              <div className="font-bold text-slate-800 dark:text-slate-200">{analytics.todo_tasks}</div>
            </div>
            <div className="flex-1 bg-slate-50 dark:bg-[#242424] p-1.5 rounded-lg border border-slate-200 dark:border-[#3c3c3c]">
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">ACTIVE</div>
              <div className="font-bold text-emerald-700 dark:text-emerald-300">{analytics.in_progress_tasks}</div>
            </div>
            <div className="flex-1 bg-emerald-50 dark:bg-[#242424] p-1.5 rounded-lg border border-emerald-200 dark:border-[#3c3c3c]">
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400">DONE</div>
              <div className="font-bold text-emerald-700 dark:text-emerald-300">{analytics.completed_tasks}</div>
            </div>
          </div>
        </div>

        {/* KPI 3: Overdue & Urgent */}
        <div className="bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Overdue & High Priority</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                analytics.overdue_count > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {analytics.overdue_count}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">overdue</span>
            <span className="text-xs text-slate-300 dark:text-slate-600">|</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">
              {(analytics.priority_distribution.URGENT || 0) + (analytics.priority_distribution.HIGH || 0)} urgent/high
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 truncate">
            Low: {analytics.priority_distribution.LOW || 0} • Med: {analytics.priority_distribution.MEDIUM || 0}
          </div>
        </div>

        {/* KPI 4: Workload */}
        <div className="bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Team Workload</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 space-y-1">
            {analytics.workload_distribution.slice(0, 2).map((w, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{w.user}</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">{w.count} tasks</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
