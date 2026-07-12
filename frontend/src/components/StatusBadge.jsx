import React from 'react';

const STATUS_CONFIG = {
  'Available':         { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  'Allocated':         { bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-500' },
  'Reserved':          { bg: 'bg-violet-100',  text: 'text-violet-800',  dot: 'bg-violet-500' },
  'Under Maintenance': { bg: 'bg-amber-100',   text: 'text-amber-800',   dot: 'bg-amber-500' },
  'Lost':              { bg: 'bg-red-100',      text: 'text-red-800',     dot: 'bg-red-500' },
  'Retired':           { bg: 'bg-slate-100',    text: 'text-slate-600',   dot: 'bg-slate-400' },
  'Disposed':          { bg: 'bg-stone-100',    text: 'text-stone-600',   dot: 'bg-stone-400' },
  'Overdue':           { bg: 'bg-red-100',      text: 'text-red-700',     dot: 'bg-red-500' },
  'Active':            { bg: 'bg-green-100',    text: 'text-green-800',   dot: 'bg-green-500' },
  'Returned':          { bg: 'bg-slate-100',    text: 'text-slate-600',   dot: 'bg-slate-400' },
  'Requested':         { bg: 'bg-yellow-100',   text: 'text-yellow-800',  dot: 'bg-yellow-500' },
  'Approved':          { bg: 'bg-emerald-100',  text: 'text-emerald-800', dot: 'bg-emerald-500' },
  'Rejected':          { bg: 'bg-red-100',      text: 'text-red-800',     dot: 'bg-red-500' },
  'Re-allocated':      { bg: 'bg-indigo-100',   text: 'text-indigo-800',  dot: 'bg-indigo-500' },
};

const StatusBadge = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
};

export default StatusBadge;
