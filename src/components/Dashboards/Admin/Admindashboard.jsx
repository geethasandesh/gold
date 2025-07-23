import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../../firebase';
import { useStore } from './StoreContext';
import { useNavigate } from 'react-router-dom';

function Admindashboard() {
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [employeeData, setEmployeeData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    role: 'Employee',
    storeName: ''
  });
  const [employees, setEmployees] = useState([]);
  const { selectStore } = useStore();
  const navigate = useNavigate();

  const stores = [
    { id: 'store1', name: 'Store 1', location: 'Dilshuk Nagar', type: 'Traditional Jewelry' },
    { id: 'store2', name: 'Store 2', location: 'Shopping Complex', type: 'Modern Designs' }
  ];

  useEffect(() => {
    const fetchEmployees = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      setEmployees(snapshot.docs.map(doc => doc.data()));
    };
    fetchEmployees();
  }, [notification]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const emailQuery = query(collection(db, 'users'), where('email', '==', employeeData.email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        showNotification('Email already exists', 'error');
        return;
      }

      const mobileQuery = query(collection(db, 'users'), where('mobile', '==', employeeData.mobile));
      const mobileSnapshot = await getDocs(mobileQuery);
      if (!mobileSnapshot.empty) {
        showNotification('Mobile number already exists', 'error');
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        employeeData.email,
        employeeData.password
      );

      await addDoc(collection(db, 'users'), {
        name: employeeData.name.trim(),
        mobile: employeeData.mobile.trim(),
        email: employeeData.email.trim(),
        role: employeeData.role,
        storeName: employeeData.storeName,
        storeId: selectedStore.id,
        createdAt: new Date().toISOString(),
        uid: userCredential.user.uid
      });

      setEmployeeData({
        name: '',
        mobile: '',
        email: '',
        password: '',
        role: 'Employee',
        storeName: ''
      });
      setShowAddEmployeeModal(false);
      showNotification('Employee added successfully', 'success');
    } catch (error) {
      console.error('Error adding employee:', error);
      showNotification(error.message, 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] py-10 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900">
          Gold Shop <span className="text-yellow-500">Management Center</span>
        </h1>
        <p className="mt-2 text-gray-500 text-lg">
          Manage your precious jewelry stores with elegance and precision
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
        {stores.map(store => (
          <div
            key={store.id}
            onClick={() => {
              selectStore(store);
              navigate('/admin/tokens');
            }}
            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition cursor-pointer relative"
          >
            <span className="absolute top-5 right-5 w-3 h-3 bg-green-500 rounded-full"></span>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-yellow-500">{store.name}</h2>
              <p className="text-gray-500 text-sm">{store.location}</p>
              <p className="text-gray-400 text-sm">{store.type}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Team Members</h3>
              {employees.filter(emp => emp.storeId === store.id).length === 0 ? (
                <p className="text-gray-400 text-sm">No employees added yet.</p>
              ) : (
                <div className="space-y-2">
                  {employees.filter(emp => emp.storeId === store.id).map((emp, idx) => (
                    <div key={emp.email + idx} className="bg-gray-50 px-4 py-2 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-400 text-white font-semibold flex items-center justify-center uppercase">
                          {emp.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="text-gray-800 font-medium text-sm">{emp.name}</p>
                          <p className="text-gray-500 text-xs">{emp.role}</p>
                        </div>
                      </div>
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStore(store);
                setEmployeeData(prev => ({ ...prev, storeName: store.name }));
                setShowAddEmployeeModal(true);
              }}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-semibold py-2 rounded-lg shadow mt-4"
            >
              Add Team Member
            </button>
          </div>
        ))}
      </div>

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setShowAddEmployeeModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
            <h3 className="text-xl font-semibold mb-4">Add Employee to {selectedStore?.name}</h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <input type="text" placeholder="Name" required
                className="w-full border px-4 py-2 rounded-lg"
                value={employeeData.name}
                onChange={e => setEmployeeData({ ...employeeData, name: e.target.value })}
              />
              <input type="tel" placeholder="Mobile" required maxLength={10}
                className="w-full border px-4 py-2 rounded-lg"
                value={employeeData.mobile}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length <= 10) setEmployeeData({ ...employeeData, mobile: val });
                }}
              />
              <input type="email" placeholder="Email" required
                className="w-full border px-4 py-2 rounded-lg"
                value={employeeData.email}
                onChange={e => setEmployeeData({ ...employeeData, email: e.target.value })}
              />
              <input type="password" placeholder="Password" required minLength={6}
                className="w-full border px-4 py-2 rounded-lg"
                value={employeeData.password}
                onChange={e => setEmployeeData({ ...employeeData, password: e.target.value })}
              />
              <select
                className="w-full border px-4 py-2 rounded-lg"
                value={employeeData.role}
                onChange={e => setEmployeeData({ ...employeeData, role: e.target.value })}
              >
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
              </select>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAddEmployeeModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 p-4 rounded-xl text-white z-[9999] ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default Admindashboard;