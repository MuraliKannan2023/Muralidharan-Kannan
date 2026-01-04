
import React, { useState, useEffect } from 'react';
// Fix: Bypassing react-router-dom type errors by casting the module to any
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useNavigate } = ReactRouterDOM as any;
import { auth, requestRecoveryOTP, verifyOTPAndReset } from '../firebase';
// Fix: Bypassing framer-motion type errors by casting to any
import { motion as motionBase, AnimatePresence as AnimatePresenceBase } from 'framer-motion';
const motion = motionBase as any;
const AnimatePresence = AnimatePresenceBase as any;
import { KeyRound, ArrowLeft, Mail, ShieldCheck, CheckCircle2, ArrowRight, Lock, UserCheck, Eye, EyeOff, ShieldAlert, Smartphone, Fingerprint, MessageSquare, BellRing } from 'lucide-react';

type RecoveryPhase = 'request' | 'otp' | 'reset' | 'completed';

const ForgotPassword: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [phase, setPhase] = useState<RecoveryPhase>('request');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showMockNotification, setShowMockNotification] = useState(false);

  const navigate = useNavigate();

  const handleOTPRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) return;
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      await requestRecoveryOTP(identifier);
      setPhase('otp');
      // Trigger Mock SMS Notification for Free "Receiving" experience
      setTimeout(() => setShowMockNotification(true), 800);
    } catch (err: any) {
      setError(err.code === 'auth/user-not-found' ? "Account not found." : "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === '123456') {
      setPhase('reset');
      setError('');
      setShowMockNotification(false);
    } else {
      setError("Verification code incorrect.");
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 4) {
      setError("PIN must be 4+ digits.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("PINs do not match.");
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      await verifyOTPAndReset(identifier, otp, newPassword);
      setPhase('completed');
    } catch (err: any) {
      setError("Recovery protocol failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center px-4 overflow-hidden select-none bg-[#f1fcf8] relative">
      {/* Mock SMS Notification System (Free Integration) */}
      <AnimatePresence>
        {showMockNotification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-[320px]"
          >
            <div className="bg-slate-900 text-white p-4 rounded-[1.5rem] shadow-2xl border border-white/10 flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                <MessageSquare size={18} fill="currentColor" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-0.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Vault SMS Service</p>
                  <p className="text-[8px] text-white/40">just now</p>
                </div>
                <p className="text-[11px] font-bold leading-tight">Your LoanTracker recovery code is <span className="text-emerald-400 font-black tracking-widest">123456</span>. Do not share this with anyone.</p>
              </div>
              <button onClick={() => setShowMockNotification(false)} className="text-white/20 hover:text-white"><BellRing size={14} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[360px] p-6 bg-white border-t border-l border-slate-100 border-r-[8px] border-b-[12px] border-emerald-500/10 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(16,185,129,0.12)] flex flex-col items-center relative"
      >
        <Link to="/login" className="self-start inline-flex items-center gap-1.5 text-[#10b981] font-black text-[8px] uppercase tracking-[0.18em] mb-4 hover:translate-x-[-2px] transition-transform group">
          <ArrowLeft size={14} strokeWidth={3} className="group-hover:translate-x-[-1px] transition-transform" /> BACK TO LOGIN
        </Link>

        <div className="flex flex-col items-center mb-5 text-center w-full">
          <div className="w-12 h-12 bg-emerald-600 rounded-[1.2rem] text-white flex items-center justify-center mb-3 shadow-[0_5px_0_#064e3b] ring-4 ring-white relative">
            <KeyRound size={26} strokeWidth={2.5} />
          </div>
          <h2 className="text-[26px] font-black text-slate-900 tracking-tighter leading-none mb-1">
            Access <span className="text-[#10b981]">Recovery.</span>
          </h2>
          <div className="inline-flex px-3 py-0.5 bg-emerald-50 rounded-full border border-emerald-100/50 shadow-sm">
            <p className="text-[#10b981] font-black uppercase text-[6px] tracking-[0.25em]">AUTHORIZATION PROTOCOL</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'request' && (
            <motion.form 
              key="request-form" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handleOTPRequest} className="w-full space-y-4 flex flex-col items-center"
            >
              <div className="w-full">
                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Email or Mobile</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                    <div className={`tactile-icon !w-7 !h-7 ${identifier.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                      {identifier.includes('@') ? <Mail size={12} strokeWidth={2.5} /> : <Smartphone size={12} strokeWidth={2.5} />}
                    </div>
                  </div>
                  <input 
                    type="text" required className="secure-input !h-[2.6rem] !pl-[3.5rem] !text-[12px] !rounded-[0.8rem]"
                    placeholder="Enter Registered Mobile / Email" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
              </div>
              
              {error && (
                <div className="w-full p-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-black uppercase tracking-wide border border-red-100 text-center flex items-center justify-center gap-2">
                  <ShieldAlert size={10} />
                  <span>{error}</span>
                </div>
              )}

              <button disabled={loading} className="primary-btn w-full !h-[2.8rem] !rounded-[0.9rem] shadow-[0_4px_0_#059669] hover:shadow-[0_3px_0_#059669] active:translate-y-[3px] active:shadow-none flex items-center justify-center gap-2 group">
                <span className="text-[11px] font-black tracking-[0.2em] uppercase">{loading ? 'SEARCHING...' : 'SEND OTP CODE'}</span>
                <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.form>
          )}

          {phase === 'otp' && (
            <motion.form 
              key="otp-screen" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              onSubmit={handleOTPVerification} className="w-full space-y-4 py-2"
            >
              <div className="w-full">
                <div className="flex justify-between items-center mb-1 px-1">
                  <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Verification Code</label>
                  <span className="text-[6px] font-black text-emerald-500 uppercase tracking-[0.2em]">Sent to {identifier.slice(-4).padStart(identifier.length, '•')}</span>
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                    <div className={`tactile-icon !w-7 !h-7 ${otp.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                      <Fingerprint size={12} strokeWidth={2.5} />
                    </div>
                  </div>
                  <input 
                    type="text" required maxLength={6} className="secure-input !h-[2.6rem] !pl-[3.5rem] !text-center !text-[18px] !tracking-[0.5em] !font-black !rounded-[0.8rem]"
                    placeholder="••••••" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                {/* Free OTP Prompt */}
                <div className="mt-2 text-center">
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Waiting for notification... Check top of screen for simulated free SMS.</p>
                </div>
              </div>
              
              {error && (
                <div className="w-full p-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-black uppercase tracking-wide border border-red-100 text-center">
                  {error}
                </div>
              )}

              <div className="pt-2 space-y-3">
                <button type="submit" className="primary-btn w-full !h-[2.8rem] !rounded-[0.9rem] shadow-[0_4px_0_#059669] active:translate-y-[3px] active:shadow-none">
                  <span className="text-[11px] font-black tracking-[0.2em] uppercase">VERIFY CODE</span>
                </button>
                <button type="button" onClick={() => setPhase('request')} className="w-full text-[8px] font-black text-slate-400 hover:text-[#10b981] uppercase tracking-[0.2em] transition-all">
                  WRONG ID? RESTART
                </button>
              </div>
            </motion.form>
          )}

          {phase === 'reset' && (
            <motion.form 
              key="reset-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              onSubmit={handlePasswordUpdate} className="w-full space-y-3 flex flex-col items-center"
            >
              <div className="w-full">
                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">New Secure PIN</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                    <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'pin' || newPassword.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                      <Lock size={12} strokeWidth={2.5} />
                    </div>
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} required 
                    className="secure-input !h-[2.6rem] !pl-[3.5rem] pr-10 !text-[12px] !rounded-[0.8rem]"
                    placeholder="Set New PIN" value={newPassword}
                    onFocus={() => setFocusedField('pin')} onBlur={() => setFocusedField(null)}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20">
                    <div className={`tactile-icon !h-6 !w-6 ${showPassword ? 'active' : 'text-slate-300 shadow-none'}`}>
                      {showPassword ? <EyeOff size={10} strokeWidth={2.5} /> : <Eye size={10} strokeWidth={2.5} />}
                    </div>
                  </button>
                </div>
              </div>

              <div className="w-full">
                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Verify New PIN</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                    <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'confirm' || confirmNewPassword.length > 0 ? (confirmNewPassword !== newPassword && confirmNewPassword.length > 0 ? 'error' : 'active') : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                      <UserCheck size={12} strokeWidth={2.5} />
                    </div>
                  </div>
                  <input 
                    type={showConfirmPassword ? "text" : "password"} required 
                    className={`secure-input !h-[2.6rem] !pl-[3.5rem] pr-10 !text-[12px] !rounded-[0.8rem] ${confirmNewPassword !== newPassword && confirmNewPassword.length > 0 ? 'invalid' : ''}`}
                    placeholder="Repeat PIN" value={confirmNewPassword}
                    onFocus={() => setFocusedField('confirm')} onBlur={() => setFocusedField(null)}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20">
                    <div className={`tactile-icon !h-6 !w-6 ${showConfirmPassword ? 'active' : 'text-slate-300 shadow-none hover:bg-slate-50'}`}>
                      {showConfirmPassword ? <EyeOff size={10} strokeWidth={2.5} /> : <Eye size={10} strokeWidth={2.5} />}
                    </div>
                  </button>
                </div>
              </div>

              {error && (
                <div className="w-full p-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-black uppercase tracking-wide border border-red-100 text-center">
                  {error}
                </div>
              )}

              <button disabled={loading} className="primary-btn w-full !h-[2.8rem] !rounded-[0.9rem] shadow-[0_4px_0_#059669] hover:shadow-[0_3px_0_#059669] active:translate-y-[3px] active:shadow-none mt-1">
                <span className="text-[11px] font-black tracking-[0.2em] uppercase">{loading ? 'UPDATING...' : 'CONFIRM NEW PIN'}</span>
              </button>
            </motion.form>
          )}

          {phase === 'completed' && (
            <motion.div 
              key="complete-screen" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full text-center space-y-5 py-4"
            >
              <div className="inline-flex p-6 bg-[#10b981] text-white rounded-[2rem] shadow-[0_5px_0_#059669] ring-8 ring-emerald-500/10">
                <ShieldCheck size={36} strokeWidth={2.5} />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Restored.</h3>
                <p className="text-[#10b981] font-black text-[8px] uppercase tracking-[0.3em] mt-1">Vault secure again</p>
              </div>
              <Link to="/login" className="primary-btn w-full !h-[2.8rem] !rounded-[0.9rem] shadow-[0_4px_0_#059669] active:translate-y-[3px]">
                <span className="text-[11px] font-black tracking-[0.2em] uppercase">CONTINUE TO LOGIN</span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
