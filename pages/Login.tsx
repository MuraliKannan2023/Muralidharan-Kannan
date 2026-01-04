
import React, { useState } from 'react';
// Fix: Bypassing react-router-dom type errors by casting the module to any
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useNavigate } = ReactRouterDOM as any;
import { auth, signInWithEmailAndPassword } from '../firebase';
// Fix: Bypassing framer-motion type errors by casting to any
import { motion as motionBase, AnimatePresence as AnimatePresenceBase } from 'framer-motion';
const motion = motionBase as any;
const AnimatePresence = AnimatePresenceBase as any;
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [hasBlurredEmail, setHasBlurredEmail] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  
  const navigate = useNavigate();

  const validateEmail = (emailStr: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(emailStr);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (hasBlurredEmail) {
      setIsEmailValid(validateEmail(val));
    }
  };

  const handleEmailBlur = () => {
    setHasBlurredEmail(true);
    setIsEmailFocused(false);
    if (email.length > 0) {
      setIsEmailValid(validateEmail(email));
    } else {
      setIsEmailValid(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const isValid = validateEmail(email);
    setIsEmailValid(isValid);
    setHasBlurredEmail(true);

    if (!isValid) {
      setError("Provide a valid email.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(err.code === 'auth/invalid-credential' ? "Invalid credentials." : "Connection failed.");
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center px-4 overflow-hidden select-none bg-[#f1fcf8]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[360px] p-6 bg-white border-t border-l border-slate-100 border-r-[8px] border-b-[12px] border-emerald-500/10 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(16,185,129,0.12)] flex flex-col items-center relative"
      >
        <div className="flex flex-col items-center mb-4 text-center w-full">
          <div className="w-14 h-14 bg-[#10b981] rounded-[1.2rem] text-white flex items-center justify-center mb-3 shadow-[0_5px_0_#059669] transform hover:rotate-3 transition-all ring-4 ring-white relative group">
            <ShieldCheck size={28} strokeWidth={2.5} className="relative z-10" />
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.2rem]"></div>
          </div>
          
          <h1 className="text-[26px] font-black text-slate-900 tracking-tighter leading-none mb-1">
            Loan<span className="text-[#10b981]">Tracker.</span>
          </h1>
          
          <div className="inline-flex px-3 py-0.5 bg-emerald-50 rounded-full border border-emerald-100/50">
            <p className="text-[#10b981] font-black uppercase text-[6px] tracking-[0.3em]">EARN WITH HONESTY</p>
          </div>
        </div>

        {error && (
          <div className="w-full mb-4 p-2.5 bg-red-50 text-red-600 rounded-xl text-[8px] font-black uppercase tracking-wide border border-red-100 text-center flex items-center justify-center gap-2">
            <AlertCircle size={10} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-3 flex flex-col items-center">
          <div className="w-full">
            <div className="flex justify-between items-center mb-1 px-1">
              <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
              <AnimatePresence>
                {hasBlurredEmail && !isEmailValid && email.length > 0 && (
                  <motion.span 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-[6px] font-black text-red-500 uppercase tracking-widest"
                  >
                    Invalid
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !w-7 !h-7 ${isEmailFocused || email.length > 0 ? (hasBlurredEmail && !isEmailValid ? 'error' : 'active') : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                   <Mail size={12} strokeWidth={2.5} />
                </div>
              </div>
              <input 
                type="email" 
                required 
                className={`secure-input !h-[2.6rem] !pl-[3.5rem] !text-[12px] !rounded-[0.8rem] ${hasBlurredEmail && !isEmailValid ? 'invalid' : ''}`}
                placeholder="money@kaasu.com"
                value={email}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={handleEmailBlur}
                onChange={handleEmailChange}
              />
            </div>
          </div>

          <div className="w-full">
            <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Access Pin</label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !w-7 !h-7 ${isPasswordFocused || password.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                   <Lock size={12} strokeWidth={2.5} />
                </div>
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                required 
                className="secure-input !h-[2.6rem] !pl-[3.5rem] pr-10 !text-[12px] !rounded-[0.8rem]"
                placeholder="••••••••"
                value={password}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20"
              >
                <div className={`tactile-icon !h-6 !w-6 ${showPassword ? 'active' : 'text-slate-300 shadow-none hover:bg-slate-50'}`}>
                  {showPassword ? <EyeOff size={10} strokeWidth={2.5} /> : <Eye size={10} strokeWidth={2.5} />}
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-end w-full px-1 pt-0.5">
            <Link to="/forgot-password" text-emerald-500 className="text-[8px] font-black text-emerald-500 hover:text-emerald-600 uppercase tracking-widest border-b border-transparent hover:border-emerald-500 transition-all">
              Forgot Pin?
            </Link>
          </div>

          <button className="primary-btn w-full !h-[2.8rem] !rounded-[0.9rem] mt-3 shadow-[0_4px_0_#059669] hover:shadow-[0_3px_0_#059669] active:translate-y-[3px] active:shadow-none flex items-center justify-center gap-2 group">
            <span className="text-[11px] font-black tracking-[0.2em] uppercase">LOG IN NOW</span>
            <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-5 text-center pt-3.5 border-t border-slate-100 w-full">
          <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.18em]">
            New to the Vault? <Link to="/register" className="text-emerald-500 hover:text-emerald-600 ml-1 border-b border-emerald-500/10 font-black">SIGN UP</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
