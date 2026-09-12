import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { fetchMe } from './lib/api.js'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Verify from './pages/Verify.jsx'
import WorkerDashboard from './pages/WorkerDashboard.jsx'
import JobSearch from './pages/JobSearch.jsx'
import Documents from './pages/Documents.jsx'
import Applications from './pages/Applications.jsx'

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
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/dashboard" element={<RequireAuth><WorkerDashboard /></RequireAuth>} />
      <Route path="/jobs" element={<RequireAuth><JobSearch /></RequireAuth>} />
      <Route path="/documents" element={<RequireAuth><Documents /></RequireAuth>} />
      <Route path="/applications" element={<RequireAuth><Applications /></RequireAuth>} />
      <Route path="/payments" element={<RequireAuth><WorkerDashboard /></RequireAuth>} />
      <Route path="/complaints" element={<RequireAuth><WorkerDashboard /></RequireAuth>} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}