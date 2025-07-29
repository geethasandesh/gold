import { useState, useEffect } from 'react';
import Employeeheader from './Employeeheader';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../Admin/StoreContext';

const purchaseTypes = [
  {
    value: 'GOLD',
    label: 'Gold purchase',
    sub: [
      { value: 'KACHA_GOLD', label: 'Kacha gold purchase' },
      { value: 'FINE_GOLD', label: 'Fine gold purchase' },
    ],
  },
  {
    value: 'SILVER',
    label: 'Silver purchase',
    sub: [
      { value: 'KACHA_SILVER', label: 'Kacha silver purchase' },
      { value: 'FINE_SILVER', label: 'Fine silver purchase' },
    ],
  },
];

function Purchases() {
  const [mainType, setMainType] = useState('GOLD');
  const [subType, setSubType] = useState('KACHA_GOLD');
  const [form, setForm] = useState({
    name: '',
    weight: '',
    touch: '',
    less: '',
    rate: '',
  });
  const [lessAuto, setLessAuto] = useState('');
  const [fineAuto, setFineAuto] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('CASH');
  const [cashMode, setCashMode] = useState('PHYSICAL');
  const navigate = useNavigate();
  
  const { selectedStore } = useStore();
  
  // Navigate to employee dashboard if no store is selected
  useEffect(() => {
    if (!selectedStore) navigate('/employee');
  }, [selectedStore, navigate]);

  useEffect(() => {
    if (mainType === 'GOLD') setSubType('KACHA_GOLD');
    else setSubType('KACHA_SILVER');
  }, [mainType]);

  useEffect(() => {
    const weight = parseFloat(form.weight) || 0;
    const touch = parseFloat(form.touch) || 0;
    const less = parseFloat(form.less) || 0;
    const rate = parseFloat(form.rate) || 0;

    let lessResult = '';
    let fineResult = '';
    let amt = '';

    if (subType === 'KACHA_GOLD' || subType === 'KACHA_SILVER') {
      lessResult = touch - less;
      fineResult = (lessResult / 100) * weight;
      amt = fineResult && rate ? (fineResult * rate).toFixed(0) : '';
    } else {
      fineResult = weight;
      amt = weight && rate ? (weight * rate).toFixed(0) : '';
    }

    setLessAuto(lessResult ? lessResult.toFixed(2) : '');
    setFineAuto(fineResult ? fineResult.toFixed(3) : '');
    setAmount(amt);
  }, [form, subType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    navigate('/employee/purchases/confirm', {
      state: {
        ...form,
        mainType,
        subType,
        lessAuto,
        fine: fineAuto,
        amount,
        paymentType,
        cashMode,
        storeId: selectedStore?.id,
        storeName: selectedStore?.name,
      },
    });
  };

  const isFormValid =
    form.name &&
    form.weight &&
    (subType.includes('FINE') || (form.touch && form.less)) &&
    form.rate;

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
                All purchases will be recorded for {selectedStore.name}
              </p>
            </div>
          </div>
        )}
        <div className="w-full max-w-xl bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100">
          <h2 className="text-xl font-bold text-yellow-700 mb-6">Purchases</h2>

          {/* Dropdown for main type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Type</label>
            <select
              value={mainType}
              onChange={(e) => setMainType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
            >
              {purchaseTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown for sub type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sub Type</label>
            <select
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
            >
              {purchaseTypes
                .find((type) => type.value === mainType)
                ?.sub.map((sub) => (
                  <option key={sub.value} value={sub.value}>
                    {sub.label}
                  </option>
                ))}
            </select>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="Enter name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (gms)</label>
              <input
                name="weight"
                type="number"
                value={form.weight}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="Enter weight"
              />
            </div>

            {subType.includes('KACHA') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Touch (%)</label>
                  <input
                    name="touch"
                    type="number"
                    value={form.touch}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                    placeholder="Enter touch"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Less</label>
                  <input
                    name="less"
                    type="number"
                    value={form.less}
                    onChange={handleChange}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                    placeholder="Enter less"
                  />
                  <span>=</span>
                  <input
                    value={lessAuto}
                    readOnly
                    className="w-24 px-2 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center"
                    placeholder="auto"
                  />
                  <span>%</span>
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fine</label>
              <input
                value={fineAuto}
                readOnly
                className="w-32 px-2 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center"
                placeholder="auto"
              />
              <span>Rate</span>
              <input
                name="rate"
                type="number"
                value={form.rate}
                onChange={handleChange}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="Enter rate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                value={amount}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center font-bold text-lg"
              />
            </div>

            {/* Payment Buttons */}
            <div className="flex gap-4 mt-6 justify-center">
              <button
                type="button"
                className={`px-6 py-2 font-semibold shadow rounded-lg ${
                  paymentType === 'CASH'
                    ? 'bg-sky-400 text-white'
                    : 'bg-white text-sky-700 border border-sky-400'
                }`}
                onClick={() => setPaymentType('CASH')}
              >
                Pay from available cash
              </button>
              <button
                type="button"
                className={`px-6 py-2 font-semibold shadow rounded-lg ${
                  paymentType === 'ACCOUNTS'
                    ? 'bg-yellow-300 text-black'
                    : 'bg-white text-yellow-700 border border-yellow-400'
                }`}
                onClick={() => setPaymentType('ACCOUNTS')}
              >
                Pay from out of accounts
              </button>
            </div>

            {/* Cash mode toggle */}
            {paymentType === 'CASH' && (
              <div className="flex gap-4 mt-4 justify-center">
                <button
                  type="button"
                  className={`px-6 py-2 font-semibold shadow rounded-lg ${
                    cashMode === 'PHYSICAL'
                      ? 'bg-sky-600 text-white'
                      : 'bg-white text-sky-700 border border-sky-600'
                  }`}
                  onClick={() => setCashMode('PHYSICAL')}
                >
                  Physical Mode
                </button>
                <button
                  type="button"
                  className={`px-6 py-2 font-semibold shadow rounded-lg ${
                    cashMode === 'ONLINE'
                      ? 'bg-sky-600 text-white'
                      : 'bg-white text-sky-700 border border-sky-600'
                  }`}
                  onClick={() => setCashMode('ONLINE')}
                >
                  Online Mode
                </button>
              </div>
            )}

            <div className="flex gap-4 justify-center mt-8">
              <button
                type="button"
                disabled={!isFormValid}
                className={`px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow ${
                  !isFormValid ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={handleSubmit}
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

export default Purchases;
