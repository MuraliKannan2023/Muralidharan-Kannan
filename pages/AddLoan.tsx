
import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, collection, addDoc, onSnapshot, query, where, updateDoc, deleteDoc, doc } from '../firebase';
import { 
  BookOpen, Plus, Calendar, Landmark, Trash2, Edit3, X, 
  Search, ArrowRight, AlertCircle, 
  Zap, History, ReceiptIndianRupee, 
  ArrowDownCircle, Banknote, Info, UserRound
} from 'lucide-react';
// Fix: Bypassing framer-motion type errors by casting the module to any
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
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  
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
    if (!selectedLoan || !window.confirm("PERMANENTLY REMOVE?")) return;
    try {
      await deleteDoc(doc(db, "payments", payment.id));
      const newPaidAmount = (selectedLoan.paidAmount - payment.amount);
      await updateDoc(doc(db, "loans", selectedLoan.id), { paidAmount: Math.max(0, newPaidAmount) });
    } catch (err) { console.error(err); }
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
  };

  const isPaidAmountInvalid = formData.paidAmount > formData.totalAmount && formData.totalAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isPaidAmountInvalid) {
      setError('Paid amount cannot exceed total loan amount.');
      return;
    }

    if (!formData.lenderId || formData.totalAmount <= 0 || !auth.currentUser) {
      setError('Please fill in all required fields.');
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
      setError('Failed to save record.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLoans = useMemo(() => {
    return loans.filter(l => 
      l.lenderName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [loans, searchQuery]);

  return (
    <div className="space-y-6 pb-24 px-1 md:px-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="bg-emerald-500 p-4 rounded-[1.5rem] text-white shadow-[0_15px_30px_-5px_rgba(16,185,129,0.3)] border-b-4 border-emerald-600 active:translate-y-[2px] active:border-b-0 transition-all">
              <BookOpen size={28} strokeWidth={2.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center animate-pulse">
               <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
              {t.loanList.split(' ')[0]} <span className="text-emerald-500">{t.loanList.split(' ').slice(1).join(' ')}.</span>
            </h1>
            <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.3em] mt-3">{t.manageEntriesCaption}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" placeholder={`${t.lenders}...`} 
              className="secure-input h-12 w-full sm:w-64 pl-11 text-xs bg-white shadow-sm hover:shadow-md transition-shadow"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setIsFormOpen(true)} className="primary-btn h-12 px-8 shadow-emerald-500/30 w-full sm:w-auto">
            <Plus size={18} strokeWidth={3} /> {t.authorise.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Responsive Ledger Content */}
      <div className="hidden md:block bg-white/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem] border-2 border-white shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.date}</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.lenders}</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.loanAmount}</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.pending}</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.dueDate}</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLoans.map((loan, idx) => (
                <motion.tr key={loan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="group hover:bg-emerald-50/30 transition-colors">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Calendar size={14} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">{new Date(loan.date).toLocaleDateString('en-GB')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black uppercase ${loan.type === LoanType.BANK ? 'bg-slate-800' : 'bg-emerald-500'}`}>
                        {loan.lenderName.charAt(0)}
                      </div>
                      <span className="text-xs font-black text-slate-900 lowercase">{loan.lenderName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6"><span className="text-xs font-bold text-slate-400">₹{loan.totalAmount.toLocaleString('en-IN')}</span></td>
                  <td className="px-6 py-6">
                    <div className="inline-flex items-center px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-600 font-black">
                       <span className="text-xs tracking-tight">₹{(loan.totalAmount - (loan.paidAmount || 0)).toLocaleString('en-IN')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6"><span className="text-[10px] font-bold text-slate-300">{loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('en-GB') : '—'}</span></td>
                  <td className="px-6 py-6">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setSelectedLoanId(loan.id); setIsHistoryModalOpen(true); }} className="tactile-icon !w-10 !h-10 !rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all border-slate-50"><History size={16} /></button>
                      <button onClick={() => { setEditingLoan(loan); setFormData({ lenderId: loan.lenderId, date: loan.date, dueDate: loan.dueDate || '', totalAmount: loan.totalAmount, paidAmount: loan.paidAmount, notes: loan.notes || '', documentUrl: loan.documentUrl || '' }); setIsFormOpen(true); }} className="tactile-icon !w-10 !h-10 !rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all border-slate-50"><Edit3 size={16} /></button>
                      <button onClick={() => deleteDoc(doc(db, "loans", loan.id))} className="tactile-icon !w-10 !h-10 !rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border-slate-50"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile-Friendly Ledger Cards */}
      <div className="md:hidden space-y-4">
        {filteredLoans.map((loan, idx) => (
          <motion.div 
            key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${loan.type === LoanType.BANK ? 'bg-slate-900' : 'bg-emerald-500'}`}>
                  {loan.type === LoanType.BANK ? <Landmark size={20} /> : <UserRound size={20} />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 lowercase">{loan.lenderName}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(loan.date).toLocaleDateString('en-GB')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.pending}</p>
                <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black">
                  ₹{(loan.totalAmount - (loan.paidAmount || 0)).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 border-t border-slate-50 pt-4 mt-2">
              <div className="text-center">
                <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1">{t.loanAmount}</p>
                <p className="text-xs font-bold text-slate-900">₹{loan.totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="text-center">
                <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1">{t.dueDate}</p>
                <p className="text-xs font-bold text-slate-900">{loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('en-GB') : '—'}</p>
              </div>
            </div>

            <div className="flex justify-around gap-2 mt-5 bg-slate-50 p-2 rounded-2xl">
              <button onClick={() => { setSelectedLoanId(loan.id); setIsHistoryModalOpen(true); }} className="flex-1 flex flex-col items-center gap-1.5 py-2 text-slate-400 hover:text-emerald-500">
                <History size={18} />
                <span className="text-[7px] font-black uppercase tracking-widest">History</span>
              </button>
              <button onClick={() => { setEditingLoan(loan); setFormData({ lenderId: loan.lenderId, date: loan.date, dueDate: loan.dueDate || '', totalAmount: loan.totalAmount, paidAmount: loan.paidAmount, notes: loan.notes || '', documentUrl: loan.documentUrl || '' }); setIsFormOpen(true); }} className="flex-1 flex flex-col items-center gap-1.5 py-2 text-slate-400 hover:text-blue-500">
                <Edit3 size={18} />
                <span className="text-[7px] font-black uppercase tracking-widest">Edit</span>
              </button>
              <button onClick={() => deleteDoc(doc(db, "loans", loan.id))} className="flex-1 flex flex-col items-center gap-1.5 py-2 text-slate-400 hover:text-red-500">
                <Trash2 size={18} />
                <span className="text-[7px] font-black uppercase tracking-widest">Delete</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && selectedLoan && (
          <div className="modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e: any) => e.stopPropagation()} className="modal-content !max-w-[380px] !p-0 overflow-hidden !rounded-[3rem] border-0 shadow-3xl max-h-[75vh] flex flex-col">
              <div className="bg-[#0f172a] p-5 pb-3 text-white relative shrink-0">
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="tactile-icon active !w-10 !h-10 !rounded-xl bg-emerald-500 shadow-lg border-0"><ReceiptIndianRupee size={18} strokeWidth={2.5} /></div>
                  <button onClick={() => setIsHistoryModalOpen(false)} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"><X size={14} strokeWidth={3} /></button>
                </div>
                <div className="relative z-10 px-1">
                  <h2 className="text-xl font-black tracking-tighter truncate leading-none lowercase mb-1">{selectedLoan.lenderName}</h2>
                  <div className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[6px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3">ACTIVE ACCOUNT</div>
                  <div className="p-3.5 bg-[#1e293b]/50 backdrop-blur-xl rounded-[1.8rem] border border-white/5 shadow-2xl">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{t.pending}</p>
                    <p className="text-2xl font-black tracking-tighter text-emerald-400 leading-none">₹{(selectedLoan.totalAmount - (selectedLoan.paidAmount || 0)).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
              <div className="p-5 bg-white flex flex-col flex-grow min-h-0">
                <div className="flex justify-between items-center mb-3 shrink-0 px-0.5">
                  <div className="flex items-center gap-1.5">
                    <History size={12} className="text-slate-300" />
                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-900">{t.recentActivity}</span>
                  </div>
                  <button onClick={() => setIsAddPaymentFormOpen(true)} className="primary-btn !h-7 !rounded-lg !px-3 text-[7px] shadow-emerald-500/20">
                    <Plus size={10} strokeWidth={3} /> RECORD PAYMENT
                  </button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-1.5 space-y-2 min-h-0">
                  {payments.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all group shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-emerald-500 shadow-sm"><Zap size={12} fill="currentColor" /></div>
                        <div>
                          <p className="text-[11px] font-black text-slate-900">₹{p.amount.toLocaleString('en-IN')}</p>
                          <p className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">{new Date(p.date).toLocaleDateString('en-GB')} • {p.note || 'RE'}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                         <button onClick={() => handleDeletePayment(p)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && <p className="text-center py-10 text-[9px] font-black text-slate-300 uppercase tracking-widest">No payments recorded</p>}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Loan Entry Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="modal-overlay" onClick={resetForm}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} onClick={(e: any) => e.stopPropagation()} className="modal-content !max-w-[420px] max-h-[90vh] overflow-y-auto !rounded-[2.8rem] !p-8 shadow-3xl">
              <button onClick={resetForm} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-emerald-500 transition-all z-50">
                <X size={20} strokeWidth={3} />
              </button>

              <div className="flex flex-col items-center mb-6 text-center">
                <div className="bg-emerald-500 p-4 rounded-[1.4rem] text-white shadow-xl shadow-emerald-500/20 mb-4">
                  <Zap size={24} strokeWidth={2.5} fill="currentColor" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {editingLoan ? 'Update' : 'New'} <span className="text-emerald-500">Loan.</span>
                </h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mt-2">Financial Registry</p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="form-label">{t.sourceSelection}</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 z-10"><Landmark size={18} /></div>
                    <select required disabled={!!editingLoan} className="secure-input appearance-none !pl-11" value={formData.lenderId} onChange={e => setFormData(prev => ({ ...prev, lenderId: e.target.value }))}>
                      <option value="">{t.sourceSelection}...</option>
                      {lenders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">{t.date}</label>
                    <input type="date" required className="secure-input !pl-4 !pr-4 !text-[11px]" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">{t.dueDate} (Opt)</label>
                    <input type="date" className="secure-input !pl-4 !pr-4 !text-[11px]" value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">{t.loanAmount} (₹)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">₹</div>
                      <input type="number" required min="1" className="secure-input !pl-9 text-lg font-black" placeholder="0" value={formData.totalAmount || ''} onChange={e => setFormData(p => ({ ...p, totalAmount: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">{t.paidUpfront} (₹)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">₹</div>
                      <input type="number" min="0" className={`secure-input !pl-9 text-lg font-black ${isPaidAmountInvalid ? 'invalid' : ''}`} placeholder="0" value={formData.paidAmount || ''} onChange={e => setFormData(p => ({ ...p, paidAmount: Number(e.target.value) }))} />
                    </div>
                  </div>
                </div>

                <button disabled={submitting || isPaidAmountInvalid} type="submit" className="primary-btn w-full mt-2 !h-[3.4rem]">
                  {submitting ? 'Processing...' : editingLoan ? 'Update Entry' : t.authorise.toUpperCase()}
                  <ArrowRight size={16} strokeWidth={3} className="ml-1" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Internal Payment Recording Modal */}
      <AnimatePresence>
        {isAddPaymentFormOpen && (
          <div className="modal-overlay z-[150]" onClick={() => setIsAddPaymentFormOpen(false)}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} onClick={(e: any) => e.stopPropagation()} className="modal-content !max-w-[340px] !rounded-[2.5rem] !p-6 shadow-3xl text-center">
              <div className="flex flex-col items-center mb-6">
                <div className="tactile-icon active !w-12 !h-12 !rounded-xl mb-3 bg-emerald-500 text-white border-0 shadow-emerald-500/40"><Banknote size={20} strokeWidth={2.5} /></div>
                <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none mb-1">Record Entry</h3>
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em]">{selectedLoan?.lenderName || 'Lender Registry'}</p>
              </div>

              {paymentError && (
                <div className="mb-4 p-2 bg-red-50 text-red-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-red-100 flex items-center justify-center gap-1.5"><AlertCircle size={12} /> {paymentError}</div>
              )}

              <form onSubmit={handleAddPayment} className="space-y-4 text-left">
                <div>
                   <label className="form-label !mb-1.5">{t.amount} (₹)</label>
                   <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-lg">₹</div>
                      <input type="number" required className="secure-input !h-10 !pl-9 !text-lg font-black bg-slate-50 border-slate-100" placeholder="0" value={paymentData.amount || ''} onChange={e => setPaymentData(p => ({ ...p, amount: Number(e.target.value) }))} />
                   </div>
                   <div className="mt-2 text-center flex items-center justify-center gap-1.5 opacity-40">
                      <Info size={10} />
                      <p className="text-[7px] font-black uppercase tracking-[0.2em]">Max Limit: ₹{remainingBalance + (editingPayment?.amount || 0)}</p>
                   </div>
                </div>
                <div>
                   <label className="form-label !mb-1.5">{t.date}</label>
                   <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Calendar size={14} /></div>
                      <input type="date" required className="secure-input !h-10 !pl-10 !text-[10px] font-black" value={paymentData.date} onChange={e => setPaymentData(p => ({ ...p, date: e.target.value }))} />
                   </div>
                </div>
                <button type="submit" className="primary-btn w-full !h-11 !rounded-xl text-[9px] shadow-2xl uppercase font-black active:scale-95">Confirm Registry <ArrowRight size={12} strokeWidth={3} /></button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoanList;
