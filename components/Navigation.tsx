
import React, { useState } from 'react';
// Fix: Bypassing react-router-dom type errors by casting the module to any
import * as ReactRouterDOM from 'react-router-dom';
const { NavLink, useNavigate } = ReactRouterDOM as any;
import { signOut, getFullDatabase, auth } from '../firebase';
import { LayoutDashboard, ListTodo, LogOut, Languages, User, Landmark, Download, CheckCircle } from 'lucide-react';
import { useTranslation } from '../App';
// Fix: Bypassing framer-motion type errors by casting to any
import { motion as motionBase, AnimatePresence as AnimatePresenceBase } from 'framer-motion';
const motion = motionBase as any;
const AnimatePresence = AnimatePresenceBase as any;

const Navigation: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useTranslation();
  const [showToast, setShowToast] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDownloadReport = () => {
    const db = getFullDatabase();
    const currentUserId = auth.currentUser?.uid;
    
    const userLoans = (db.loans || []).filter((l: any) => l.userId === currentUserId);
    const userPayments = (db.payments || []).filter((p: any) => p.userId === currentUserId);

    let csvContent = "LOANFLOW - SOURCE VAULT FINANCIAL REPORT\n";
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    const totalTaken = userLoans.reduce((acc: number, l: any) => acc + l.totalAmount, 0);
    const totalPaid = userLoans.reduce((acc: number, l: any) => acc + (l.paidAmount || 0), 0);
    csvContent += "PORTFOLIO SUMMARY\n";
    csvContent += `Total Capital Borrowed: , ₹${totalTaken}\n`;
    csvContent += `Total Repayments: , ₹${totalPaid}\n`;
    csvContent += `Outstanding Balance: , ₹${totalTaken - totalPaid}\n\n`;

    csvContent += "DETAILED LOAN LIST\n";
    csvContent += "Source Name,Category,Start Date,Due Date,Borrowed Amount,Current Balance,Status\n";
    userLoans.forEach((l: any) => {
      const balance = l.totalAmount - (l.paidAmount || 0);
      csvContent += `"${l.lenderName}","${l.type}","${l.date}","${l.dueDate || 'N/A'}",${l.totalAmount},${balance},"${balance === 0 ? 'SETTLED' : 'ACTIVE'}"\n`;
    });

    csvContent += "\nTRANSACTION LEDGER (PAYMENTS)\n";
    csvContent += "Date,Source,Amount Paid,Note\n";
    userPayments.forEach((p: any) => {
      csvContent += `"${p.date}","${p.lenderName || 'N/A'}",${p.amount},"${p.note || 'RE'}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `LoanFlow_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t.dashboard },
    { to: '/lenders', icon: Landmark, label: t.lenders },
    { to: '/add-loan', icon: ListTodo, label: t.loanList },
  ];

  return (
    <>
      <nav className="hidden lg:flex glass-panel fixed top-6 left-8 right-8 z-50 h-20 items-center justify-between px-10 border border-emerald-50/50">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500 p-2.5 rounded-[1.2rem] text-white shadow-lg shadow-emerald-500/20">
            <Landmark size={24} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-slate-900 tracking-tighter leading-none">LoanFlow</span>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mt-1">{t.sourceVault}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-emerald-50/20 p-1.5 rounded-[1.8rem]">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }: any) => `flex items-center gap-2 px-6 py-3 rounded-[1.5rem] transition-all font-black text-[10px] uppercase tracking-[0.15em] ${isActive ? 'bg-white text-emerald-600 shadow-sm border border-emerald-50' : 'text-slate-400 hover:text-emerald-500'}`}>
              <Icon size={14} strokeWidth={2.5} /> {label}
            </NavLink>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          {/* 3D TACTILE DOWNLOAD ICON */}
          <button 
            onClick={handleDownloadReport}
            className="tactile-icon active !w-11 !h-11 !rounded-2xl bg-emerald-500 text-white shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)] border-white/20 hover:scale-110 active:scale-95 transition-all"
            title={t.downloadReport}
          >
            <Download size={18} strokeWidth={3} />
          </button>

          <button 
            onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
            className="flex items-center gap-2 px-5 py-3 bg-white text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-100 hover:border-emerald-200 transition-all shadow-sm active:scale-95"
          >
            <Languages size={14} strokeWidth={2.5} />
            {lang === 'en' ? 'தமிழ்' : 'ENGLISH'}
          </button>

          <div className="flex items-center gap-3 ml-4">
            <div className="w-10 h-10 rounded-full border-2 border-emerald-500 p-0.5 relative overflow-hidden bg-slate-50">
              {user?.photoURL ? (
                <img src={user.photoURL} className="w-full h-full object-cover rounded-full" alt="profile" />
              ) : (
                <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center text-emerald-600"><User size={20} /></div>
              )}
            </div>
            <button onClick={handleLogout} className="p-3 text-slate-300 hover:text-red-500 transition-all"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>
      
      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50 glass-panel p-2 border border-emerald-50 flex justify-around shadow-2xl">
          {navItems.map(({ to, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }: any) => `p-4 rounded-2xl transition-all ${isActive ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>
              <Icon size={22} strokeWidth={2.5} />
            </NavLink>
          ))}
          <button onClick={handleDownloadReport} className="p-4 rounded-2xl text-emerald-500">
            <Download size={22} strokeWidth={2.5} />
          </button>
      </div>

      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-slate-900 text-white rounded-full flex items-center gap-3 shadow-2xl border border-white/10"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle size={14} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{t.reportGenerated}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
