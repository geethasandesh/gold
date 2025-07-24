import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../../../firebase';
import { useStore } from './StoreContext';
import { useNavigate } from 'react-router-dom';
import store1Image from '../../../assets/store1.jpg';
import store2Image from '../../../assets/store2.jpg';

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
    { id: 'store1', name: 'Store 1', location: 'Dilshuk Nagar', type: 'Traditional Jewelry', image: store1Image },
    { id: 'store2', name: 'Store 2', location: 'Shopping Complex', type: 'Modern Designs', image: store2Image }
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch {
      showNotification('Error logging out', 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] py-6 px-4 relative">
      <div className={showAddEmployeeModal ? 'blur-md transition duration-300' : ''}>
        {/* Top left */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6">
          <h1 className="text-lg md:text-2xl font-semibold font-sans text-yellow-700">S M D B</h1>
          <div className="h-1 w-12 md:w-21 bg-yellow-500 mt-1 rounded-full"></div>
        </div>

        {/* Top right */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6">
          <button
            onClick={handleLogout}
            className="bg-yellow-500 text-white px-3 py-1 md:px-4 md:py-2 rounded-lg hover:bg-yellow-600 font-semibold text-sm md:text-base"
          >
            Logout
          </button>
        </div>

        <div className="text-center mb-8 md:mb-12 px-2">
          <h1 className="text-2xl md:text-4xl font-semibold font-sans text-gray-900">
            Gold Shop <span className="text-yellow-500">Management Center</span>
          </h1>
          <p className="mt-2 text-gray-500 text-xl  font-sans md:text-lg max-w-xl mx-auto">
            Manage your precious jewelry stores with elegance and precision
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10 max-w-6xl mx-auto w-full px-2">
          {stores.map(store => (
            <div
              key={store.id}
              onClick={() => {
                selectStore(store);
                navigate('/admin/tokens');
              }}
              className="rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-2xl transition cursor-pointer relative border-2 border-yellow-400 bg-white/30 backdrop-blur-md h-[440px] flex flex-col justify-between"
            >
              <div className="relative">
                <img
                  src={store.image}
                  alt={store.name}
                  className="absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16 object-cover rounded-bl-xl shadow-md"
                />
                <div className="mb-3 md:mb-4">
                  <h2 className="text-lg md:text-xl font-bold text-yellow-500">{store.name}</h2>
                  <p className="text-gray-500 text-xs md:text-sm">{store.location}</p>
                  <p className="text-gray-400 text-xs md:text-sm">{store.type}</p>
                </div>
                <div className="mb-3 md:mb-4 flex-1 flex flex-col">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-600 mb-1 md:mb-2">Team Members</h3>
                  {employees.filter(emp => emp.storeId === store.id).length === 0 ? (
                    <p className="text-gray-400 text-xs md:text-sm">No employees added yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {employees.filter(emp => emp.storeId === store.id).map((emp, idx) => (
                        <div
                          key={emp.email + idx}
                          className="bg-gray-50 px-3 py-1.5 md:px-4 md:py-2 rounded-lg flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2 md:space-x-3">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-yellow-400 text-white font-semibold flex items-center justify-center uppercase text-xs md:text-sm">
                              {emp.name?.[0] || 'U'}
                            </div>
                            <div>
                              <p className="text-gray-800 font-medium text-xs md:text-sm">{emp.name}</p>
                              <p className="text-gray-500 text-[10px] md:text-xs">{emp.role}</p>
                            </div>
                          </div>
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStore(store);
                  setEmployeeData(prev => ({ ...prev, storeName: store.name }));
                  setShowAddEmployeeModal(true);
                }}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-semibold py-1.5 md:py-2 rounded-lg shadow mt-3 md:mt-4 text-sm md:text-base"
              >
                Add Team Member
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-4 md:p-6 z-10">
            <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">
              Add Employee to {selectedStore?.name}
            </h3>
            <form onSubmit={handleAddEmployee} className="space-y-3 md:space-y-4">
              <input
                type="text"
                placeholder="Name"
                required
                className="w-full border px-3 py-2 rounded-lg text-sm md:text-base"
                value={employeeData.name}
                onChange={e => setEmployeeData({ ...employeeData, name: e.target.value })}
              />
              <input
                type="tel"
                placeholder="Mobile"
                required
                maxLength={10}
                className="w-full border px-3 py-2 rounded-lg text-sm md:text-base"
                value={employeeData.mobile}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length <= 10) setEmployeeData({ ...employeeData, mobile: val });
                }}
              />
              <input
                type="email"
                placeholder="Email"
                required
                className="w-full border px-3 py-2 rounded-lg text-sm md:text-base"
                value={employeeData.email}
                onChange={e => setEmployeeData({ ...employeeData, email: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                required
                minLength={6}
                className="w-full border px-3 py-2 rounded-lg text-sm md:text-base"
                value={employeeData.password}
                onChange={e => setEmployeeData({ ...employeeData, password: e.target.value })}
              />
              <select
                className="w-full border px-3 py-2 rounded-lg text-sm md:text-base"
                value={employeeData.role}
                onChange={e => setEmployeeData({ ...employeeData, role: e.target.value })}
              >
                <option value="Employee">Employee</option>
               
              </select>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm md:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm md:text-base"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Notification Toast */}
        {notification.show && (
          <div
            className={`fixed top-6 left-1/2 transform -translate-x-1/2 p-3 md:p-4 rounded-xl text-white z-[9999] ${
              notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            } text-sm md:text-base`}
          >
            {notification.message}
          </div>
        )}
    </div>
  );
}

export default Admindashboard;
