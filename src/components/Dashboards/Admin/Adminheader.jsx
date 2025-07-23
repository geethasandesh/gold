import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useStore } from './StoreContext';
 
function Adminheader() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { selectedStore } = useStore();
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
 
  // Listen for admin notifications
  useEffect(() => {
    const notifQ = query(collection(db, 'admin_notifications'), where('seen', '==', false));
    const unsub = onSnapshot(notifQ, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);
 
  const handleNotifClick = async (notif) => {
    setShowNotif(false);
    // Mark as seen
    await updateDoc(doc(db, 'admin_notifications', notif.id), { seen: true });
    // Navigate to the relevant reserves page
    navigate(notif.link);
  };
 
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
 
  // Helper to get initials from userName
  const getInitials = (name) => {
    if (!name) return 'A';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };
 
  return (
    <header className="bg-gradient-to-r from-yellow-700 via-yellow-600 to-yellow-500 shadow-lg rounded-b-2xl px-2 sm:px-0">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between py-4 px-4 sm:px-8">
        {/* Logo/Branding and Store */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 select-none">
          <a href="/admin" className="flex items-center space-x-2">
            <div className="text-2xl font-extrabold tracking-tight text-white drop-shadow-lg flex items-center">
              <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent mr-2">&#11044;</span>
              <span className="">Admin Dashboard</span>
            </div>
          </a>
          <div className="text-sm sm:text-base font-semibold text-yellow-100 bg-yellow-800/60 px-3 py-1 rounded-lg shadow border border-yellow-300/30 ml-0 sm:ml-4 mt-1 sm:mt-0">
            {selectedStore ? `Store: ${selectedStore.name}` : 'No Store Selected'}
          </div>
        </div>
        {/* Navigation & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-6 mt-4 sm:mt-0">
          <nav className="flex space-x-1 sm:space-x-4">
            <Link to="/admin/tokens" className="px-3 py-2 rounded-lg font-medium text-white hover:bg-yellow-800/80 transition-colors duration-200">Tokens</Link>
            <Link to="/admin/gold-reserves" className="px-3 py-2 rounded-lg font-medium text-white hover:bg-yellow-800/80 transition-colors duration-200">Gold Reserves</Link>
            <Link to="/admin/silver-reserves" className="px-3 py-2 rounded-lg font-medium text-white hover:bg-yellow-800/80 transition-colors duration-200">Silver Reserves</Link>
            <Link to="/admin/file" className="px-3 py-2 rounded-lg font-medium text-white hover:bg-yellow-800/80 transition-colors duration-200">File</Link>
            <Link to="/admin/reports" className="px-3 py-2 rounded-lg font-medium text-white hover:bg-yellow-800/80 transition-colors duration-200">Reports</Link>
          </nav>
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotif((v) => !v)}
              className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-yellow-600/70 focus:outline-none transition-colors"
              title="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-black rounded-xl shadow-2xl z-50 border border-yellow-200 animate-fade-in">
                <div className="p-4 border-b font-bold text-yellow-800 flex items-center">
                  <svg className="h-5 w-5 mr-2 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  Notifications
                </div>
                <ul className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <li className="px-4 py-3 text-gray-500">No new notifications</li>
                  ) : notifications.map((notif) => (
                    <li key={notif.id} className="px-4 py-3 border-b hover:bg-yellow-100/80 cursor-pointer transition-colors" onClick={() => handleNotifClick(notif)}>
                      {notif.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {/* User/Logout Button */}
          <div className="relative">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-full transition-colors shadow-md focus:outline-none"
            >
              <span className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-800 font-bold text-lg mr-2 border-2 border-yellow-400">
                {getInitials(userName)}
              </span>
              <span className="font-semibold text-white text-base">{userName || 'Admin'}</span>
            </button>
          </div>
        </div>
      </div>
 
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
          <div className="relative bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 border border-yellow-200 animate-fade-in">
            <h3 className="text-xl font-bold text-yellow-800 mb-4 flex items-center">
              <svg className="h-6 w-6 mr-2 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              Confirm Logout
            </h3>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-yellow-700 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors font-medium"
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
      )}
      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease;
        }
      `}</style>
    </header>
  );
}
 
export default Adminheader;