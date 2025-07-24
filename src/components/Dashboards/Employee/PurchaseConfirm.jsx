import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { db, auth } from '../../../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import Employeeheader from './Employeeheader';
 
function PurchaseConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state || {};
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [employee, setEmployee] = useState('');
  const [availableCash, setAvailableCash] = useState(0);
  const [remainingCash, setRemainingCash] = useState(0);
  const [insufficient, setInsufficient] = useState(false);
  // Add for online
  const [availableOnline, setAvailableOnline] = useState(0);
  const [remainingOnline, setRemainingOnline] = useState(0);
 
  // Fetch employee name
  useState(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          setEmployee(userData.name || user.email);
        }
      }
    };
    fetchUser();
  }, []);
 
  // Fetch available cash for both ledger and online
  useEffect(() => {
    const fetchBoth = async () => {
      // Ledger
      const qLedger = query(collection(db, 'cashreserves'), where('type', '==', 'LEDGER'));
      const snapLedger = await getDocs(qLedger);
      let ledger = 0;
      snapLedger.forEach(docSnap => {
        const d = docSnap.data();
        if (typeof d.available === 'number' && d.available > ledger) {
          ledger = d.available;
        }
      });
      setAvailableCash(ledger);
      const amt = parseFloat(data.amount) || 0;
      setRemainingCash(ledger - amt);
      // Online
      const qOnline = query(collection(db, 'cashreserves'), where('type', '==', 'ONLINE'));
      const snapOnline = await getDocs(qOnline);
      let online = 0;
      snapOnline.forEach(docSnap => {
        const d = docSnap.data();
        if (typeof d.available === 'number' && d.available > online) {
          online = d.available;
        }
      });
      setAvailableOnline(online);
      setRemainingOnline(online - amt);
      // Insufficient only for selected mode
      if (data.paymentType === 'CASH') {
        if (data.cashMode === 'PHYSICAL') {
          setInsufficient((ledger - amt) < 0);
        } else {
          setInsufficient((online - amt) < 0);
        }
      }
    };
    fetchBoth();
  }, [data.paymentType, data.cashMode, data.amount]);
 
  const handleApprove = async () => {
    if (insufficient) return;
    setLoading(true);
    try {
      // Deduct from cashreserves if paymentType is CASH
      let mode = null;
      if (data.paymentType === 'CASH') {
        mode = data.cashMode === 'PHYSICAL' ? 'LEDGER' : 'ONLINE';
      }
      if (mode) {
        const q = query(collection(db, 'cashreserves'), where('type', '==', mode));
        const snapshot = await getDocs(q);
        let docId = null;
        let current = 0;
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          if (typeof d.available === 'number' && d.available > current) {
            current = d.available;
            docId = docSnap.id;
          }
        });
        const amt = parseFloat(data.amount) || 0;
        const newTotal = current - amt;
        if (docId) {
          await updateDoc(doc(db, 'cashreserves', docId), { available: newTotal });
        } else {
          // If not found, create it
          await addDoc(collection(db, 'cashreserves'), { type: mode, available: newTotal });
        }
      }
      await addDoc(collection(db, 'purchases'), {
        ...data,
        employee,
        date: new Date().toLocaleDateString('en-GB'),
        createdAt: serverTimestamp(),
      });
      setToast({ show: true, message: 'Purchase approved and saved!', type: 'success' });
      setTimeout(() => navigate('/employee/purchases'), 1500);
    } catch {
      setToast({ show: true, message: 'Error saving purchase.', type: 'error' });
    }
    setLoading(false);
  };
 
  const handleDeny = () => {
    navigate('/employee/purchases');
  };
 
  // Print functionality
  const handlePrint = () => {
    const printContents = document.getElementById('purchase-receipt').innerHTML;
    const win = window.open('', '', 'height=600,width=500');
    win.document.write('<html><head><title>Purchase Receipt</title>');
    win.document.write('<style>body{font-family:monospace;} .border-black{border:2px solid #000;padding:24px;width:400px;margin:auto;}</style>');
    win.document.write('</head><body >');
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };
 
  // Calculation part rendering
  const renderCalc = () => {
    if (data.subType === 'KACHA_GOLD' || data.subType === 'KACHA_SILVER') {
      return (
        <>
          <div><b>Name</b>: {data.name}</div>
          <div><b>Weight</b>: {data.weight} gms</div>
          <div><b>Touch</b>: {data.touch} %</div>
          <div><b>Less</b>: {data.less} = {data.lessAuto} % auto</div>
          <div><b>Fine</b>: {data.lessAuto}% * {data.weight} = {data.fine} gms → auto</div>
          <div><b>Rate</b>: {data.rate}</div>
          <div><b>Amount</b>: {data.fine} * {data.rate} = <b>{data.amount}</b> ← auto</div>
        </>
      );
    } else if (data.subType === 'FINE_GOLD' || data.subType === 'FINE_SILVER') {
      return (
        <>
          <div><b>Name</b>: {data.name}</div>
          <div><b>Weight</b>: {data.weight} gms</div>
          <div><b>Rate</b>: {data.rate}</div>
          <div><b>Amount</b>: {data.weight} * {data.rate} = <b>{data.amount}</b> ← auto</div>
        </>
      );
    }
    return null;
  };
 
  return (
    <>
      <Employeeheader />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-200 py-8 px-2">
        <div className="w-full max-w-lg bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100">
          <h2 className="text-xl font-bold text-yellow-700 mb-4 text-center">Calculation part</h2>
          <div id="purchase-receipt" className="border-2 border-black rounded-lg p-6 mb-6 font-mono">
            <div className="mb-2"><b>{data.mainType === 'GOLD' ? (data.subType === 'KACHA_GOLD' ? 'Kacha gold purchase' : 'Fine gold purchase') : (data.subType === 'KACHA_SILVER' ? 'Kacha silver purchase' : 'Fine silver purchase')}</b></div>
            {renderCalc()}
            {data.paymentType === 'CASH' && (
              <div className="mb-4 flex gap-12">
                {/* Ledger */}
                <div>
                  <div className="mb-2 font-bold">Available cash in ledger</div>
                  <div className="mb-2">Available: <input value={availableCash} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
                  <div className="mb-2">Currently paying cash: <input value={data.amount} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
                  <div className="mb-2">Remaining available cash: <input value={remainingCash} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
                  {data.cashMode === 'PHYSICAL' && insufficient && (
                    <div className="text-red-600 font-semibold mt-2">Insufficient cash in ledger!</div>
                  )}
                </div>
                {/* Online */}
                <div>
                  <div className="mb-2 font-bold">Available cash in online</div>
                  <div className="mb-2">Available: <input value={availableOnline} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
                  <div className="mb-2">Currently paying cash in online: <input value={data.amount} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
                  <div className="mb-2">Remaining available cash in online: <input value={remainingOnline} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
                  {data.cashMode === 'ONLINE' && insufficient && (
                    <div className="text-red-600 font-semibold mt-2">Insufficient cash in online!</div>
                  )}
                </div>
              </div>
            )}
            <div><b>Payment Type</b>: {data.paymentType === 'CASH' ? 'Available cash' : 'Out of accounts'}</div>
            {data.paymentType === 'CASH' && <div><b>Cash Mode</b>: {data.cashMode}</div>}
            <div><b>Employee</b>: {employee}</div>
          </div>
          <div className="flex gap-4 justify-center mb-4">
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium shadow flex items-center gap-2"
            >
              Print Receipt
            </button>
          </div>
          <div className="flex gap-4 justify-center mt-6">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow"
            >
              Approve
            </button>
            <button
              onClick={handleDeny}
              disabled={loading}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow"
            >
              Deny
            </button>
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
 
export default PurchaseConfirm;
 