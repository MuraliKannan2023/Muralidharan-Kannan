
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, ShieldCheck, CheckCircle2, ArrowLeft, Save, AlertCircle, Info } from 'lucide-react';
import { auth, updateUserProfile } from '../firebase';
// @ts-ignore
import { useNavigate, Link } from 'react-router-dom';

const ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [imageUrl, setImageUrl] = useState(user?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width; canvas.height = height;
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        photoURL: imageUrl
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Update protocol failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center px-4 overflow-hidden select-none bg-transparent">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[360px] p-8 bg-white border-t border-l border-slate-100 border-r-[8px] border-b-[12px] border-emerald-500/10 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(16,185,129,0.12)] flex flex-col items-center relative"
      >
        <Link to="/" className="self-start inline-flex items-center gap-1.5 text-[#10b981] font-black text-[8px] uppercase tracking-[0.18em] mb-6 hover:translate-x-[-2px] transition-transform group">
          <ArrowLeft size={14} strokeWidth={3} /> BACK TO VAULT
        </Link>

        <div className="flex flex-col items-center mb-6 text-center w-full">
          {/* 3D PROFILE UPLOADER */}
          <div className="relative mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-20 h-20 rounded-[1.8rem] bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-[0_6px_0_#d1fae5] transform hover:rotate-2 transition-all ring-4 ring-white relative overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <User size={40} strokeWidth={2.5} />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#10b981] text-white p-2 rounded-xl shadow-lg border-2 border-white ring-2 ring-emerald-50 active:translate-y-0.5 transition-transform">
               <Camera size={12} strokeWidth={3} />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          <h1 className="text-[26px] font-black text-slate-900 tracking-tighter leading-none mb-1.5">
            Vault <span className="text-[#10b981]">Settings.</span>
          </h1>
          
          <div className="inline-flex px-3 py-0.5 bg-emerald-50 rounded-full border border-emerald-100/50 shadow-sm">
            <p className="text-[#10b981] font-black uppercase text-[7px] tracking-[0.3em]">IDENTITY MANAGEMENT</p>
          </div>
        </div>

        {error && (
          <div className="w-full mb-4 p-2.5 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-wide border border-red-100 text-center flex items-center justify-center gap-2">
            <AlertCircle size={12} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="w-full mb-4 p-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-wide border border-emerald-100 flex items-center justify-center gap-2">
            <CheckCircle2 size={12} />
            <span>Identity Protocol Updated</span>
          </div>
        )}

        <form onSubmit={handleSave} className="w-full space-y-4">
          <div>
            <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Display Name</label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20">
                <div className={`tactile-icon !w-7 !h-7 active`}>
                   <ShieldCheck size={12} strokeWidth={2.5} />
                </div>
              </div>
              <input 
                type="text" required 
                className="secure-input !h-[3rem] !pl-[3.5rem] !text-[13px] !rounded-[1rem]"
                placeholder="Murali Kannan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-slate-50/80 p-3 rounded-[1.2rem] border border-slate-100 flex items-start gap-3">
            <div className="p-1.5 bg-white rounded-lg text-emerald-500 shadow-sm border border-emerald-50">
              <Info size={12} />
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase leading-relaxed tracking-wider">
              This name and image will be visible in your local financial reports and vault headers.
            </p>
          </div>

          <button 
            type="submit" disabled={loading}
            className="primary-btn w-full !h-[3.2rem] !rounded-[1.2rem] mt-4 shadow-[0_6px_0_#059669] hover:shadow-[0_4px_0_#059669] active:translate-y-[4px] active:shadow-none flex items-center justify-center gap-2.5 group"
          >
            <span className="text-[12px] font-black tracking-[0.25em] group-active:opacity-80 uppercase">
              {loading ? 'PROCESSING...' : 'SAVE CHANGES'}
            </span>
            <Save size={18} strokeWidth={3} />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileSettings;
