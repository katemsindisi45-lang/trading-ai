import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  LogOut, 
  Bookmark, 
  Bell, 
  Clock, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { MarketTicker, UserAlert, UserWatchlistItem } from '../../types/crypto';
import { formatCurrency } from '../../services/marketApi';

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currentTicker: MarketTicker | null;
  onSelectSymbol: (symbol: string) => void;
}

export const UserDrawer: React.FC<UserDrawerProps> = ({
  isOpen,
  onClose,
  user,
  currentTicker,
  onSelectSymbol,
}) => {
  const [activeTab, setActiveTab] = useState<'WATCHLIST' | 'ALERTS' | 'HISTORY'>('WATCHLIST');
  const [watchlist, setWatchlist] = useState<UserWatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [newAlertMetric, setNewAlertMetric] = useState<string>('PRICE');
  const [newAlertTarget, setNewAlertTarget] = useState<string>(currentTicker ? String(currentTicker.price) : '95000');
  const [loading, setLoading] = useState<boolean>(false);

  // Sync Watchlist from Firestore
  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/watchlists`;
    const colRef = collection(db, 'users', user.uid, 'watchlists');

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items: UserWatchlistItem[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as UserWatchlistItem));
        setWatchlist(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Sync Alerts from Firestore
  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/alerts`;
    const colRef = collection(db, 'users', user.uid, 'alerts');

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items: UserAlert[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as UserAlert));
        setAlerts(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (!isOpen || !user) return null;

  const handleAddWatchlist = async () => {
    if (!currentTicker) return;
    const symbol = currentTicker.symbol;
    const path = `users/${user.uid}/watchlists/${symbol}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'watchlists', symbol), {
        symbol,
        userId: user.uid,
        notes: `Saved from terminal at ${formatCurrency(currentTicker.price)}`,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleRemoveWatchlist = async (symbol: string) => {
    const path = `users/${user.uid}/watchlists/${symbol}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'watchlists', symbol));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleCreateAlert = async () => {
    if (!currentTicker || !newAlertTarget) return;
    const alertId = `alert-${Date.now()}`;
    const path = `users/${user.uid}/alerts/${alertId}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'alerts', alertId), {
        id: alertId,
        userId: user.uid,
        symbol: currentTicker.symbol,
        metric: newAlertMetric,
        condition: 'GREATER_THAN',
        targetValue: parseFloat(newAlertTarget),
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    const path = `users/${user.uid}/alerts/${id}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'alerts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full glass-panel border-l border-white/10 p-6 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center font-bold text-black text-sm">
                {user.email?.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">{user.displayName || 'Institutional Trader'}</h3>
                <span className="text-xs text-slate-400 font-mono">{user.email}</span>
              </div>
            </div>

            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveTab('WATCHLIST')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                activeTab === 'WATCHLIST' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Watchlist ({watchlist.length})
            </button>
            <button
              onClick={() => setActiveTab('ALERTS')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                activeTab === 'ALERTS' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Alerts ({alerts.length})
            </button>
          </div>

          {/* 1. WATCHLIST TAB */}
          {activeTab === 'WATCHLIST' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 uppercase">Tracked Assets</span>
                {currentTicker && (
                  <button
                    onClick={handleAddWatchlist}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-mono hover:bg-cyan-500/30 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add {currentTicker.baseAsset}</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {watchlist.length > 0 ? (
                  watchlist.map((item) => (
                    <div
                      key={item.symbol}
                      className="p-3 rounded-xl bg-black/30 border border-white/[0.06] flex items-center justify-between group hover:border-white/20 transition cursor-pointer"
                      onClick={() => onSelectSymbol(item.symbol)}
                    >
                      <div>
                        <span className="font-bold text-xs text-white block">{item.symbol}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{item.notes}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveWatchlist(item.symbol);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs font-mono">
                    No symbols saved yet. Add {currentTicker?.baseAsset || 'BTC'} to monitor.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. ALERTS TAB */}
          {activeTab === 'ALERTS' && (
            <div className="space-y-4">
              {/* Add Alert Form */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
                <span className="text-xs font-bold text-white block font-mono">Configure New Alert</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Metric</label>
                    <select
                      value={newAlertMetric}
                      onChange={(e) => setNewAlertMetric(e.target.value)}
                      className="w-full bg-black/50 text-xs rounded-lg p-2 border border-white/10 text-white"
                    >
                      <option value="PRICE">Price Target ($)</option>
                      <option value="CVD_DIVERGENCE">CVD Divergence</option>
                      <option value="GAMMA_FLIP">Gamma Flip Crossing</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Target Value</label>
                    <input
                      type="number"
                      value={newAlertTarget}
                      onChange={(e) => setNewAlertTarget(e.target.value)}
                      className="w-full bg-black/50 text-xs rounded-lg p-2 border border-white/10 text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateAlert}
                  className="w-full py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold tracking-wide hover:opacity-90 transition"
                >
                  Save Alert to Firestore
                </button>
              </div>

              {/* Active Alerts List */}
              <div className="space-y-2">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-3 rounded-xl bg-black/30 border border-white/[0.06] flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{al.symbol}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-400">
                          {al.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {al.metric} {al.condition} ${al.targetValue}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(al.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Sign Out */}
        <div className="pt-4 border-t border-white/[0.08]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-mono font-bold text-rose-300 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
