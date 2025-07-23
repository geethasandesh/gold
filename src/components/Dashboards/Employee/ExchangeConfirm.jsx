import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db, auth } from '../../../firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import Employeeheader from './Employeeheader';

function ExchangeConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state || {};

  const [available, setAvailable] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [insufficient, setInsufficient] = useState(false);

  const localType = data.type === 'SILVER' ? 'LOCAL SILVER' : 'LOCAL GOLD';
  const bankType = data.type === 'SILVER' ? 'KAMAL SILVER' : 'BANK GOLD';

  const [selectedSource, setSelectedSource] = useState(data.source || localType);

  // Labels
  const localLabel = data.type === 'SILVER' ? 'Pay from local silver' : 'Pay from local gold';
  const bankLabel = data.type === 'SILVER' ? 'Pay from kamal silver' : 'Pay from bank gold';
  const metalLabel = data.type === 'SILVER' ? 'silver' : 'gold';
  const availableLabel = selectedSource === localType
    ? localLabel.replace('Pay from ', 'Available ')
    : bankLabel.replace('Pay from ', 'Available ');

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
      const reservesCol = data.type === 'GOLD' ? 'goldreserves' : 'silverreserves';
      const typeVal = selectedSource === localType ? localType : bankType;
      const q = query(collection(db, reservesCol), where('type', '==', typeVal));
      const snapshot = await getDocs(q);
      let latestTotal = 0;
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (typeof d.totalingms === 'number' && d.totalingms > latestTotal) {
          latestTotal = d.totalingms;
        }
      });
      setAvailable(latestTotal);
      const fine = parseFloat(data.fine) || 0;
      const rem = latestTotal - fine;
      setRemaining(rem);
      setInsufficient(rem < 0);

      // Notify admin if insufficient
      if (rem < 0) {
        const notifCol = collection(db, 'admin_notifications');
        const notifQ = query(notifCol, where('reserveType', '==', typeVal), where('seen', '==', false));
        const notifSnap = await getDocs(notifQ);
        if (notifSnap.empty) {
          await addDoc(notifCol, {
            reserveType: typeVal,
            message: `${typeVal} is insufficient for transaction! Only ${latestTotal}g available.`,
            createdAt: serverTimestamp(),
            seen: false,
            link: reservesCol === 'goldreserves' ? '/admin/gold-reserves' : '/admin/silver-reserves',
          });
        }
      }
    };
    fetchAvailable();
  }, [data.type, selectedSource, data.fine]);

  const handleApprove = async () => {
    if (insufficient) return;
    setLoading(true);
    try {
      const reservesCol = data.type === 'GOLD' ? 'goldreserves' : 'silverreserves';
      const typeVal = selectedSource === localType ? localType : bankType;

      const q = query(collection(db, reservesCol), where('type', '==', typeVal));
      const snapshot = await getDocs(q);

      let latestTotal = 0;
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (typeof d.totalingms === 'number' && d.totalingms > latestTotal) {
          latestTotal = d.totalingms;
        }
      });

      const fine = parseFloat(data.fine) || 0;
      const newTotal = latestTotal - fine;

      if (latestDocId) {
        await updateDoc(doc(db, reservesCol, latestDocId), {
          availableingms: newTotal,
          totalingms: newTotal,
        });
      }

      // Low stock notification logic
      if (newTotal < 10) {
        const notifCol = collection(db, 'admin_notifications');
        const notifQ = query(notifCol, where('reserveType', '==', typeVal), where('seen', '==', false));
        const notifSnap = await getDocs(notifQ);
        if (notifSnap.empty) {
          await addDoc(notifCol, {
            reserveType: typeVal,
            message: `${typeVal} is low: ${newTotal}g remaining!`,
            createdAt: serverTimestamp(),
            seen: false,
            link: reservesCol === 'goldreserves' ? '/admin/gold-reserves' : '/admin/silver-reserves',
          });
        }
      }

      await addDoc(collection(db, 'exchanges'), {
        ...data,
        source: selectedSource,
        employee,
        date: new Date().toLocaleDateString('en-GB'),
        createdAt: serverTimestamp(),
      });

      setToast({ show: true, message: 'Transaction approved!', type: 'success' });
      setTimeout(() => navigate('/employee/exchanges'), 1500);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Error approving transaction.', type: 'error' });
    }
    setLoading(false);
  };

  const handleDeny = () => {
    if (insufficient) return;
    navigate('/employee/exchanges');
  };

  return (
    <>
      <Employeeheader />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-200 py-8 px-2">
        <div className="w-full max-w-lg bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100">
          <h2 className="text-xl font-bold text-yellow-700 mb-4 text-center">Calculation part</h2>
          <div className="border-2 border-black rounded-lg p-6 mb-6 font-mono">
            <div className="mb-2"><b>Name</b>: {data.name}</div>
            <div className="mb-2"><b>Weight</b>: {data.weight} gms</div>
            <div className="mb-2"><b>Touch</b>: {data.touch} %</div>
            <div className="mb-2"><b>Less</b>: {data.less} = {data.lessAuto} % auto</div>
            <div className="mb-2"><b>Fine</b>: {data.touch}% * {data.weight} = {data.fine} gms → auto</div>
            <div className="mb-2"><b>Amount</b>: {data.fine} * 0.25 = <b>{data.amount}</b> (rounded)</div>
            <div className="mb-2"><b>Type</b>: {data.type}</div>
            <div className="mb-2"><b>Source</b>: {data.source}</div>
            <div className="mb-2"><b>Employee</b>: {employee}</div>
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

          <div className="mb-4">
            <div className="mb-2"><b>{availableLabel}</b>: <input value={available} readOnly className="border px-2 py-1 rounded w-32 text-center" /></div>
            <div className="mb-2"><b>Currently paying {metalLabel}</b>: <input value={data.fine} readOnly className="border px-2 py-1 rounded w-32 text-center" /></div>
            <div className="mb-2"><b>Remaining {availableLabel.toLowerCase()}</b>: <input value={remaining} readOnly className="border px-2 py-1 rounded w-32 text-center" /></div>
            {insufficient && (
              <div className="text-red-600 font-semibold mt-2">Insufficient balance in {availableLabel.toLowerCase()}!</div>
            )}
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

export default ExchangeConfirm;
