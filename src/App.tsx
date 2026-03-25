import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Login from '@/pages/Login'
import EnhancedDashboard from '@/pages/EnhancedDashboard'
import EnhancedQueries from '@/pages/EnhancedQueries'
import QueryWorkspace from '@/components/queries/QueryWorkspace'
import Passengers from '@/pages/Passengers'
import PassengerProfile from '@/pages/PassengerProfile'
import Vendors from '@/pages/Vendors'
import VendorProfile360 from '@/pages/VendorProfile360'
import Invoices from '@/pages/Invoices'
import FinancialDashboard from '@/pages/FinancialDashboard'
import TransactionLedger from '@/pages/TransactionLedger'
import Reports from '@/pages/Reports'
import Calendar from '@/pages/Calendar'
import Settings from '@/pages/Settings'
import Layout from '@/components/Layout'

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
          element={user ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<EnhancedDashboard />} />
          <Route path="queries" element={<EnhancedQueries />} />
          <Route path="queries/:queryId" element={<QueryWorkspace />} />
          <Route path="passengers" element={<Passengers />} />
          <Route path="passengers/:id" element={<PassengerProfile />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="vendors/:id" element={<VendorProfile360 />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="finance" element={<FinancialDashboard />} />
          <Route path="transactions" element={<TransactionLedger />} />
          <Route path="reports" element={<Reports />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
