import React from 'react';
import { 
  LayoutDashboard, 
  ScanLine, 
  CandlestickChart, 
  GitCommitVertical, 
  Sigma, 
  Coins, 
  Boxes, 
  Newspaper, 
  BrainCircuit, 
  X,
  Flame,
  Target,
  Trophy,
} from 'lucide-react';

export type WorkspaceTab = 
  | 'overview' 
  | 'signals'
  | 'journal'
  | 'orderflow' 
  | 'charts' 
  | 'options' 
  | 'scanner' 
  | 'three3d' 
  | 'fundamentals' 
  | 'news' 
  | 'ai';

interface SidebarProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const navItems: Array<{ id: WorkspaceTab; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }> = [
    {
      id: 'overview',
      label: 'Market Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'signals',
      label: 'Signal Plus (1:5 R:R)',
      icon: <Target className="w-4 h-4" />,
      badge: '1:5 R:R',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    },
    {
      id: 'journal',
      label: 'Win Rate & Everyday Trades',
      icon: <Trophy className="w-4 h-4" />,
      badge: 'TRACKER',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'orderflow',
      label: 'Order Flow & Footprint',
      icon: <GitCommitVertical className="w-4 h-4" />,
      badge: 'CORE',
      badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    },
    {
      id: 'charts',
      label: 'Pro Charting',
      icon: <CandlestickChart className="w-4 h-4" />,
    },
    {
      id: 'options',
      label: 'Options & Gamma (GEX)',
      icon: <Sigma className="w-4 h-4" />,
      badge: 'DERIBIT',
      badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    },
    {
      id: 'scanner',
      label: 'Market Scanner',
      icon: <ScanLine className="w-4 h-4" />,
    },
    {
      id: 'three3d',
      label: '3D Liquidity & Gamma Flow',
      icon: <Boxes className="w-4 h-4" />,
      badge: 'GEX & FLOW',
      badgeColor: 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      id: 'fundamentals',
      label: 'Fundamentals & On-Chain',
      icon: <Coins className="w-4 h-4" />,
    },
    {
      id: 'news',
      label: 'News & Macro Catalysts',
      icon: <Newspaper className="w-4 h-4" />,
      badge: 'SEARCH',
      badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    },
    {
      id: 'ai',
      label: 'AI Trading Desk',
      icon: <BrainCircuit className="w-4 h-4" />,
      badge: 'THINKING',
      badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 glass-panel border-r border-white/[0.08] transition-transform duration-300 ease-out flex flex-col justify-between shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-3 space-y-1 overflow-y-auto">
          {/* Mobile Close Button */}
          <div className="flex md:hidden items-center justify-between pb-3 px-2 border-b border-white/[0.06] mb-2">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Workspaces</span>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[11px] font-mono tracking-wider text-slate-400 uppercase px-3 py-1 font-semibold">
            Intelligence Workspaces
          </div>

          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium tracking-wide transition duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-400/30 text-white shadow-sm shadow-cyan-500/10'
                    : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${item.badgeColor || 'border-white/10 text-slate-400'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Terminal Status Footer */}
        <div className="p-3 border-t border-white/[0.06] bg-black/20 text-[11px] font-mono text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ENGINE</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              CRYEXC 2.6 PRO
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">LATENCY</span>
            <span className="text-emerald-400">~12ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ORDER FLOW</span>
            <span className="text-slate-300">TICK-LEVEL CVD</span>
          </div>
        </div>
      </aside>
    </>
  );
};
