
import React, { useState, useRef } from 'react';
// Fix: Bypassing react-router-dom type errors by casting the module to any
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useNavigate } = ReactRouterDOM as any;
import { auth, createUserWithEmailAndPassword, sendEmailVerification } from '../firebase';
// Fix: Bypassing framer-motion type errors by casting to any
import { motion as motionBase, AnimatePresence as AnimatePresenceBase } from 'framer-motion';
const motion = motionBase as any;
const AnimatePresence = AnimatePresenceBase as any;
import { 
  UserPlus, Mail, Lock, UserCheck, ShieldAlert, 
  ArrowRight, Eye, EyeOff, Camera, User, 
  Phone, Sparkles, Fingerprint, ShieldCheck 
} from 'lucide-react';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
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
        const MAX_WIDTH = 100;
        const MAX_HEIGHT = 100;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
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
    
    if (!username.trim()) { setError("Username required"); return; }
    if (!phoneNumber.trim()) { setError("Mobile required"); return; }
    
    const isValid = validateEmail(email);
    setIsEmailValid(isValid);
    setHasBlurredEmail(true);

    if (!isValid) { setError("Enter a valid email"); return; }
    if (password !== confirmPassword) { setError("PINs do not match"); return; }
    if (password.length < 4) { setError("PIN must be 4+ digits"); return; }
    
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password, imageUrl, username.trim(), phoneNumber.trim());
      if (result.user) { await sendEmailVerification(result.user); }
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 1800);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError("Email already exists");
      else if (err.code === 'auth/phone-already-in-use') setError("Mobile already exists");
      else setError("Enrollment failed");
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
          {/* Compact Profile Uploader - Matches Login Shield Size */}
          <div className="relative mb-3 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-14 h-14 bg-emerald-500 rounded-[1.2rem] text-white flex items-center justify-center shadow-[0_5px_0_#059669] ring-4 ring-white relative overflow-hidden transition-all group-hover:rotate-3">
              {imageUrl ? (
                <img src={imageUrl} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <UserPlus size={26} strokeWidth={2.5} />
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 bg-[#10b981] text-white p-1 rounded-lg shadow-lg border border-white ring-2 ring-emerald-50">
               <Camera size={10} strokeWidth={3} />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          <h1 className="text-[26px] font-black text-slate-900 tracking-tighter leading-none mb-1">
            New <span className="text-[#10b981]">Account.</span>
          </h1>
          
          <div className="inline-flex px-3 py-0.5 bg-emerald-50 rounded-full border border-emerald-100/50">
            <p className="text-[#10b981] font-black uppercase text-[6px] tracking-[0.3em]">VAULT SETUP</p>
          </div>
        </div>

        {error && (
          <div className="w-full mb-3 p-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-black uppercase tracking-wide border border-red-100 text-center flex items-center justify-center gap-2">
            <ShieldAlert size={10} />
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="w-full space-y-2.5 flex flex-col items-center">
          {/* Compact Identity Row */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="w-full">
              <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Username</label>
              <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                  <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'user' || username.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                     <User size={10} strokeWidth={3} />
                  </div>
                </div>
                <input 
                  type="text" required 
                  className="secure-input !h-[2.4rem] !pl-[2.8rem] !text-[11px] !rounded-[0.7rem]"
                  placeholder="Murali"
                  value={username}
                  onFocus={() => setFocusedField('user')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full">
              <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Mobile</label>
              <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                  <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'phone' || phoneNumber.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                     <Phone size={10} strokeWidth={3} />
                  </div>
                </div>
                <input 
                  type="tel" required 
                  className="secure-input !h-[2.4rem] !pl-[2.8rem] !text-[11px] !rounded-[0.7rem]"
                  placeholder="9876543210"
                  value={phoneNumber}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Email Row */}
          <div className="w-full">
            <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Email Address</label>
            <div className="relative group">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'email' || email.length > 0 ? (hasBlurredEmail && !isEmailValid ? 'error' : 'active') : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                   <Mail size={10} strokeWidth={3} />
                </div>
              </div>
              <input 
                type="email" required 
                className={`secure-input !h-[2.4rem] !pl-[2.8rem] !text-[11px] !rounded-[0.7rem] ${hasBlurredEmail && !isEmailValid ? 'invalid' : ''}`}
                placeholder="money@kaasu.com"
                value={email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => {setHasBlurredEmail(true); setFocusedField(null); if(email.length > 0) setIsEmailValid(validateEmail(email))}}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* PIN Row */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="w-full">
              <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Create Pin</label>
              <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                  <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'pin' || password.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                     <Fingerprint size={10} strokeWidth={3} />
                  </div>
                </div>
                <input 
                  type={showPassword ? "text" : "password"} required 
                  className="secure-input !h-[2.4rem] !pl-[2.8rem] !text-[11px] !rounded-[0.7rem] tracking-[0.2em]"
                  placeholder="••••••"
                  value={password}
                  onFocus={() => setFocusedField('pin')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 z-20 opacity-30 hover:opacity-100">
                  {showPassword ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
              </div>
            </div>
            <div className="w-full">
              <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Verify Pin</label>
              <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                  <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'confirm' || confirmPassword.length > 0 ? (confirmPassword !== password && confirmPassword.length > 0 ? 'error' : 'active') : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                     <ShieldCheck size={10} strokeWidth={3} />
                  </div>
                </div>
                <input 
                  type={showConfirmPassword ? "text" : "password"} required 
                  className={`secure-input !h-[2.4rem] !pl-[2.8rem] !text-[11px] !rounded-[0.7rem] tracking-[0.2em] ${confirmPassword.length > 0 && confirmPassword !== password ? 'invalid' : ''}`}
                  placeholder="••••••"
                  value={confirmPassword}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 z-20 opacity-30 hover:opacity-100">
                  {showConfirmPassword ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit" disabled={isSuccess}
            className="primary-btn w-full !h-[2.8rem] !rounded-[0.9rem] mt-3 shadow-[0_4px_0_#059669] hover:shadow-[0_3px_0_#059669] active:translate-y-[3px] active:shadow-none flex items-center justify-center gap-2 group"
          >
            <span className="text-[11px] font-black tracking-[0.2em] uppercase">COMPLETE SIGN UP</span>
            <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-5 text-center pt-3.5 border-t border-slate-100 w-full">
          <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.18em]">
            Recorded? <Link to="/login" className="text-emerald-500 hover:text-emerald-600 ml-1 border-b border-emerald-500/10 font-black">LOG IN</Link>
          </p>
        </div>
      </motion.div>
      
      {/* Enrollment Overlay */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] bg-[#f1fcf8]/90 backdrop-blur-sm flex flex-col items-center justify-center p-10 text-center"
          >
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)] mb-4">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Identity Verified</h2>
            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Entering the Vault...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Register;
