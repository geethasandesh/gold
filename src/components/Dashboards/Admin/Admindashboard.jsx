import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../../firebase';
import Adminheader from './Adminheader';
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
    { id: 'store1', name: 'Store 1' },
    { id: 'store2', name: 'Store 2' }
  ];

  // Fetch employees from Firestore
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
      // Check if email already exists in users collection
      const emailQuery = query(collection(db, 'users'), where('email', '==', employeeData.email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        showNotification('Email already exists', 'error');
        return;
      }
      // Check if mobile already exists
      const mobileQuery = query(collection(db, 'users'), where('mobile', '==', employeeData.mobile));
      const mobileSnapshot = await getDocs(mobileQuery);
      if (!mobileSnapshot.empty) {
        showNotification('Mobile number already exists', 'error');
        return;
      }
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        employeeData.email,
        employeeData.password
      );
      // Create user document in Firestore
      await addDoc(collection(db, 'users'), {
        name: employeeData.name.trim(),
        mobile: employeeData.mobile.trim(),
        email: employeeData.email.trim(),
        role: employeeData.role,
        storeName: employeeData.storeName,
        storeId: selectedStore.id,
        store: selectedStore.id, // Add this line
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
    <div className="space-y-6 p-4">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage stores and employees</p>
      </div>
    </div>
    {/* Store Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {stores.map(store => (
        <div key={store.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 relative">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start mb-2">
    <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">{store.name}</h2>
                <p className="text-gray-600">Manage employees for {store.name}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedStore(store);
                  setEmployeeData(prev => ({ ...prev, storeName: store.name }));
                  setShowAddEmployeeModal(true);
                }}
                className="ml-4 px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-medium shadow"
              >
                Add
              </button>
            </div>
            {/* Employee List */}
            <div className="mt-4">
              {employees.filter(emp => emp.storeId === store.id).length === 0 ? (
                <p className="text-gray-400 text-sm">No employees added yet.</p>
              ) : (
                <ul className="space-y-1">
                  {employees.filter(emp => emp.storeId === store.id).map((emp, idx) => (
                    <li key={emp.email + idx} className="text-gray-800 text-sm pl-2">• {emp.name}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow text-sm"
                onClick={() => {
                  selectStore(store);
                  navigate('/admin/tokens');
                }}
              >Select</button>
            </div>
          </div>
        </div>
      ))}
    </div>
    {/* Add Employee Modal */}
    {showAddEmployeeModal && (
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setShowAddEmployeeModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
          <h3 className="text-xl font-semibold mb-4">Add Employee to {selectedStore?.name}</h3>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={employeeData.name}
                onChange={e => setEmployeeData({ ...employeeData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="Employee Name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={employeeData.mobile}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length <= 10) setEmployeeData({ ...employeeData, mobile: val });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="10-digit mobile number"
                maxLength={10}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={employeeData.email}
                onChange={e => setEmployeeData({ ...employeeData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="Email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={employeeData.password}
                onChange={e => setEmployeeData({ ...employeeData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                placeholder="Set password"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={employeeData.role}
                onChange={e => setEmployeeData({ ...employeeData, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                required
              >
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddEmployeeModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors"
              >
                Add Employee
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    {/* Notification Toast */}
    {notification.show && (
      <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 p-4 rounded-xl shadow-lg transition-all duration-300 z-[9999] ${
        notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}>
        <div className="flex items-center space-x-2 text-white">
          <span>{notification.message}</span>
        </div>
      </div>
    )}
  </div>
  );
}
 
export default Admindashboard;