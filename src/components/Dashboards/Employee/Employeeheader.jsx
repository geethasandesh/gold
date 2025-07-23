import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FaCoins, FaExchangeAlt, FaShoppingCart, FaClipboardList, FaChartLine, FaFileAlt, FaChevronDown, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';
 
function stringToInitials(nameOrEmail) {
  if (!nameOrEmail) return 'U';
  const parts = nameOrEmail.split(' ');
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (nameOrEmail.includes('@')) return nameOrEmail[0].toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}
 
function Employeeheader() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
 
  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        setUserEmail(user.email);
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setUserName(userData.name || user.email);
        } else {
          setUserName(user.email);
        }
      }
    };
    fetchUserName();
  }, []);
 
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
 
  return (
    <header className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between py-4 px-4 sm:px-8">
        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
          <Link
            to="/employee"
            className="rounded-xl px-4 py-2 shadow-none flex items-center transition hover:bg-blue-900/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            style={{ textDecoration: 'none' }}
          >
            <MdDashboard className="h-7 w-7 text-yellow-300 mr-2" />
            <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow">Employee Dashboard</span>
          </Link>
        </div>
        <nav className="flex flex-wrap gap-2 sm:gap-4 items-center justify-center">
          <Link to="/employee/tokens" className="flex items-center gap-1 px-3 py-2 rounded-lg text-white hover:bg-blue-900 transition font-medium">
            <FaCoins className="w-5 h-5" />
            Tokens
          </Link>
          <Link to="/employee/exchanges" className="flex items-center gap-1 px-3 py-2 rounded-lg text-white hover:bg-blue-900 transition font-medium">
            <FaExchangeAlt className="w-5 h-5" />
            Exchanges
          </Link>
          <Link to="/employee/purchases" className="flex items-center gap-1 px-3 py-2 rounded-lg text-white hover:bg-blue-900 transition font-medium">
            <FaShoppingCart className="w-5 h-5" />
            Purchases
          </Link>
          <Link to="/employee/order-management" className="flex items-center gap-1 px-3 py-2 rounded-lg text-white hover:bg-blue-900 transition font-medium">
            <FaClipboardList className="w-5 h-5" />
            Orders
          </Link>
          <Link to="/employee/sales" className="flex items-center gap-1 px-3 py-2 rounded-lg text-white hover:bg-blue-900 transition font-medium">
            <FaChartLine className="w-5 h-5" />
            Sales
          </Link>
          <Link to="/employee/test-reports" className="flex items-center gap-1 px-3 py-2 rounded-lg text-white hover:bg-blue-900 transition font-medium">
            <FaFileAlt className="w-5 h-5" />
            Reports
          </Link>
        </nav>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl transition-colors shadow-none hover:bg-blue-900/40"
          >
            <FaUserCircle className="w-8 h-8 text-blue-900 bg-yellow-300 rounded-full border-2 border-blue-300" />
            <FaChevronDown className="h-5 w-5 text-white ml-2" />
          </button>
        </div>
      </div>
 
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 backdrop-blur-sm transition-opacity duration-300" onClick={() => setShowLogoutModal(false)}></div>
          <div className="relative bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 animate-fadeIn">
            <div className="flex flex-col items-center">
              <FaSignOutAlt className="w-12 h-12 text-red-500 mb-2" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
              <p className="text-gray-600 mb-6 text-center">Are you sure you want to logout?</p>
              <div className="flex w-full justify-end space-x-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium shadow"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 640px) {
          nav {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
 
export default Employeeheader;