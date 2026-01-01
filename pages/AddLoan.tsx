
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { auth, db, collection, addDoc, onSnapshot, query, where, updateDoc, deleteDoc, doc } from '../firebase';
import { 
  ListTodo, Plus, Calendar, Landmark, Trash2, Edit3, X, 
  IndianRupee, Search, ArrowRight, AlertCircle, 
  CheckCircle, Zap, History, ReceiptIndianRupee, 
  ArrowDownCircle, Info, Banknote
} from 'lucide-react';
// Fix: Bypassing framer-motion type errors by casting to any
import { motion as motionBase, AnimatePresence as AnimatePresenceBase } from 'framer-motion';
const motion = motionBase as any;
const AnimatePresence = AnimatePresenceBase as any;
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

  // Fetch Loans
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

  // Fetch Payments for History Modal
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

  // Handle Repayment Logic
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

  const isPaidAmountInvalid = formData.paidAmount > formData.totalAmount && formData.totalAmount > 0;

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

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      lenderId: loan.lenderId,
      date: loan.date,
      dueDate: loan.dueDate || '',
      totalAmount: loan.totalAmount,
      paidAmount: loan.paidAmount,
      notes: loan.notes || '',
      documentUrl: loan.documentUrl || ''
    });
    setError('');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("ERASE this loan entry?")) {
      try {
        await deleteDoc(doc(db, "loans", id));
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaidAmountInvalid) return;
    if (!formData.lenderId || formData.totalAmount <= 0 || !auth.currentUser) {
      setError('Required fields missing.');
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
      console.error(err);
      setError('Database error.');
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
    <div className="space-y-6 pb-24">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-xl shadow-emerald-500/20">
            <ListTodo size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Loan <span className="text-emerald-500">List.</span>
            </h1>
            <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] mt-2">Manage all credit entries</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder="Search source..." 
              className="secure-input h-11 w-full sm:w-64 pl-11 text-xs bg-white shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setIsFormOpen(true)} className="primary-btn h-11 px-6 shadow-emerald-500/30 whitespace-nowrap">
            <Plus size={16} strokeWidth={3} /> SAVE
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem] border-2 border-white shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sources</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan Amount</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Amount</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLoans.map((loan, idx) => (
                <motion.tr 
                  key={loan.id} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: idx * 0.02 }} 
                  className="group hover:bg-emerald-50/20 transition-colors"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-slate-200" />
                      <span className="text-xs font-bold text-slate-600">{new Date(loan.date).toLocaleDateString('en-GB')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-black text-slate-900 lowercase">{loan.lenderName}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold text-slate-400">₹{loan.totalAmount.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-black">
                       <span className="text-sm tracking-tight">₹{(loan.totalAmount - (loan.paidAmount || 0)).toLocaleString('en-IN')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-bold text-slate-300">
                      {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('en-GB') : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setSelectedLoanId(loan.id); setIsHistoryModalOpen(true); }}
                        className="tactile-icon !w-9 !h-9 !rounded-xl !bg-white hover:!bg-emerald-500 hover:text-white transition-all text-slate-300"
                        title="View History"
                      >
                        <History size={16} />
                      </button>
                      <button onClick={() => handleEdit(loan)} className="tactile-icon !w-9 !h-9 !rounded-xl !bg-white hover:!bg-emerald-500 hover:text-white transition-all text-slate-300">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(loan.id)} className="tactile-icon !w-9 !h-9 !rounded-xl !bg-white hover:!bg-red-500 hover:text-white transition-all text-slate-300">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compact History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && selectedLoan && (
          <div className="modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e: any) => e.stopPropagation()} className="modal-content !max-w-[400px] !p-0 overflow-hidden !rounded-[3.5rem] border-0 shadow-3xl max-h-[85vh] flex flex-col">
              <div className="bg-[#0f172a] p-6 pb-4 text-white relative shrink-0">
                <div className="flex justify-between items-start mb-4">
                  <div className="tactile-icon active !w-11 !h-11 !rounded-2xl shadow-emerald-500/40 bg-emerald-500 text-white border-0">
                    <ReceiptIndianRupee size={20} />
                  </div>
                  <button onClick={() => setIsHistoryModalOpen(false)} className="w-9 h-9 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all">
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>
                <h2 className="text-2xl font-black tracking-tighter mb-1 truncate leading-none lowercase px-2">{selectedLoan.lenderName}</h2>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[7px] font-black text-emerald-400 uppercase tracking-widest mb-3 ml-2">ACTIVE ACCOUNT</div>
                <div className="p-4 bg-[#1e293b]/50 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl mx-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Balance Amount</p>
                  <p className="text-3xl font-black tracking-tighter text-emerald-400 leading-none">₹{(selectedLoan.totalAmount - (selectedLoan.paidAmount || 0)).toLocaleString('en-IN')}</p>
                </div>
              </div>
              
              <div className="p-6 bg-white flex flex-col min-h-0 flex-grow">
                <div className="flex justify-between items-center mb-4 shrink-0 px-1">
                  <div className="flex items-center gap-2">
                    <History size={14} className="text-slate-300" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-900">Recent History</span>
                  </div>
                  <button 
                    onClick={() => setIsAddPaymentFormOpen(true)} 
                    className="primary-btn !h-8 !rounded-xl !px-4 text-[8px] shadow-emerald-500/20"
                  >
                    <Plus size={12} strokeWidth={3} /> RECORD PAYMENT
                  </button>
                </div>
                
                <div className="space-y-2.5 overflow-y-auto pr-2 custom-scrollbar flex-grow min-h-0">
                  {payments.length === 0 ? (
                    <div className="py-16 text-center opacity-10 flex flex-col items-center">
                      <ArrowDownCircle size={32} className="mb-3" />
                      <p className="text-[9px] font-black uppercase tracking-widest">No History Yet</p>
                    </div>
                  ) : (
                    payments.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all group shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-emerald-500 shadow-sm">
                            <Zap size={14} fill="currentColor" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900">₹{p.amount.toLocaleString('en-IN')}</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                              {new Date(p.date).toLocaleDateString('en-GB')} • {p.note || 'RE'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingPayment(p); setPaymentData({ amount: p.amount, date: p.date, note: p.note || '' }); setIsAddPaymentFormOpen(true); }} className="p-1.5 text-slate-400 hover:text-emerald-600"><Edit3 size={13} /></button>
                          <button onClick={() => handleDeletePayment(p)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
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

      {/* Payment Form Modal */}
      <AnimatePresence>
        {isAddPaymentFormOpen && (
          <div className="modal-overlay z-[150]" onClick={() => setIsAddPaymentFormOpen(false)}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} onClick={(e: any) => e.stopPropagation()} className="modal-content !max-w-[360px] !rounded-[3rem] !p-8 shadow-3xl text-center">
              <div className="flex flex-col items-center mb-8">
                <div className="tactile-icon active !w-14 !h-14 !rounded-[1.4rem] mb-4 bg-emerald-500 text-white border-0 shadow-emerald-500/40"><Banknote size={24} strokeWidth={2.5} /></div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-1">Record Entry</h3>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">{selectedLoan?.lenderName || 'Source Registry'}</p>
              </div>

              {paymentError && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-100 flex items-center justify-center gap-2"><AlertCircle size={14} /> {paymentError}</div>
              )}

              <form onSubmit={handleAddPayment} className="space-y-6 text-left">
                <div>
                   <label className="form-label !mb-2">Payment Amount (₹)</label>
                   <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-xl">₹</div>
                      <input type="number" required className="secure-input !h-12 !pl-10 !text-xl font-black bg-slate-50 border-slate-100" placeholder="0.00" value={paymentData.amount || ''} onChange={e => setPaymentData(p => ({ ...p, amount: Number(e.target.value) }))} />
                   </div>
                   <div className="mt-2 text-center flex items-center justify-center gap-1.5 opacity-40">
                      <Info size={10} />
                      <p className="text-[8px] font-black uppercase tracking-[0.2em]">Limit: ₹{remainingBalance + (editingPayment?.amount || 0)}</p>
                   </div>
                </div>
                <div>
                   <label className="form-label !mb-2">Entry Date</label>
                   <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Calendar size={18} /></div>
                      <input type="date" required className="secure-input !h-12 !pl-12 !text-[11px] font-black" value={paymentData.date} onChange={e => setPaymentData(p => ({ ...p, date: e.target.value }))} />
                   </div>
                </div>
                <button type="submit" className="primary-btn w-full !h-12 !rounded-2xl text-[10px] shadow-2xl uppercase font-black active:scale-95">Confirm Registry <ArrowRight size={14} strokeWidth={3} /></button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loan Form Modal */}
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
                  <label className="form-label">Source Selection</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 z-10"><Landmark size={18} /></div>
                    <select required disabled={!!editingLoan} className="secure-input appearance-none !pl-11" value={formData.lenderId} onChange={e => setFormData(prev => ({ ...prev, lenderId: e.target.value }))}>
                      <option value="">Choose Source...</option>
                      {lenders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Date</label>
                    <input type="date" required className="secure-input !pl-4 !pr-4 !text-[11px]" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Due Date (Opt)</label>
                    <input type="date" className="secure-input !pl-4 !pr-4 !text-[11px]" value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Total Amount (₹)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">₹</div>
                      <input type="number" required min="1" className="secure-input !pl-9 text-lg font-black" placeholder="0" value={formData.totalAmount || ''} onChange={e => setFormData(p => ({ ...p, totalAmount: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Paid Upfront (₹)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">₹</div>
                      <input type="number" min="0" className={`secure-input !pl-9 text-lg font-black ${isPaidAmountInvalid ? 'invalid' : ''}`} placeholder="0" value={formData.paidAmount || ''} onChange={e => setFormData(p => ({ ...p, paidAmount: Number(e.target.value) }))} />
                    </div>
                  </div>
                </div>

                <button disabled={submitting || isPaidAmountInvalid} type="submit" className="primary-btn w-full mt-2 !h-[3.4rem]">
                  {submitting ? 'Processing...' : editingLoan ? 'Update Entry' : 'Authorise Entry'}
                  <ArrowRight size={16} strokeWidth={3} className="ml-1" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoanList;
