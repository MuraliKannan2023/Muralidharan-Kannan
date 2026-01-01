
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, createUserWithEmailAndPassword, sendEmailVerification } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Mail, Lock, UserCheck, ShieldAlert, CheckCircle, ArrowRight, Eye, EyeOff, ImageIcon, Plus, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../App';

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
  const { t } = useTranslation();

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
      setError("Please enter a valid email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Security PIN must be at least 6 characters.");
      return;
    }
    
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password, imageUrl);
      // Trigger Verification
      if (result.user) {
        await sendEmailVerification(result.user);
      }
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.code === 'auth/email-already-in-use' ? "Email already registered." : (err.message || "Error occurred."));
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-2">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-[360px] p-4 md:p-5 border border-slate-50 shadow-2xl flex flex-col items-center"
      >
        <div className="flex flex-col items-center mb-3 text-center">
          <div className="relative mb-3 group">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-[1.2rem] bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 transform hover:scale-105 transition-transform cursor-pointer overflow-hidden border-2 border-white"
            >
              {imageUrl ? (
                <img src={imageUrl} className="w-full h-full object-cover" />
              ) : (
                <UserPlus size={22} strokeWidth={2.5} />
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Plus size={16} className="text-white" />
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">New Account</h1>
          <div className="bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-100/30">
            <p className="text-emerald-500 font-black uppercase text-[7px] tracking-[0.25em]">Profile Setup</p>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full mb-2.5 p-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-bold uppercase tracking-wide border border-red-100 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <ShieldAlert size={10} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className="w-full mb-2.5 p-2 bg-emerald-50 text-emerald-600 rounded-xl text-[8px] font-bold uppercase tracking-wide border border-emerald-100 flex flex-col items-center gap-1 shadow-sm"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle size={10} className="shrink-0" />
              <span>Vault Created</span>
            </div>
            <p className="text-[7px] opacity-70">Verification mail dispatched!</p>
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="w-full space-y-2">
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
                <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'email' || email.length > 0 ? (hasBlurredEmail && !isEmailValid ? 'error' : 'active') : 'text-slate-300'}`}>
                   <Mail size={12} strokeWidth={2.5} />
                </div>
              </div>
              <input 
                type="email" 
                required 
                className={`secure-input !h-[2.6rem] !pl-[2.8rem] ${hasBlurredEmail && !isEmailValid ? 'invalid' : ''}`}
                placeholder="money@kaasu.com"
                value={email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => {setHasBlurredEmail(true); setFocusedField(null); if(email.length > 0) setIsEmailValid(validateEmail(email))}}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Access Pin</label>
            <div className="relative group">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'pin' || password.length > 0 ? 'active' : 'text-slate-300'}`}>
                   <Lock size={12} strokeWidth={2.5} />
                </div>
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                required 
                className="secure-input !h-[2.6rem] !pl-[2.8rem] pr-10"
                placeholder="Secure pin"
                value={password}
                onFocus={() => setFocusedField('pin')}
                onBlur={() => setFocusedField(null)}
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

          <div>
            <label className="form-label">Verify Pin</label>
            <div className="relative group">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'confirm' || confirmPassword.length > 0 ? (confirmPassword.length > 0 && confirmPassword !== password ? 'error' : 'active') : 'text-slate-300'}`}>
                   <UserCheck size={12} strokeWidth={2.5} />
                </div>
              </div>
              <input 
                type={showConfirmPassword ? "text" : "password"}
                required 
                className={`secure-input !h-[2.6rem] !pl-[2.8rem] pr-10 ${confirmPassword.length > 0 && confirmPassword !== password ? 'invalid' : ''}`}
                placeholder="Confirm pin"
                value={confirmPassword}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20"
              >
                <div className={`tactile-icon !h-7 !w-7 ${showConfirmPassword ? 'active' : 'text-slate-300'}`}>
                  {showConfirmPassword ? <EyeOff size={11} strokeWidth={2.5} /> : <Eye size={11} strokeWidth={2.5} />}
                </div>
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSuccess}
            className="primary-btn w-full !h-[2.6rem] mt-2 shadow-emerald-500/20"
          >
            {isSuccess ? 'READY...' : 'SIGN UP'}
            {!isSuccess && <ArrowRight size={13} strokeWidth={3} className="ml-1" />}
          </button>
        </form>

        <div className="mt-4 text-center border-t border-slate-50 pt-2.5 w-full">
          <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.2em]">
            Already recorded? <Link to="/login" className="text-emerald-500 hover:text-emerald-600 transition-colors ml-1.5 border-b-2 border-emerald-500/10">LOG IN</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
