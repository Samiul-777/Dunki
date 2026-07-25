import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import JourneyStrip from '../components/JourneyStrip.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { fetchDashboard, logout } from '../lib/api.js'
import { useNavigate } from 'react-router-dom'

export default function WorkerDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    fetchDashboard()
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load dashboard.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex bg-paper">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-navy/50">Loading your dashboard…</p>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex bg-paper">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-alert bg-alert/10 border border-alert/30 rounded-card px-4 py-3">
            {error}
          </p>
        </main>
      </div>
    )
  }

  const { worker, journeyStages, documentChecklist = [], recentPayments = [], notifications = [] } = data

  const missingCount = documentChecklist.filter((d) => d.status !== 'complete').length

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar />
      <main className="flex-1 px-6 md:px-10 py-8 max-w-6xl">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-navy/45 font-mono">
              {worker.tracking_id}
            </p>
            <h1 className="font-display text-3xl text-navy mt-1">
              Welcome, {worker.name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-navy/60 mt-1">
              {worker.destination} · via {worker.agency}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-navy text-paper flex items-center justify-center font-display text-lg">
              {worker.name?.[0]}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-navy/60 underline underline-offset-2 hover:text-navy"
            >
              Log out
            </button>
          </div>
        </header>

        <section className="mt-8">
          <h2 className="font-display text-lg text-navy mb-3">Your journey</h2>
          <JourneyStrip stages={journeyStages} />
        </section>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <section className="bg-white rounded-card border border-navy/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-navy">Document checklist</h2>
              {missingCount > 0 ? (
                <StatusBadge level="warning">{missingCount} missing</StatusBadge>
              ) : (
                <StatusBadge level="verified">All complete</StatusBadge>
              )}
            </div>
            <ul className="flex flex-col gap-2.5">
              {documentChecklist.map((d) => (
                <li key={d.name} className="flex items-center justify-between text-sm">
                  <span className="text-navy/80">{d.name}</span>
                  {d.status === 'complete' ? (
                    <StatusBadge level="verified">Complete</StatusBadge>
                  ) : (
                    <StatusBadge level="alert">Missing</StatusBadge>
                  )}
                </li>
              ))}
              {documentChecklist.length === 0 && (
                <p className="text-sm text-navy/40">No documents tracked yet.</p>
              )}
            </ul>
            <Link
              to="/documents"
              className="inline-block mt-4 text-sm font-medium text-navy underline underline-offset-2"
            >
              Manage documents →
            </Link>
          </section>

          <section className="bg-white rounded-card border border-navy/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-navy">Recruitment cost ledger</h2>
              <span className="font-mono text-xs text-navy/45">BDT</span>
            </div>
            <ul className="flex flex-col gap-3">
              {recentPayments.map((p) => (
                <li key={p.purpose} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-navy/80">{p.purpose}</p>
                    <p className="text-xs text-navy/45">{p.method} · {p.date}</p>
                  </div>
                  <span className="font-mono text-navy">৳{p.amount?.toLocaleString()}</span>
                </li>
              ))}
              {recentPayments.length === 0 && (
                <p className="text-sm text-navy/40">No payments recorded yet.</p>
              )}
            </ul>
            <Link
              to="/payments"
              className="inline-block mt-4 text-sm font-medium text-navy underline underline-offset-2"
            >
              View all payments →
            </Link>
          </section>
        </div>

        <section className="mt-6 bg-white rounded-card border border-navy/10 p-5">
          <h2 className="font-display text-lg text-navy mb-4">Notifications</h2>
          <ul className="flex flex-col divide-y divide-navy/8">
            {notifications.map((n) => (
              <li key={n.title} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <StatusBadge level={n.level === 'info' ? 'info' : n.level === 'warning' ? 'warning' : 'alert'}>
                  {n.level}
                </StatusBadge>
                <div className="flex-1">
                  <p className="text-sm text-navy font-medium">{n.title}</p>
                  <p className="text-xs text-navy/55 mt-0.5">{n.detail}</p>
                </div>
                <span className="text-xs text-navy/40 shrink-0">{n.time}</span>
              </li>
            ))}
            {notifications.length === 0 && (
              <p className="text-sm text-navy/40">Nothing new right now.</p>
            )}
          </ul>
        </section>
      </main>
    </div>
  )
}