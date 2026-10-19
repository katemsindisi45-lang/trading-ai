import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Sparkles, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { 
  auth, 
  googleAuthProvider, 
  handleFirestoreError, 
  OperationType,
  db 
} from '../../lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithPopup(auth, googleAuthProvider);
      // Persist profile to Firestore
      if (res.user) {
        const userRef = doc(db, 'users', res.user.uid);
        try {
          await setDoc(userRef, {
            userId: res.user.uid,
            email: res.user.email || '',
            displayName: res.user.displayName || 'Trader',
            defaultSymbol: 'BTCUSDT',
            defaultTimeframe: '15m',
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, `users/${res.user.uid}`);
        }
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName && res.user) {
          await updateProfile(res.user, { displayName });
        }
        // Save user profile in Firestore
        if (res.user) {
          const userRef = doc(db, 'users', res.user.uid);
          try {
            await setDoc(userRef, {
              userId: res.user.uid,
              email: res.user.email || email,
              displayName: displayName || email.split('@')[0],
              defaultSymbol: 'BTCUSDT',
              defaultTimeframe: '15m',
              updatedAt: new Date().toISOString(),
            });
          } catch (dbErr) {
            handleFirestoreError(dbErr, OperationType.WRITE, `users/${res.user.uid}`);
          }
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Email Auth failed:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Emblem */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <span className="font-extrabold text-black text-base">CX</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              {isRegister ? 'Create CryExc Account' : 'Connect Terminal'}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Secure Firebase Authentication & Firestore Persistence
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="break-all">{error}</span>
          </div>
        )}

        {/* Google One-Click Auth */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-white text-xs font-semibold tracking-wide transition active:scale-95 disabled:opacity-50 mb-5"
        >
          <svg className="w-4 h-4" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center mb-5">
          <div className="w-full border-t border-white/[0.08]" />
          <span className="absolute bg-[#0B1220] px-3 text-[10px] uppercase font-mono text-slate-500">
            or email credentials
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Display Name</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Alex Trader"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-black/40 text-xs rounded-xl pl-9 pr-3 py-2.5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                placeholder="name@institution.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 text-xs rounded-xl pl-9 pr-3 py-2.5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 text-xs rounded-xl pl-9 pr-10 py-2.5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-black text-xs font-bold tracking-wide shadow-lg shadow-cyan-500/25 hover:opacity-95 transition active:scale-95 disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-5 text-xs text-slate-400">
          {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-cyan-400 font-semibold hover:underline"
          >
            {isRegister ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
