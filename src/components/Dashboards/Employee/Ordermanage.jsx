import React, { useState, useEffect } from 'react';
import Employeeheader from './Employeeheader';
import { FaPlus, FaTrash, FaWhatsapp, FaTimes, FaEdit, FaSave, FaEye } from 'react-icons/fa';
import { db } from '../../../firebase';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useStore } from '../Admin/StoreContext';
 
const ORNAMENT_TYPES = [
  'Necklace',
  'Earrings',
  'Ring',
  'Bangles',
  'Bracelet',
  'Pendant',
  'Chain',
  'Anklet',
  'Nose Pin',
  'Other',
];

const ORDER_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'Work in Progress',
  DELAYED: 'Work in Delay',
  COMPLETED: 'Work Completed'
};

const ITEM_STATUS = {
  WITH_WORKER: 'Items with Worker',
  WITH_DEPARTMENT: 'Items with Department',
  DELIVERED: 'Items delivered to customer'
};
 
// Helper to generate the next available order ID in ascending order
function getNextOrderId(orders) {
  // Extract all numeric parts of order IDs
  const nums = orders
    .map(o => parseInt((o.orderId || '').replace('ORD-', ''), 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return 'ORD-' + String(max + 1).padStart(5, '0');
}
 
function Ordermanage() {
  const { selectedStore } = useStore();
  const [orders, setOrders] = useState([
    {
      orderId: 'ORD-00001',
      orderType: '', // 'GROUP' | 'INDIVIDUAL'
      customer: { name: '', contact: '', address: '' },
      subQuantity: '',
      totalWeight: '',
      advance: '', // amount in ₹ (if advanceType === 'AMOUNT')
      advanceType: 'AMOUNT', // 'AMOUNT' | 'GOLD'
      advanceGoldGms: '', // if advanceType === 'GOLD'
      advanceGoldRate: '', // if advanceType === 'GOLD'
      advanceAmountRate: '', // if advanceType === 'AMOUNT'
      requestedDeliveryDate: '',
      orderWeightage: '', // number of items
      orderPeopleContact: '', // Contact number for order people
      items: [
        { 
          sno: 1,
          ornamentType: 'Necklace', 
          weight: '', 
          advance: '', 
          customerNotes: '',
          photo: null,
          status: ORDER_STATUS.PENDING,
          itemStatus: ITEM_STATUS.WITH_WORKER,
          notes: '',
          isSubmitted: false,
          dailyPlan: { 1: { status: 'NA', note: '' } }
        },
      ],
      orderStatus: ORDER_STATUS.PENDING,
      isPlaced: false,
      dailyPlan: { 1: { status: 'NA', note: '' } }
    },
  ]);

  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [maxOrderId, setMaxOrderId] = useState(1); // Track highest order ID from database
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Fetch highest order ID from database on mount
  useEffect(() => {
    const fetchMaxOrderId = async () => {
      if (!selectedStore) return;
      
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('storeId', '==', selectedStore.id));
        const snapshot = await getDocs(q);
        
        let maxId = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          const num = parseInt((data.orderId || '').replace('ORD-', ''), 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        });
        
        // Set maxOrderId to the next available ID
        const nextId = maxId + 1;
        setMaxOrderId(nextId);
        
        // Update the initial order's ID to be the next available
        setOrders((prev) => {
          const newOrderId = 'ORD-' + String(nextId).padStart(5, '0');
          return prev.map((order, idx) => 
            idx === 0 && order.orderId === 'ORD-00001' 
              ? { ...order, orderId: newOrderId }
              : order
          );
        });
      } catch (error) {
        console.error('Error fetching max order ID:', error);
      }
    };
    
    fetchMaxOrderId();
  }, [selectedStore]);

  // Filtered orders based on search
  const filteredOrders = orders.filter(order => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    return (
      order.orderId.toLowerCase().includes(s) ||
      (order.customer.name && order.customer.name.toLowerCase().includes(s)) ||
      (order.customer.contact && order.customer.contact.toLowerCase().includes(s))
    );
  });

  // Adjust activeTab to always be in range of filteredOrders
  React.useEffect(() => {
    if (activeTab >= filteredOrders.length) setActiveTab(0);
  }, [filteredOrders.length]);

  // Fetch all orders from database
  const fetchAllOrders = async () => {
    if (!selectedStore) {
      alert('Please select a store first');
      return;
    }

    setIsLoadingOrders(true);
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('storeId', '==', selectedStore.id));
      const snapshot = await getDocs(q);
      
      const fetchedOrders = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Mark orders loaded from database to show workflow
        fetchedOrders.push({ ...data, isLoadedFromDb: true });
      });
      
      if (fetchedOrders.length > 0) {
        setOrders(fetchedOrders);
        setActiveTab(0);
      } else {
        alert('No orders found in the database for this store.');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to fetch orders from database');
    } finally {
      setIsLoadingOrders(false);
    }
  };
 
  // Persist an order to Firestore (upsert)
  const saveOrderToDb = async (order) => {
    try {
      if (!order?.orderId || !selectedStore) return;
      
      // If this is the first save of a new order, increment maxOrderId
      if (order.isUnsaved) {
        const orderNum = parseInt(order.orderId.replace('ORD-', ''), 10);
        if (orderNum > maxOrderId) {
          setMaxOrderId(orderNum);
        }
      }
      
      const ref = doc(db, 'orders', order.orderId);
      const payload = {
        ...order,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        updatedAt: serverTimestamp(),
        isUnsaved: false // Mark as saved
      };
      if (!order.createdAt) payload.createdAt = serverTimestamp();
      await setDoc(ref, payload, { merge: true });
      
      // Update local state to remove isUnsaved flag
      setOrders((prev) => 
        prev.map((o) => 
          o.orderId === order.orderId 
            ? { ...o, isUnsaved: false } 
            : o
        )
      );
    } catch (e) {
      console.error('Failed to save order', e);
      throw e;
    }
  };

  // Update order by index in filteredOrders
  const updateOrder = (filteredIdx, newOrder) => {
    const orderId = filteredOrders[filteredIdx]?.orderId;
    setOrders((prev) => {
      const mergedList = prev.map((o) => (o.orderId === orderId ? { ...o, ...newOrder } : o));
      return mergedList;
    });
    // Don't auto-save - user must click "Save to Database" button
  };
 
  const currentOrder = filteredOrders[activeTab] || {};
  // Ensure Day 1 exists by default
  React.useEffect(() => {
    if (!currentOrder || !currentOrder.orderId) return;
    const hasPlan = currentOrder.dailyPlan && Object.keys(currentOrder.dailyPlan).length > 0;
    if (!hasPlan) {
      updateOrder(activeTab, { dailyPlan: { 1: { status: 'NA', note: '' } } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentOrder.orderId]);

  const handleCustomerChange = (field, value) => {
    updateOrder(activeTab, { 
      customer: { ...currentOrder.customer, [field]: value } 
    });
  };

  const handleOrderFieldChange = (field, value) => {
    updateOrder(activeTab, { [field]: value });
  };

  // Adjust items rows to match order quantity
  const adjustItemsCount = (count) => {
    const desired = Math.max(0, parseInt(count || '0', 10));
    let newItems = [...(currentOrder.items || [])];
    if (desired > newItems.length) {
      const toAdd = desired - newItems.length;
      for (let i = 0; i < toAdd; i++) {
        newItems.push({
          sno: newItems.length + 1,
          ornamentType: 'Necklace',
          weight: '',
          advance: '',
          customerNotes: '',
          photo: null,
          status: ORDER_STATUS.PENDING,
          itemStatus: ITEM_STATUS.WITH_WORKER,
          notes: '',
          isSubmitted: false,
          dailyPlan: { 1: { status: 'NA', note: '' } }
        });
      }
    } else if (desired < newItems.length) {
      newItems = newItems.slice(0, desired).map((it, idx) => ({ ...it, sno: idx + 1 }));
    }
    updateOrder(activeTab, { items: newItems, orderWeightage: count });
  };

  const handleItemChange = (idx, field, value) => {
    const newItems = currentOrder.items.map((item, i) => 
      i === idx ? { ...item, [field]: value } : item
    );
    updateOrder(activeTab, { items: newItems });
  };

  // Add a day row manually (+ button)
  const addWorkflowDay = () => {
    const plan = { ...(currentOrder.dailyPlan || {}) };
    const keys = Object.keys(plan).map(k => Number(k)).sort((a,b)=>a-b);
    const next = (keys[keys.length - 1] || 0) + 1;
    plan[next] = { status: 'NA', note: '' };
    updateOrder(activeTab, { dailyPlan: plan });
  };

  // Remove a specific workflow day
  const removeWorkflowDay = (dayNum) => {
    // Don't allow removing Day 1
    if (dayNum === 1) {
      alert('Day 1 cannot be removed');
      return;
    }
    const plan = { ...(currentOrder.dailyPlan || {}) };
    delete plan[dayNum];
    updateOrder(activeTab, { dailyPlan: plan });
  };
  const getDayOptions = (d, dailyPlan, orderType = null) => {
    // Helper function to check if order has been forwarded in any previous day
    const isOrderForwarded = (currentDay) => {
      for (let i = 1; i < currentDay; i++) {
        if (dailyPlan?.[i]?.status === 'FORWARDED') {
          return true;
        }
      }
      return false;
    };

    // Helper function to check if order has been placed in any previous day
    const isOrderPlaced = (currentDay) => {
      for (let i = 1; i < currentDay; i++) {
        if (dailyPlan?.[i]?.status === 'PLACED') {
          return true;
        }
      }
      return false;
    };

    // For Day 1, always show forward/not forward options
    if (d === 1) {
      return [
        { value: 'FORWARDED', label: 'Order forwarded to Department' },
        { value: 'NOT_FORWARDED', label: 'Not forwarded' },
        { value: 'CUSTOM', label: 'Custom…' }
      ];
    }
    
    // For Day 2 onwards, check if order has been forwarded
    if (d >= 2) {
      // If order hasn't been forwarded yet, keep showing forward/not forward options
      if (!isOrderForwarded(d)) {
        return [
          { value: 'FORWARDED', label: 'Order forwarded to Department' },
          { value: 'NOT_FORWARDED', label: 'Not forwarded' },
          { value: 'CUSTOM', label: 'Custom…' }
        ];
      }
      
      // If order has been forwarded but not placed yet, show placed/not placed options
      if (isOrderForwarded(d) && !isOrderPlaced(d)) {
        return [
          { value: 'PLACED', label: 'Order placed' },
          { value: 'NOT_PLACED', label: 'Order not placed' },
          { value: 'CUSTOM', label: 'Custom…' }
        ];
      }
      
      // If order has been placed
      if (isOrderPlaced(d)) {
        // Check if orderType is already set (Individual or Group already selected)
        if (orderType === 'INDIVIDUAL' || orderType === 'GROUP') {
          // Skip Individual/Group selection, go straight to work progress
          return [
            { value: 'IN_PROGRESS', label: 'Work in progress' },
            { value: 'DELAY', label: 'Work in delay' },
            { value: 'COMPLETED', label: 'Work completed' },
            { value: 'CUSTOM', label: 'Custom…' }
          ];
        }
        
        // Check if Individual or Group has already been selected in previous days
        let alreadySelected = false;
        for (let i = 1; i < d; i++) {
          if (dailyPlan?.[i]?.status === 'INDIVIDUAL' || dailyPlan?.[i]?.status === 'GROUP') {
            alreadySelected = true;
            break;
          }
        }
        
        // If not yet selected, show Individual/Group options
        if (!alreadySelected) {
          return [
            { value: 'INDIVIDUAL', label: 'Individual Order' },
            { value: 'GROUP', label: 'Group Order' },
            { value: 'CUSTOM', label: 'Custom…' }
          ];
        }
        
        // After Individual/Group is selected, show work progress options
        return [
          { value: 'IN_PROGRESS', label: 'Work in progress' },
          { value: 'DELAY', label: 'Work in delay' },
          { value: 'COMPLETED', label: 'Work completed' },
          { value: 'CUSTOM', label: 'Custom…' }
        ];
      }
    }
    
    // Default fallback
    return [
      { value: 'IN_PROGRESS', label: 'Work in progress' },
      { value: 'DELAY', label: 'Work in delay' },
      { value: 'COMPLETED', label: 'Work completed' },
      { value: 'CUSTOM', label: 'Custom…' }
    ];
  };

  const addItem = () => {
    const newSno = currentOrder.items.length + 1;
    updateOrder(activeTab, {
      items: [
        ...currentOrder.items,
        { 
          sno: newSno,
          ornamentType: 'Necklace', 
          weight: '', 
          advance: '', 
          customerNotes: '',
          photo: null,
          status: ORDER_STATUS.PENDING,
          itemStatus: ITEM_STATUS.WITH_WORKER,
          notes: '',
          isSubmitted: false,
          dailyPlan: { 1: { status: 'NA', note: '' } }
        },
      ],
    });
  };

  const removeItem = (idx) => {
    const newItems = currentOrder.items.filter((_, i) => i !== idx);
    // Renumber the items
    const renumberedItems = newItems.map((item, i) => ({ ...item, sno: i + 1 }));
    updateOrder(activeTab, { items: renumberedItems });
  };
 
  const addTab = () => {
    // Generate temporary ID for the new order (will be finalized on save)
    const tempOrderNum = maxOrderId + 1;
    
    const newOrder = {
      orderId: 'ORD-' + String(tempOrderNum).padStart(5, '0'),
      orderType: '',
      customer: { name: '', contact: '', address: '' },
      subQuantity: '',
      totalWeight: '',
      advance: '',
      advanceType: 'AMOUNT',
      advanceGoldGms: '',
      advanceGoldRate: '',
      advanceAmountRate: '',
      requestedDeliveryDate: '',
      orderWeightage: '',
      orderPeopleContact: '',
      items: [
        { 
          sno: 1,
          ornamentType: 'Necklace', 
          weight: '', 
          advance: '', 
          customerNotes: '',
          photo: null,
          status: ORDER_STATUS.PENDING,
          itemStatus: ITEM_STATUS.WITH_WORKER,
          notes: '',
          isSubmitted: false,
          dailyPlan: { 1: { status: 'NA', note: '' } }
        },
      ],
      orderStatus: ORDER_STATUS.PENDING,
      isPlaced: false,
      dailyPlan: { 1: { status: 'NA', note: '' } },
      isUnsaved: true // Mark as unsaved - won't be in database yet
    };
    
    setOrders((prev) => {
      const list = [...prev, newOrder];
      setActiveTab(list.length - 1);
      return list;
    });
    
    // Don't save to database immediately - user must click "Save to Database"
  };

  const removeTab = (filteredIdx) => {
    if (orders.length === 1) return;
    const orderId = filteredOrders[filteredIdx]?.orderId;
    
    const newOrders = orders.filter((o) => o.orderId !== orderId);
    setOrders(newOrders);
    setActiveTab(0);
  };


  const placeOrder = () => {
    const order = currentOrder;
    
    // Validate required fields
    if (!order.orderPeopleContact) {
      alert('Please enter Order People Contact number before placing the order.');
      return;
    }

    // Create WhatsApp message
    const sendOrderToWhatsApp = () => {
      let message = `🔔 *NEW ORDER RECEIVED*\n\n`;
      message += `📋 *Order ID:* ${order.orderId}\n`;
      message += `👤 *Customer:* ${order.customer.name || 'N/A'}\n`;
      // Contact is intentionally omitted from WhatsApp message per requirement
      
      if (order.requestedDeliveryDate) {
        const deliveryDate = new Date(order.requestedDeliveryDate).toLocaleDateString();
        message += `📅 *Expected Delivery:* ${deliveryDate}\n`;
      }
      
      if (order.totalWeight) message += `⚖️ *Total Weight:* ${order.totalWeight} gms\n`;
      if (order.orderWeightage) message += `📊 *Order Quantity:* ${order.orderWeightage}\n`;
      if (order.orderType) message += `🧩 *Order Type:* ${order.orderType === 'GROUP' ? 'Group' : 'Individual'}\n`;

      // Advance details
      if (order.advanceType === 'AMOUNT') {
        if (order.advance) message += `💰 *Advance Amount:* ₹${order.advance}\n`;
      } else if (order.advanceType === 'GOLD') {
        if (order.advanceGoldGms) message += `🥇 *Advance Gold:* ${order.advanceGoldGms} gms\n`;
        if (order.advanceGoldRate) message += `💱 *Advance Gold Rate:* ₹${order.advanceGoldRate}/g\n`;
      }
      
      message += `\n📝 *ITEMS DETAILS:*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      
      order.items.forEach((item, idx) => {
        message += `\n${idx + 1}. *${item.ornamentType}*\n`;
        if (item.weight) message += `   Weight: ${item.weight} gms\n`;
        if (item.customerNotes) message += `   Notes: ${item.customerNotes}\n`;
        message += `   ────────────────────\n`;
      });
      // Address is intentionally omitted from WhatsApp message per requirement

      // Clean phone number
      const phoneNumber = order.orderPeopleContact.replace(/\D/g, '');
      if (phoneNumber.length >= 10) {
        const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        // Show success message
        alert('Order sent to WhatsApp!');
      } else {
        alert('Please enter a valid phone number for Order People Contact.');
        return;
      }
    };

    // Send to WhatsApp first
    sendOrderToWhatsApp();
    
    // Then update order status and save to database
    const updatedOrder = {
      ...currentOrder,
      isPlaced: true,
      orderStatus: ORDER_STATUS.IN_PROGRESS
    };
    
    updateOrder(activeTab, { 
      isPlaced: true,
      orderStatus: ORDER_STATUS.IN_PROGRESS 
    });
    
    // Save to database when placing order
    saveOrderToDb(updatedOrder);
  };

  const updateOrderStatus = (newStatus) => {
    updateOrder(activeTab, { orderStatus: newStatus });
  };

  const sendPhotosToWhatsApp = () => {
    const order = currentOrder;
    const itemsWithPhotos = order.items.filter(item => item.photo);
    
    if (itemsWithPhotos.length === 0) {
      alert('No photos available to send.');
      return;
    }

    const phoneNumber = order.orderPeopleContact?.replace(/\D/g, '');
    if (!phoneNumber || phoneNumber.length < 10) {
      alert('Order People Contact not available.');
      return;
    }

    let message = `📸 *PHOTOS FOR ORDER: ${order.orderId}*\n\n`;
    message += `Please find the reference photos for the following items:\n\n`;
    
    itemsWithPhotos.forEach((item, idx) => {
      message += `${idx + 1}. ${item.ornamentType}`;
      if (item.customerNotes) {
        message += ` - ${item.customerNotes}`;
      }
      message += `\n`;
    });
    
    message += `\n📝 Note: Photos will be sent as separate messages after this text.`;

    const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    alert(`Photos message sent! Please manually send ${itemsWithPhotos.length} photo(s) in the WhatsApp chat.`);
  };
 

 
  return (
    <>
      <Employeeheader />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
        {/* Main Content Container - Set to 75% width */}
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{width: '75%', maxWidth: '75vw'}}>
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white border-b-4 border-orange-600 rounded-lg p-6 shadow-md mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Management System</h1>
              <p className="text-gray-600 text-sm">
                Manage customer orders, track progress, and coordinate with production teams
              </p>
            </div>
            

            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <button
                className="px-6 py-3 rounded-lg bg-orange-400 hover:bg-orange-700 text-white font-semibold text-base shadow-md transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={async () => {
                  if (!showTable) {
                    // Fetch orders when showing table
                    await fetchAllOrders();
                    setShowTable(true);
                  } else {
                    // Just hide table
                    setShowTable(false);
                  }
                }}
                disabled={isLoadingOrders}
              >
                {isLoadingOrders ? 'Loading...' : (showTable ? 'Back to Orders' : 'View All Orders')}
              </button>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setActiveTab(0); }}
                placeholder="Search by Order ID, Name, or Contact"
                className="px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-800 placeholder:text-gray-400 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full md:w-96 shadow-sm"
              />
            </div>
          </div>
          {/* Orders Table View */}
          {showTable && (
            <div className="mb-8">
              {isLoadingOrders ? (
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading orders from database...</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">
                      All Orders ({orders.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Order ID</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Customer Name</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orders.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                              No orders found in the database
                            </td>
                          </tr>
                        ) : (
                          orders.map((order, idx) => (
                            <tr key={order.orderId} className="hover:bg-gray-50 transition-all duration-200">
                              <td className="px-6 py-4 font-mono text-gray-900 font-medium">{order.orderId}</td>
                              <td className="px-6 py-4 text-gray-800">{order.customer?.name || 'N/A'}</td>
                              <td className="px-6 py-4 text-gray-800">{order.customer?.contact || 'N/A'}</td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-md text-xs font-medium ${
                                  order.orderStatus === ORDER_STATUS.PENDING ? 'bg-yellow-100 text-yellow-800' :
                                  order.orderStatus === ORDER_STATUS.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                                  order.orderStatus === ORDER_STATUS.DELAYED ? 'bg-red-100 text-red-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {order.orderStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <button
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition-all duration-200"
                                    onClick={() => {
                                      // Load only this specific order, mark as loaded from DB
                                      setOrders([{ ...order, isLoadedFromDb: true }]);
                                      setActiveTab(0);
                                      setShowTable(false);
                                    }}
                                  >
                                    <FaEye className="inline mr-2" />
                                    View/Edit
                                  </button>
                                  
                                  <button
                                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium shadow-sm transition-all duration-200 flex items-center gap-1"
                                    onClick={async () => {
                                      const confirmDelete = window.confirm(
                                        `Are you sure you want to delete Order ${order.orderId}?\n\nThis will permanently remove the order from the database.`
                                      );
                                      
                                      if (confirmDelete) {
                                        try {
                                          // Delete from database
                                          await deleteDoc(doc(db, 'orders', order.orderId));
                                          
                                          // Remove from local state
                                          setOrders((prev) => prev.filter(o => o.orderId !== order.orderId));
                                          
                                          alert(`Order ${order.orderId} has been deleted from the database.`);
                                          
                                          // Refresh the orders list
                                          await fetchAllOrders();
                                        } catch (error) {
                                          console.error('Error deleting order:', error);
                                          alert('Failed to delete order. Please try again.');
                                        }
                                      }
                                    }}
                                  >
                                    <FaTrash className="text-xs" />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Order Form View */}
          {!showTable && filteredOrders.length > 0 && (
            <>
              {/* Order Tabs */}
              <div className="mb-8">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Order Tabs ({filteredOrders.length})</h3>
                    <div className="flex gap-2">
                      
                      <button
                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all duration-200 text-xs font-semibold flex items-center gap-2 shadow-sm"
                        onClick={addTab}
                      >
                        <FaPlus className="text-xs" />
                        New Order
                      </button>
                    </div>
                  </div>
                  
                  {/* Scrollable tabs container with custom scrollbar */}
                  <div className="relative">
                    <div 
                      className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#9CA3AF #E5E7EB'
                      }}
                    >
                      {filteredOrders.map((order, idx) => (
                        <div key={order.orderId} className="relative flex-shrink-0">
                          <button
                            className={`px-4 py-2 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap ${
                              activeTab === idx
                                ? 'bg-blue-600 text-white shadow-md'
                                : order.isUnsaved
                                  ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                            onClick={() => setActiveTab(idx)}
                          >
                            {order.isUnsaved && <span className="mr-1">●</span>}
                            {order.orderId}
                            {order.isPlaced && <span className="ml-1 text-xs">✓</span>}
                          </button>
                          {orders.length > 1 && (
                            <button
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-all duration-200 flex items-center justify-center shadow-sm"
                              onClick={() => removeTab(idx)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Scroll hint indicator */}
                    {filteredOrders.length > 5 && (
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                        Scroll horizontally to see all orders
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Order Form */}
              {(
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
                {/* Order Header */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 rounded-lg p-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">
                        {currentOrder.orderId}
                        {currentOrder.isPlaced && (
                          <span className="ml-4 px-4 py-2 bg-green-100 text-green-800 text-lg rounded-lg border border-green-200">
                            Order Placed
                          </span>
                        )}
                      </h2>
                      <p className="text-gray-600 mt-1">Manage order details and track progress</p>
                      <div className="mt-2">
                        <span className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-300 bg-gray-50 text-gray-700">
                          Order Type: {currentOrder.orderType ? (currentOrder.orderType === 'GROUP' ? 'Group' : 'Individual') : 'Not Selected'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex flex-col">
                      <label className="text-sm font-semibold text-gray-700 mb-2">Order People Contact</label>
                      <input
                        type="tel"
                        value={currentOrder.orderPeopleContact || ''}
                        onChange={(e) => handleOrderFieldChange('orderPeopleContact', e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 shadow-sm transition-all duration-200"
                        placeholder="WhatsApp Number"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                    {currentOrder.isPlaced && (
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Order Status</label>
                        <select
                          value={currentOrder.orderStatus}
                          onChange={(e) => updateOrderStatus(e.target.value)}
                          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                        >
                          <option value={ORDER_STATUS.IN_PROGRESS}>Work in Progress</option>
                          <option value={ORDER_STATUS.DELAYED}>Work in Delay</option>
                          <option value={ORDER_STATUS.COMPLETED}>Work Completed</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6">
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name</label>
                      <input
                        type="text"
                        value={currentOrder.customer?.name || ''}
                        onChange={(e) => handleCustomerChange('name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                        placeholder="Enter customer name"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Number</label>
                      <input
                        type="text"
                        value={currentOrder.customer?.contact || ''}
                        onChange={(e) => handleCustomerChange('contact', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                        placeholder="Phone number"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Address</label>
                    <textarea
                      value={currentOrder.customer?.address || ''}
                      onChange={(e) => handleCustomerChange('address', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                      placeholder="Enter complete address"
                      rows="3"
                      disabled={currentOrder.isPlaced}
                    />
                  </div>
                </div>

                {/* Order Details */}
                <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Weight (gms)</label>
                      <input
                        type="text"
                        value={currentOrder.totalWeight || ''}
                        onChange={(e) => handleOrderFieldChange('totalWeight', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Weight in grams"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Advance Type</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            currentOrder.advanceType === 'AMOUNT' 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => updateOrder(activeTab, { advanceType: 'AMOUNT' })}
                          disabled={currentOrder.isPlaced}
                        >
                          Amount (₹)
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            currentOrder.advanceType === 'GOLD' 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => updateOrder(activeTab, { advanceType: 'GOLD' })}
                          disabled={currentOrder.isPlaced}
                        >
                          Gold
                        </button>
                      </div>
                    </div>
                    {currentOrder.advanceType === 'AMOUNT' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount (₹)</label>
                          <input
                            type="number"
                            value={currentOrder.advance || ''}
                            onChange={(e) => handleOrderFieldChange('advance', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Advance payment"
                            disabled={currentOrder.isPlaced}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹/g)</label>
                          <input
                            type="number"
                            value={currentOrder.advanceAmountRate || ''}
                            onChange={(e) => handleOrderFieldChange('advanceAmountRate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Rate per gram"
                            disabled={currentOrder.isPlaced}
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Advance Gold (gms)</label>
                        <input
                          type="number"
                          value={currentOrder.advanceGoldGms || ''}
                          onChange={(e) => handleOrderFieldChange('advanceGoldGms', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Gold in grams"
                          disabled={currentOrder.isPlaced}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                      <input
                        type="date"
                        value={currentOrder.requestedDeliveryDate || ''}
                        onChange={(e) => handleOrderFieldChange('requestedDeliveryDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Order Quantity</label>
                      <input
                        type="number"
                        value={currentOrder.orderWeightage || ''}
                        onChange={(e) => adjustItemsCount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Number of items"
                        disabled={currentOrder.isPlaced}
                      />
                    </div>
                  </div>
                  {currentOrder.advanceType === 'GOLD' && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Estimated Advance Value:</span> 
                        ₹{((parseFloat(currentOrder.advanceGoldGms) || 0) * (parseFloat(currentOrder.advanceGoldRate) || 0)).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
                {/* Items Table */}
                <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Order Items</h3>
                    {!currentOrder.isPlaced && (
                      <button
                        onClick={addItem}
                        className="px-4 py-2 bg-orange-400 hover:bg-orange-700 text-white rounded-md  transition-colors text-sm font-medium"
                      >
                        <FaPlus className="inline mr-1" />
                        Add Item
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">S.No</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ornament Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Weight (gms)</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Advance</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer Notes</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Photo</th>
                          {currentOrder.isPlaced && (
                            <>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Item Status</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Notes</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Submit</th>
                            </>
                          )}
                          {!currentOrder.isPlaced && (
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {currentOrder.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{item.sno}</td>
                            <td className="px-4 py-3">
                              <select
                                value={item.ornamentType}
                                onChange={(e) => handleItemChange(idx, 'ornamentType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                disabled={currentOrder.isPlaced}
                              >
                                {ORNAMENT_TYPES.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.weight}
                                onChange={(e) => handleItemChange(idx, 'weight', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder="Weight"
                                disabled={currentOrder.isPlaced}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.advance}
                                onChange={(e) => handleItemChange(idx, 'advance', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder="Advance"
                                disabled={currentOrder.isPlaced}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <textarea
                                value={item.customerNotes || ''}
                                onChange={(e) => handleItemChange(idx, 'customerNotes', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                placeholder="Customer Notes"
                                rows="2"
                                disabled={currentOrder.isPlaced}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        handleItemChange(idx, 'photo', {
                                          file: file,
                                          url: event.target.result,
                                          name: file.name
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  className="w-full text-xs border border-gray-300 rounded p-1"
                                  disabled={currentOrder.isPlaced}
                                />
                                {item.photo && (
                                  <div className="flex items-center gap-2">
                                    <img 
                                      src={item.photo.url} 
                                      alt="Item photo" 
                                      className="w-8 h-8 object-cover rounded cursor-pointer border border-gray-300"
                                      onClick={() => window.open(item.photo.url, '_blank')}
                                    />
                                    <span className="text-xs text-gray-600 truncate max-w-16" title={item.photo.name}>
                                      {item.photo.name}
                                    </span>
                                    {!currentOrder.isPlaced && (
                                      <button
                                        onClick={() => handleItemChange(idx, 'photo', null)}
                                        className="text-red-500 hover:text-red-700 text-xs bg-red-100 hover:bg-red-200 rounded-full w-5 h-5 flex items-center justify-center"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            {currentOrder.isPlaced && (
                              <>
                                <td className="px-4 py-3">
                                  <select
                                    value={item.status}
                                    onChange={(e) => handleItemChange(idx, 'status', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  >
                                    <option value={ORDER_STATUS.PENDING}>Pending</option>
                                    <option value={ORDER_STATUS.IN_PROGRESS}>In Progress</option>
                                    <option value={ORDER_STATUS.DELAYED}>Delayed</option>
                                    <option value={ORDER_STATUS.COMPLETED}>Completed</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={item.itemStatus}
                                    onChange={(e) => handleItemChange(idx, 'itemStatus', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  >
                                    <option value={ITEM_STATUS.WITH_WORKER}>Items with Worker</option>
                                    <option value={ITEM_STATUS.WITH_DEPARTMENT}>Items with Department</option>
                                    <option value={ITEM_STATUS.DELIVERED}>Items delivered to customer</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <textarea
                                    value={item.notes || ''}
                                    onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                    placeholder="Internal Notes"
                                    rows="2"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => handleItemChange(idx, 'isSubmitted', !item.isSubmitted)}
                                    className={`px-3 py-1 rounded text-sm font-medium ${
                                      item.isSubmitted 
                                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                    }`}
                                  >
                                    {item.isSubmitted ? 'Submitted' : 'Submit'}
                                  </button>
                                </td>
                              </>
                            )}
                            {!currentOrder.isPlaced && (
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => removeItem(idx)}
                                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                                  disabled={currentOrder.items.length === 1}
                                >
                                  <FaTrash />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Workflow Info Message for New Orders */}
                {!currentOrder.isLoadedFromDb && (
                  <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">ℹ️ About Daily Workflow Tracking</h3>
                    <p className="text-sm text-blue-700">
                      Daily workflow tracking will be available after you <strong>save this order</strong> and then access it from the <strong>"View All Orders"</strong> section. This allows you to track order progress day-by-day.
                    </p>
                  </div>
                )}

                {/* Order Status Section - After Items */}
                <div className="bg-green-50 rounded-lg p-6 mb-8 border border-green-200">
                  <div className="flex flex-col items-center gap-4">
                    {!currentOrder.isPlaced ? (
                      <>
                        <h3 className="text-xl font-semibold text-green-800">Ready to Place Order?</h3>
                        <p className="text-green-700 text-sm text-center">
                          Make sure you have filled in all the required details above, then place your order
                        </p>
                        <div className="flex flex-col items-center gap-3">
                          {!currentOrder.orderPeopleContact && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                                ⚠ Order People Contact is required
                              </p>
                            </div>
                          )}
                          <button
                            onClick={placeOrder}
                            disabled={!currentOrder.orderPeopleContact}
                            className={`px-8 py-4 rounded-lg transition-all duration-200 font-semibold flex items-center gap-3 text-base shadow-md ${
                              currentOrder.orderPeopleContact
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <FaWhatsapp className="text-xl" />
                            Place Order & Send to WhatsApp
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold text-green-800">Order Successfully Placed!</h3>
                        <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                          <div className="text-center">
                            <p className="text-lg font-semibold text-green-800 mb-2">Order ID: {currentOrder.orderId}</p>
                            <p className="text-sm text-green-700 mb-2">Status: {currentOrder.orderStatus}</p>
                            <p className="text-sm text-green-600">Order has been sent to WhatsApp and is now in progress</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Initial Workflow - Before Order Type Selection */}
                {/* Only show workflow if order is loaded from database */}
                {!currentOrder.orderType && currentOrder.isLoadedFromDb && (
                  <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-200">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">Daily Workflow</h3>
                    <p className="text-sm text-gray-600 mb-4">Track the order progress. Select Individual or Group when prompted.</p>
                    {/* Manual day-by-day plan with Day selector */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm text-gray-700 font-medium">Start with Day 1. Use "Add Next Day" to add Day 2, Day 3, etc.</div>
                      <button type="button" onClick={addWorkflowDay} className="px-4 py-2 rounded-lg bg-orange-400 hover:bg-orange-700 text-white text-sm font-semibold">+ Add Next Day</button>
                    </div>
                    <div className="space-y-4">
                      {Object.keys(currentOrder.dailyPlan || {}).sort((a,b)=>Number(a)-Number(b)).map(key => {
                        const d = Number(key);
                        const status = currentOrder.dailyPlan?.[d]?.status || 'NA';
                        const options = getDayOptions(d, currentOrder.dailyPlan, currentOrder.orderType);
                        return (
                          <div key={d} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-semibold text-gray-800 w-16">Day {d}</span>
                              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={status} onChange={e => {
                                const newStatus = e.target.value;
                                const updates = { dailyPlan: { ...(currentOrder.dailyPlan||{}), [d]: { ...(currentOrder.dailyPlan?.[d]||{}), status: newStatus } } };
                                // If selecting Individual or Group on any day, also set orderType
                                if (newStatus === 'INDIVIDUAL' || newStatus === 'GROUP') {
                                  updates.orderType = newStatus;
                                }
                                updateOrder(activeTab, updates);
                              }}>
                                <option value="NA">Select status</option>
                                {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                              </select>
                              {status === 'CUSTOM' && (
                                <input className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 md:w-60" placeholder="Custom status" value={currentOrder.dailyPlan?.[d]?.custom || ''} onChange={e => updateOrder(activeTab, { dailyPlan: { ...(currentOrder.dailyPlan||{}), [d]: { ...(currentOrder.dailyPlan?.[d]||{}), custom: e.target.value } } })} />
                              )}
                              {d !== 1 && (
                                <button type="button" onClick={() => removeWorkflowDay(d)} className="px-3 py-1 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium">Remove</button>
                              )}
                            </div>
                            <input className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full" placeholder="Note" value={currentOrder.dailyPlan?.[d]?.note || ''} onChange={e => updateOrder(activeTab, { dailyPlan: { ...(currentOrder.dailyPlan||{}), [d]: { ...(currentOrder.dailyPlan?.[d]||{}), note: e.target.value } } })} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Daily Workflow - Group Order (After Type Selected) */}
                {/* Only show workflow if order is loaded from database */}
                {currentOrder.orderType === 'GROUP' && currentOrder.isLoadedFromDb && (
                  <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-200">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">Daily Workflow - Group Order</h3>
                    <p className="text-sm text-gray-600 mb-4">All items in this order follow the same workflow</p>
                    {/* Manual day-by-day plan with Day selector */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm text-gray-700 font-medium">Continue tracking the order progress</div>
                      <button type="button" onClick={addWorkflowDay} className="px-4 py-2 rounded-lg bg-orange-400 hover:bg-orange-700 text-white text-sm font-semibold">+ Add Next Day</button>
                    </div>
                    <div className="space-y-4">
                      {Object.keys(currentOrder.dailyPlan || {}).sort((a,b)=>Number(a)-Number(b)).map(key => {
                        const d = Number(key);
                        const status = currentOrder.dailyPlan?.[d]?.status || 'NA';
                        const options = getDayOptions(d, currentOrder.dailyPlan, currentOrder.orderType);
                        return (
                          <div key={d} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-semibold text-gray-800 w-16">Day {d}</span>
                              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={status} onChange={e => {
                                const newStatus = e.target.value;
                                const updates = { dailyPlan: { ...(currentOrder.dailyPlan||{}), [d]: { ...(currentOrder.dailyPlan?.[d]||{}), status: newStatus } } };
                                updateOrder(activeTab, updates);
                              }}>
                                <option value="NA">Select status</option>
                                {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                              </select>
                              {status === 'CUSTOM' && (
                                <input className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 md:w-60" placeholder="Custom status" value={currentOrder.dailyPlan?.[d]?.custom || ''} onChange={e => updateOrder(activeTab, { dailyPlan: { ...(currentOrder.dailyPlan||{}), [d]: { ...(currentOrder.dailyPlan?.[d]||{}), custom: e.target.value } } })} />
                              )}
                              {d !== 1 && (
                                <button type="button" onClick={() => removeWorkflowDay(d)} className="px-3 py-1 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium">Remove</button>
                              )}
                            </div>
                            <input className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full" placeholder="Note" value={currentOrder.dailyPlan?.[d]?.note || ''} onChange={e => updateOrder(activeTab, { dailyPlan: { ...(currentOrder.dailyPlan||{}), [d]: { ...(currentOrder.dailyPlan?.[d]||{}), note: e.target.value } } })} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Individual Item Workflows */}
                {/* Only show workflow if order is loaded from database */}
                {currentOrder.orderType === 'INDIVIDUAL' && currentOrder.isLoadedFromDb && (
                  <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-200">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">Daily Workflow - Individual Order</h3>
                    <p className="text-sm text-gray-600 mb-6">Each item has its own workflow tracking</p>
                    
                    <div className="space-y-6">
                      {currentOrder.items?.map((item, itemIdx) => {
                        // Initialize item workflow if not exists
                        if (!item.dailyPlan) {
                          item.dailyPlan = { 1: { status: 'NA', note: '' } };
                        }
                        
                        return (
                          <div key={itemIdx} className="bg-white rounded-lg p-4 border border-gray-300">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                              <h4 className="font-semibold text-gray-800">
                                Item {item.sno}: {item.ornamentType} {item.weight && `(${item.weight}g)`}
                              </h4>
                              <button 
                                type="button" 
                                onClick={() => {
                                  const newItems = currentOrder.items.map((it, idx) => {
                                    if (idx === itemIdx) {
                                      const plan = { ...(it.dailyPlan || {}) };
                                      const keys = Object.keys(plan).map(k => Number(k)).sort((a,b)=>a-b);
                                      const next = (keys[keys.length - 1] || 0) + 1;
                                      plan[next] = { status: 'NA', note: '' };
                                      return { ...it, dailyPlan: plan };
                                    }
                                    return it;
                                  });
                                  updateOrder(activeTab, { items: newItems });
                                }}
                                className="px-3 py-1 rounded-lg bg-orange-400 hover:bg-orange-700 text-white text-xs font-semibold"
                              >
                                + Add Day
                              </button>
                            </div>
                            
                            <div className="space-y-3">
                              {Object.keys(item.dailyPlan || {}).sort((a,b)=>Number(a)-Number(b)).map(key => {
                                const d = Number(key);
                                const status = item.dailyPlan?.[d]?.status || 'NA';
                                const options = getDayOptions(d, item.dailyPlan, currentOrder.orderType);
                                
                                return (
                                  <div key={d} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-gray-700 text-sm w-12">Day {d}</span>
                                      <select 
                                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs flex-1"
                                        value={status}
                                        onChange={e => {
                                          const newItems = currentOrder.items.map((it, idx) => {
                                            if (idx === itemIdx) {
                                              return {
                                                ...it,
                                                dailyPlan: {
                                                  ...(it.dailyPlan || {}),
                                                  [d]: { ...(it.dailyPlan?.[d] || {}), status: e.target.value }
                                                }
                                              };
                                            }
                                            return it;
                                          });
                                          updateOrder(activeTab, { items: newItems });
                                        }}
                                      >
                                        <option value="NA">Select status</option>
                                        {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                                      </select>
                                      {status === 'CUSTOM' && (
                                        <input 
                                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs w-32"
                                          placeholder="Custom"
                                          value={item.dailyPlan?.[d]?.custom || ''}
                                          onChange={e => {
                                            const newItems = currentOrder.items.map((it, idx) => {
                                              if (idx === itemIdx) {
                                                return {
                                                  ...it,
                                                  dailyPlan: {
                                                    ...(it.dailyPlan || {}),
                                                    [d]: { ...(it.dailyPlan?.[d] || {}), custom: e.target.value }
                                                  }
                                                };
                                              }
                                              return it;
                                            });
                                            updateOrder(activeTab, { items: newItems });
                                          }}
                                        />
                                      )}
                                      {d !== 1 && (
                                        <button 
                                          type="button" 
                                          onClick={() => {
                                            const newItems = currentOrder.items.map((it, idx) => {
                                              if (idx === itemIdx) {
                                                const plan = { ...(it.dailyPlan || {}) };
                                                delete plan[d];
                                                return { ...it, dailyPlan: plan };
                                              }
                                              return it;
                                            });
                                            updateOrder(activeTab, { items: newItems });
                                          }}
                                          className="px-2 py-1 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium"
                                        >
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                    <input 
                                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs w-full"
                                      placeholder="Note"
                                      value={item.dailyPlan?.[d]?.note || ''}
                                      onChange={e => {
                                        const newItems = currentOrder.items.map((it, idx) => {
                                          if (idx === itemIdx) {
                                            return {
                                              ...it,
                                              dailyPlan: {
                                                ...(it.dailyPlan || {}),
                                                [d]: { ...(it.dailyPlan?.[d] || {}), note: e.target.value }
                                              }
                                            };
                                          }
                                          return it;
                                        });
                                        updateOrder(activeTab, { items: newItems });
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}



                {/* Action Buttons */}
                <div className="flex gap-4 justify-end items-center flex-wrap">
                  {/* Save Button - Always visible */}
                  <button
                    onClick={async () => {
                      try {
                        await saveOrderToDb(currentOrder);
                        alert('Order saved successfully to database!');
                      } catch (error) {
                        alert('Failed to save order. Please try again.');
                      }
                    }}
                    className={`px-6 py-3 rounded-lg hover:bg-green-700 transition-all duration-200 font-semibold flex items-center gap-2 text-sm shadow-md ${
                      currentOrder.isUnsaved 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-white'
                    }`}
                  >
                    <FaSave className="text-base" />
                    {currentOrder.isUnsaved ? 'Save to Database (Unsaved)' : 'Save to Database'}
                  </button>

                  {/* Delete Button - Only visible if order is placed */}
                  {currentOrder.isPlaced && (
                    <button
                      onClick={() => {
                        const confirmDelete = window.confirm(
                          `Are you sure you want to delete Order ${currentOrder.orderId}?\n\nThis will permanently remove the order from the database.`
                        );
                        
                        if (confirmDelete) {
                          
                          // Generate and auto-download order report PDF
                          try {
                            const docx = new jsPDF();
                            docx.setFontSize(14);
                            docx.text(`Order Report - ${currentOrder.orderId}`, 14, 16);
                            docx.setFontSize(10);
                            const rows = [
                              ['Customer', currentOrder.customer?.name || '-'],
                              ['Order Type', currentOrder.orderType || '-'],
                              ['Total Weight', currentOrder.totalWeight || '-'],
                              ['Advance', currentOrder.advanceType === 'GOLD' ? `${currentOrder.advanceGoldGms||0} g @ ₹${currentOrder.advanceGoldRate||0}` : (currentOrder.advance ? `₹${currentOrder.advance}` : '-')],
                              ['Delivery', currentOrder.requestedDeliveryDate || '-'],
                            ];
                            autoTable(docx, { startY: 20, head: [['Field','Value']], body: rows, styles: { fontSize: 9 } });
                            let y = docx.lastAutoTable.finalY + 6;
                            docx.setFontSize(12);
                            docx.text('Daily Plan', 14, y); y += 4;
                            const planRows = Object.keys(currentOrder.dailyPlan||{}).map(k => [`Day ${k}`, currentOrder.dailyPlan[k]?.status || 'NA', currentOrder.dailyPlan[k]?.note || '' ]);
                            autoTable(docx, { startY: y, head: [['Day','Status','Note']], body: planRows, styles: { fontSize: 9 } });
                            docx.save(`${currentOrder.orderId}_report.pdf`);
                          } catch {}

                          // Remove the order from the database
                          deleteDoc(doc(db, 'orders', currentOrder.orderId)).catch(() => {});
                          const orderId = currentOrder.orderId;
                          const newOrders = orders.filter(order => order.orderId !== orderId);
                          setOrders(newOrders);
                          // Reset active tab if needed
                          if (newOrders.length === 0) {
                            // If no orders left, create a new empty order
                            setOrders([{
                              orderId: 'ORD-00001',
                              customer: { name: '', contact: '', address: '' },
                              subQuantity: '',
                              totalWeight: '',
                              advance: '',
                              requestedDeliveryDate: '',
                              orderWeightage: '',
                              orderPeopleContact: '',
                              items: [
                                { 
                                  sno: 1,
                                  ornamentType: 'Necklace', 
                                  weight: '', 
                                  advance: '', 
                                  customerNotes: '',
                                  photo: null,
                                  status: ORDER_STATUS.PENDING,
                                  itemStatus: ITEM_STATUS.WITH_WORKER,
                                  notes: '',
                                  isSubmitted: false,
                                  dailyPlan: { 1: { status: 'NA', note: '' } }
                                },
                              ],
                              orderStatus: ORDER_STATUS.PENDING,
                              isPlaced: false,
                            }]);
                            setActiveTab(0);
                          } else {
                            // Adjust active tab to stay within bounds
                            if (activeTab >= newOrders.length) {
                              setActiveTab(newOrders.length - 1);
                            }
                          }
                          
                          alert(`Order ${orderId} has been deleted from the database.`);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium flex items-center gap-2 text-xs shadow-md"
                    >
                      <FaTrash className="text-xs" />
                      Delete from Database
                    </button>
                  )}
                </div>
              </div>
              )}
            </>
          )}

          {/* No Orders Message */}
          {!showTable && filteredOrders.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 max-w-md mx-auto">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">No Orders Found</h3>
                <p className="text-gray-600 mb-8">Start by creating your first order to manage customer requests</p>
                <button
                  onClick={addTab}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold text-base shadow-md"
                >
                  Create New Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
export default Ordermanage;