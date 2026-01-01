
import React, { useState, useEffect, createContext, useContext } from 'react';
// Fix: Bypassing react-router-dom type errors by casting the module to any
import * as ReactRouterDOM from 'react-router-dom';
const { HashRouter, Routes, Route, Navigate } = ReactRouterDOM as any;
import { auth, onAuthStateChanged, db, collection, onSnapshot, query, where } from './firebase';

import Dashboard from './pages/Dashboard';
import LenderMaster from './pages/LenderMaster';
import AddLoan from './pages/AddLoan';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Navigation from './components/Navigation';
import { Lender, Loan } from './types';
import { translations, Language } from './translations';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useTranslation must be used within LanguageProvider");
  return context;
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Language>('en');

  const t = translations[lang];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
      if (!currentUser) {
        setLenders([]);
        setLoans([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const qLenders = query(collection(db, "lenders"), where("userId", "==", user.uid));
    const unsubscribeLenders = onSnapshot(qLenders, (snapshot: any) => {
      setLenders(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
    });

    const qLoans = query(collection(db, "loans"), where("userId", "==", user.uid));
    const unsubscribeLoans = onSnapshot(qLoans, (snapshot: any) => {
      setLoans(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { unsubscribeLenders(); unsubscribeLoans(); };
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <HashRouter>
        <div className="min-h-screen flex flex-col">
          {user && <Navigation user={user} />}
          <main className={`flex-grow container mx-auto px-4 py-8 ${user ? 'mt-20' : 'mt-0'} max-w-5xl`}>
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/" element={user ? <Dashboard lenders={lenders} loans={loans} /> : <Navigate to="/login" />} />
              <Route path="/lenders" element={user ? <LenderMaster /> : <Navigate to="/login" />} />
              <Route path="/add-loan" element={user ? <AddLoan lenders={lenders} /> : <Navigate to="/login" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </LanguageContext.Provider>
  );
};

export default App;
