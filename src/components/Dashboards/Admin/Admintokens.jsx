import React, { useState, useEffect } from 'react';
import Adminheader from './Adminheader';
import { db } from '../../../firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, AlertCircle, Loader2, User, FileText, Edit, IndianRupee } from 'lucide-react';
import { useStore } from './StoreContext';
import { useNavigate } from 'react-router-dom';

function Admintokens() {
  const [form, setForm] = useState({ name: '', purpose: 'GTS', amount: '' });
  const [customPurpose, setCustomPurpose] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Get the next token number on mount or after submission
  const [tokenNo, setTokenNo] = useState('');
  const { selectedStore } = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (!selectedStore) navigate('/admin');
  }, [selectedStore, navigate]);

  useEffect(() => {
    const fetchTokenCount = async () => {
      if (!selectedStore) return;
      const tokensRef = collection(db, 'tokens');
      const snapshot = await getDocs(tokensRef);
      // Count only tokens for the selected store
      const storeTokens = snapshot.docs.filter(doc => doc.data().storeId === selectedStore.id);
      const nextNum = storeTokens.length + 1;
      setTokenNo(`Tk-${String(nextNum).padStart(2, '0')}`);
    };
    fetchTokenCount();
  }, [preview, selectedStore]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'purpose' && value !== 'CUSTOM') setCustomPurpose('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.amount.trim() || (form.purpose === 'CUSTOM' && !customPurpose.trim())) {
      setToast({ show: true, message: 'Please fill all required fields.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      // Get the next token number for this store only
      const tokensRef = collection(db, 'tokens');
      const snapshot = await getDocs(tokensRef);
      const storeTokens = snapshot.docs.filter(doc => doc.data().storeId === selectedStore.id);
      const nextNum = storeTokens.length + 1;
      const tokenNumber = `Tk-${String(nextNum).padStart(2, '0')}`;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-GB');
      // Store in Firestore
      await addDoc(collection(db, 'tokens'), {
        name: form.name,
        purpose: form.purpose === 'CUSTOM' ? customPurpose : form.purpose,
        amount: form.amount,
        tokenNo: tokenNumber,
        date: dateStr,
        storeId: selectedStore?.id,
        storeName: selectedStore?.name,
        createdAt: serverTimestamp(),
      });
      setPreview({ ...form, purpose: form.purpose === 'CUSTOM' ? customPurpose : form.purpose, tokenNo: tokenNumber, date: dateStr });
      setForm({ name: '', purpose: 'GTS', amount: '' });
      setCustomPurpose('');
      setToast({ show: true, message: 'Token generated successfully!', type: 'success' });
    } catch (err) {
      setToast({ show: true, message: 'Error generating token.', type: 'error' });
    }
    setLoading(false);
  };

  // Print functionality
  const handlePrint = () => {
    const printContents = document.getElementById('token-preview').innerHTML;
    const win = window.open('', '', 'height=600,width=500');
    win.document.write('<html><head><title>Token</title>');
    win.document.write('<style>body{font-family:monospace;} .border-black{border:2px solid #000;padding:24px;width:400px;margin:auto;}</style>');
    win.document.write('</head><body >');
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  // Toast auto-hide
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <>
      <Adminheader />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-60 py-8 px-2">
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-10 items-start">
          {/* Form Card */}
          <form onSubmit={handleSubmit} className="flex-1 bg-white/90 rounded-3xl shadow-2xl p-10 space-y-8 border border-yellow-100">
            <h2 className="text-2xl font-extrabold text-yellow-700 mb-4 flex items-center gap-3 tracking-tight"><FileText className="w-6 h-6" /> Generate Token</h2>
            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-700 mb-1">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400 w-6 h-6" />
                <input name="name" value={form.name} onChange={handleChange} required className="w-full pl-12 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400 text-lg" placeholder="Enter customer name" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-700 mb-1">Purpose</label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition text-lg ${form.purpose === 'GTS' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white'}`}> <input type="radio" name="purpose" value="GTS" checked={form.purpose === 'GTS'} onChange={handleChange} className="accent-yellow-500" /> GTS </label>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition text-lg ${form.purpose === 'SOLDERING' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white'}`}> <input type="radio" name="purpose" value="SOLDERING" checked={form.purpose === 'SOLDERING'} onChange={handleChange} className="accent-yellow-500" /> Soldering </label>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition text-lg ${form.purpose === 'CUSTOM' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white'}`}> <input type="radio" name="purpose" value="CUSTOM" checked={form.purpose === 'CUSTOM'} onChange={handleChange} className="accent-yellow-500" /> Custom </label>
              </div>
              {form.purpose === 'CUSTOM' && (
                <div className="mt-2 animate-fade-in">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Enter Custom Purpose</label>
                  <div className="relative">
                    <Edit className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400 w-5 h-5" />
                    <input type="text" value={customPurpose} onChange={e => setCustomPurpose(e.target.value)} required className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 text-base" placeholder="Enter custom purpose" />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-700 mb-1">Amount (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400 w-6 h-6" />
                <input name="amount" value={form.amount} onChange={handleChange} required className="w-full pl-12 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400 text-lg" type="number" min="0" placeholder="Enter amount in rupees" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-3 rounded-2xl text-xl flex items-center justify-center gap-3 transition shadow-lg">
              {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <FileText className="w-6 h-6" />} Generate Token
            </button>
          </form>

          {/* Token Preview Card */}
          {preview && (
            <div className="flex-1 flex flex-col items-center">
              <h2 className="text-xl font-bold text-yellow-700 mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Token Preview</h2>
              <div id="token-preview" className="border-2 border-black p-8 w-[350px] bg-white relative rounded-2xl shadow-2xl" style={{fontFamily: 'monospace'}}>
                <div className="text-center font-bold text-lg mb-2 text-yellow-800">SRI GAYATRI ASSAYING CENTRE</div>
                <div className="mt-2 text-yellow-700 font-semibold">DETAILS:</div>
                <div className="mt-2 mb-2 text-gray-400">---------------------------------------------------------------------</div>
                <div className="flex justify-between mb-2 text-base">
                  <span className="font-semibold">TOKEN NO : {preview.tokenNo}</span>
                  <span className="font-semibold">DATE: {preview.date}</span>
                </div>
                <div className="mt-4">
                  <div className="flex mb-1"><span className="w-24 inline-block font-semibold">NAME</span>: {preview.name}</div>
                  <div className="flex mb-1"><span className="w-24 inline-block font-semibold">PURPOSE</span>: {preview.purpose}</div>
                  <div className="flex mb-1"><span className="w-24 inline-block font-semibold">AMOUNT</span>: ₹{preview.amount}</div>
                </div>
              </div>
              <button onClick={handlePrint} className="mt-6 px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-bold shadow flex items-center gap-2 text-lg transition"><FileText className="w-5 h-5" /> Print</button>
            </div>
          )}
        </div>
        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 text-white text-lg font-semibold ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} animate-fade-in`}>
            {toast.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease;
        }
      `}</style>
    </>
  );
}

export default Admintokens;
