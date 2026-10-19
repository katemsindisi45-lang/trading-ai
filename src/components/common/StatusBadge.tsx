import React from 'react';
import { DataStatus } from '../../types/crypto';

interface StatusBadgeProps {
  status: DataStatus;
  timestamp?: number;
  className?: string;
  source?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, timestamp, className = '', source }) => {
  const getColors = () => {
    switch (status) {
      case 'LIVE':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400 animate-ping',
          label: 'LIVE',
        };
      case 'DELAYED':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          label: 'DELAYED',
        };
      case 'STALE':
        return {
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          dot: 'bg-orange-400',
          label: 'STALE',
        };
      case 'DISCONNECTED':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
          label: 'OFFLINE',
        };
      case 'ESTIMATED':
        return {
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          dot: 'bg-purple-400',
          label: 'ESTIMATED',
        };
      case 'UNAVAILABLE':
      default:
        return {
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
          dot: 'bg-slate-400',
          label: 'N/A',
        };
    }
  };

  const info = getColors();

  return (
    <div
      title={timestamp ? `Last updated: ${new Date(timestamp).toLocaleTimeString()}${source ? ` via ${source}` : ''}` : undefined}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono tracking-wider border ${info.bg} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {status === 'LIVE' && (
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${info.dot}`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${status === 'LIVE' ? 'bg-emerald-400' : info.dot}`} />
      </span>
      <span>{info.label}</span>
    </div>
  );
};
