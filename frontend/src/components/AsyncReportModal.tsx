import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Play, RotateCw, X } from 'lucide-react';
import { jobsApi } from '../api/client';
import { useJobPoller } from '../hooks/useJobPoller';
import { BackgroundJob } from '../types';

interface AsyncReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
}

export const AsyncReportModal: React.FC<AsyncReportModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}) => {
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: jobStatus } = useJobPoller(
    activeJobId,
    projectId,
    () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    }
  );

  const triggerReportMutation = useMutation({
    mutationFn: () => jobsApi.triggerReport(projectId),
    onSuccess: (data: BackgroundJob) => {
      setActiveJobId(data.id);
    },
  });

  const triggerRolloverMutation = useMutation({
    mutationFn: () => jobsApi.triggerRollover(projectId),
    onSuccess: (data: BackgroundJob) => {
      setActiveJobId(data.id);
    },
  });

  if (!isOpen) return null;

  const isRunning =
    jobStatus?.status === 'PENDING' || jobStatus?.status === 'PROCESSING';
  const isFinished = jobStatus?.status === 'COMPLETED';
  const progress = jobStatus ? jobStatus.progress_percent : 0;

  const handleDownload = () => {
    if (!jobStatus?.result_data) return;
    const blob = new Blob([JSON.stringify(jobStatus.result_data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sprint-report-project-${projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 transition-colors">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-[#383838]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Async Celery Background Engine
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#242424] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              Active Project
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {projectName}
            </div>
          </div>

          {/* Trigger Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => triggerReportMutation.mutate()}
              disabled={isRunning || triggerReportMutation.isPending}
              className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#242424] dark:hover:bg-[#333333] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-left transition disabled:opacity-50"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Generate Sprint Report
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Aggregates metrics & velocity
                </div>
              </div>
              <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </button>

            <button
              onClick={() => triggerRolloverMutation.mutate()}
              disabled={isRunning || triggerRolloverMutation.isPending}
              className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#242424] dark:hover:bg-[#333333] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-left transition disabled:opacity-50"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Bulk Sprint Rollover
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Moves unfinished tasks & clears cache
                </div>
              </div>
              <RotateCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </button>
          </div>

          {/* Live Progress Bar Section */}
          {activeJobId && (
            <div className="bg-slate-50 dark:bg-[#242424] border border-slate-200 dark:border-[#3c3c3c] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  ) : isFinished ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Status: <strong className="font-mono">{jobStatus?.status || 'PENDING'}</strong>
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                <span>0% Queued</span>
                <span>25% Gathering</span>
                <span>60% Building</span>
                <span>100% Ready</span>
              </div>
            </div>
          )}

          {/* Result Payload Preview */}
          {isFinished && jobStatus?.result_data && (
            <div className="space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Job Output Payload
                </span>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-900 dark:bg-[#1a1a1a] border border-slate-800 dark:border-[#333333] rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-48">
                {JSON.stringify(jobStatus.result_data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-5 sm:px-6 py-3.5 bg-slate-50 dark:bg-[#242424] border-t border-slate-100 dark:border-[#383838]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200/80 hover:bg-slate-300 dark:bg-[#333333] dark:hover:bg-[#3c3c3c] rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
