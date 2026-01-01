
import React, { useMemo, useState, useEffect } from 'react';
import { 
  UserRound, ShieldCheck, Landmark, Coins, TrendingUp, History, 
  Wallet, Calendar, ArrowRight, Plus, X, 
  Trash2, Edit3, ReceiptIndianRupee, 
  Zap, ArrowDownCircle, Info, AlertCircle, Layers, Banknote
} from 'lucide-react';
// @ts-ignore
import { motion, AnimatePresence } from 'framer-motion';
import { Loan, LoanType, Lender, Payment } from '../types';
import { useTranslation } from '../App';
// @ts-ignore
import { Link } from 'react-router-dom';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, auth } from '../firebase';

interface DashboardProps {
  loans: Loan[];
  lenders: Lender[];
}

const Dashboard: React.FC<DashboardProps> = ({ loans, lenders }) => {
  const { t } = useTranslation();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAddPaymentFormOpen, setIsAddPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formError, setFormError] = useState('');
  
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  const selectedLoan = useMemo(() => 
    loans.find(l => l.id === selectedLoanId) || null
  , [loans, selectedLoanId]);

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

  const stats = useMemo(() => {
    const totalLoan = loans.reduce((acc, l) => acc + l.totalAmount, 0);
    const totalPaid = loans.reduce((acc, l) => acc + (l.paidAmount || 0), 0);
    const pending = totalLoan - totalPaid;
    
    return {
      totalLoan, totalPaid, pending,
      recentActivity: [...loans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)
    };
  }, [loans]);

  const remainingBalance = selectedLoan ? (selectedLoan.totalAmount - (selectedLoan.paidAmount || 0)) : 0;
  
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedLoan || !auth.currentUser || paymentData.amount <= 0) {
      setFormError('PLEASE ENTER A VALID AMOUNT');
      return;
    }

    const maxAllowed = remainingBalance + (editingPayment?.amount || 0);
    if (paymentData.amount > maxAllowed) {
      setFormError(`MAX LIMIT: ₹${maxAllowed}`);
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
      setFormError('SAVE FAILED'); 
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

  return (
    <div className="flex flex-col gap-8 h-full min-h-0 overflow-hidden pb-10">
      {/* Dynamic Summary Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 z-10">
        <div className="space-y-1">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-emerald-500/10 text-emerald-600 px-4 py-1 rounded-full border border-emerald-500/20 inline-flex items-center gap-2 mb-2">
            <TrendingUp size={12} strokeWidth={3} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t.livePortfolio}</span>
          </motion.div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none lowercase">
            {t.financialPulse.split(' ')[0]} <span className="text-emerald-500">{t.financialPulse.split(' ')[1]}.</span>
          </h2>
        </div>
        
        <div className="flex gap-3">
          <Link to="/add-loan" className="primary-btn !h-12 px-8 !rounded-2xl group relative overflow-hidden shadow-2xl shadow-emerald-500/30">
            <span className="relative z-10">{t.authorise}</span>
            <ArrowRight size={16} strokeWidth={3} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-5 z-10">
        {[
          { label: t.totalTaken, value: stats.totalLoan, icon: Coins, highlight: false },
          { label: t.totalPaid, value: stats.totalPaid, icon: ShieldCheck, highlight: false },
          { label: t.pending, value: stats.pending, icon: Wallet, highlight: true },
        ].map((item, idx) => (
          <motion.div 
            key={idx} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            className={`relative p-6 rounded-[2.5rem] border-2 overflow-hidden transition-all hover:scale-[1.02] cursor-default ${item.highlight ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.35)]' : 'bg-white text-slate-900 border-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)]'}`}
          >
            <div className="flex justify-between items-start mb-10 relative z-10">
              <div className={`tactile-icon !w-11 !h-11 !rounded-2xl ${item.highlight ? 'bg-white text-emerald-600' : 'bg-emerald-50 text-emerald-600 active'}`}>
                <item.icon size={20} strokeWidth={2.5} />
              </div>
              <p className={`text-[8px] font-black uppercase tracking-[0.25em] ${item.highlight ? 'text-white/70' : 'text-slate-400'}`}>{item.label}</p>
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-black tracking-tighter leading-none mb-1">₹{item.value.toLocaleString('en-IN')}</h3>
              <div className={`h-1 w-8 rounded-full ${item.highlight ? 'bg-white/30' : 'bg-emerald-500/20'}`}></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="flex-grow flex flex-col bg-white/60 backdrop-blur-2xl p-8 rounded-[3.5rem] border-2 border-white shadow-[0_40px_80px_-30px_rgba(6,78,59,0.1)] z-10 overflow-hidden min-h-0">
        <div className="flex items-center justify-between mb-8 shrink-0 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg"><Layers size={18} /></div>
            <div>
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">{t.recentOrigins}</h3>
              <div className="h-0.5 w-12 bg-emerald-500 rounded-full mt-1"></div>
            </div>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stats.recentActivity.length} ACTIVE DEBTS</p>
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-4 min-h-0">
          {stats.recentActivity.map((loan, idx) => (
            <motion.div 
              key={loan.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + idx * 0.05 }}
              className="flex items-center justify-between p-5 bg-white rounded-[2rem] border-2 border-slate-50 hover:border-emerald-200 transition-all hover:shadow-2xl hover:shadow-emerald-900/5 group"
            >
              <div className="flex items-center gap-5 cursor-pointer flex-grow" onClick={() => { setSelectedLoanId(loan.id); setIsHistoryModalOpen(true); }}>
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                    {loan.type === LoanType.BANK ? <Landmark size={22} /> : <UserRound size={22} />}
                  </div>
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 leading-none lowercase mb-1.5 group-hover:text-emerald-600 transition-colors">{loan.lenderName}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(loan.date).toLocaleDateString('en-GB')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900 tracking-tighter leading-none">₹{(loan.totalAmount - loan.paidAmount).toLocaleString('en-IN')}</p>
                </div>
                
                <button 
                  onClick={() => { setSelectedLoanId(loan.id); setIsAddPaymentFormOpen(true); }}
                  className="tactile-icon !w-10 !h-10 !rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all border-emerald-100"
                  title="Record Payment"
                >
                  <Plus size={18} strokeWidth={3} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* REFINED COMPACT History Modal */}
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
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Balance Amount</p>
                    <p className="text-2xl font-black tracking-tighter text-emerald-400 leading-none">₹{(selectedLoan.totalAmount - (selectedLoan.paidAmount || 0)).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-5 bg-white flex flex-col flex-grow min-h-0">
                <div className="flex justify-between items-center mb-3 shrink-0 px-0.5">
                  <div className="flex items-center gap-1.5">
                    <History size={12} className="text-slate-300" />
                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-900">Recent History</span>
                  </div>
                  <button onClick={() => setIsAddPaymentFormOpen(true)} className="primary-btn !h-7 !rounded-lg !px-3 text-[7px] shadow-emerald-500/20">
                    <Plus size={10} strokeWidth={3} /> RECORD PAYMENT
                  </button>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-1.5 space-y-2 min-h-0">
                  {payments.length === 0 ? (
                    <div className="py-12 text-center opacity-10 flex flex-col items-center">
                      <ArrowDownCircle size={28} className="mb-2" />
                      <p className="text-[8px] font-black uppercase tracking-widest">No History Yet</p>
                    </div>
                  ) : (
                    payments.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all group">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-emerald-500 shadow-sm"><Zap size={12} fill="currentColor" /></div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900">₹{p.amount.toLocaleString('en-IN')}</p>
                            <p className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">{new Date(p.date).toLocaleDateString('en-GB')} • {p.note || 'RE'}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingPayment(p); setPaymentData({ amount: p.amount, date: p.date, note: p.note || '' }); setIsAddPaymentFormOpen(true); }} className="p-1 text-slate-300 hover:text-emerald-600"><Edit3 size={11} /></button>
                          <button onClick={() => handleDeletePayment(p)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={11} /></button>
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

      {/* Payment Registry Modal */}
      <AnimatePresence>
        {isAddPaymentFormOpen && (
          <div className="modal-overlay z-[120]" onClick={() => setIsAddPaymentFormOpen(false)}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} onClick={(e: any) => e.stopPropagation()} className="modal-content !max-w-[340px] !rounded-[2.5rem] !p-6 shadow-3xl text-center">
              <div className="flex flex-col items-center mb-6">
                <div className="tactile-icon active !w-12 !h-12 !rounded-xl mb-3 bg-emerald-500 text-white border-0 shadow-emerald-500/40"><Banknote size={20} strokeWidth={2.5} /></div>
                <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none mb-1">Record Entry</h3>
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em]">{selectedLoan?.lenderName || 'Source Registry'}</p>
              </div>

              {formError && (
                <div className="mb-4 p-2 bg-red-50 text-red-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-red-100 flex items-center justify-center gap-1.5"><AlertCircle size={12} /> {formError}</div>
              )}

              <form onSubmit={handleAddPayment} className="space-y-4 text-left">
                <div>
                   <label className="form-label !mb-1.5">Payment Amount (₹)</label>
                   <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-lg">₹</div>
                      <input type="number" required className="secure-input !h-10 !pl-9 !text-lg font-black bg-slate-50 border-slate-100" placeholder="0" value={paymentData.amount || ''} onChange={e => setPaymentData(p => ({ ...p, amount: Number(e.target.value) }))} />
                   </div>
                </div>
                <div>
                   <label className="form-label !mb-1.5">Entry Date</label>
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

export default Dashboard;
