import React, { useState, useEffect } from 'react';
import Adminheader from './Adminheader';
import { db } from '../../../firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { useStore } from './StoreContext';
import { useNavigate } from 'react-router-dom';

function Goldreservers() {
  const [reserveType, setReserveType] = useState('LOCAL GOLD');
  const [available, setAvailable] = useState(0);
  const [addAmount, setAddAmount] = useState('');
  const [total, setTotal] = useState(0);
  const [pendingAdd, setPendingAdd] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const { selectedStore } = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (!selectedStore) navigate('/admin');
  }, [selectedStore, navigate]);

  // Fetch available gold for selected type
  useEffect(() => {
    const fetchAvailable = async () => {
      if (!selectedStore) return;
      const q = query(
        collection(db, 'goldreserves'),
        where('type', '==', reserveType),
        where('storeId', '==', selectedStore.id)
      );
      const snapshot = await getDocs(q);
      let latestTotal = 0;
      let latestAvailable = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (typeof data.totalingms === 'number') {
          if (data.totalingms > latestTotal) {
            latestTotal = data.totalingms;
            latestAvailable = data.availableingms;
          }
        }
      });
      setAvailable(latestTotal);
      setTotal(latestTotal);
    };
    fetchAvailable();
  }, [reserveType, toast, selectedStore]);

  // Update total only when add button is clicked
  useEffect(() => {
    setTotal(available + pendingAdd);
  }, [pendingAdd, available]);

  const handleAdd = () => {
    if (!addAmount || isNaN(addAmount) || Number(addAmount) <= 0) {
      setToast({ show: true, message: 'Enter a valid amount to add.', type: 'error' });
      return;
    }
    setPendingAdd(Number(addAmount));
    setAddAmount('');
  };

  const handleApprove = async () => {
    if (!pendingAdd || isNaN(pendingAdd) || Number(pendingAdd) <= 0) {
      setToast({ show: true, message: 'Add an amount first.', type: 'error' });
      return;
    }
    try {
      // Unique doc id: storeId-type
      const docId = `${selectedStore.id}-${reserveType}`;
      const docRef = doc(db, 'goldreserves', docId);
      // Try to get the existing doc
      const q = query(
        collection(db, 'goldreserves'),
        where('type', '==', reserveType),
        where('storeId', '==', selectedStore.id)
      );
      const snapshot = await getDocs(q);
      let newAvailable = available;
      let newTotal = available + Number(pendingAdd);
      if (!snapshot.empty) {
        // Update existing
        await setDoc(docRef, {
          type: reserveType,
          availableingms: newAvailable,
          addedingms: Number(pendingAdd),
          totalingms: newTotal,
          storeId: selectedStore?.id,
          storeName: selectedStore?.name,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } else {
        // Create new
        await setDoc(docRef, {
          type: reserveType,
          availableingms: 0,
          addedingms: Number(pendingAdd),
          totalingms: Number(pendingAdd),
          storeId: selectedStore?.id,
          storeName: selectedStore?.name,
          createdAt: serverTimestamp(),
        });
      }
      setPendingAdd(0);
      setToast({ show: true, message: 'Gold reserve updated!', type: 'success' });
    } catch {
      setToast({ show: true, message: 'Error updating gold reserve.', type: 'error' });
    }
  };

  // Toast auto-hide
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
        <div className="w-full text-center mb-4 text-lg font-semibold text-yellow-700">{selectedStore ? `Store: ${selectedStore.name}` : ''}</div>
        <div className="w-full max-w-lg bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100">
          <h2 className="text-xl font-bold text-yellow-700 mb-6 text-center">Gold Reserves Management</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Gold Reserves</label>
            <select value={reserveType} onChange={e => setReserveType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400">
              <option value="LOCAL GOLD">LOCAL GOLD</option>
              <option value="BANK GOLD">BANK GOLD</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Available {reserveType} in gms</label>
            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">{available} gms</div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Adding of new {reserveType.toLowerCase()} (in gms)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={addAmount}
                onChange={e => setAddAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder={`Enter amount in gms`}
              />
              <button
                type="button"
                onClick={handleAdd}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold shadow"
              >
                Add
              </button>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Total available {reserveType.toLowerCase()} in gms</label>
            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">{total} gms</div>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleApprove}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow"
            >
              Approve
            </button>
            <button
              onClick={() => { setAddAmount(''); setPendingAdd(0); }}
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

export default Goldreservers;
