
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload, Trash2, Database, ShieldCheck, CloudLightning, Info, CheckCircle2, FileText } from 'lucide-react';
import { getFullDatabase, saveFullDatabase } from '../firebase';
import { useTranslation } from '../App';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const exportData = () => {
    const data = getFullDatabase();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Family_Vault_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage({ text: "Database exported successfully.", type: 'success' });
  };

  const exportExcelReport = () => {
    const db = getFullDatabase();
    const loans = db.loans || [];
    const payments = db.payments || [];

    let csvContent = "DATA REPORT - FAMILY LOAN TRACKER\n\n";
    
    csvContent += "LOAN SUMMARY\n";
    csvContent += "Lender,Type,Date,Due Date,Total Amount,Paid Amount,Remaining\n";
    loans.forEach((l: any) => {
      csvContent += `${l.lenderName},${l.type},${l.date},${l.dueDate || 'N/A'},${l.totalAmount},${l.paidAmount},${l.totalAmount - l.paidAmount}\n`;
    });

    csvContent += "\nPAYMENT HISTORY\n";
    csvContent += "Lender,Date,Amount,Note\n";
    payments.forEach((p: any) => {
      csvContent += `${p.lenderName || 'N/A'},${p.date},${p.amount},${p.note || 'N/A'}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage({ text: "Excel-ready report generated.", type: 'success' });
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.users && json.loans && json.lenders) {
          saveFullDatabase(json);
          setMessage({ text: "Restored successfully. Refreshing...", type: 'success' });
          setTimeout(() => window.location.reload(), 1500);
        } else { throw new Error(); }
      } catch (err) { setMessage({ text: "Invalid backup format.", type: 'error' }); }
    };
    reader.readAsText(file);
  };

  const clearData = () => {
    if (window.confirm("ERASE ALL LOCAL RECORDS?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-1 px-2">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {t.vaultControl.split(' ')[0]} <span className="text-emerald-600">{t.vaultControl.split(' ')[1]}.</span>
        </h2>
        <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.2em]">Manage persistence and local data</p>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-4 rounded-2xl border flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          <CheckCircle2 size={18} />
          <span className="font-bold uppercase text-[10px] tracking-widest">{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-6 border border-emerald-50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl"><Database size={20} /></div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Portability</h3>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button onClick={exportData} className="w-full h-12 bg-white border border-slate-100 hover:text-emerald-600 font-black rounded-xl flex items-center justify-center gap-2 uppercase tracking-[0.15em] text-[9px] shadow-sm">
              <Download size={14} /> Export Backup (JSON)
            </button>
            <button onClick={exportExcelReport} className="w-full h-12 bg-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 uppercase tracking-[0.15em] text-[9px] shadow-lg shadow-emerald-200">
              <FileText size={14} /> Export Report (Excel/CSV)
            </button>
            <label className="w-full h-12 bg-white border border-slate-100 hover:text-emerald-600 font-black rounded-xl flex items-center justify-center gap-2 uppercase tracking-[0.15em] text-[9px] shadow-sm cursor-pointer">
              <Upload size={14} /> Import Backup
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        <div className="glass-panel p-6 border border-emerald-50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-900 text-white p-3 rounded-xl"><CloudLightning size={20} /></div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Connectivity</h3>
          </div>
          <button onClick={clearData} className="w-full h-12 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-[0.15em] text-[9px]">
            <Trash2 size={14} /> Wipe Records
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
