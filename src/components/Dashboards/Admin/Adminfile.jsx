import React, { useEffect } from 'react'
import Adminheader from './Adminheader';
import { useStore } from './StoreContext';
import { useNavigate } from 'react-router-dom';

function Adminfile() {
  const { selectedStore } = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (!selectedStore) navigate('/admin');
  }, [selectedStore, navigate]);

  return (
    <>
      <Adminheader />
      <div>
        <div className="w-full text-center mb-4 text-lg font-semibold text-yellow-700">{selectedStore ? `Store: ${selectedStore.name}` : ''}</div>
        {/* Page content here */}
      </div>
    </>
  )
}

export default Adminfile
