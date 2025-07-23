import React from 'react'
import Employeeheader from './Employeeheader'
import { Link } from 'react-router-dom'
import { FaCoins, FaExchangeAlt, FaShoppingCart, FaClipboardList, FaChartLine, FaFileAlt } from 'react-icons/fa'
 
const QUICK_ACTIONS = [
  {
    label: 'Tokens',
    to: '/employee/tokens',
    icon: <FaCoins className="w-8 h-8 text-yellow-500 mb-2" />,
  },
  {
    label: 'Exchanges',
    to: '/employee/exchanges',
    icon: <FaExchangeAlt className="w-8 h-8 text-blue-500 mb-2" />,
  },
  {
    label: 'Purchases',
    to: '/employee/purchases',
    icon: <FaShoppingCart className="w-8 h-8 text-green-500 mb-2" />,
  },
  {
    label: 'Orders',
    to: '/employee/order-management',
    icon: <FaClipboardList className="w-8 h-8 text-indigo-500 mb-2" />,
  },
  {
    label: 'Sales',
    to: '/employee/sales',
    icon: <FaChartLine className="w-8 h-8 text-pink-500 mb-2" />,
  },
  {
    label: 'Reports',
    to: '/employee/test-reports',
    icon: <FaFileAlt className="w-8 h-8 text-gray-500 mb-2" />,
  },
]
 
function Employeedashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Employeeheader/>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-blue-800 mb-8 flex items-center gap-3">
          Welcome to Employee Dashboard
        </h1>
        {/* Simple Quick Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-10">
          <h2 className="text-xl font-semibold text-blue-700 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition shadow group border border-blue-100 hover:border-blue-300"
              >
                {action.icon}
                <span className="font-medium text-blue-800 group-hover:text-blue-900 transition text-lg">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
        {/* You can add more dashboard widgets or stats here */}
      </div>
    </div>
  )
}
 
export default Employeedashboard
 
 