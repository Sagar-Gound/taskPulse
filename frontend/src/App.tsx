import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Moon, Sparkles, Sun } from 'lucide-react';
import { authApi, projectsApi } from './api/client';
import { queryKeys } from './api/queryKeys';
import { AnalyticsHeader } from './components/AnalyticsHeader';
import { AsyncReportModal } from './components/AsyncReportModal';
import { KanbanBoard } from './components/KanbanBoard';
import { Navbar } from './components/Navbar';
import { useTasks } from './hooks/useTasks';
import { Project, Role, User } from './types';

export const App: React.FC = () => {
  const queryClient = useQueryClient();

  // Light mode by default; dark mode uses #2b2b2b theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('taskpulse_theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDarkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('taskpulse_theme', 'dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('taskpulse_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('taskpulse_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Debounce search to prevent query spam and out-of-order responses
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [email, setEmail] = useState('manager@taskpulse.io');
  const [password, setPassword] = useState('password123');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const handleLogout = () => {
      setCurrentUser(null);
      setActiveProject(null);
    };
    window.addEventListener('auth_logout', handleLogout);
    return () => window.removeEventListener('auth_logout', handleLogout);
  }, []);

  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: ({ signal }) => projectsApi.list(signal),
    enabled: !!currentUser,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (projects.length > 0 && !activeProject) {
      setActiveProject(projects[0]);
    }
  }, [projects, activeProject]);

  const activeProjectId = activeProject?.id || 0;

  const {
    data: paginatedTasks,
    updateStatus,
    createTask,
    deleteTask,
    prefetchProject,
  } = useTasks(activeProjectId, {
    q: debouncedSearch || undefined,
    priority: priorityFilter || undefined,
  });

  const handleDemoLogin = async (role: Role) => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await authApi.demoLogin(role);
      setCurrentUser(res.user);
      queryClient.invalidateQueries();
    } catch {
      setLoginError('Demo login failed. Ensure the backend server is reachable.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await authApi.login(email, password);
      setCurrentUser(res.user);
      queryClient.invalidateQueries();
    } catch {
      setLoginError('Invalid credentials. Check email and password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRoleSwitch = async (role: Role) => {
    await handleDemoLogin(role);
  };

  // Login Screen (Light mode by default with theme toggle)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#1c1c1c] text-slate-900 dark:text-slate-100 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white transition-colors duration-150">
        {/* <div className="absolute top-4 right-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] text-slate-700 dark:text-slate-200 shadow-sm transition cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode (#2b2b2b)'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div> */}

        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-500 items-center justify-center text-2xl font-black text-slate-950 shadow-lg shadow-emerald-500/20 mb-3 sm:mb-4">
            ⚡
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            TaskPulse
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Collaborative Project Hub & Async Celery Report Engine
          </p>
        </div>

        <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] py-6 sm:py-8 px-4 sm:px-10 shadow-xl rounded-2xl space-y-6 transition-colors">
            {/* 1-Click Recruiter Demo Button */}
            <div className="space-y-3 pb-5 border-b border-slate-100 dark:border-[#383838]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>1-Click Recruiter Demo</span>
              </div>

              <button
                onClick={() => handleDemoLogin('MANAGER')}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <span>Explore as Demo Manager</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleDemoLogin('ADMIN')}
                  disabled={isLoggingIn}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-[#242424] dark:hover:bg-[#333333] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition text-center"
                >
                  Admin Role
                </button>
                <button
                  onClick={() => handleDemoLogin('MEMBER')}
                  disabled={isLoggingIn}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-[#242424] dark:hover:bg-[#333333] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition text-center"
                >
                  Member Role
                </button>
              </div>
            </div>

            {/* Standard Login */}
            <form onSubmit={handleStandardLogin} className="space-y-3.5">
              {loginError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#242424] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#242424] border border-slate-200 dark:border-[#3c3c3c] rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-[#1f1f1f] dark:hover:bg-[#292929] border border-slate-800 dark:border-[#3c3c3c] rounded-xl text-xs font-bold text-white transition disabled:opacity-50"
              >
                {isLoggingIn ? 'Signing in...' : 'Sign In with Email'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#1c1c1c] text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white flex flex-col transition-colors duration-150">
      <Navbar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => setActiveProject(p)}
        onPrefetchProject={prefetchProject}
        currentUser={currentUser}
        onSwitchRole={handleRoleSwitch}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onLogout={() => authApi.logout()}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 w-full">
        {activeProject ? (
          <>
            <AnalyticsHeader projectId={activeProject.id} />

            <KanbanBoard
              tasks={paginatedTasks?.items || []}
              projectId={activeProject.id}
              currentUser={currentUser}
              onUpdateStatus={(taskId, newStatus) =>
                updateStatus({ taskId, newStatus })
              }
              onCreateTask={async (data) => {
                await createTask(data);
              }}
              onDeleteTask={async (taskId) => {
                await deleteTask(taskId);
              }}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
            />
          </>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            {isProjectsLoading ? 'Loading workspace...' : 'No projects found.'}
          </div>
        )}
      </main>

      {activeProject && (
        <AsyncReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          projectId={activeProject.id}
          projectName={activeProject.name}
        />
      )}
    </div>
  );
};
