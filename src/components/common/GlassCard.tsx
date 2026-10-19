import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  glow?: 'cyan' | 'violet' | 'none';
  className?: string;
  headerClassName?: string;
  noPadding?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  title,
  subtitle,
  action,
  glow = 'none',
  className = '',
  headerClassName = '',
  noPadding = false,
}) => {
  const glowClass = glow === 'cyan' ? 'glass-glow-cyan' : glow === 'violet' ? 'glass-glow-violet' : '';

  return (
    <div
      className={`glass-panel rounded-2xl relative overflow-hidden transition-all duration-300 ${glowClass} ${className}`}
    >
      {/* Top subtle highlight gradient */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent pointer-events-none" />

      {(title || action) && (
        <div
          className={`px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3 ${headerClassName}`}
        >
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-2">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}

      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
};
