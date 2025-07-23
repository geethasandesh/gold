import { useEffect, useState } from 'react';
import Adminheader from './Adminheader';
import { db } from '../../../firebase';
import { collection, getDocs, query } from 'firebase/firestore';

function Adminfile() {
  const [ledger, setLedger] = useState('');
  const [online, setOnline] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const fetchCash = async () => {
      const q = query(collection(db, 'cashreserves'));
      const snapshot = await getDocs(q);
      let ledgerVal = '';
      let onlineVal = '';
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.type === 'LEDGER') {
          ledgerVal = d.available;
        } else if (d.type === 'ONLINE') {
          onlineVal = d.available;
        }
      });
      setLedger(ledgerVal);
      setOnline(onlineVal);
    };
    fetchCash();
  }, [toast]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <>
      <Adminheader />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-200 py-8 px-2">
        <div className="w-full max-w-lg bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100">
          <h2 className="text-xl font-bold text-yellow-700 mb-6 text-center">Cash Management</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Available cash in ledger</label>
            <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-lg">{ledger}</div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Available cash in online</label>
            <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-lg">{online}</div>
          </div>
        </div>
        {toast.show && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-[9999] flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </>
  );
}

export default Adminfile;
