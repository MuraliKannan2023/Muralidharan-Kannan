
import React, { useState, useRef } from 'react';
// Fix: Bypassing react-router-dom type errors by casting the module to any
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useNavigate } = ReactRouterDOM as any;
import { auth, createUserWithEmailAndPassword, sendEmailVerification } from '../firebase';
// Fix: Bypassing framer-motion type errors by casting to any
import { motion as motionBase, AnimatePresence as AnimatePresenceBase } from 'framer-motion';
const motion = motionBase as any;
const AnimatePresence = AnimatePresenceBase as any;
import { UserPlus, Mail, Lock, UserCheck, ShieldAlert, CheckCircle, ArrowRight, Eye, EyeOff, Camera } from 'lucide-react';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [hasBlurredEmail, setHasBlurredEmail] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const validateEmail = (emailStr: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(emailStr);
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setImageUrl(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const isValid = validateEmail(email);
    setIsEmailValid(isValid);
    setHasBlurredEmail(true);

    if (!isValid) {
      setError("Provide a valid email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("PINs do not match.");
      return;
    }

    if (password.length < 6) {
      setError("PIN must be 6+ chars.");
      return;
    }
    
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password, imageUrl);
      if (result.user) {
        await sendEmailVerification(result.user);
      }
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 1800);
    } catch (err: any) {
      setError(err.code === 'auth/email-already-in-use' ? "Email taken." : "Protocol error.");
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center px-4 overflow-hidden select-none bg-[#f1fcf8]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[360px] p-6 bg-white border-t border-l border-slate-100 border-r-[8px] border-b-[12px] border-emerald-500/10 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(16,185,129,0.12)] flex flex-col items-center relative"
      >
        <div className="flex flex-col items-center mb-3 text-center w-full">
          <div className="relative mb-2 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-14 h-14 rounded-[1.2rem] bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-[0_4px_0_#d1fae5] transform hover:rotate-3 transition-all ring-4 ring-white relative overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <UserPlus size={28} strokeWidth={2.5} />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#10b981] text-white p-1 rounded-lg shadow-lg border-2 border-white ring-2 ring-emerald-50">
               <Camera size={8} strokeWidth={3} />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          <h1 className="text-[26px] font-black text-slate-900 tracking-tighter leading-none mb-1">
            New <span className="text-[#10b981]">Account.</span>
          </h1>
          
          <div className="inline-flex px-3 py-0.5 bg-emerald-50 rounded-full border border-emerald-100/50 shadow-sm">
            <p className="text-[#10b981] font-black uppercase text-[6px] tracking-[0.3em]">VAULT SETUP</p>
          </div>
        </div>

        {error && (
          <div className="w-full mb-3 p-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-black uppercase tracking-wide border border-red-100 text-center flex items-center justify-center gap-2">
            <ShieldAlert size={10} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="w-full space-y-2 flex flex-col items-center">
          <div className="w-full">
            <div className="flex justify-between items-center mb-1 px-1">
              <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
              <AnimatePresence>
                {hasBlurredEmail && !isEmailValid && email.length > 0 && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[6px] font-black text-red-500 uppercase tracking-widest">Invalid</motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'email' || email.length > 0 ? (hasBlurredEmail && !isEmailValid ? 'error' : 'active') : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                   <Mail size={12} strokeWidth={2.5} />
                </div>
              </div>
              <input 
                type="email" required 
                className={`secure-input !h-[2.6rem] !pl-[3.5rem] !text-[12px] !rounded-[0.8rem] ${hasBlurredEmail && !isEmailValid ? 'invalid' : ''}`}
                placeholder="money@kaasu.com"
                value={email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => {setHasBlurredEmail(true); setFocusedField(null); if(email.length > 0) setIsEmailValid(validateEmail(email))}}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full">
            <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Create Access Pin</label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'pin' || password.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                   <Lock size={12} strokeWidth={2.5} />
                </div>
              </div>
              <input 
                type={showPassword ? "text" : "password"} required 
                className="secure-input !h-[2.6rem] !pl-[3.5rem] pr-10 !text-[12px] !rounded-[0.8rem]"
                placeholder="••••••"
                value={password}
                onFocus={() => setFocusedField('pin')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !h-6 !w-6 ${showPassword ? 'active' : 'text-slate-300 shadow-none hover:bg-slate-50'}`}>
                  {showPassword ? <EyeOff size={10} strokeWidth={2.5} /> : <Eye size={10} strokeWidth={2.5} />}
                </div>
              </button>
            </div>
          </div>

          <div className="w-full">
            <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Verify Pin</label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'confirm' || confirmPassword.length > 0 ? (confirmPassword.length > 0 && confirmPassword !== password ? 'error' : 'active') : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                   <UserCheck size={12} strokeWidth={2.5} />
                </div>
              </div>
              <input 
                type={showConfirmPassword ? "text" : "password"} required 
                className={`secure-input !h-[2.6rem] !pl-[3.5rem] pr-10 !text-[12px] !rounded-[0.8rem] ${confirmPassword.length > 0 && confirmPassword !== password ? 'invalid' : ''}`}
                placeholder="Verify Pin"
                value={confirmPassword}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !h-6 !w-6 ${showConfirmPassword ? 'active' : 'text-slate-300 shadow-none hover:bg-slate-50'}`}>
                  {showConfirmPassword ? <EyeOff size={10} strokeWidth={2.5} /> : <Eye size={10} strokeWidth={2.5} />}
                </div>
              </button>
            </div>
          </div>

          <button 
            type="submit" disabled={isSuccess}
            className="primary-btn w-full !h-[2.8rem] !rounded-[0.9rem] mt-2 shadow-[0_4px_0_#059669] hover:shadow-[0_3px_0_#059669] active:translate-y-[3px] active:shadow-none flex items-center justify-center gap-2 group"
          >
            <span className="text-[11px] font-black tracking-[0.2em] uppercase">COMPLETE SIGN UP</span>
            <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-4 text-center pt-3 border-t border-slate-100 w-full">
          <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.18em]">
            Already recorded? <Link to="/login" className="text-emerald-500 hover:text-emerald-600 ml-1 border-b border-emerald-500/10 font-black">LOG IN</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
