import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  Search,
  Users,
  Building2,
  DollarSign,
  BarChart3,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  BookOpen,
  FileText,
  TrendingUp,
  ChevronDown,
  Upload,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  name: string
  href: string
  icon: any
  children?: { name: string; href: string; icon: any }[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Queries', href: '/queries', icon: Search },
  { name: 'Passengers', href: '/passengers', icon: Users },
  { name: 'Vendors', href: '/vendors', icon: Building2 },
  {
    name: 'Finance',
    href: '/finance',
    icon: DollarSign,
    children: [
      { name: 'Overview', href: '/finance', icon: DollarSign },
      { name: 'Transactions', href: '/finance/transactions', icon: BookOpen },
      { name: 'Invoices', href: '/finance/invoices', icon: FileText },
      { name: 'Reports', href: '/finance/reports', icon: TrendingUp },
      { name: 'Bulk Import', href: '/finance/bulk-upload', icon: Upload },
    ],
  },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
]

export default function Layout() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['Finance'])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleSection = (name: string) => {
    setExpandedSections(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  const isFinanceActive = location.pathname.startsWith('/finance')

  const renderNavItem = (item: NavItem, mobile = false) => {
    if (item.children) {
      const isExpanded = expandedSections.includes(item.name) || isFinanceActive
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleSection(item.name)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isFinanceActive
                ? 'text-primary-700 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              <item.icon className="w-5 h-5 flex-shrink-0 mr-3" />
              <span>{item.name}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-0.5">
              {item.children.map(child => (
                <NavLink
                  key={child.href}
                  to={child.href}
                  end={child.href === '/finance'}
                  onClick={mobile ? () => setSidebarOpen(false) : undefined}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      isActive
                        ? 'text-primary-700 bg-primary-50 font-medium'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`
                  }
                >
                  <child.icon className="w-4 h-4 flex-shrink-0 mr-2.5" />
                  <span>{child.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <NavLink
        key={item.name}
        to={item.href}
        onClick={mobile ? () => setSidebarOpen(false) : undefined}
        className={({ isActive }) =>
          isActive
            ? 'nav-item-active'
            : 'nav-item-inactive'
        }
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span>{item.name}</span>
      </NavLink>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/20">
      {/* Mobile sidebar backdrop & panel */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        <div className={`fixed inset-y-0 left-0 flex flex-col w-72 bg-white shadow-2xl transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* Mobile Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-display font-bold text-gradient">
                Billoo Travel
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Premium Travel Portal</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navigation.map(item => renderNavItem(item, true))}
          </nav>

          {/* Mobile User Section */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3 mb-3 p-3 bg-white rounded-xl shadow-soft">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shadow-glow">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-danger-600 rounded-xl hover:bg-danger-50 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r border-gray-200 shadow-soft">
          {/* Desktop Logo */}
          <div className="px-6 py-6 border-b border-gray-100">
            <h1 className="text-2xl font-display font-bold text-gradient mb-1">
              Billoo Travel
            </h1>
            <p className="text-sm text-gray-500">Premium Travel Portal</p>
          </div>

          {/* Desktop Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navigation.map(item => renderNavItem(item))}
          </nav>

          {/* Desktop User Section */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3 mb-3 p-3 bg-white rounded-xl shadow-soft">
              <div className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shadow-glow">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-danger-600 rounded-xl hover:bg-danger-50 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-16 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-soft lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-gray-600 hover:text-gray-900 focus:outline-none transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center flex-1 px-4">
            <h1 className="text-lg font-display font-bold text-gradient">Billoo Travel</h1>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
