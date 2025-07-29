import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db, auth } from '../../../firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import Employeeheader from './Employeeheader';
import { useStore } from '../Admin/StoreContext';
 
function SaleConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state || {};
 
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [insufficient, setInsufficient] = useState(false);
 
  // State for both local and bank gold/silver
  const [localAvailable, setLocalAvailable] = useState(0);
  const [localRemaining, setLocalRemaining] = useState(0);
  const [bankAvailable, setBankAvailable] = useState(0);
  const [bankRemaining, setBankRemaining] = useState(0);
  
  const { selectedStore } = useStore();
  
  // Navigate to employee dashboard if no store is selected
  useEffect(() => {
    if (!selectedStore) navigate('/employee');
  }, [selectedStore, navigate]);
 
  const localType = data.saleType === 'SILVER' ? 'LOCAL SILVER' : 'LOCAL GOLD';
  const bankType = data.saleType === 'SILVER' ? 'KAMAL SILVER' : 'BANK GOLD';
  const [selectedSource, setSelectedSource] = useState(data.source || localType);
 
  // Labels
  const localLabel = data.saleType === 'SILVER' ? 'Pay from local silver' : 'Pay from local gold';
  const bankLabel = data.saleType === 'SILVER' ? 'Pay from kamal silver' : 'Pay from bank gold';
 
  // Get current employee
  useEffect(() => {
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
 
  // Fetch available stock
  useEffect(() => {
    const fetchAvailable = async () => {
      if (!selectedStore) return;
      
      const reservesCol = data.saleType === 'GOLD' ? 'goldreserves' : 'silverreserves';
      const typeVal = selectedSource === localType ? localType : bankType;
      const q = query(
        collection(db, reservesCol), 
        where('type', '==', typeVal),
        where('storeId', '==', selectedStore.id)
      );
      const snapshot = await getDocs(q);
      let latestTotal = 0;
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (typeof d.totalingms === 'number' && d.totalingms > latestTotal) {
          latestTotal = d.totalingms;
        }
      });
      const weight = parseFloat(data.weight) || 0;
      const rem = latestTotal - weight;
      setInsufficient(rem < 0);
 
      // Notify admin if insufficient
      if (rem < 0) {
        const notifCol = collection(db, 'admin_notifications');
        const notifQ = query(
          notifCol, 
          where('reserveType', '==', typeVal), 
          where('storeId', '==', selectedStore.id),
          where('seen', '==', false)
        );
        const notifSnap = await getDocs(notifQ);
        if (notifSnap.empty) {
          await addDoc(notifCol, {
            reserveType: typeVal,
            storeId: selectedStore.id,
            storeName: selectedStore.name,
            message: `${typeVal} is insufficient for sale in ${selectedStore.name}! Only ${latestTotal}g available.`,
            createdAt: serverTimestamp(),
            seen: false,
            link: reservesCol === 'goldreserves' ? '/admin/gold-reserves' : '/admin/silver-reserves',
          });
        }
      }
    };
    fetchAvailable();
  }, [data.saleType, selectedSource, data.weight, selectedStore]);
 
  // Fetch available cash for selected mode
  useEffect(() => {
    const fetchCash = async () => {
      if (!selectedStore) return;
      
      const mode = data.mode === 'CASH' ? 'LEDGER' : 'ONLINE';
      const q = query(
        collection(db, 'cashreserves'), 
        where('type', '==', mode),
        where('storeId', '==', selectedStore.id)
      );
      const snapshot = await getDocs(q);
      let latest = 0;
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (typeof d.available === 'number' && d.available > latest) {
          latest = d.available;
        }
      });
      // setAvailableCash(latest); // Removed
      // const amt = parseFloat(data.amount) || 0; // Removed
      // setRemainingCash(latest - amt); // Removed
    };
    fetchCash();
  }, [data.mode, data.amount, selectedStore]);
 
  // Fetch both local and bank available/remaining
  useEffect(() => {
    const fetchBoth = async () => {
      if (!selectedStore) return;
      
      const reservesCol = data.saleType === 'GOLD' ? 'goldreserves' : 'silverreserves';
      // Local
      const qLocal = query(
        collection(db, reservesCol), 
        where('type', '==', localType),
        where('storeId', '==', selectedStore.id)
      );
      const snapLocal = await getDocs(qLocal);
      let localTotal = 0;
      snapLocal.forEach(docSnap => {
        const d = docSnap.data();
        if (typeof d.totalingms === 'number' && d.totalingms > localTotal) {
          localTotal = d.totalingms;
        }
      });
      setLocalAvailable(localTotal);
      const weight = parseFloat(data.weight) || 0;
      setLocalRemaining(localTotal - weight);
      // Bank
      const qBank = query(
        collection(db, reservesCol), 
        where('type', '==', bankType),
        where('storeId', '==', selectedStore.id)
      );
      const snapBank = await getDocs(qBank);
      let bankTotal = 0;
      snapBank.forEach(docSnap => {
        const d = docSnap.data();
        if (typeof d.totalingms === 'number' && d.totalingms > bankTotal) {
          bankTotal = d.totalingms;
        }
      });
      setBankAvailable(bankTotal);
      setBankRemaining(bankTotal - weight);
    };
    fetchBoth();
  }, [data.saleType, data.weight, selectedStore]);
 
  // Print functionality
  const handleApprove = async () => {
    if (insufficient) return;
    setLoading(true);
    try {
      // Add to cashreserves if mode is CASH/ONLINE
      const mode = data.mode === 'CASH' ? 'LEDGER' : 'ONLINE';
      const q = query(
        collection(db, 'cashreserves'), 
        where('type', '==', mode),
        where('storeId', '==', selectedStore.id)
      );
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
      const newTotal = current + amt;
      if (docId) {
        await updateDoc(doc(db, 'cashreserves', docId), { available: newTotal });
      } else {
        // If not found, create it
        await addDoc(collection(db, 'cashreserves'), { 
          type: mode, 
          available: newTotal,
          storeId: selectedStore.id,
          storeName: selectedStore.name
        });
      }
      // Log cash movement
      await addDoc(collection(db, 'cashmovements'), {
        date: new Date().toLocaleDateString('en-GB'),
        type: mode,
        change: amt,
        newBalance: newTotal,
        reason: 'sale',
        by: employee,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        createdAt: serverTimestamp(),
      });
      const reservesCol = data.saleType === 'GOLD' ? 'goldreserves' : 'silverreserves';
      const typeVal = selectedSource === localType ? localType : bankType;
      const qReserves = query(
        collection(db, reservesCol), 
        where('type', '==', typeVal),
        where('storeId', '==', selectedStore.id)
      );
      const snapshotReserves = await getDocs(qReserves);
      let latestTotal = 0;
      let latestDocIdReserves = null;
      snapshotReserves.forEach(docSnap => {
        const d = docSnap.data();
        if (typeof d.totalingms === 'number' && d.totalingms > latestTotal) {
          latestTotal = d.totalingms;
          latestDocIdReserves = docSnap.id;
        }
      });
      const weight = parseFloat(data.weight) || 0;
      const newTotalReserves = latestTotal - weight;
      if (latestDocIdReserves) {
        await updateDoc(doc(db, reservesCol, latestDocIdReserves), {
          availableingms: newTotalReserves,
          totalingms: newTotalReserves,
        });
      }
      // Low stock notification logic
      if (newTotalReserves < 10) {
        const notifCol = collection(db, 'admin_notifications');
        const notifQ = query(
          notifCol, 
          where('reserveType', '==', typeVal), 
          where('storeId', '==', selectedStore.id),
          where('seen', '==', false)
        );
        const notifSnap = await getDocs(notifQ);
        if (notifSnap.empty) {
          await addDoc(notifCol, {
            reserveType: typeVal,
            storeId: selectedStore.id,
            storeName: selectedStore.name,
            message: `${typeVal} is low in ${selectedStore.name}: ${newTotalReserves}g remaining!`,
            createdAt: serverTimestamp(),
            seen: false,
            link: reservesCol === 'goldreserves' ? '/admin/gold-reserves' : '/admin/silver-reserves',
          });
        }
      }
      await addDoc(collection(db, 'sales'), {
        ...data,
        source: selectedSource,
        employee,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        date: new Date().toLocaleDateString('en-GB'),
        createdAt: serverTimestamp(),
      });
      setToast({ show: true, message: 'Sale approved and saved!', type: 'success' });
      setTimeout(() => navigate('/employee/sales'), 1500);
    } catch {
      setToast({ show: true, message: 'Error saving sale.', type: 'error' });
    }
    setLoading(false);
  };
 
  const handleDeny = () => {
    if (insufficient) return;
    navigate('/employee/sales');
  };
 
  return (
    <>
      <Employeeheader />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-200 py-8 px-2">
        {/* Store Indicator */}
        {selectedStore && (
          <div className="w-full max-w-lg mb-4">
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 text-center">
              <h3 className="text-lg font-bold text-yellow-800">
                🏪 Working for: <span className="text-yellow-900">{selectedStore.name}</span>
              </h3>
              <p className="text-yellow-700 text-sm mt-1">
                Sale will be recorded for {selectedStore.name}
              </p>
            </div>
          </div>
        )}
        <div className="w-full max-w-lg bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100">
          <h2 className="text-xl font-bold text-yellow-700 mb-4 text-center">Calculation part</h2>
          <div id="sale-receipt" className="border-2 border-black rounded-lg p-6 mb-6 font-mono">
            <div className="mb-2"><b>{data.saleType === 'GOLD' ? 'Gold Sale' : 'Silver Sale'}</b></div>
            <div><b>Name</b>: {data.name}</div>
            <div><b>Weight</b>: {data.weight} gms</div>
            <div><b>Rate</b>: {data.rate}</div>
            <div><b>Amount</b>: {data.amount}</div>
            <div><b>Mode of payment</b>: {data.mode === 'CASH' ? 'Cash' : 'Online'}</div>
            <div><b>Payment Source</b>: {selectedSource}</div>
            <div><b>Employee</b>: {employee}</div>
          </div>
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setSelectedSource(localType)}
              className={`px-6 py-2 font-semibold shadow rounded-lg ${
                selectedSource === localType
                  ? 'bg-sky-400 text-white'
                  : 'bg-white text-sky-700 border border-sky-400'
              }`}
            >
              {localLabel}
            </button>
            <button
              type="button"
              onClick={() => setSelectedSource(bankType)}
              className={`px-6 py-2 font-semibold shadow rounded-lg ${
                selectedSource === bankType
                  ? 'bg-yellow-300 text-black'
                  : 'bg-white text-yellow-700 border border-yellow-400'
              }`}
            >
              {bankLabel}
            </button>
          </div>
          <div className="mb-4 flex gap-12">
            {/* Local gold/silver */}
            <div>
              <div className="mb-2 font-bold">{localLabel}</div>
              <div className="mb-2">Available: <input value={localAvailable} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
              <div className="mb-2">Currently paying: <input value={data.weight} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
              <div className="mb-2">Remaining: <input value={localRemaining} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
            </div>
            {/* Bank gold/silver */}
            <div>
              <div className="mb-2 font-bold">{bankLabel}</div>
              <div className="mb-2">Available: <input value={bankAvailable} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
              <div className="mb-2">Currently paying: <input value={data.weight} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
              <div className="mb-2">Remaining: <input value={bankRemaining} readOnly className="border px-2 py-1 rounded w-24 text-center" /></div>
            </div>
          </div>
          <div className="flex gap-4 justify-center mt-6">
            <button
              onClick={handleApprove}
              disabled={loading || insufficient}
              className={`px-6 py-2 rounded-lg font-semibold shadow text-white ${
                insufficient ? 'bg-green-300 opacity-60 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              Approve
            </button>
            <button
              onClick={handleDeny}
              disabled={loading || insufficient}
              className={`px-6 py-2 rounded-lg font-semibold shadow text-white ${
                insufficient ? 'bg-red-300 opacity-60 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              Deny
            </button>
          </div>
        </div>
        {toast.show && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-[9999] flex items-center gap-2 text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </>
  );
}
 
export default SaleConfirm;
 