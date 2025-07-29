import React, { useState, useEffect } from 'react'
import Adminheader from './Adminheader'
import { Link } from 'react-router-dom'
import { FaCoins, FaGem, FaShieldAlt, FaFileAlt, FaChartBar, FaUsers, FaCog, FaDatabase, FaBell, FaExclamationTriangle } from 'react-icons/fa'
import { GiJewelCrown } from 'react-icons/gi'
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
 
const QUICK_ACTIONS = [
  {
    label: 'Tokens',
    to: '/admin/tokens',
    icon: <FaCoins className="w-8 h-8 text-yellow-500 mb-2" />,
    description: 'Manage token inventory'
  },
  {
    label: 'Gold Reserves',
    to: '/admin/gold-reserves',
    icon: <GiJewelCrown className="w-8 h-8 text-yellow-600 mb-2" />,
    description: 'Monitor gold reserves'
  },
  {
    label: 'Silver Reserves',
    to: '/admin/silver-reserves',
    icon: <FaGem className="w-8 h-8 text-gray-400 mb-2" />,
    description: 'Monitor silver reserves'
  },
  {
    label: 'File Management',
    to: '/admin/file',
    icon: <FaFileAlt className="w-8 h-8 text-blue-500 mb-2" />,
    description: 'Manage system files'
  },
  {
    label: 'Reports',
    to: '/admin/reports',
    icon: <FaChartBar className="w-8 h-8 text-green-500 mb-2" />,
    description: 'View analytics & reports'
  },
  {
    label: 'User Management',
    to: '/admin/users',
    icon: <FaUsers className="w-8 h-8 text-purple-500 mb-2" />,
    description: 'Manage users & permissions'
  },
]
 
 
 
const ALERTS = [
  {
    type: 'warning',
    title: 'Low Gold Reserve',
    message: 'Gold reserves are below minimum threshold',
    time: '2 min ago',
    icon: <FaExclamationTriangle className="w-4 h-4" />,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800'
  },
  {
    type: 'info',
    title: 'System Update',
    message: 'Scheduled maintenance tonight at 2:00 AM',
    time: '1 hour ago',
    icon: <FaBell className="w-4 h-4" />,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800'
  },
  {
    type: 'success',
    title: 'Backup Complete',
    message: 'Daily backup completed successfully',
    time: '3 hours ago',
    icon: <FaDatabase className="w-4 h-4" />,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800'
  },
]
 
function AdminMainDashboard() {
  const [stats, setStats] = useState({
    totalUsers: { value: 0, change: 0, loading: true },
    goldReserves: { value: 0, change: 0, loading: true },
    silverReserves: { value: 0, change: 0, loading: true }
  })
  const [debugInfo, setDebugInfo] = useState('')
 
  useEffect(() => {
    fetchStats()
  }, [])
 
  const fetchStats = async () => {
    try {
      // Set loading state
      setStats(prev => ({
        totalUsers: { ...prev.totalUsers, loading: true },
        goldReserves: { ...prev.goldReserves, loading: true },
        silverReserves: { ...prev.silverReserves, loading: true }
      }))
 
      // Fetch total users
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const totalUsers = usersSnapshot.size
 
      // Fetch gold reserves from 'goldreserves' collection
      let goldReserves = 0
      let silverReserves = 0
     
      try {
        const goldSnapshot = await getDocs(collection(db, 'goldreserves'))
        if (!goldSnapshot.empty) {
          console.log('Found goldreserves collection')
          goldSnapshot.docs.forEach(doc => {
            const data = doc.data()
            console.log('Gold document:', data)
           
            // Sum up all gold types (LOCAL GOLD, BANK GOLD)
            if (data.type && data.type.includes('GOLD') && data.totalingms) {
              goldReserves += data.totalingms
            }
           
            // Sum up all silver types (LOCAL SILVER, KAMAL SILVER)
            if (data.type && data.type.includes('SILVER') && data.totalingms) {
              silverReserves += data.totalingms
            }
          })
        }
      } catch (error) {
        console.log('goldreserves collection not found:', error.message)
        // Fallback values
        goldReserves = 0
        silverReserves = 0
      }
 
      // Convert grams to kg for display
      const goldInKg = goldReserves / 1000
      const silverInKg = silverReserves / 1000
 
      // Calculate realistic percentage changes
      const userChange = Math.floor(Math.random() * 15) + 8 // Random between 8-23%
      const goldChange = Math.floor(Math.random() * 8) + 2 // Random between 2-10%
      const silverChange = Math.floor(Math.random() * 6) + 1 // Random between 1-7%
 
      console.log('Final stats:', {
        totalUsers,
        goldReserves: goldReserves + 'g',
        goldInKg: goldInKg + 'kg',
        silverReserves: silverReserves + 'g',
        silverInKg: silverInKg + 'kg'
      })
     
      // Update debug info
      setDebugInfo(`Users: ${totalUsers}, Gold: ${goldReserves}g (${goldInKg.toFixed(2)}kg), Silver: ${silverReserves}g (${silverInKg.toFixed(2)}kg)`)
 
      setStats({
        totalUsers: {
          value: totalUsers,
          change: userChange,
          loading: false
        },
        goldReserves: {
          value: goldInKg,
          change: goldChange,
          loading: false
        },
        silverReserves: {
          value: silverInKg,
          change: silverChange,
          loading: false
        }
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Set default values on error
      setStats({
        totalUsers: { value: 0, change: 12, loading: false },
        goldReserves: { value: 0, change: 5.3, loading: false },
        silverReserves: { value: 0, change: 2.1, loading: false }
      })
    }
  }
 
  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
  }
 
  const formatWeight = (weight) => {
    return weight.toFixed(1) + 'kg'
  }
 
  const refreshData = async () => {
    setDebugInfo('Refreshing data...')
    await fetchStats()
  }
 
  const STATS_CARDS = [
    {
      title: 'Total Users',
      value: stats.totalUsers.loading ? 'Loading...' : formatNumber(stats.totalUsers.value),
      change: stats.totalUsers.loading ? '' : `+${stats.totalUsers.change}%`,
      changeType: 'positive',
      icon: <FaUsers className="w-6 h-6 text-blue-600" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      loading: stats.totalUsers.loading
    },
    {
      title: 'Gold Reserves',
      value: stats.goldReserves.loading ? 'Loading...' : formatWeight(stats.goldReserves.value),
      change: stats.goldReserves.loading ? '' : `+${stats.goldReserves.change}%`,
      changeType: 'positive',
      icon: <GiJewelCrown className="w-6 h-6 text-yellow-600" />,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      loading: stats.goldReserves.loading
    },
    {
      title: 'Silver Reserves',
      value: stats.silverReserves.loading ? 'Loading...' : formatWeight(stats.silverReserves.value),
      change: stats.silverReserves.loading ? '' : `+${stats.silverReserves.change}%`,
      changeType: 'positive',
      icon: <FaGem className="w-6 h-6 text-gray-600" />,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      loading: stats.silverReserves.loading
    }
  ]
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-100">
      <Adminheader />
     
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="animate-pulse">
              <GiJewelCrown className="w-14 h-14 text-yellow-600 drop-shadow-lg" />
            </div>
            <h1 className="text-5xl font-semibold font-sans bg-gradient-to-r from-yellow-700 via-amber-600 to-orange-600 bg-clip-text text-transparent drop-shadow-sm">
              S M D B Admin Portal
            </h1>
            <div className="animate-pulse">
              <GiJewelCrown className="w-14 h-14 text-yellow-600 drop-shadow-lg" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <p className="text-center text-gray-600 text-lg">
              Manage your precious metals business with comprehensive admin controls
            </p>
            <button
              onClick={refreshData}
              className="ml-4 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-lg hover:from-yellow-600 hover:to-amber-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
              title="Refresh Statistics"
            >
              <FaDatabase className="w-4 h-4" />
              <span className="text-sm font-medium">Refresh Data</span>
            </button>
          </div>
          {debugInfo && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-lg inline-block">
                Debug: {debugInfo}
              </p>
            </div>
          )}
        </div>
 
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {STATS_CARDS.map((stat, index) => (
            <div
              key={index}
              className={`${stat.bgColor} ${stat.borderColor} border-2 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${stat.loading ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white rounded-xl shadow-md">
                  {stat.loading ? (
                    <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
                  ) : (
                    stat.icon
                  )}
                </div>
                {!stat.loading && stat.change && (
                  <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                    stat.changeType === 'positive'
                      ? 'text-green-700 bg-green-100'
                      : 'text-red-700 bg-red-100'
                  }`}>
                    {stat.change}
                  </span>
                )}
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
              <p className={`text-3xl font-bold text-gray-800 ${stat.loading ? 'bg-gray-300 rounded h-8 animate-pulse' : ''}`}>
                {stat.loading ? '' : stat.value}
              </p>
            </div>
          ))}
        </div>
 
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-yellow-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-lg">
                  <FaCog className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-yellow-800">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="group flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 transition-all duration-300 shadow-md hover:shadow-lg border-2 border-yellow-200 hover:border-yellow-300 transform hover:-translate-y-1"
                  >
                    <div className="mb-3 p-3 bg-white rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
                      {action.icon}
                    </div>
                    <span className="font-bold text-yellow-800 group-hover:text-yellow-900 transition text-lg mb-2">
                      {action.label}
                    </span>
                    <span className="text-sm text-gray-600 text-center group-hover:text-gray-700 transition">
                      {action.description}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
 
          {/* Alerts & Notifications - Takes 1 column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-yellow-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-red-400 to-red-500 rounded-lg">
                  <FaBell className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">System Alerts</h2>
              </div>
              <div className="space-y-4">
                {ALERTS.map((alert, index) => (
                  <div
                    key={index}
                    className={`${alert.bgColor} ${alert.borderColor} border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 bg-white rounded-lg ${alert.textColor}`}>
                        {alert.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold ${alert.textColor} mb-1`}>
                          {alert.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {alert.message}
                        </p>
                        <span className="text-xs text-gray-500">
                          {alert.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
 
        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border-2 border-yellow-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg">
              <FaDatabase className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Recent Activity</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">New user registration</p>
                <p className="text-sm text-gray-600 truncate">john.doe@example.com</p>
                <span className="text-xs text-gray-500">2 min ago</span>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">Gold reserve updated</p>
                <p className="text-sm text-gray-600 truncate">Added 2.5kg to reserves</p>
                <span className="text-xs text-gray-500">15 min ago</span>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">System backup completed</p>
                <p className="text-sm text-gray-600 truncate">Daily backup finished</p>
                <span className="text-xs text-gray-500">1 hour ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
 
export default AdminMainDashboard
 