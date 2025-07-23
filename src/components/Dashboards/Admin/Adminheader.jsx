import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
 
function Adminheader() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();
 
  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setUserName(userData.name || user.email);
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
    <header className="bg-yellow-700 text-white shadow-md">
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        <a href="/admin">
          <div className="text-xl font-bold">Admin Dashboard</div>
        </a>
        <div className="flex items-center space-x-4">
          <nav className="space-x-4">
            
            <Link to="/admin/tokens" className="hover:underline">Tokens</Link>
            <Link to="/admin/gold-reserves" className="hover:underline">Gold Reserves</Link>
            <Link to="/admin/silver-reserves" className="hover:underline">Silver Reserves</Link>
            <Link to="/admin/file" className="hover:underline">File</Link>
            <Link to="/admin/reports" className="hover:underline">Reports</Link>


          </nav>
          <div className="relative">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span>{userName || 'Admin'}</span>
            </button>
          </div>
        </div>
      </div>
 
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setShowLogoutModal(false)}></div>
          <div className="relative bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
 
export default Adminheader;