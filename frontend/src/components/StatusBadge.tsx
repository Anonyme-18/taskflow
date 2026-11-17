import React from 'react';
import { TaskStatus } from '@/types';

interface StatusBadgeProps {
  status: TaskStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

  if (status === 'En cours') {
    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (status === 'Terminée') {
    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle}`}
    >
      <span
        className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
          status === 'Terminée'
            ? 'bg-emerald-500'
            : status === 'En cours'
            ? 'bg-amber-500'
            : 'bg-slate-400'
        }`}
      />
      {status}
    </span>
  );
};
