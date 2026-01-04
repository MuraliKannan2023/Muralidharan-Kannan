
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase';
import { User, Phone, MapPin, Trash2, Edit3, X, Image as ImageIcon, Plus, Search, UserRound, UserCheck, Landmark, ShieldCheck, Zap, Camera } from 'lucide-react';
// Fix: Bypassing framer-motion type errors by casting the module to any
import { motion as motionBase, AnimatePresence as AnimatePresenceBase } from 'framer-motion';
const motion = motionBase as any;
const AnimatePresence = AnimatePresenceBase as any;
import { Lender, LoanType } from '../types';
import { useTranslation } from '../App';

const LenderMaster: React.FC = () => {
  const { t } = useTranslation();
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLender, setEditingLender] = useState<Lender | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    type: LoanType.INDIVIDUAL,
    imageUrl: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "lenders"), where("userId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const list = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Lender[];
      setLenders(list);
    });
    return () => unsubscribe();
  }, []);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setFormData(prev => ({ ...prev, imageUrl: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', address: '', type: LoanType.INDIVIDUAL, imageUrl: '' });
    setEditingLender(null);
    setIsFormOpen(false);
    setFocusedField(null);
  };

  const handleEdit = (lender: Lender) => {
    setEditingLender(lender);
    setFormData({
      name: lender.name,
      phone: lender.phone,
      address: lender.address,
      type: lender.type || LoanType.INDIVIDUAL,
      imageUrl: lender.imageUrl || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("ERASE THIS LENDER?")) {
      try {
        await deleteDoc(doc(db, "lenders", id));
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !auth.currentUser) return;

    setSubmitting(true);
    try {
      if (editingLender) {
        await updateDoc(doc(db, "lenders", editingLender.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "lenders"), {
          ...formData,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLenders = lenders.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-24 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-2.5 rounded-[1.2rem] text-white shadow-lg shadow-emerald-500/20 ring-4 ring-white">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              Lender <span className="text-emerald-500">List.</span>
            </h1>
            <p className="text-slate-400 font-black text-[7px] uppercase tracking-[0.25em] mt-1.5">{t.registryCaption}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={12} />
            <input 
              type="text" 
              placeholder="Locate lender..." 
              className="secure-input !h-9 w-40 sm:w-56 !pl-9 !text-[10px] bg-white border-slate-100 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setIsFormOpen(true)} className="primary-btn !h-9 px-5 !rounded-[0.8rem] shadow-emerald-500/20">
            <Plus size={14} strokeWidth={3} /> CREATE LENDER
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="modal-overlay" onClick={resetForm}>
            <motion.div 
              initial={{ scale: 0.97, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 10 }}
              onClick={(e: any) => e.stopPropagation()}
              className="modal-content !max-w-[400px] !p-7 bg-white border-t border-l border-slate-100 border-r-[8px] border-b-[12px] border-emerald-500/10 rounded-[2.8rem] shadow-[0_40px_80px_-15px_rgba(16,185,129,0.18)] flex flex-col items-start relative overflow-visible"
            >
              <button onClick={resetForm} className="absolute top-6 right-6 p-1.5 text-slate-300 hover:text-emerald-500 transition-all z-50">
                <X size={20} strokeWidth={3} />
              </button>

              {/* Optimized Horizontal Header */}
              <div className="flex items-center gap-4 mb-5 w-full pr-8">
                <div className="w-12 h-12 bg-emerald-600 rounded-[1.2rem] text-white flex items-center justify-center shadow-[0_4px_0_#059669] ring-4 ring-white shrink-0">
                  <UserCheck size={26} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-[22px] font-black text-slate-900 tracking-tighter leading-none mb-1.5">
                     {editingLender ? 'Update' : 'Create'} <span className="text-emerald-500">Lender.</span>
                  </h2>
                  <div className="inline-flex px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100/50 w-fit">
                    <p className="text-[#10b981] font-black uppercase text-[6px] tracking-[0.2em]">IDENTITY & CLASSIFICATION</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="w-full space-y-4">
                {/* Profile Pic - Compact and Integrated */}
                <div className="flex items-center gap-4 mb-2 p-3 bg-slate-50/50 rounded-[1.5rem] border border-slate-100">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-[1.2rem] bg-white border-2 border-white shadow-md flex items-center justify-center transition-all overflow-hidden ring-1 ring-slate-100">
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} className="w-full h-full object-cover" alt="lender" />
                      ) : (
                        <ImageIcon size={22} className="text-slate-200" />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-[#10b981] text-white p-1.5 rounded-lg shadow-md border border-white">
                       <Camera size={10} strokeWidth={3} />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quick Identity</p>
                    <div className="flex bg-white p-1 rounded-xl gap-1 border border-slate-100 shadow-sm">
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, type: LoanType.BANK }))} 
                        className={`flex-1 py-1 rounded-lg font-black text-[7px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${formData.type === LoanType.BANK ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'}`}
                      >
                        <Landmark size={10} /> Institutional
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, type: LoanType.INDIVIDUAL }))} 
                        className={`flex-1 py-1 rounded-lg font-black text-[7px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${formData.type === LoanType.INDIVIDUAL ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'}`}
                      >
                        <UserRound size={10} /> Personal
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Name Input */}
                  <div className="w-full">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Provider Name</label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                        <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'name' || formData.name.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                           <User size={12} strokeWidth={3} />
                        </div>
                      </div>
                      <input 
                        type="text" required 
                        className="secure-input !h-[2.8rem] !pl-[3.5rem] !text-[12px] !rounded-[0.9rem]"
                        placeholder="e.g. Murali Kannan" 
                        value={formData.name} 
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} 
                      />
                    </div>
                  </div>

                  {/* Mobile Input */}
                  <div className="w-full">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Contact Access</label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                        <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'phone' || formData.phone.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                           <Phone size={12} strokeWidth={3} />
                        </div>
                      </div>
                      <input 
                        type="tel" required 
                        className="secure-input !h-[2.8rem] !pl-[3.5rem] !text-[12px] !rounded-[0.9rem]"
                        placeholder="+91 86586 58686" 
                        value={formData.phone} 
                        onFocus={() => setFocusedField('phone')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} 
                      />
                    </div>
                  </div>

                  {/* Address Input */}
                  <div className="w-full">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Location / Address</label>
                    <div className="relative group">
                      <div className="absolute left-3 top-3 z-20">
                        <div className={`tactile-icon !w-7 !h-7 ${focusedField === 'address' || formData.address.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                           <MapPin size={12} strokeWidth={3} />
                        </div>
                      </div>
                      <textarea 
                        className="secure-input min-h-[60px] !py-3 !pl-[3.5rem] !pr-3 resize-none leading-relaxed !text-[11px] !rounded-[0.9rem]" 
                        placeholder="Enter full address details..." 
                        value={formData.address} 
                        onFocus={() => setFocusedField('address')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))} 
                      />
                    </div>
                  </div>
                </div>

                <button disabled={submitting} type="submit" className="primary-btn w-full !h-[3rem] !rounded-[1rem] shadow-[0_5px_0_#059669] active:translate-y-[3px] active:shadow-none mt-2">
                  <span className="text-[11px] font-black tracking-[0.2em] uppercase">{submitting ? 'COMMITTING...' : 'ADD LENDER'}</span>
                  <Zap size={14} strokeWidth={3} className="ml-1" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredLenders.length === 0 ? (
          <div className="col-span-full py-32 text-center opacity-20">
             <Landmark size={64} strokeWidth={1} className="mx-auto mb-4" />
             <p className="font-black uppercase text-[10px] tracking-[0.5em]">Lender Registry Empty</p>
          </div>
        ) : (
          filteredLenders.map((lender, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              key={lender.id}
              className="bg-white rounded-[2rem] shadow-lg shadow-emerald-900/5 border border-white/50 flex flex-col overflow-hidden group hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 relative"
            >
              <div className="p-5 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-[1.8rem] p-1 bg-gradient-to-tr from-emerald-100 to-white shadow-inner">
                    <div className="w-full h-full rounded-[1.6rem] bg-white overflow-hidden flex items-center justify-center text-emerald-100 relative group-hover:rotate-1 transition-transform">
                      {lender.imageUrl ? (
                        <img src={lender.imageUrl} className="w-full h-full object-cover" alt="lender" />
                      ) : (
                        <UserRound size={32} />
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 bg-white p-1.5 rounded-xl shadow-md border border-emerald-50 text-emerald-500">
                    {lender.type === LoanType.BANK ? <Landmark size={12} strokeWidth={2.5} /> : <UserRound size={12} strokeWidth={2.5} />}
                  </div>
                </div>
                
                <div className="space-y-1.5 w-full">
                  <h4 className="text-sm font-black text-slate-900 tracking-tight leading-none truncate">{lender.name}</h4>
                  <div className="inline-flex">
                    <span className="text-[7px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50/50 px-2 py-0.5 rounded-full border border-emerald-100/30">
                      {lender.type === LoanType.BANK ? 'Institutional' : 'Personal'}
                    </span>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 tracking-tighter mt-1">{lender.phone}</p>
                </div>
              </div>
              
              <div className="flex border-t border-slate-50 mt-auto bg-slate-50/30">
                <button 
                  onClick={() => handleEdit(lender)} 
                  className="flex-1 py-3.5 flex justify-center items-center hover:bg-emerald-500 hover:text-white text-slate-300 transition-all border-r border-slate-50"
                >
                  <Edit3 size={15} />
                </button>
                <button 
                  onClick={() => handleDelete(lender.id)} 
                  className="flex-1 py-3.5 flex justify-center items-center hover:bg-red-500 hover:text-white text-slate-300 transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default LenderMaster;
