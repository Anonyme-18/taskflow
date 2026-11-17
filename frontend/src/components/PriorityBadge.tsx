import React from 'react';
import { TaskPriority } from '@/types';

interface PriorityBadgeProps {
  priority: TaskPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

  if (priority === 'Moyenne') {
    badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (priority === 'Haute') {
    badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badgeStyle}`}
    >
      {priority}
    </span>
  );
};
