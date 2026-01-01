
import React, { useState } from 'react';
// Fix: Bypassing react-router-dom type errors by casting the module to any
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useNavigate } = ReactRouterDOM as any;
import { auth, signInWithEmailAndPassword } from '../firebase';
// Fix: Bypassing framer-motion type errors by casting to any
import { motion as motionBase, AnimatePresence as AnimatePresenceBase } from 'framer-motion';
const motion = motionBase as any;
const AnimatePresence = AnimatePresenceBase as any;
import { Mail, Lock, ArrowRight, Users, AlertCircle, Eye, EyeOff } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useTranslation } from '../App';

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
      setError("Please provide a valid email address.");
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
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-2">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-[360px] p-4 md:p-5 border border-slate-100 shadow-2xl flex flex-col items-center"
      >
        <div className="flex flex-col items-center mb-3 text-center">
          <div className="bg-emerald-500 p-2.5 rounded-[1rem] text-white mb-2 shadow-lg shadow-emerald-500/20 transform hover:scale-105 transition-transform">
            <Users size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">Family <span className="text-emerald-500">Tracker.</span></h1>
          <p className="text-emerald-500 font-black uppercase text-[7px] tracking-[0.2em] mt-1">Money is always ultimate</p>
        </div>

        {error && (
          <div className="w-full mb-2 p-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-bold uppercase tracking-wide border border-red-100 text-center flex items-center justify-center gap-1.5">
            <AlertCircle size={10} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-2.5">
          <div>
            <div className="flex justify-between items-center mb-0 px-1">
              <label className="form-label mb-0">Email Address</label>
              <AnimatePresence>
                {hasBlurredEmail && !isEmailValid && email.length > 0 && (
                  <motion.span 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-[7px] font-black text-red-500 uppercase tracking-widest"
                  >
                    Invalid
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="relative group">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !w-7 !h-7 ${isEmailFocused || email.length > 0 ? (hasBlurredEmail && !isEmailValid ? 'error' : 'active') : 'text-slate-300'}`}>
                   <Mail size={13} strokeWidth={2.5} />
                </div>
              </div>
              <input 
                type="email" 
                required 
                className={`secure-input !h-[2.6rem] !pl-[2.8rem] ${hasBlurredEmail && !isEmailValid ? 'invalid' : ''}`}
                placeholder="money@kaasu.com"
                value={email}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={handleEmailBlur}
                onChange={handleEmailChange}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Access Pin</label>
            <div className="relative group">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !w-7 !h-7 ${isPasswordFocused || password.length > 0 ? 'active' : 'text-slate-300'}`}>
                   <Lock size={13} strokeWidth={2.5} />
                </div>
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                required 
                className="secure-input !h-[2.6rem] !pl-[2.8rem] pr-10"
                placeholder="••••••••"
                value={password}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20"
              >
                <div className={`tactile-icon !h-7 !w-7 ${showPassword ? 'active' : 'text-slate-300'}`}>
                  {showPassword ? <EyeOff size={11} strokeWidth={2.5} /> : <Eye size={11} strokeWidth={2.5} />}
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-end px-1">
            <Link to="/forgot-password" text-emerald-500 className="text-[7px] font-black text-emerald-500 hover:text-emerald-600 uppercase tracking-widest">
              Forgot Pin?
            </Link>
          </div>

          <button className="primary-btn w-full !h-[2.6rem] mt-0.5">
            Log In Now <ArrowRight size={13} />
          </button>
        </form>

        <div className="mt-5 text-center pt-1.5 border-t border-slate-50 w-full">
          <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.2em]">
            New to the Vault? <Link to="/register" className="text-emerald-500 hover:text-emerald-600 transition-colors ml-1.5 border-b-2 border-emerald-500/10">SIGN UP</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
