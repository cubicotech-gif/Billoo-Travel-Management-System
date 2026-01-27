import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  Calendar,
  HelpCircle,
  Settings,
  Crown,
  Plane,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import ThemeToggle from './ThemeToggle'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Hotels', href: '/hotels', icon: Building2 },
  { name: 'Queries', href: '/queries', icon: FileText },
  { name: 'Passengers', href: '/passengers', icon: Users },
  { name: 'Bookings', href: '/bookings', icon: Calendar },
  { name: 'Vendors', href: '/vendors', icon: Building2 },
  { name: 'Help / Info', href: '/help', icon: HelpCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function ModernSidebar() {
  const { user } = useAuthStore()

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Plane className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            Billoo Travels
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-gradient-primary text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Upgrade Pro Section */}
      <div className="p-4 m-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-purple rounded-full mb-3">
          <Crown className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
          Upgrade to Pro
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          Get unlimited access to all premium features and more!
        </p>
        <button className="w-full px-4 py-2 bg-gradient-purple text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          UPGRADE
        </button>
      </div>

      {/* User Profile & Theme Toggle */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Travel Manager
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
