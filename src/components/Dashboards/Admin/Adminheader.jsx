import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc } from 'firebase/firestore';
 
function Adminheader() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
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
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotif((v) => !v)}
              className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-yellow-600 focus:outline-none"
              title="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            {showNotif && notifications.length > 0 && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-black rounded-lg shadow-xl z-50">
                <div className="p-4 border-b font-bold">Notifications</div>
                <ul>
                  {notifications.map((notif) => (
                    <li key={notif.id} className="px-4 py-3 border-b hover:bg-yellow-100 cursor-pointer" onClick={() => handleNotifClick(notif)}>
                      {notif.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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