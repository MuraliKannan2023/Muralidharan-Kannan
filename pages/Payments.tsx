
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { db, collection, onSnapshot, query, where, auth, deleteDoc, doc, updateDoc } from '../firebase';
import { Payment, Loan } from '../types';
// Fixed: Added Calendar to lucide-react imports
import { Search, Filter, IndianRupee, Trash2, Edit3, ArrowUpRight, Download, Receipt, Calendar } from 'lucide-react';

const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const qPayments = query(collection(db, "payments"), where("userId", "==", auth.currentUser.uid));
    const unsubPayments = onSnapshot(qPayments, (snap: any) => {
      setPayments(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    });

    const qLoans = query(collection(db, "loans"), where("userId", "==", auth.currentUser.uid));
    const unsubLoans = onSnapshot(qLoans, (snap: any) => {
      setLoans(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubPayments(); unsubLoans(); };
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => 
      p.lenderName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.note?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchQuery]);

  const handleDelete = async (payment: Payment) => {
    if (!window.confirm("Erase this record from ledger?")) return;
    try {
      await deleteDoc(doc(db, "payments", payment.id));
      const loan = loans.find(l => l.id === payment.loanId);
      if (loan) {
        const remaining = payments.filter(p => p.loanId === loan.id && p.id !== payment.id).reduce((acc, p) => acc + p.amount, 0);
        await updateDoc(doc(db, "loans", loan.id), { paidAmount: remaining });
      }
    } catch (e) { console.error(e); }
  };

  const formatCurrency = (amt: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-3 rounded-2xl text-white"><Receipt size={24} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vault <span className="text-emerald-500">Ledger.</span></h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit transaction stream</p>
          </div>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input 
            type="text" placeholder="Search ledger..." 
            className="secure-input !h-11 !pl-11 !text-xs bg-white w-full sm:w-64"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-panel overflow-hidden border border-emerald-50 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Note</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPayments.map((p, idx) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="hover:bg-emerald-50/20 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-slate-300" />
                      <span className="text-xs font-bold text-slate-600">{new Date(p.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-black text-slate-900">{p.lenderName || 'Source Unknown'}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1 text-emerald-600 font-black">
                       <IndianRupee size={12} strokeWidth={3} />
                       <span className="text-sm tracking-tight">{p.amount.toLocaleString('en-IN')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.note || '—'}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleDelete(p)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-300 uppercase font-black text-[10px] tracking-[0.3em]">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payments;
