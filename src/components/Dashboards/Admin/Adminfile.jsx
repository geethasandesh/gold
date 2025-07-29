import { useEffect, useState } from 'react';
import Adminheader from './Adminheader';
import { db } from '../../../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useStore } from './StoreContext';
import { useNavigate } from 'react-router-dom';

function Adminfile() {
  const [ledger, setLedger] = useState('');
  const [online, setOnline] = useState('');
  const [tokenAmount, setTokenAmount] = useState(0);
  const [salesAmount, setSalesAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [tokenDetails, setTokenDetails] = useState([]);
  const [salesDetails, setSalesDetails] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const { selectedStore } = useStore();
  const navigate = useNavigate();
  
  // Navigate to admin dashboard if no store is selected
  useEffect(() => {
    if (!selectedStore) navigate('/admin');
  }, [selectedStore, navigate]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!selectedStore) return;
      
      // Fetch cash reserves
      const cashQuery = query(
        collection(db, 'cashreserves'),
        where('storeId', '==', selectedStore.id)
      );
      const cashSnapshot = await getDocs(cashQuery);
      let ledgerVal = '';
      let onlineVal = '';
      cashSnapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.type === 'LEDGER') {
          ledgerVal = d.available;
        } else if (d.type === 'ONLINE') {
          onlineVal = d.available;
        }
      });
      setLedger(ledgerVal);
      setOnline(onlineVal);
      
      // Fetch tokens
      const tokensQuery = query(
        collection(db, 'tokens'),
        where('storeId', '==', selectedStore.id),
        orderBy('createdAt', 'desc')
      );
      const tokensSnapshot = await getDocs(tokensQuery);
      let tokenTotal = 0;
      const tokenData = [];
      tokensSnapshot.forEach(docSnap => {
        const d = docSnap.data();
        const amount = parseFloat(d.amount) || 0;
        tokenTotal += amount;
        tokenData.push({
          id: docSnap.id,
          name: d.name,
          purpose: d.purpose,
          amount: amount,
          date: d.date,
          tokenNo: d.tokenNo
        });
      });
      setTokenAmount(tokenTotal);
      setTokenDetails(tokenData);
      
      // Fetch sales
      const salesQuery = query(
        collection(db, 'sales'),
        where('storeId', '==', selectedStore.id),
        orderBy('createdAt', 'desc')
      );
      const salesSnapshot = await getDocs(salesQuery);
      let salesTotal = 0;
      const salesData = [];
      salesSnapshot.forEach(docSnap => {
        const d = docSnap.data();
        const amount = parseFloat(d.amount) || 0;
        salesTotal += amount;
        salesData.push({
          id: docSnap.id,
          name: d.name,
          weight: d.weight,
          rate: d.rate,
          amount: amount,
          date: d.date,
          saleType: d.saleType,
          source: d.source
        });
      });
      setSalesAmount(salesTotal);
      setSalesDetails(salesData);
      
      // Calculate total
      const total = parseFloat(ledgerVal || 0) + parseFloat(onlineVal || 0) + tokenTotal + salesTotal;
      setTotalAmount(total);
    };
    fetchAllData();
  }, [selectedStore]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <>
      <Adminheader />
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fffcf5] py-8 px-2">
        {/* Store Indicator */}
        {selectedStore && (
          <div className="w-full max-w-4xl mb-4">
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 text-center">
              <h3 className="text-lg font-bold text-yellow-800">
                🏪 Viewing: <span className="text-yellow-900">{selectedStore.name}</span>
              </h3>
              <p className="text-yellow-700 text-sm mt-1">
                Financial overview for {selectedStore.name}
              </p>
            </div>
          </div>
        )}
        
        <div className="w-full max-w-4xl bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100">
          <h2 className="text-xl font-bold text-yellow-700 mb-6 text-center">Financial Management</h2>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                activeTab === 'overview'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                activeTab === 'tokens'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tokens
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                activeTab === 'sales'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sales
            </button>
          </div>
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-blue-800 mb-2">Cash Reserves</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ledger:</span>
                      <span className="font-semibold">₹{ledger || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Online:</span>
                      <span className="font-semibold">₹{online || 0}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-blue-800">
                        <span>Total Cash:</span>
                        <span>₹{parseFloat(ledger || 0) + parseFloat(online || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-bold text-green-800 mb-2">Revenue Sources</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tokens:</span>
                      <span className="font-semibold">₹{tokenAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sales:</span>
                      <span className="font-semibold">₹{salesAmount}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-green-800">
                        <span>Total Revenue:</span>
                        <span>₹{tokenAmount + salesAmount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-bold text-yellow-800 mb-2">Total Financial Overview</h3>
                <div className="text-2xl font-bold text-yellow-900 text-center">
                  ₹{totalAmount}
                </div>
                <p className="text-sm text-yellow-700 text-center mt-1">
                  Total (Cash + Tokens + Sales)
                </p>
              </div>
            </div>
          )}
          
          {/* Tokens Tab */}
          {activeTab === 'tokens' && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-bold text-green-800 mb-2">Token Revenue Summary</h3>
                <div className="text-xl font-bold text-green-900">₹{tokenAmount}</div>
                <p className="text-sm text-green-700">Total from {tokenDetails.length} tokens</p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left">Token No</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Name</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Purpose</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Amount</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenDetails.map((token) => (
                      <tr key={token.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{token.tokenNo}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.purpose}</td>
                        <td className="border border-gray-300 px-3 py-2 font-semibold">₹{token.amount}</td>
                        <td className="border border-gray-300 px-3 py-2">{token.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-800 mb-2">Sales Revenue Summary</h3>
                <div className="text-xl font-bold text-blue-900">₹{salesAmount}</div>
                <p className="text-sm text-blue-700">Total from {salesDetails.length} sales</p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left">Name</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Type</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Weight</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Rate</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Amount</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Source</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesDetails.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2">{sale.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.saleType}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.weight}g</td>
                        <td className="border border-gray-300 px-3 py-2">₹{sale.rate}</td>
                        <td className="border border-gray-300 px-3 py-2 font-semibold">₹{sale.amount}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.source}</td>
                        <td className="border border-gray-300 px-3 py-2">{sale.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
