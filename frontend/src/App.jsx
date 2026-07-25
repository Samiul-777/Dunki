import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import WorkerDashboard from './pages/WorkerDashboard.jsx'
import JobSearch from './pages/JobSearch.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<WorkerDashboard />} />
      <Route path="/jobs" element={<JobSearch />} />
      <Route path="/documents" element={<WorkerDashboard />} />
      <Route path="/payments" element={<WorkerDashboard />} />
      <Route path="/complaints" element={<WorkerDashboard />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}