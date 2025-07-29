import { useState, useEffect } from 'react';
import Employeeheader from './Employeeheader';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../Admin/StoreContext';

function Exchanges() {
  const [form, setForm] = useState({
    name: '',
    weight: '',
    touch: '',
    less: '',
    type: 'GOLD',
  });

  const [lessAuto, setLessAuto] = useState('');
  const [fineAuto, setFineAuto] = useState('');
  const [amount, setAmount] = useState('');
  const navigate = useNavigate();
  
  const { selectedStore } = useStore();
  
  // Navigate to employee dashboard if no store is selected
  useEffect(() => {
    if (!selectedStore) navigate('/employee');
  }, [selectedStore, navigate]);

  // Determine labels based on type
  const localLabel = form.type === 'SILVER' ? 'Pay from local silver' : 'Pay from local gold';
  const bankLabel = form.type === 'SILVER' ? 'Pay from kamal silver' : 'Pay from bank gold';
  const localSource = form.type === 'SILVER' ? 'LOCAL SILVER' : 'LOCAL GOLD';
  const bankSource = form.type === 'SILVER' ? 'KAMAL SILVER' : 'BANK GOLD';

  const [selectedSource, setSelectedSource] = useState(localSource);

  // Form validation check - different requirements for GOLD vs SILVER
  const isFormValid = form.name && form.weight && form.touch && 
    (form.type === 'GOLD' || (form.type === 'SILVER' && amount));

  useEffect(() => {
    const weight = parseFloat(form.weight) || 0;
    const touch = parseFloat(form.touch) || 0;
    const less = parseFloat(form.less) || 0;

    const lessResult = touch - less;
    setLessAuto(less ? lessResult.toFixed(2) : '');
    const fineResult = (lessResult / 100) * weight;
    setFineAuto(fineResult ? fineResult.toFixed(3) : '');

    // Amount calculation only for SILVER exchange
    if (form.type === 'SILVER') {
      const rawAmount = (fineResult ? fineResult : 0) * 0.25;
      // Round UP to next multiple of 5
      const amt = Math.ceil(rawAmount / 5) * 5;
      setAmount(fineResult ? amt : '');
    } else {
      // For GOLD exchange, no amount calculation
      setAmount('');
    }
  }, [form.weight, form.touch, form.less, form.type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (source) => {
    navigate('/employee/exchanges/confirm', {
      state: {
        ...form,
        lessAuto,
        fine: fineAuto,
        amount,
        source,
        type: form.type,
        storeId: selectedStore?.id,
        storeName: selectedStore?.name,
      },
    });
  };

  const handlePaymentClick = (source) => {
    setSelectedSource(source);
    handleSubmit(source);
  };

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
                All transactions will be recorded for {selectedStore.name}
              </p>
            </div>
          </div>
        )}
        <div className="w-full max-w-xl bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100">
          <h2 className="text-xl font-bold text-yellow-700 mb-6 flex items-center gap-2">
            {form.type === 'GOLD' ? 'Gold Exchange' : 'Silver Exchange'}
          </h2>
          <form className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
              >
                <option value="GOLD">Gold Exchange (No Amount)</option>
                <option value="SILVER">Silver Exchange (With Amount)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (gms)</label>
              <input
                name="weight"
                value={form.weight}
                onChange={handleChange}
                required
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="Enter weight in grams"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Touch (%)</label>
              <input
                name="touch"
                value={form.touch}
                onChange={handleChange}
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="Enter touch percentage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Less</label>
              <input
                name="less"
                value={form.less}
                onChange={handleChange}
                type="number"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="Enter less value"
              />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-gray-700">=</span>
              <input
                value={lessAuto}
                readOnly
                className="w-24 px-2 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center"
                placeholder="auto"
              />
              <span className="text-gray-700">%</span>
              <span className="ml-4">Fine:</span>
              <input
                value={fineAuto}
                readOnly
                className="w-24 px-2 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center"
                placeholder="auto"
              />
              <span className="text-gray-700">gms</span>
            </div>
            {/* Amount field only for SILVER exchange */}
            {form.type === 'SILVER' && (
              <div className="flex gap-2 items-center mt-2">
                <span className="text-gray-700">Amount:</span>
                <input
                  value={amount}
                  readOnly
                  className="w-24 px-2 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center font-bold text-lg"
                  placeholder="auto"
                />
                <span className="text-gray-700 font-bold">(rounded)</span>
              </div>
            )}
            <div className="flex gap-4 mt-6 justify-center">
              <button
                type="button"
                disabled={!isFormValid}
                className={`px-6 py-2 font-semibold shadow rounded-lg ${
                  selectedSource === localSource
                    ? 'bg-sky-400 text-white'
                    : 'bg-white text-sky-700 border border-sky-400'
                } ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handlePaymentClick(localSource)}
              >
                {localLabel}
              </button>
              <button
                type="button"
                disabled={!isFormValid}
                className={`px-6 py-2 font-semibold shadow rounded-lg ${
                  selectedSource === bankSource
                    ? 'bg-yellow-300 text-black'
                    : 'bg-white text-yellow-700 border border-yellow-400'
                } ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handlePaymentClick(bankSource)}
              >
                {bankLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default Exchanges;
