import React from 'react';
import { Role } from '../types';

interface RoleBadgeProps {
  role: Role;
  interactive?: boolean;
  onSwitch?: (role: Role) => void;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, interactive = false, onSwitch }) => {
  const styles: Record<Role, { badge: string }> = {
    ADMIN: {
      badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50',
    },
    MANAGER: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[#2b2b2b] dark:text-emerald-300 dark:border-emerald-700/60',
    },
    MEMBER: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#2b2b2b] dark:text-slate-300 dark:border-[#3c3c3c]',
    },
  };

  const currentStyle = styles[role] || styles.MEMBER;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span
        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${currentStyle.badge}`}
      >
        {role}
      </span>
      {interactive && onSwitch && (
        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">Switch:</span>
          {(['ADMIN', 'MANAGER', 'MEMBER'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => onSwitch(r)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                r === role
                  ? 'bg-slate-800 text-white font-bold dark:bg-emerald-500 dark:text-slate-950'
                  : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700 dark:bg-[#242424] dark:hover:bg-[#333333] dark:text-slate-300'
              }`}
            >
              {r[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
