import { useState, useEffect } from 'react';
import Employeeheader from './Employeeheader';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../Admin/StoreContext';

function Sales() {
  const [saleType, setSaleType] = useState('GOLD');
  const [form, setForm] = useState({
    name: '',
    weight: '',
    rate: '',
    mode: 'CASH',
  });
  const [amount, setAmount] = useState('');
  const [selectedSource, setSelectedSource] = useState('LOCAL GOLD');
  const navigate = useNavigate();
  
  const { selectedStore } = useStore();
  
  // Navigate to employee dashboard if no store is selected
  useEffect(() => {
    if (!selectedStore) navigate('/employee');
  }, [selectedStore, navigate]);

  // Payment source labels
  const localLabel = saleType === 'SILVER' ? 'Pay from local silver' : 'Pay from local gold';
  const bankLabel = saleType === 'SILVER' ? 'Pay from kamal silver' : 'Pay from bank gold';
  const localSource = saleType === 'SILVER' ? 'LOCAL SILVER' : 'LOCAL GOLD';
  const bankSource = saleType === 'SILVER' ? 'KAMAL SILVER' : 'BANK GOLD';

  useEffect(() => {
    setSelectedSource(localSource);
  }, [saleType]);

  useEffect(() => {
    const weight = parseFloat(form.weight) || 0;
    const rate = parseFloat(form.rate) || 0;
    setAmount(weight && rate ? (weight * rate).toFixed(0) : '');
  }, [form.weight, form.rate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContinue = () => {
    navigate('/employee/sales/confirm', {
      state: {
        ...form,
        saleType,
        amount,
        source: selectedSource,
        storeId: selectedStore?.id,
        storeName: selectedStore?.name,
      },
    });
  };

  const isFormValid = form.name && form.weight && form.rate && form.mode;

  return (
    <>
      <Employeeheader />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-200 py-8 px-2">
        {/* Store Indicator */}
        {selectedStore && (
          <div className="w-full max-w-xl mb-4">
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 text-center">
              <h3 className="text-lg font-bold text-yellow-800">
                🏪 Working for: <span className="text-yellow-900">{selectedStore.name}</span>
              </h3>
              <p className="text-yellow-700 text-sm mt-1">
                All sales will be recorded for {selectedStore.name}
              </p>
            </div>
          </div>
        )}
        <div className="w-full max-w-xl bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100">
          <h2 className="text-xl font-bold text-yellow-700 mb-6 flex items-center gap-2">{saleType === 'GOLD' ? 'Gold Sale' : 'Silver Sale'}</h2>
          <div className="flex gap-4 mb-4">
            <button
              className={`px-4 py-2 rounded border font-bold text-lg ${saleType === 'GOLD' ? 'bg-red-100 text-red-600 border-red-400' : 'bg-white text-black border-gray-300'}`}
              onClick={() => setSaleType('GOLD')}
            >
              GOLD sale
            </button>
            <button
              className={`px-4 py-2 rounded border font-bold text-lg ${saleType === 'SILVER' ? 'bg-red-100 text-red-600 border-red-400' : 'bg-white text-black border-gray-300'}`}
              onClick={() => setSaleType('SILVER')}
            >
              SILVER sale
            </button>
          </div>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400" placeholder="Enter name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (gms)</label>
              <input name="weight" value={form.weight} onChange={handleChange} required type="number" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400" placeholder="Enter weight" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
              <input name="rate" value={form.rate} onChange={handleChange} required type="number" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400" placeholder="Enter rate" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input value={amount} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center font-bold text-lg" placeholder="auto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
              <select name="mode" value={form.mode} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400">
                <option value="CASH">Cash</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div className="flex gap-4 mt-6 justify-center">
              <button
                type="button"
                className={`px-6 py-2 font-semibold shadow rounded-lg ${selectedSource === localSource ? 'bg-sky-400 text-white' : 'bg-white text-sky-700 border border-sky-400'}`}
                onClick={() => setSelectedSource(localSource)}
              >
                {localLabel}
              </button>
              <button
                type="button"
                className={`px-6 py-2 font-semibold shadow rounded-lg ${selectedSource === bankSource ? 'bg-yellow-300 text-black' : 'bg-white text-yellow-700 border border-yellow-400'}`}
                onClick={() => setSelectedSource(bankSource)}
              >
                {bankLabel}
              </button>
            </div>
            <div className="flex gap-4 justify-center mt-8">
              <button
                type="button"
                disabled={!isFormValid}
                className={`px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleContinue}
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default Sales;
