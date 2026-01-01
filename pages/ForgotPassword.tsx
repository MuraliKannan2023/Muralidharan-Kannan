
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, sendPasswordResetEmail, confirmPasswordReset } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, ArrowLeft, Mail, ShieldCheck, CheckCircle2, ArrowRight, Lock, UserCheck, Eye, EyeOff } from 'lucide-react';

type RecoveryPhase = 'request' | 'sent' | 'reset' | 'completed';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [phase, setPhase] = useState<RecoveryPhase>('request');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      await sendPasswordResetEmail(auth, email.trim());
      setPhase('sent');
    } catch (err: any) {
      setError(err.code === 'auth/user-not-found' ? "Record not found." : "Protocol error.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError("PIN must be 6+ characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("PINs do not match.");
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      // In mock mode, we use email as the "actionCode"
      await confirmPasswordReset(auth, email, newPassword);
      setPhase('completed');
    } catch (err: any) {
      setError("Update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-[360px] p-5 md:p-6 relative border border-slate-100 shadow-2xl flex flex-col items-center"
      >
        <Link to="/login" className="self-start inline-flex items-center gap-1.5 text-emerald-600 font-black text-[9px] uppercase tracking-[0.2em] mb-6 hover:translate-x-[-2px] transition-transform">
          <ArrowLeft size={14} strokeWidth={3} /> BACK TO LOGIN
        </Link>

        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-emerald-600 p-4 rounded-[1.2rem] text-white mb-4 shadow-xl shadow-emerald-500/20">
            <KeyRound size={28} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-1.5">
            Access <span className="text-emerald-600">Recovery.</span>
          </h2>
          <div className="bg-emerald-50 px-4 py-1 rounded-full border border-emerald-100/30">
            <p className="text-emerald-500 font-black uppercase text-[7px] tracking-[0.25em]">
              Authorization Protocol
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'request' && (
            <motion.form 
              key="request-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleResetRequest} className="w-full space-y-4"
            >
              <div>
                <label className="form-label">Registered Email</label>
                <div className="relative group">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                    <div className={`tactile-icon !w-7 !h-7 ${email.length > 0 ? 'active' : 'text-slate-300'}`}>
                      <Mail size={13} strokeWidth={2.5} />
                    </div>
                  </div>
                  <input 
                    type="email" required className="secure-input !h-[2.8rem] !pl-[3rem]"
                    placeholder="money@kaasu.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="p-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-bold uppercase tracking-wide border border-red-100 flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShieldCheck size={12} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <button disabled={loading} className="primary-btn w-full !h-[2.8rem] mt-2">
                {loading ? 'Processing...' : 'Verify Credential'} <ArrowRight size={14} strokeWidth={3} />
              </button>
            </motion.form>
          )}

          {phase === 'sent' && (
            <motion.div 
              key="sent-screen" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="w-full text-center space-y-6 py-2"
            >
              <div className="relative inline-flex p-6 bg-white text-emerald-500 rounded-[1.8rem] shadow-xl border-2 border-emerald-50">
                <CheckCircle2 size={40} strokeWidth={3} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Link Dispatched.</h3>
                <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em]">Check your inbox or reset below.</p>
              </div>
              
              <div className="pt-4 space-y-2">
                <button onClick={() => setPhase('reset')} className="primary-btn w-full !h-[2.8rem]">
                  RESET PIN NOW
                </button>
                <Link to="/login" className="block text-[8px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest pt-2">
                  No access? Support Required
                </Link>
              </div>
            </motion.div>
          )}

          {phase === 'reset' && (
            <motion.form 
              key="reset-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              onSubmit={handlePasswordUpdate} className="w-full space-y-3"
            >
              <div>
                <label className="form-label">New Access PIN</label>
                <div className="relative group">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                    <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'pin' || newPassword.length > 0 ? 'active' : 'text-slate-300'}`}>
                      <Lock size={12} strokeWidth={2.5} />
                    </div>
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} required className="secure-input !h-[2.6rem] !pl-[2.8rem] pr-10"
                    placeholder="New pin" value={newPassword}
                    onFocus={() => setFocusedField('pin')} onBlur={() => setFocusedField(null)}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
                    <div className={`tactile-icon !h-7 !w-7 ${showPassword ? 'active' : 'text-slate-300'}`}>
                      {showPassword ? <EyeOff size={11} strokeWidth={2.5} /> : <Eye size={11} strokeWidth={2.5} />}
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">Verify New PIN</label>
                <div className="relative group">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                    <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'confirm' || confirmNewPassword.length > 0 ? (confirmNewPassword !== newPassword && confirmNewPassword.length > 0 ? 'error' : 'active') : 'text-slate-300'}`}>
                      <UserCheck size={12} strokeWidth={2.5} />
                    </div>
                  </div>
                  <input 
                    type="password" required className={`secure-input !h-[2.6rem] !pl-[2.8rem] ${confirmNewPassword !== newPassword && confirmNewPassword.length > 0 ? 'invalid' : ''}`}
                    placeholder="Verify pin" value={confirmNewPassword}
                    onFocus={() => setFocusedField('confirm')} onBlur={() => setFocusedField(null)}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-bold uppercase tracking-wide text-center">
                  {error}
                </div>
              )}

              <button disabled={loading} className="primary-btn w-full !h-[2.8rem] mt-2">
                {loading ? 'Updating...' : 'Confirm New Pin'}
              </button>
            </motion.form>
          )}

          {phase === 'completed' && (
            <motion.div 
              key="complete-screen" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full text-center space-y-6 py-4"
            >
              <div className="inline-flex p-8 bg-emerald-500 text-white rounded-[2.5rem] shadow-2xl shadow-emerald-500/30">
                <ShieldCheck size={48} strokeWidth={2.5} />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Access Restored.</h3>
                <p className="text-emerald-500 font-black text-[9px] uppercase tracking-[0.25em]">Your vault is secure</p>
              </div>
              <Link to="/login" className="primary-btn w-full !h-[2.8rem]">
                GO TO LOGIN
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
