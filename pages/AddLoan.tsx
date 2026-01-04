
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { auth, db, collection, onSnapshot, query, where, updateDoc, deleteDoc, doc, addDoc } from '../firebase';
import { 
  BookOpen, Plus, Calendar, Landmark, Trash2, Edit3, X, 
  Search, ArrowRight, AlertCircle, 
  Zap, History, ReceiptIndianRupee, 
  IndianRupee,
  ArrowDownCircle, Banknote, Info, UserRound,
  ShieldCheck, Fingerprint, ChevronDown, Check,
  User as UserIcon, AlertTriangle
} from 'lucide-react';
import * as FramerMotion from 'framer-motion';
const { motion, AnimatePresence } = FramerMotion as any;

import { Lender, Loan, LoanType, Payment } from '../types';
import { useTranslation } from '../App';

interface LoanListProps {
  lenders: Lender[];
}

const LoanList: React.FC<LoanListProps> = ({ lenders }) => {
  const { t } = useTranslation();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAddPaymentFormOpen, setIsAddPaymentFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loanToDeleteId, setLoanToDeleteId] = useState<string | null>(null);
  const [isLenderDropdownOpen, setIsLenderDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    lenderId: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    totalAmount: 0,
    paidAmount: 0,
    notes: '',
    documentUrl: ''
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "loans"), where("userId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const list = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Loan[];
      setLoans(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedLoanId || !auth.currentUser) return;
    const q = query(collection(db, "payments"), where("loanId", "==", selectedLoanId));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const list = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
      setPayments(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
    return () => unsubscribe();
  }, [selectedLoanId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLenderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLoan = useMemo(() => 
    loans.find(l => l.id === selectedLoanId) || null
  , [loans, selectedLoanId]);

  const remainingBalance = selectedLoan ? (selectedLoan.totalAmount - (selectedLoan.paidAmount || 0)) : 0;

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    if (!selectedLoan || !auth.currentUser || paymentData.amount <= 0) {
      setPaymentError('ENTER VALID AMOUNT');
      return;
    }

    const maxAllowed = remainingBalance + (editingPayment?.amount || 0);
    if (paymentData.amount > maxAllowed) {
      setPaymentError(`MAX: ₹${maxAllowed}`);
      return;
    }

    try {
      if (editingPayment) {
        await updateDoc(doc(db, "payments", editingPayment.id), { ...paymentData });
      } else {
        await addDoc(collection(db, "payments"), {
          ...paymentData,
          loanId: selectedLoan.id,
          lenderName: selectedLoan.lenderName,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }
      
      const newPaidAmount = editingPayment 
        ? (selectedLoan.paidAmount - editingPayment.amount + paymentData.amount)
        : (selectedLoan.paidAmount + paymentData.amount);

      await updateDoc(doc(db, "loans", selectedLoan.id), { paidAmount: newPaidAmount });
      
      setPaymentData({ amount: 0, date: new Date().toISOString().split('T')[0], note: '' });
      setIsAddPaymentFormOpen(false);
      setEditingPayment(null);
    } catch (err) { 
      setPaymentError('SAVE FAILED'); 
    }
  };

  const handleDeletePayment = async (payment: Payment) => {
    try {
      await deleteDoc(doc(db, "payments", payment.id));
      const newPaidAmount = (selectedLoan!.paidAmount - payment.amount);
      await updateDoc(doc(db, "loans", selectedLoan!.id), { paidAmount: Math.max(0, newPaidAmount) });
    } catch (err) { console.error(err); }
  };

  const initiateDeleteLoan = (loanId: string) => {
    setLoanToDeleteId(loanId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteLoan = async () => {
    if (!loanToDeleteId) return;
    try {
      await deleteDoc(doc(db, "loans", loanToDeleteId));
      setIsDeleteModalOpen(false);
      setLoanToDeleteId(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      lenderId: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      totalAmount: 0,
      paidAmount: 0,
      notes: '',
      documentUrl: ''
    });
    setEditingLoan(null);
    setError('');
    setIsFormOpen(false);
    setFocusedField(null);
    setIsLenderDropdownOpen(false);
  };

  const isPaidAmountInvalid = formData.paidAmount > formData.totalAmount && formData.totalAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isPaidAmountInvalid) {
      setError('Repayment amount exceeds total loan.');
      return;
    }

    if (!formData.lenderId || formData.totalAmount <= 0 || !auth.currentUser) {
      setError('Fill required fields.');
      return;
    }
    
    const lender = lenders.find(l => l.id === formData.lenderId);
    if (!lender) return;

    setSubmitting(true);
    try {
      if (editingLoan) {
        await updateDoc(doc(db, "loans", editingLoan.id), {
          lenderId: formData.lenderId,
          lenderName: lender.name,
          date: formData.date,
          dueDate: formData.dueDate || null,
          totalAmount: formData.totalAmount,
          paidAmount: formData.paidAmount,
          notes: formData.notes
        });
      } else {
        const loanRef = await addDoc(collection(db, "loans"), {
          lenderId: formData.lenderId,
          lenderName: lender.name,
          date: formData.date,
          dueDate: formData.dueDate || null,
          type: lender.type || LoanType.INDIVIDUAL,
          totalAmount: formData.totalAmount,
          paidAmount: formData.paidAmount,
          notes: formData.notes,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });

        if (formData.paidAmount > 0) {
          await addDoc(collection(db, "payments"), {
            loanId: loanRef.id,
            lenderName: lender.name,
            amount: formData.paidAmount,
            date: formData.date,
            note: 'Upfront Payment',
            userId: auth.currentUser.uid,
            createdAt: new Date().toISOString()
          });
        }
      }
      resetForm();
    } catch (err) {
      setError('Save failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLoans = useMemo(() => {
    return loans.filter(l => 
      l.lenderName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [loans, searchQuery]);

  const currentLender = lenders.find(l => l.id === formData.lenderId);

  return (
    <div className="space-y-6 pb-24 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-2.5 rounded-[1.2rem] text-white shadow-lg shadow-emerald-500/20 ring-4 ring-white">
            <BookOpen size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              Ledger <span className="text-emerald-500">History.</span>
            </h1>
            <p className="text-slate-400 font-black text-[7px] uppercase tracking-[0.25em] mt-1.5">MANAGE ALL CREDIT ENTRIES</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-auto group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={12} />
            <input 
              type="text" placeholder={`${t.lenders}...`} 
              className="secure-input !h-9 w-full sm:w-56 !pl-9 !text-[10px] bg-white border-slate-100 shadow-sm"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setIsFormOpen(true)} className="primary-btn !h-9 px-5 !rounded-[0.8rem] shadow-emerald-500/20 w-full sm:w-auto">
            <Plus size={14} strokeWidth={3} /> CREATE LOAN
          </button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-2xl overflow-hidden rounded-[2.5rem] border-2 border-white shadow-2xl">
        <div className="overflow-x-hidden">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-emerald-50/70 border-b-2 border-white">
                <th className="px-4 py-6 text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] w-[15%]">
                  <div className="flex items-center gap-1.5 justify-center">
                    <Calendar size={11} strokeWidth={3} /> {t.date}
                  </div>
                </th>
                <th className="px-4 py-6 text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] w-[25%]">
                  <div className="flex items-center gap-1.5">
                    <UserIcon size={11} strokeWidth={3} /> {t.lenders}
                  </div>
                </th>
                <th className="px-4 py-6 text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] w-[15%] text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <IndianRupee size={11} strokeWidth={3} /> AMOUNT
                  </div>
                </th>
                <th className="px-4 py-6 text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] w-[15%] text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <Zap size={11} strokeWidth={3} /> BALANCE
                  </div>
                </th>
                <th className="px-4 py-6 text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] w-[15%] text-center">
                   <div className="flex items-center gap-1.5 justify-center">
                    <History size={11} strokeWidth={3} /> DUE
                  </div>
                </th>
                <th className="px-4 py-6 text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] text-center w-[15%]">
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/50">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-200 mb-6">
                        <Landmark size={40} strokeWidth={1} />
                      </div>
                      <p className="font-black uppercase text-[10px] tracking-[0.3em] text-slate-400">There is no history for the loan</p>
                    </motion.div>
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan, idx) => {
                  const lender = lenders.find(l => l.id === loan.lenderId);
                  return (
                    <motion.tr 
                      key={loan.id} 
                      initial={{ opacity: 0, x: -5 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: idx * 0.02 }} 
                      className="group hover:bg-emerald-50/40 transition-all duration-300"
                    >
                      <td className="px-2 py-5 text-center">
                        <span className="text-[10px] font-bold text-slate-600 tracking-tight">
                          {new Date(loan.date).toLocaleDateString('en-GB')}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-[0.8rem] flex items-center justify-center text-white overflow-hidden shadow-lg border-2 border-white ring-1 ring-slate-100/50 ${loan.type === LoanType.BANK ? 'bg-slate-900' : 'bg-emerald-500'} shrink-0`}>
                            {lender?.imageUrl ? (
                              <img src={lender.imageUrl} className="w-full h-full object-cover" alt={loan.lenderName} />
                            ) : (
                              <span className="text-[11px] font-black uppercase">{loan.lenderName.charAt(0)}</span>
                            )}
                          </div>
                          <span className="text-[11px] font-black text-slate-900 truncate max-w-[120px]">{loan.lenderName}</span>
                        </div>
                      </td>
                      <td className="px-2 py-5 text-center">
                        <span className="text-[11px] font-bold text-slate-400">₹{loan.totalAmount.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-2 py-5 text-center">
                        <div className="inline-flex items-center px-3 py-1.5 bg-emerald-500 text-white rounded-[0.7rem] font-black shadow-lg shadow-emerald-500/20">
                           <span className="text-[11px] tracking-tighter">₹{(loan.totalAmount - (loan.paidAmount || 0)).toLocaleString('en-IN')}</span>
                        </div>
                      </td>
                      <td className="px-2 py-5 text-center">
                        <span className="text-[10px] font-black text-slate-300 uppercase">{loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('en-GB') : '—'}</span>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex justify-center items-center gap-3">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedLoanId(loan.id); setIsHistoryModalOpen(true); }} 
                            className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-300 shadow-[0_4px_0_#dcfce7] hover:shadow-[0_2px_0_#059669] active:translate-y-[2px] active:shadow-none border border-emerald-100/50"
                            title="History"
                          >
                            <History size={16} strokeWidth={2.5} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingLoan(loan); setFormData({ lenderId: loan.lenderId, date: loan.date, dueDate: loan.dueDate || '', totalAmount: loan.totalAmount, paidAmount: loan.paidAmount, notes: loan.notes || '', documentUrl: loan.documentUrl || '' }); setIsFormOpen(true); }} 
                            className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all duration-300 shadow-[0_4px_0_#dbeafe] hover:shadow-[0_2px_0_#2563eb] active:translate-y-[2px] active:shadow-none border border-blue-100/50"
                            title="Edit"
                          >
                            <Edit3 size={16} strokeWidth={2.5} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); initiateDeleteLoan(loan.id); }} 
                            className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all duration-300 shadow-[0_4px_0_#fee2e2] hover:shadow-[0_2px_0_#dc2626] active:translate-y-[2px] active:shadow-none border border-red-100/50"
                            title="Delete"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
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
              className="modal-content !max-w-[380px] max-h-[95vh] overflow-y-auto !rounded-[2.5rem] !p-5 shadow-[0_30px_60px_-15px_rgba(16,185,129,0.12)] border-t border-l border-slate-100 border-r-[8px] border-b-[12px] border-emerald-500/10 custom-scrollbar"
            >
              <button onClick={resetForm} className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-emerald-500 transition-all z-50">
                <X size={18} strokeWidth={3} />
              </button>

              <div className="flex flex-col items-center mb-3 text-center">
                <div className="w-11 h-11 bg-emerald-600 rounded-[1rem] text-white flex items-center justify-center mb-2 shadow-[0_4px_0_#059669] ring-4 ring-white relative group">
                  <Zap size={20} strokeWidth={2.5} fill="currentColor" />
                </div>
                <h2 className="text-[22px] font-black text-slate-900 tracking-tighter leading-none mb-0.5">
                  {editingLoan ? 'Update' : 'New'} <span className="text-emerald-500">Loan.</span>
                </h2>
                <div className="inline-flex px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100/50">
                  <p className="text-[#10b981] font-black uppercase text-[6px] tracking-[0.2em]">FINANCIAL REGISTRY</p>
                </div>
              </div>

              {error && (
                <div className="mb-2 p-1.5 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center gap-2">
                  <AlertCircle size={10} className="text-red-500" />
                  <p className="text-[8px] font-black text-red-600 uppercase tracking-widest">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div className="w-full relative" ref={dropdownRef}>
                  <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">CHOOSE LENDER</label>
                  <div className="relative group">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                      <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'lender' || formData.lenderId.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                         <Landmark size={10} strokeWidth={3} />
                      </div>
                    </div>
                    <button 
                      type="button"
                      disabled={!!editingLoan}
                      onClick={() => setIsLenderDropdownOpen(!isLenderDropdownOpen)}
                      className={`secure-input !h-[2.4rem] !pl-[2.8rem] !text-[11px] !rounded-[0.7rem] text-left flex items-center justify-between ${editingLoan ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className={formData.lenderId ? 'text-slate-900 font-bold' : 'text-slate-300 font-medium opacity-50'}>
                        {currentLender ? currentLender.name : 'Choose Lender...'}
                      </span>
                      <ChevronDown size={14} className={`text-slate-300 transition-transform ${isLenderDropdownOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isLenderDropdownOpen && !editingLoan && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute left-0 right-0 z-[110] bg-white rounded-[1.2rem] shadow-2xl border border-emerald-50 p-1.5 overflow-hidden ring-4 ring-emerald-500/5 max-h-[180px] overflow-y-auto custom-scrollbar"
                      >
                        {lenders.map(l => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => { setFormData(p => ({ ...p, lenderId: l.id })); setIsLenderDropdownOpen(false); }}
                            className={`w-full text-left p-2.5 rounded-[0.8rem] flex items-center justify-between transition-all group ${formData.lenderId === l.id ? 'bg-emerald-500 text-white shadow-lg' : 'hover:bg-emerald-50 text-slate-600'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${formData.lenderId === l.id ? 'bg-white/20' : 'bg-emerald-50 text-emerald-500'}`}>
                                {l.type === LoanType.BANK ? <Landmark size={10} /> : <UserRound size={10} />}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider">{l.name}</span>
                            </div>
                            {formData.lenderId === l.id && <Check size={12} strokeWidth={4} />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="w-full">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">DATE</label>
                    <div className="relative group">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                        <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'date' || formData.date.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                           <Calendar size={10} strokeWidth={3} />
                        </div>
                      </div>
                      <input 
                        type="date" required 
                        className="secure-input !h-[2.4rem] !pl-[2.8rem] !text-[10px] !rounded-[0.7rem]" 
                        value={formData.date} 
                        onFocus={() => setFocusedField('date')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} 
                      />
                    </div>
                  </div>
                  <div className="w-full">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">DUE DATE (OPT)</label>
                    <div className="relative group">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                        <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'dueDate' || formData.dueDate.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                           <Calendar size={10} strokeWidth={3} />
                        </div>
                      </div>
                      <input 
                        type="date" 
                        className="secure-input !h-[2.4rem] !pl-[2.8rem] !text-[10px] !rounded-[0.7rem]" 
                        value={formData.dueDate} 
                        onFocus={() => setFocusedField('dueDate')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="w-full">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">LOAN AMOUNT (₹)</label>
                    <div className="relative group">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                        <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'amount' || formData.totalAmount > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                           <IndianRupee size={10} strokeWidth={3} />
                        </div>
                      </div>
                      <input 
                        type="number" required 
                        className="secure-input !h-[2.4rem] !pl-[2.8rem] !text-[12px] !font-black !rounded-[0.7rem]" 
                        placeholder="0" value={formData.totalAmount || ''} 
                        onFocus={() => setFocusedField('amount')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData(p => ({ ...p, totalAmount: Number(e.target.value) }))} 
                      />
                    </div>
                  </div>
                  <div className="w-full">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">PAID BACK NOW (₹)</label>
                    <div className="relative group">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                        <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'paid' || formData.paidAmount > 0 ? (isPaidAmountInvalid ? 'error' : 'active') : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                           <IndianRupee size={10} strokeWidth={3} />
                        </div>
                      </div>
                      <input 
                        type="number" 
                        className={`secure-input !h-[2.4rem] !pl-[2.8rem] !text-[12px] !font-black !rounded-[0.7rem] ${isPaidAmountInvalid ? 'invalid !border-red-400 !bg-red-50' : ''}`} 
                        placeholder="0" value={formData.paidAmount || ''} 
                        onFocus={() => setFocusedField('paid')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData(p => ({ ...p, paidAmount: Number(e.target.value) }))} 
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isPaidAmountInvalid && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-2 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2"
                    >
                      <AlertCircle size={12} className="text-red-500 shrink-0" />
                      <p className="text-[9px] font-bold text-red-600 uppercase tracking-tight">Paid amount cannot exceed loan amount (₹{formData.totalAmount})</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  disabled={submitting || isPaidAmountInvalid} 
                  type="submit" 
                  className="primary-btn w-full !h-[2.8rem] !rounded-[1rem] mt-3 shadow-[0_4px_0_#059669] active:translate-y-[3px] active:shadow-none flex items-center justify-center gap-2 group transition-all"
                >
                  <span className="text-[11px] font-black tracking-[0.2em] uppercase transition-opacity group-disabled:opacity-50">
                    {submitting ? 'PROCESSING...' : editingLoan ? 'UPDATE LOAN' : 'CREATE LOAN'}
                  </span>
                  <ArrowRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform group-disabled:translate-x-0" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHistoryModalOpen && selectedLoan && (
          <div className="modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              onClick={(e: any) => e.stopPropagation()} 
              className="modal-content !max-w-[400px] !p-0 overflow-hidden !rounded-[3.2rem] border-0 shadow-3xl max-h-[85vh] flex flex-col"
            >
              <div className="bg-[#0f172a] p-6 pb-5 text-white relative shrink-0">
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="tactile-icon active !w-12 !h-12 !rounded-2xl bg-emerald-500 shadow-lg border-white/10 shrink-0">
                      <ReceiptIndianRupee size={22} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-[20px] font-black tracking-tighter truncate leading-none lowercase">
                          {selectedLoan.lenderName}
                        </h2>
                        <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-[6px] font-black text-emerald-400 uppercase tracking-[0.15em]">ACTIVE ACCOUNT</span>
                        </div>
                      </div>
                      <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.25em]">Registry ID: #{selectedLoan.id.slice(-4).toUpperCase()}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsHistoryModalOpen(false)} className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 border border-white/10">
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>

                <div className="relative z-10 px-1">
                  <div className="p-4 bg-[#1e293b]/50 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Pending Balance</p>
                      <p className="text-3xl font-black tracking-tighter text-emerald-400 leading-none">
                        ₹{(selectedLoan.totalAmount - (selectedLoan.paidAmount || 0)).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[6px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Limit</p>
                      <p className="text-xs font-black text-slate-300">₹{selectedLoan.totalAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-white flex flex-col flex-grow min-h-0">
                <div className="flex justify-between items-center mb-4 shrink-0 px-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-50 rounded-lg text-slate-300">
                      <History size={14} strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900">Recent History</span>
                  </div>
                  <button onClick={() => setIsAddPaymentFormOpen(true)} className="primary-btn !h-8 !rounded-xl !px-4 text-[8px] shadow-emerald-500/20">
                    <Plus size={12} strokeWidth={3} /> RECORD PAYMENT
                  </button>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-1.5 space-y-3 min-h-0">
                  {payments.length === 0 ? (
                    <div className="py-16 text-center opacity-10 flex flex-col items-center">
                      <ArrowDownCircle size={40} strokeWidth={1} className="mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Activity Recorded</p>
                    </div>
                  ) : (
                    payments.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all group">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-110 transition-transform">
                            <Zap size={16} fill="currentColor" strokeWidth={0} />
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-slate-900 tracking-tight">₹{p.amount.toLocaleString('en-IN')}</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{new Date(p.date).toLocaleDateString('en-GB')} • {p.note || 'RE'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <button onClick={() => { setEditingPayment(p); setPaymentData({ amount: p.amount, date: p.date, note: p.note || '' }); setIsAddPaymentFormOpen(true); }} className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors shadow-sm"><Edit3 size={13} /></button>
                          <button onClick={() => handleDeletePayment(p)} className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddPaymentFormOpen && (
          <div className="modal-overlay z-[150]" onClick={() => setIsAddPaymentFormOpen(false)}>
            <motion.div 
              initial={{ scale: 0.97, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.97, opacity: 0, y: 10 }} 
              onClick={(e: any) => e.stopPropagation()} 
              className="modal-content !max-w-[340px] !rounded-[2.5rem] !p-6 shadow-[0_30px_60px_-15px_rgba(16,185,129,0.12)] border-t border-l border-slate-100 border-r-[8px] border-b-[12px] border-emerald-500/10"
            >
              <div className="flex flex-col items-center mb-5 text-center">
                <div className="w-12 h-12 bg-emerald-600 rounded-[1rem] text-white flex items-center justify-center mb-2 shadow-[0_4px_0_#059669] ring-4 ring-white relative group">
                  <Banknote size={22} strokeWidth={2.5} />
                </div>
                <h3 className="text-[22px] font-black text-slate-900 tracking-tighter leading-none mb-0.5">Record <span className="text-emerald-500">Entry.</span></h3>
                <div className="inline-flex px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100/50">
                  <p className="text-[#10b981] font-black uppercase text-[6px] tracking-[0.2em]">{selectedLoan?.lenderName || 'VAULT'}</p>
                </div>
              </div>

              {paymentError && (
                <div className="mb-3 p-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-black uppercase tracking-widest border border-red-100 flex items-center justify-center gap-1.5">
                  <AlertCircle size={10} /> {paymentError}
                </div>
              )}

              <form onSubmit={handleAddPayment} className="space-y-3">
                <div className="w-full">
                  <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">AMOUNT (₹)</label>
                  <div className="relative group">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                      <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'payAmt' || paymentData.amount > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                         <IndianRupee size={10} strokeWidth={3} />
                      </div>
                    </div>
                    <input 
                      type="number" required 
                      className="secure-input !h-[2.4rem] !pl-[2.8rem] !text-[14px] !font-black !rounded-[0.7rem] bg-slate-50/50" 
                      placeholder="0" 
                      value={paymentData.amount || ''} 
                      onFocus={() => setFocusedField('payAmt')}
                      onBlur={() => setFocusedField(null)}
                      onChange={e => setPaymentData(p => ({ ...p, amount: Number(e.target.value) }))} 
                    />
                  </div>
                  <div className="mt-1.5 text-center flex items-center justify-center gap-1 opacity-40">
                    <Info size={9} />
                    <p className="text-[6px] font-black uppercase tracking-[0.15em]">Max Registry: ₹{remainingBalance + (editingPayment?.amount || 0)}</p>
                  </div>
                </div>
                
                <div className="w-full">
                  <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">DATE</label>
                  <div className="relative group">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20">
                      <div className={`tactile-icon !w-6 !h-6 ${focusedField === 'payDate' || paymentData.date.length > 0 ? 'active' : 'text-slate-300 shadow-none bg-slate-50 border border-slate-100'}`}>
                         <Calendar size={10} strokeWidth={3} />
                      </div>
                    </div>
                    <input 
                      type="date" required 
                      className="secure-input !h-[2.4rem] !pl-[2.8rem] !text-[10px] !rounded-[0.7rem] bg-slate-50/50" 
                      value={paymentData.date} 
                      onFocus={() => setFocusedField('payDate')}
                      onBlur={() => setFocusedField(null)}
                      onChange={e => setPaymentData(p => ({ ...p, date: e.target.value }))} 
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className="primary-btn w-full !h-[2.6rem] !rounded-[0.8rem] text-[10px] shadow-[0_4px_0_#059669] active:translate-y-[3px] active:shadow-none mt-1 uppercase font-black"
                >
                  CONFIRM REGISTRY <ArrowRight size={14} strokeWidth={3} className="ml-1" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="modal-overlay z-[200]" onClick={() => setIsDeleteModalOpen(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 15 }} 
              onClick={(e: any) => e.stopPropagation()} 
              className="modal-content !max-w-[340px] !p-8 border-t border-l border-slate-100 border-r-[8px] border-b-[12px] border-red-500/10 !rounded-[2.5rem] shadow-2xl text-center"
            >
              <div className="flex flex-col items-center mb-6">
                <div className="tactile-icon error !w-14 !h-14 !rounded-2xl mb-4 bg-red-500 text-white shadow-lg border-white/20">
                  <AlertTriangle size={28} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Delete Record?</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Are you sure you want to delete this entry? This action cannot be undone.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDeleteLoan}
                  className="primary-btn !bg-red-500 !shadow-[0_4px_0_#b91c1c] w-full !h-12 !rounded-xl text-[10px]"
                >
                  YES, DELETE ENTRY <Trash2 size={16} strokeWidth={3} />
                </button>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full h-12 bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all active:translate-y-[2px]"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoanList;
