import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { fetchMe } from './lib/api.js'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Verify from './pages/Verify.jsx'
import WorkerDashboard from './pages/WorkerDashboard.jsx'
import JobSearch from './pages/JobSearch.jsx'
import Documents from './pages/Documents.jsx'
import Applications from './pages/Applications.jsx'
import Contracts from './pages/Contracts.jsx'
import Payments from './pages/Payments.jsx'
import Complaints from './pages/Complaints.jsx'
import Insights from './pages/Insights.jsx'
import Profile from './pages/Profile.jsx'
import DunkiAssistantWidget from './components/DunkiAssistantWidget.jsx'

function RequireAuth({ children }) {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMe().then(setMe).catch(() => setMe(null)).finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (!me) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  const currentPath = useLocation().pathname
  const showAssistant = Boolean(localStorage.getItem('token')) && !['/login', '/register'].includes(currentPath)

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/dashboard" element={<RequireAuth><WorkerDashboard /></RequireAuth>} />
        <Route path="/jobs" element={<RequireAuth><JobSearch /></RequireAuth>} />
        <Route path="/documents" element={<RequireAuth><Documents /></RequireAuth>} />
        <Route path="/applications" element={<RequireAuth><Applications /></RequireAuth>} />
        <Route path="/contracts" element={<RequireAuth><Contracts /></RequireAuth>} />
        <Route path="/payments" element={<RequireAuth><Payments /></RequireAuth>} />
        <Route path="/complaints" element={<RequireAuth><Complaints /></RequireAuth>} />
        <Route path="/insights" element={<RequireAuth><Insights /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="*" element={<Landing />} />
      </Routes>
      {showAssistant && <DunkiAssistantWidget />}
    </>
  )
}