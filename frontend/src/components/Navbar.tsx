import React, { useState } from 'react';
import { ChevronDown, FileText, FolderKanban, LogOut, Menu, Sparkles, X } from 'lucide-react';
import { Project, Role, User } from '../types';
import { RoleBadge } from './RoleBadge';

interface NavbarProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  onPrefetchProject: (id: number) => void;
  currentUser: User | null;
  onSwitchRole: (role: Role) => void;
  onOpenReportModal: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onPrefetchProject,
  currentUser,
  onSwitchRole,
  onOpenReportModal,
  onLogout,
  // isDarkMode,
  // onToggleTheme,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#242424]/95 border-b border-slate-200 dark:border-[#3c3c3c] backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand & Project Selector */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20">
              ⚡
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                TaskPulse
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-[#2b2b2b] dark:text-emerald-300 dark:border dark:border-emerald-800/60">
                PROD
              </span>
            </div>
          </div>

          {/* Project Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-[#2b2b2b] dark:hover:bg-[#333333] border border-slate-200 dark:border-[#3c3c3c] text-xs font-semibold text-slate-800 dark:text-slate-200 transition min-w-0 max-w-[170px] sm:max-w-[240px] cursor-pointer"
            >
              <FolderKanban className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">
                {activeProject ? activeProject.name : 'Select Project'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-72 bg-white dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                  Switch Project
                </div>
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      onSelectProject(proj);
                      setIsProjectDropdownOpen(false);
                    }}
                    onMouseEnter={() => onPrefetchProject(proj.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${proj.id === activeProject?.id
                      ? 'bg-emerald-50 text-emerald-700 font-semibold dark:bg-[#333333] dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#383838]'
                      }`}
                  >
                    <span className="truncate">{proj.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {proj.task_count ?? 0} tasks
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          {/* <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#2b2b2b] dark:hover:bg-[#333333] border border-slate-200 dark:border-[#3c3c3c] text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode (#2b2b2b)'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button> */}

          {/* Async Reports Trigger */}
          <button
            type="button"
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-[#2b2b2b] dark:hover:bg-[#333333] border border-slate-200 dark:border-[#3c3c3c] rounded-xl transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Async Reports</span>
          </button>

          {/* Recruiter 1-Click Role Switcher */}
          {currentUser && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium hidden lg:inline">Demo:</span>
              <RoleBadge role={currentUser.role} interactive onSwitch={onSwitchRole} />
            </div>
          )}

          {/* User profile & logout */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-[#3c3c3c]">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[110px]">
                  {currentUser.full_name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate max-w-[110px]">
                  {currentUser.role}
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-[#333333] transition cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Action Bar (Theme toggle + Hamburger) */}
        <div className="flex md:hidden items-center gap-2">
          {/* <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] text-slate-600 dark:text-slate-300 cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode (#2b2b2b)'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button> */}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-[#3c3c3c] bg-white dark:bg-[#242424] px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">User:</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{currentUser?.full_name}</span>
            </div>
            {currentUser && <RoleBadge role={currentUser.role} interactive onSwitch={onSwitchRole} />}
          </div>

          {/* Explicit Mobile Theme Switcher Row */}
          {/* <button
            type="button"
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              <span>Theme</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {isDarkMode ? 'Dark (#2b2b2b)' : 'Light Mode'}
            </span>
          </button> */}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onOpenReportModal();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#2b2b2b] border border-slate-200 dark:border-[#3c3c3c] text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>Async Reports</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onLogout();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
