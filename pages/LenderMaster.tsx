
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase';
import { User, Phone, MapPin, Trash2, Edit3, X, Image as ImageIcon, Plus, Search, UserRound, UserCheck, Landmark, ShieldCheck, Zap } from 'lucide-react';
// Fix: Bypassing framer-motion type errors by casting to any
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
          <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-xl shadow-emerald-500/30 ring-4 ring-white">
            <ShieldCheck size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {t.capitalNexus.split(' ')[0]} <span className="text-emerald-500">{t.capitalNexus.split(' ')[1]}.</span>
            </h1>
            <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.25em] mt-2">{t.registryCaption}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Locate lender..." 
              className="secure-input !h-10 w-44 sm:w-60 !pl-10 !text-[11px] bg-white border-slate-100 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setIsFormOpen(true)} className="primary-btn !h-10 px-6 shadow-emerald-500/20">
            <Plus size={14} strokeWidth={3} /> {t.register.toUpperCase()}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="modal-overlay" onClick={resetForm}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e: any) => e.stopPropagation()}
              className="modal-content !max-w-[400px]"
            >
              <button onClick={resetForm} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-emerald-500 transition-all z-50">
                <X size={20} strokeWidth={3} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                  <UserCheck size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">{editingLender ? 'Update' : t.register} Lender</h2>
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-1">Identity & Classification</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center mb-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-[2rem] bg-slate-50 border-4 border-white shadow-xl flex items-center justify-center cursor-pointer hover:rotate-3 transition-all overflow-hidden group relative ring-2 ring-emerald-500/5"
                  >
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} className="w-full h-full object-cover" alt="lender" />
                    ) : (
                      <ImageIcon size={24} className="text-slate-200" />
                    )}
                    <div className="absolute inset-0 bg-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Plus size={16} className="text-emerald-600" />
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="form-label">Category Selection</label>
                    <div className="flex bg-slate-50/80 p-1.5 rounded-2xl gap-2 border border-slate-100">
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, type: LoanType.BANK }))} 
                        className={`flex-1 py-2 rounded-xl font-black text-[8px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${formData.type === LoanType.BANK ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}
                      >
                        <Landmark size={12} /> Institutional
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, type: LoanType.INDIVIDUAL }))} 
                        className={`flex-1 py-2 rounded-xl font-black text-[8px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${formData.type === LoanType.INDIVIDUAL ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}
                      >
                        <UserRound size={12} /> Personal
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">{t.officialName}</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500">
                         <User size={16} />
                      </div>
                      <input 
                        type="text" required className="secure-input !h-11 !pl-11" 
                        placeholder="e.g. Murali Kannan" 
                        value={formData.name} 
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">{t.phone}</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500">
                         <Phone size={16} />
                      </div>
                      <input 
                        type="tel" required className="secure-input !h-11 !pl-11" 
                        placeholder="8685868666" 
                        value={formData.phone} 
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">{t.address}</label>
                    <div className="relative">
                      <div className="absolute left-4 top-3.5 text-emerald-500">
                         <MapPin size={16} />
                      </div>
                      <textarea 
                        className="secure-input min-h-[60px] !py-3 !pl-11 resize-none leading-relaxed text-[11px]" 
                        placeholder="Address details..." 
                        value={formData.address} 
                        onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))} 
                      />
                    </div>
                  </div>
                </div>

                <button disabled={submitting} type="submit" className="primary-btn w-full mt-2 !h-[3.4rem]">
                  {submitting ? 'COMMITTING...' : t.establishRecord.toUpperCase()}
                  <Zap size={14} className="ml-1" />
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
              {/* Card Body */}
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
              
              {/* Hover Actions */}
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
