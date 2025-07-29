import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { db, auth } from '../../../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import Employeeheader from './Employeeheader';
import { useStore } from '../Admin/StoreContext';
 
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
  
  const { selectedStore } = useStore();
  
  // Navigate to employee dashboard if no store is selected
  useEffect(() => {
    if (!selectedStore) navigate('/employee');
  }, [selectedStore, navigate]);
 
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
      if (!selectedStore) return;
      
      // Ledger
      const qLedger = query(
        collection(db, 'cashreserves'), 
        where('type', '==', 'LEDGER'),
        where('storeId', '==', selectedStore.id)
      );
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
      const qOnline = query(
        collection(db, 'cashreserves'), 
        where('type', '==', 'ONLINE'),
        where('storeId', '==', selectedStore.id)
      );
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
  }, [data.paymentType, data.cashMode, data.amount, selectedStore]);
 
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
        const newTotal = current - amt;
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
      }
      await addDoc(collection(db, 'purchases'), {
        ...data,
        employee,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Store Indicator */}
          {selectedStore && (
            <div className="mb-4">
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 rounded-xl p-3 text-center shadow-lg">
                <h3 className="text-lg font-bold text-yellow-800">
                  🏪 Working for: <span className="text-yellow-900">{selectedStore.name}</span>
                </h3>
                <p className="text-yellow-700 text-xs mt-1">
                  Purchase will be recorded for {selectedStore.name}
                </p>
              </div>
            </div>
          )}

          {/* Purchase Confirmation Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-yellow-100">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Purchase Confirmation</h2>
                <p className="text-gray-600 text-sm">
                  Review and confirm the purchase details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Purchase Details */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Purchase Details</h3>
                  <div id="purchase-receipt" className="font-mono text-sm space-y-2">
                    <div className="mb-3 p-3 bg-white rounded-lg border border-blue-200">
                      <div className="font-bold text-blue-700 mb-2">
                        {data.mainType === 'GOLD' ? 
                          (data.subType === 'KACHA_GOLD' ? '🥇 Kacha Gold Purchase' : '🥇 Fine Gold Purchase') : 
                          (data.subType === 'KACHA_SILVER' ? '🥈 Kacha Silver Purchase' : '🥈 Fine Silver Purchase')
                        }
                      </div>
                      {renderCalc()}
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold">Payment Type:</span>
                      <span className="text-green-700">{data.paymentType === 'CASH' ? '💵 Available Cash' : '🏦 Out of Accounts'}</span>
                    </div>
                    {data.paymentType === 'CASH' && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Cash Mode:</span>
                        <span className="text-green-700">{data.cashMode === 'PHYSICAL' ? '🏪 Physical' : '💳 Online'}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-semibold">Employee:</span>
                      <span className="text-green-700">{employee}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Cash Availability */}
              <div className="space-y-4">
                {data.paymentType === 'CASH' && (
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Cash Availability</h3>
                    
                    {/* Physical Cash */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🏪</span>
                        <span className="font-semibold text-gray-700">Physical Cash (Ledger)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-white rounded-lg p-2 border border-yellow-200">
                          <div className="text-xs text-gray-500">Available</div>
                          <div className="font-bold text-blue-600">₹{availableCash.toLocaleString()}</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-yellow-200">
                          <div className="text-xs text-gray-500">Paying</div>
                          <div className="font-bold text-red-600">₹{data.amount}</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-yellow-200">
                          <div className="text-xs text-gray-500">Remaining</div>
                          <div className={`font-bold ${remainingCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{remainingCash.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {data.cashMode === 'PHYSICAL' && insufficient && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                          <div className="text-red-700 text-sm font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Insufficient cash in ledger!
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Online Cash */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">💳</span>
                        <span className="font-semibold text-gray-700">Online Cash</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-white rounded-lg p-2 border border-yellow-200">
                          <div className="text-xs text-gray-500">Available</div>
                          <div className="font-bold text-blue-600">₹{availableOnline.toLocaleString()}</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-yellow-200">
                          <div className="text-xs text-gray-500">Paying</div>
                          <div className="font-bold text-red-600">₹{data.amount}</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-yellow-200">
                          <div className="text-xs text-gray-500">Remaining</div>
                          <div className={`font-bold ${remainingOnline >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{remainingOnline.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {data.cashMode === 'ONLINE' && insufficient && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                          <div className="text-red-700 text-sm font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Insufficient cash in online!
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={handlePrint}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transition-all duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print Receipt
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={loading || insufficient}
                      className={`px-6 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                        loading || insufficient
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve Purchase
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleDeny}
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Deny Purchase
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 text-white text-lg font-semibold ${toast.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-pink-600'} animate-fade-in`}>
            {toast.type === 'success' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
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
 
export default PurchaseConfirm;
 