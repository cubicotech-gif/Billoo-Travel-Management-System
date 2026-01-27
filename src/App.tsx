import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Login from '@/pages/Login'
import ModernDashboard from '@/pages/ModernDashboard'
import EnhancedQueries from '@/pages/EnhancedQueries'
import Passengers from '@/pages/Passengers'
import Vendors from '@/pages/Vendors'
import Invoices from '@/pages/Invoices'
import Reports from '@/pages/Reports'
import Calendar from '@/pages/Calendar'
import Settings from '@/pages/Settings'
import ModernLayout from '@/components/ModernLayout'

function App() {
  const { user, loading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

        <Route
          path="/"
          element={user ? <ModernLayout /> : <Navigate to="/login" />}
        >
          <Route index element={<ModernDashboard />} />
          <Route path="queries" element={<EnhancedQueries />} />
          <Route path="passengers" element={<Passengers />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="reports" element={<Reports />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
