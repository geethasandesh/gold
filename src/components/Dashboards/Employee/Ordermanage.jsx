import React, { useState } from 'react';
import Employeeheader from './Employeeheader';
import { FaPlus, FaTrash, FaWhatsapp, FaTimes } from 'react-icons/fa';
 
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
  // Tabs state
  const [orders, setOrders] = useState([
    {
      orderId: 'ORD-00001',
      customer: { name: '', contact: '' },
      receiver: '',
      items: [
        { metal: 'Gold', ornament: 'Necklace', quantity: 1, weight: '' },
      ],
      images: [],
    },
  ]);
  const [search, setSearch] = useState('');
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
  const [activeTab, setActiveTab] = useState(0);
  React.useEffect(() => {
    if (activeTab >= filteredOrders.length) setActiveTab(0);
  }, [filteredOrders.length]);
 
  // Update order by index in filteredOrders
  const updateOrder = (filteredIdx, newOrder) => {
    const orderId = filteredOrders[filteredIdx]?.orderId;
    setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, ...newOrder } : o)));
  };
 
  const handleReceiverChange = (e) => {
    updateOrder(activeTab, { receiver: e.target.value });
  };
 
  // Handlers for the active order (from filtered list)
  const customer = filteredOrders[activeTab]?.customer || { name: '', contact: '' };
  const receiver = filteredOrders[activeTab]?.receiver || '';
  const items = filteredOrders[activeTab]?.items || [];
 
  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    updateOrder(activeTab, { customer: { ...customer, [name]: value } });
  };
 
  const handleItemChange = (idx, field, value) => {
    const newItems = items.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    updateOrder(activeTab, { items: newItems });
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.map(file => ({
      file: file,
      imageUrl: URL.createObjectURL(file),
      name: file.name
    }));
    
    const currentImages = filteredOrders[activeTab]?.images || [];
    updateOrder(activeTab, { images: [...currentImages, ...imageFiles] });
  };

  const removeImage = (imageIndex) => {
    const currentImages = filteredOrders[activeTab]?.images || [];
    const newImages = currentImages.filter((_, index) => index !== imageIndex);
    updateOrder(activeTab, { images: newImages });
  };


 
  const addItem = () => {
    updateOrder(activeTab, {
      items: [
        ...items,
        { metal: 'Gold', ornament: 'Necklace', quantity: 1, weight: '' },
      ],
    });
  };
 
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, type: '', idx: null });
 
  const removeItem = (idx) => {
    setConfirmModal({ open: true, type: 'item', idx });
  };
 
  const [orderSent, setOrderSent] = useState(false);
 
  const handleSend = () => {
    const orderId = filteredOrders[activeTab].orderId;
    const currentImages = filteredOrders[activeTab]?.images || [];
    
    let message = `*New Order*\nOrder ID: ${orderId}\n`;
    if (customer.name) message += `Name: ${customer.name}\n`;
    if (customer.contact) message += `Contact: ${customer.contact}\n`;
    message += `Items:`;
    items.forEach((item, idx) => {
      let ornamentLabel = item.ornament === 'Other' && item.otherDetails ? item.otherDetails : item.ornament;
      message += `\n${idx + 1}. ${item.metal} - ${ornamentLabel} x${item.quantity}`;
      if (item.weight) message += ` (${item.weight} gms)`;
    });
    
    if (currentImages.length > 0) {
      message += `\n\n📸 Reference Images: ${currentImages.length} image(s) attached`;
      message += `\nPlease check the images for reference details.`;
    }
    
    const encoded = encodeURIComponent(message);
    
    // Check if it's a group ID or individual number
    const receiverInput = receiver.trim();
    let whatsappUrl;
    
    // Group IDs are typically long alphanumeric strings (22+ characters)
    // Individual numbers are typically 10-15 digits
    if (receiverInput.length > 15 && /^[a-zA-Z0-9]+$/.test(receiverInput)) {
      // It's likely a group ID - send to group
      // Use the same format as individual numbers but with group ID
      whatsappUrl = `https://wa.me/${receiverInput}?text=${encoded}`;
    } else {
      // It's an individual number - add country code if needed
      const receiverNumber = receiverInput.replace(/\D/g, '');
      if (receiverNumber.length < 10) return; // basic validation
      whatsappUrl = `https://wa.me/91${receiverNumber}?text=${encoded}`;
    }
    
    // Open WhatsApp with pre-filled message
    window.open(whatsappUrl, '_blank');
    setOrderSent(true);
    
    // For groups, show simple confirmation
    if (receiverInput.length > 15 && /^[a-zA-Z0-9]+$/.test(receiverInput)) {
      setTimeout(() => {
        alert(`Order sent to WhatsApp group!\n\nGroup ID: ${receiverInput}\n\nIf the message is not pre-filled, please check your WhatsApp.`);
      }, 1000);
    }
    
          // Show instructions for manual image attachment if images exist
      if (currentImages.length > 0) {
        setTimeout(() => {
          alert(`Order text sent! Please manually attach the ${currentImages.length} reference image(s) in WhatsApp.\n\nTo get group ID: Open WhatsApp group → Group info → Scroll down to find the group ID (e.g., ESie4aulBDyId1KpkpiH10).`);
        }, 1000);
      }
  };


 
  const handleNotify = () => {
    const orderId = filteredOrders[activeTab].orderId;
    const customerName = customer.name || '';
    let reminderMessage = `*Order Reminder*\nOrder ID: ${orderId}`;
    if (customerName) reminderMessage += `\nCustomer: ${customerName}`;
    reminderMessage += `\nThis is a reminder to process the above order as soon as possible.`;
    const encoded = encodeURIComponent(reminderMessage);
    
    // Check if it's a group ID or individual number (same logic as handleSend)
    const receiverInput = receiver.trim();
    let whatsappUrl;
    
    // Group IDs are typically long alphanumeric strings (22+ characters)
    // Individual numbers are typically 10-15 digits
    if (receiverInput.length > 15 && /^[a-zA-Z0-9]+$/.test(receiverInput)) {
      // It's likely a group ID - send to group
      // Use the same format as individual numbers but with group ID
      whatsappUrl = `https://wa.me/${receiverInput}?text=${encoded}`;
    } else {
      // It's an individual number - add country code if needed
      const receiverNumber = receiverInput.replace(/\D/g, '');
      if (receiverNumber.length < 10) return; // basic validation
      whatsappUrl = `https://wa.me/91${receiverNumber}?text=${encoded}`;
    }
    
    window.open(whatsappUrl, '_blank');
    
    // For groups, show simple confirmation
    if (receiverInput.length > 15 && /^[a-zA-Z0-9]+$/.test(receiverInput)) {
      setTimeout(() => {
        alert(`Reminder sent to WhatsApp group!\n\nGroup ID: ${receiverInput}\n\nIf the message is not pre-filled, please check your WhatsApp.`);
      }, 1000);
    }
  };
 

 
  // Tab management
  const addTab = () => {
    setOrders((prev) => [
      ...prev,
      {
        orderId: getNextOrderId(prev),
        customer: { name: '', contact: '' },
        receiver: '',
        items: [
          { metal: 'Gold', ornament: 'Necklace', quantity: 1, weight: '' },
        ],
        images: [],
        showImageModal: false,
      },
    ]);
    setActiveTab(filteredOrders.length);
  };
 
  const removeTab = (filteredIdx) => {
    if (orders.length === 1) return;
    setConfirmModal({ open: true, type: 'order', idx: filteredIdx });
  };
 
  const handleConfirmDelete = () => {
    if (confirmModal.type === 'item') {
      updateOrder(activeTab, { items: items.filter((_, i) => i !== confirmModal.idx) });
    } else if (confirmModal.type === 'order') {
      // Remove by orderId
      const orderId = filteredOrders[confirmModal.idx]?.orderId;
      const newOrders = orders.filter((o) => o.orderId !== orderId);
      setOrders(newOrders);
      setActiveTab(0);
    }
    setConfirmModal({ open: false, type: '', idx: null });
  };
 
  const handleCancelDelete = () => {
    setConfirmModal({ open: false, type: '', idx: null });
  };
 

 
  const [showTable, setShowTable] = useState(false);
  const [tableFilters, setTableFilters] = useState({ orderId: '', name: '', receiver: '' });
 
  return (
    <div className="min-h-screen w-full h-full bg-gradient-to-br from-blue-50 via-white to-blue-100 overflow-x-hidden">
      <Employeeheader />
      <div className="w-full h-full px-0 py-0">
        <div className="flex flex-col md:flex-row md:items-center gap-4 pl-4 pt-4 mb-4">
          <h1 className="text-3xl font-bold text-blue-900">Order Management</h1>
          <button
            className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base shadow transition"
            onClick={() => setShowTable((prev) => !prev)}
          >
            {showTable ? 'Back to Orders' : 'Orders'}
          </button>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveTab(0); }}
            placeholder="Search by Order ID, Name, or Number"
            className="px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 placeholder:text-blue-400 text-base focus:ring-2 focus:ring-blue-400 transition w-full md:w-96"
            style={{ maxWidth: 400 }}
          />
        </div>
        {showTable && (
          <div className="px-4 pb-8">
            <div className="flex flex-wrap gap-4 mb-4">
              <input
                type="text"
                placeholder="Filter by Order ID"
                value={tableFilters.orderId}
                onChange={e => setTableFilters(f => ({ ...f, orderId: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 placeholder:text-blue-400 text-base focus:ring-2 focus:ring-blue-400 transition"
                style={{ minWidth: 160 }}
              />
              <input
                type="text"
                placeholder="Filter by Name"
                value={tableFilters.name}
                onChange={e => setTableFilters(f => ({ ...f, name: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 placeholder:text-blue-400 text-base focus:ring-2 focus:ring-blue-400 transition"
                style={{ minWidth: 160 }}
              />
              <input
                type="text"
                placeholder="Filter by Receiver Number"
                value={tableFilters.receiver}
                onChange={e => setTableFilters(f => ({ ...f, receiver: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 placeholder:text-blue-400 text-base focus:ring-2 focus:ring-blue-400 transition"
                style={{ minWidth: 160 }}
              />
            </div>
            <div className="overflow-x-auto rounded-2xl shadow border border-blue-100 bg-white">
              <table className="min-w-full divide-y divide-blue-100">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Customer Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Receiver Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-50">
                  {orders
                    .filter(order =>
                      (!tableFilters.orderId || order.orderId.toLowerCase().includes(tableFilters.orderId.toLowerCase())) &&
                      (!tableFilters.name || (order.customer.name || '').toLowerCase().includes(tableFilters.name.toLowerCase())) &&
                      (!tableFilters.receiver || (order.receiver || '').toLowerCase().includes(tableFilters.receiver.toLowerCase()))
                    )
                    .map((order) => (
                      <tr key={order.orderId} className="hover:bg-blue-50 transition">
                        <td className="px-4 py-2 font-mono text-blue-900">{order.orderId}</td>
                        <td className="px-4 py-2">{order.customer.name}</td>
                        <td className="px-4 py-2">{order.customer.contact}</td>
                        <td className="px-4 py-2">{order.receiver}</td>
                        <td className="px-4 py-2">
                          <button
                            className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow"
                            onClick={() => {
                              setShowTable(false);
                              // Find the index in filteredOrders for this order
                              const filteredIdx = filteredOrders.findIndex(o => o.orderId === order.orderId);
                              if (filteredIdx !== -1) setActiveTab(filteredIdx);
                              else {
                                // If not in filteredOrders, reset search and set tab by index in orders
                                setSearch('');
                                setActiveTab(orders.findIndex(o => o.orderId === order.orderId));
                              }
                            }}
                          >View/Edit</button>
                        </td>
                      </tr>
                    ))}
                  {orders.filter(order =>
                    (!tableFilters.orderId || order.orderId.toLowerCase().includes(tableFilters.orderId.toLowerCase())) &&
                    (!tableFilters.name || (order.customer.name || '').toLowerCase().includes(tableFilters.name.toLowerCase())) &&
                    (!tableFilters.receiver || (order.receiver || '').toLowerCase().includes(tableFilters.receiver.toLowerCase()))
                  ).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-blue-400">No orders found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {!showTable && (
          <>
            {search && filteredOrders.length === 0 && (
              <div className="mb-8 pl-4 text-red-500 font-semibold text-lg">No order found</div>
            )}
            {filteredOrders.length > 0 && (
              <div className="mb-4 pl-4 text-blue-700 font-semibold">
                Order ID: {filteredOrders[activeTab].orderId}
              </div>
            )}
            {/* Tabs */}
            {filteredOrders.length > 0 && (
              <div className="flex gap-2 mb-6 border-b border-blue-100 pl-4 w-full overflow-x-auto">
                {filteredOrders.map((order, idx) => (
                  <div key={order.orderId} className="relative">
                    <button
                      className={`px-5 py-2 rounded-t-xl font-semibold transition text-base focus:outline-none ${activeTab === idx ? 'bg-white shadow text-blue-900 border border-b-0 border-blue-200' : 'bg-blue-50 text-blue-400 hover:text-blue-700'}`}
                      onClick={() => setActiveTab(idx)}
                    >
                      {order.orderId}
                    </button>
                    {filteredOrders.length > 1 && (
                      <button
                        className="absolute -right-2 -top-2 bg-white text-red-400 hover:text-red-600 rounded-full p-1 shadow"
                        onClick={() => removeTab(idx)}
                        title="Remove order"
                        style={{ zIndex: 2 }}
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="px-4 py-2 rounded-t-xl bg-blue-50 text-blue-500 hover:bg-blue-100 font-bold text-xl ml-2"
                  onClick={addTab}
                  title="Add new order"
                >
                  <FaPlus />
                </button>
              </div>
            )}
            {/* Order Form (per tab) */}
            <div className="bg-white/90 rounded-none shadow-none p-2 md:p-4 border-0 w-full h-full">
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <input
                  type="text"
                  name="name"
                  value={customer.name}
                  onChange={handleCustomerChange}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-50 border-none focus:ring-2 focus:ring-blue-400 text-blue-900 placeholder:text-blue-300 text-base transition"
                  placeholder="Customer Name (optional)"
                />
                <input
                  type="text"
                  name="contact"
                  value={customer.contact}
                  onChange={handleCustomerChange}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-50 border-none focus:ring-2 focus:ring-blue-400 text-blue-900 placeholder:text-blue-300 text-base transition"
                  placeholder="Contact (optional)"
                />
                <input
                  type="text"
                  name="receiver"
                  value={receiver}
                  onChange={handleReceiverChange}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-50 border-none focus:ring-2 focus:ring-blue-400 text-blue-900 placeholder:text-blue-300 text-base transition"
                  placeholder="WhatsApp Number or Group ID (e.g., ESie4aulBDyId1KpkpiH10)"
                  required
                />
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="mb-8 p-5 rounded-2xl border border-blue-100 bg-blue-50/60 shadow-sm relative animate-fadeIn">
                  <div className="flex flex-wrap md:flex-nowrap gap-4 items-stretch">
                    <div className="flex flex-col gap-1 flex-1 min-w-[120px] w-full md:w-auto">
                      <label className="font-semibold text-blue-700 mb-1">Metal</label>
                      <select
                        value={item.metal}
                        onChange={e => handleItemChange(idx, 'metal', e.target.value)}
                        className="px-3 py-2 rounded-lg bg-white border border-blue-200 focus:ring-2 focus:ring-blue-400 text-blue-900 transition"
                      >
                        <option value="Gold">Gold</option>
                        <option value="Silver">Silver</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[140px] w-full md:w-auto">
                      <label className="font-semibold text-blue-700 mb-1">Ornament</label>
                      <select
                        value={item.ornament}
                        onChange={e => handleItemChange(idx, 'ornament', e.target.value)}
                        className="px-3 py-2 rounded-lg bg-white border border-blue-200 focus:ring-2 focus:ring-blue-400 text-blue-900 transition"
                      >
                        {ORNAMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                      {item.ornament === 'Other' && (
                        <input
                          type="text"
                          value={item.otherDetails || ''}
                          onChange={e => handleItemChange(idx, 'otherDetails', e.target.value)}
                          className="mt-2 px-3 py-2 rounded-lg bg-white border border-blue-200 focus:ring-2 focus:ring-blue-400 text-blue-900 placeholder:text-blue-300 transition"
                          placeholder="Enter ornament details"
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 w-full md:w-28">
                      <label className="font-semibold text-blue-700 mb-1">Weight (gms)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.weight || ''}
                        onChange={e => handleItemChange(idx, 'weight', e.target.value)}
                        className="px-3 py-2 rounded-lg bg-white border border-blue-200 focus:ring-2 focus:ring-blue-400 text-blue-900 placeholder:text-blue-300 transition"
                        placeholder="e.g. 10.5"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-full md:w-20">
                      <label className="font-semibold text-blue-700 mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                        className="px-3 py-2 rounded-lg bg-white border border-blue-200 focus:ring-2 focus:ring-blue-400 text-blue-900 transition"
                      />
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-600 bg-white rounded-full p-2 shadow z-10 flex items-center justify-center"
                      title="Remove item"
                      style={{ right: 8, top: 8 }}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold mb-8 transition text-base shadow"
              >
                <FaPlus /> Add Item
              </button>

              {/* Image Upload Section */}
              <div className="mb-8 p-5 rounded-2xl border border-blue-100 bg-blue-50/60 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📸</span>
                  <h3 className="font-semibold text-blue-700 text-lg">Reference Images</h3>
                </div>
                
                {/* Image Upload Input */}
                <div className="mb-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold cursor-pointer transition text-base shadow"
                  >
                    <FaPlus /> Upload Reference Images
                  </label>
                </div>

                {/* Display Uploaded Images */}
                {filteredOrders[activeTab]?.images && filteredOrders[activeTab].images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredOrders[activeTab].images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.imageUrl}
                          alt={`Reference ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-blue-200"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                        <div className="text-xs text-blue-600 mt-1 truncate">{image.name}</div>
                      </div>
                    ))}
                  </div>
                )}

                {(!filteredOrders[activeTab]?.images || filteredOrders[activeTab].images.length === 0) && (
                  <div className="text-center py-8 text-blue-400">
                    <div className="text-4xl mb-2">📸</div>
                    <p className="text-sm">No reference images uploaded yet</p>
                    <p className="text-xs mt-1">Upload images to help with order details</p>
                  </div>
                )}
              </div>
              {filteredOrders.length > 0 && (!orderSent ? (
                <button
                  type="button"
                  onClick={handleSend}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-xl shadow-lg transition mt-2 ${receiver.trim().length < 5 ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                  disabled={receiver.trim().length < 5}
                >
                  <FaWhatsapp className="w-7 h-7" /> Send Order to WhatsApp
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNotify}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg shadow-lg transition mt-4"
                >
                  <FaWhatsapp className="w-6 h-6" /> Remind/Notify about this Order
                </button>
              ))}

              <div className="text-xs text-blue-500 mt-4">
                *For automatic sending with images, you need to use WhatsApp Business API or third-party services. 
                Currently, images need to be manually attached in WhatsApp after the text is sent.
                <br />
                <strong>Tip:</strong> For group IDs, use the format: ESie4aulBDyId1KpkpiH10 (found in group info)
              </div>
            </div>
          </>
        )}
        {/* Confirmation Modal */}
        {confirmModal.open && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 backdrop-blur-sm" onClick={handleCancelDelete}></div>
            <div className="relative bg-white rounded-2xl p-8 shadow-2xl max-w-xs w-full mx-4 animate-fadeIn flex flex-col items-center">
              <div className="mb-4">
                {confirmModal.type === 'item' ? (
                  <FaTrash className="text-red-500 w-12 h-12" />
                ) : (
                  <FaTimes className="text-red-500 w-12 h-12" />
                )}
              </div>
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                {confirmModal.type === 'item' ? 'Delete Item' : 'Delete Order'}
              </h3>
              <p className="mb-6 text-blue-700 text-center">
                {confirmModal.type === 'item'
                  ? 'Are you sure you want to delete this item?'
                  : 'Are you sure you want to delete this order?'}
              </p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition flex items-center justify-center gap-2"
                >
                  {confirmModal.type === 'item' ? <FaTrash /> : <FaTimes />} Delete
                </button>
              </div>
            </div>
          </div>
        )}
        <style>{`
          .animate-fadeIn { animation: fadeIn 0.3s ease; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </div>
  );
}
 
export default Ordermanage;