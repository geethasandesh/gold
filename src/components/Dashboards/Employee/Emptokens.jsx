import { useState, useEffect } from 'react';
import Adminheader from './Employeeheader';
import { db } from '../../../firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { FaCheckCircle, FaExclamationCircle, FaUser, FaFileAlt, FaEdit, FaRupeeSign, FaPrint, FaFileSignature } from 'react-icons/fa';
import { useStore } from '../Admin/StoreContext';
import { useNavigate } from 'react-router-dom';
 
function Emptokens() {
  const [form, setForm] = useState({ name: '', purpose: 'GTS', amount: '' });
  const [customPurpose, setCustomPurpose] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();
  const { selectedStore } = useStore();
  
  // Navigate to employee dashboard if no store is selected
  useEffect(() => {
    if (!selectedStore) navigate('/employee');
  }, [selectedStore, navigate]);
 
  useEffect(() => {
    const fetchTokenCount = async () => {
      if (!selectedStore) return;
      const snapshot = await getDocs(collection(db, 'tokens'));
      // Count only tokens for the selected store
      const storeTokens = snapshot.docs.filter(doc => doc.data().storeId === selectedStore.id);
      const nextNum = storeTokens.length + 1;
      // Generate token number directly without state
      const tokenNumber = `Tk-${String(nextNum).padStart(2, '0')}`;
      return tokenNumber;
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
      const snapshot = await getDocs(collection(db, 'tokens'));
      const nextNum = snapshot.size + 1;
      const tokenNumber = `Tk-${String(nextNum).padStart(2, '0')}`;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-GB');
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
    } catch {
      setToast({ show: true, message: 'Error generating token.', type: 'error' });
    }
    setLoading(false);
  };
 
  const handlePrint = () => {
    const printContents = document.getElementById('token-preview').innerHTML;
    const win = window.open('', '', 'height=600,width=500');
    win.document.write('<html><head><title>Token</title>');
    win.document.write('<style>body{font-family:monospace;} .border-blue{border:2px solid #2563eb;padding:24px;width:400px;margin:auto;}</style>');
    win.document.write('</head><body >');
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };
 
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
 
  return (
    <>
      <Adminheader />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 py-8 px-2">
        {/* Store Indicator */}
        {selectedStore && (
          <div className="w-full max-w-4xl mb-4">
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 text-center">
              <h3 className="text-lg font-bold text-blue-800">
                🏪 Working for: <span className="text-blue-900">{selectedStore.name}</span>
              </h3>
              <p className="text-blue-700 text-sm mt-1">
                All tokens will be recorded for {selectedStore.name}
              </p>
            </div>
          </div>
        )}
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-10 items-start">
          {/* Form Card */}
          <form onSubmit={handleSubmit} className="flex-1 bg-white rounded-2xl shadow-2xl p-10 space-y-8 border border-blue-100">
            <h2 className="text-2xl font-bold text-blue-700 mb-4 flex items-center gap-3">
              <FaFileSignature className="w-6 h-6 text-blue-500" /> Generate Token
            </h2>
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-blue-700 mb-1">Name</label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
                <input name="name" value={form.name} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition" placeholder="Enter customer name" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-blue-700 mb-1">Purpose</label>
              <div className="flex gap-3 flex-wrap">
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-blue-700 ${form.purpose === 'GTS' ? 'border-blue-500 bg-blue-50' : 'border-blue-100 bg-white'}`}>
                  <input type="radio" name="purpose" value="GTS" checked={form.purpose === 'GTS'} onChange={handleChange} className="accent-blue-500" /> GTS
                </label>
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-blue-700 ${form.purpose === 'SOLDERING' ? 'border-blue-500 bg-blue-50' : 'border-blue-100 bg-white'}`}>
                  <input type="radio" name="purpose" value="SOLDERING" checked={form.purpose === 'SOLDERING'} onChange={handleChange} className="accent-blue-500" /> Soldering
                </label>
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-blue-700 ${form.purpose === 'CUSTOM' ? 'border-blue-500 bg-blue-50' : 'border-blue-100 bg-white'}`}>
                  <input type="radio" name="purpose" value="CUSTOM" checked={form.purpose === 'CUSTOM'} onChange={handleChange} className="accent-blue-500" /> Custom
                </label>
              </div>
              {form.purpose === 'CUSTOM' && (
                <div className="mt-2 animate-fade-in">
                  <label className="block text-xs font-medium text-blue-500 mb-1">Enter Custom Purpose</label>
                  <div className="relative">
                    <FaEdit className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
                    <input
                      type="text"
                      value={customPurpose}
                      onChange={e => setCustomPurpose(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                      placeholder="Enter custom purpose"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-blue-700 mb-1">Amount (₹)</label>
              <div className="relative">
                <FaRupeeSign className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
                <input name="amount" value={form.amount} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition" type="number" min="0" placeholder="Enter amount in rupees" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl text-lg flex items-center justify-center gap-2 transition shadow-lg">
              {loading ? <span className="animate-spin"><FaFileAlt className="w-5 h-5" /></span> : <FaFileAlt className="w-5 h-5" />} Generate Token
            </button>
          </form>
 
          {/* Token Preview Card */}
          {preview && (
            <div className="flex-1 flex flex-col items-center">
              <h2 className="text-lg font-semibold text-blue-700 mb-2 flex items-center gap-2"><FaFileAlt className="w-5 h-5" /> Token Preview</h2>
              <div id="token-preview" className="border-2 border-blue-600 p-6 w-[350px] bg-white relative rounded-xl shadow-lg" style={{fontFamily: 'monospace'}}>
                <div className="text-center font-bold text-blue-700">SRI GAYATRI ASSAYING CENTRE</div>
                <div className="mt-2 text-blue-900">DETAILS:</div>
                <div className="mt-2 mb-2 text-blue-300">---------------------------------------------------------------------</div>
                <div className="flex justify-between mb-2 text-blue-900">
                  <span>TOKEN NO : {preview.tokenNo}</span>
                  <span>DATE: {preview.date}</span>
                </div>
                <div className="mt-4">
                  <div className="flex mb-1"><span className="w-24 inline-block">NAME</span>: {preview.name}</div>
                  <div className="flex mb-1"><span className="w-24 inline-block">PURPOSE</span>: {preview.purpose}</div>
                  <div className="flex mb-1"><span className="w-24 inline-block">AMOUNT</span>: ₹{preview.amount}</div>
                </div>
              </div>
              <button onClick={handlePrint} className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow flex items-center gap-2"><FaPrint className="w-4 h-4" /> Print</button>
            </div>
          )}
        </div>
        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-[9999] flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-blue-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <FaCheckCircle className="w-5 h-5" /> : <FaExclamationCircle className="w-5 h-5" />}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
 
export default Emptokens;
 