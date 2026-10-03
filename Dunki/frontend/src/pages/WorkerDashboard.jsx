import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import JourneyStrip from '../components/JourneyStrip.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { fetchDashboard, logout } from '../lib/api.js'

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
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-navy/30 border-t-navy rounded-full animate-spin"></div>
            <p className="text-sm font-mono text-navy/60">Loading live registry records…</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex bg-paper">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-card border border-alert/30 p-6 max-w-md w-full shadow-sm text-center">
            <p className="text-sm text-alert font-medium">{error || 'Failed to load dashboard data.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-card bg-navy text-paper text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    )
  }

  const {
    worker = {},
    journeyStages = [],
    documentChecklist = [],
    documentStats = {},
    recentPayments = [],
    paymentSummary = {},
    notifications = [],
    complaintsSummary = {},
    stats = {},
    agencyStats,
    recentApplications = [],
  } = data

  const isAgency = worker.role === 'agency'
  const missingCount = documentStats.missing ?? documentChecklist.filter((d) => d.status !== 'complete').length

  // If role is Agency, render dedicated Agency Command Center
  if (isAgency && agencyStats) {
    return (
      <div className="min-h-screen flex bg-paper">
        <Sidebar user={worker} />
        <main className="flex-1 px-6 md:px-10 py-8 max-w-6xl">
          <header className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-navy/45 font-mono">
                  {worker.tracking_id}
                </span>
                <StatusBadge level="verified">Authorized Agency</StatusBadge>
              </div>
              <h1 className="font-display text-3xl text-navy mt-1">
                {worker.name}
              </h1>
              <p className="text-sm text-navy/60 mt-1">
                Recruitment Agency Control Center · Licensed Overseas Provider
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="text-xs text-navy/60 underline underline-offset-2 hover:text-navy font-medium"
              >
                Log out
              </button>
            </div>
          </header>

          {/* Agency KPI Grid */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-card border border-navy/10 p-5 shadow-sm">
              <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Posted Circulars</p>
              <p className="font-mono text-3xl font-bold text-navy mt-1">{agencyStats.total_jobs}</p>
              <Link to="/jobs" className="text-xs text-navy font-semibold underline mt-2 inline-block">
                Manage circulars →
              </Link>
            </div>

            <div className="bg-white rounded-card border border-navy/10 p-5 shadow-sm">
              <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Pending Applicants</p>
              <p className="font-mono text-3xl font-bold text-amber-600 mt-1">{agencyStats.pending_reviews}</p>
              <Link to="/applications" className="text-xs text-navy font-semibold underline mt-2 inline-block">
                Review applicants →
              </Link>
            </div>

            <div className="bg-white rounded-card border border-navy/10 p-5 shadow-sm">
              <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Accepted Candidates</p>
              <p className="font-mono text-3xl font-bold text-emerald-600 mt-1">{agencyStats.accepted_candidates}</p>
              <p className="text-xs text-navy/40 mt-1">In processing pipeline</p>
            </div>

            <div className="bg-white rounded-card border border-navy/10 p-5 shadow-sm">
              <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Grievances Filed</p>
              <p className="font-mono text-3xl font-bold text-navy mt-1">{agencyStats.complaints_received}</p>
              <Link to="/complaints" className="text-xs text-navy font-semibold underline mt-2 inline-block">
                View complaints →
              </Link>
            </div>
          </section>

          {/* Agency Action Center */}
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <section className="bg-white rounded-card border border-navy/10 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg text-navy">Recent Applicants</h2>
                <Link to="/applications" className="text-xs font-semibold text-navy underline">
                  All Applications →
                </Link>
              </div>
              <ul className="flex flex-col divide-y divide-navy/8">
                {recentApplications.map((app) => (
                  <li key={app.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-navy">{app.applicant?.name || 'Applicant'}</p>
                      <p className="text-xs text-navy/50 mt-0.5">
                        Applied for: {app.job?.title} · {app.applicant?.phone}
                      </p>
                    </div>
                    <StatusBadge level={app.status === 'accepted' ? 'verified' : app.status === 'rejected' ? 'alert' : 'warning'}>
                      {app.status}
                    </StatusBadge>
                  </li>
                ))}
                {recentApplications.length === 0 && (
                  <p className="text-sm text-navy/40 py-4">No candidates have applied to your circulars yet.</p>
                )}
              </ul>
            </section>

            <section className="bg-white rounded-card border border-navy/10 p-5 shadow-sm">
              <h2 className="font-display text-lg text-navy mb-4">Agency Operations &amp; Tools</h2>
              <div className="flex flex-col gap-3">
                <Link
                  to="/jobs"
                  className="flex items-center justify-between p-3.5 rounded-card border border-navy/15 hover:border-stamp hover:bg-paper/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy">Post Circular with AI Assistant</p>
                    <p className="text-xs text-navy/55 mt-0.5">Use Gemini to generate verified BMET job circulars in seconds</p>
                  </div>
                  <span className="font-bold text-navy">→</span>
                </Link>

                <Link
                  to="/applications"
                  className="flex items-center justify-between p-3.5 rounded-card border border-navy/15 hover:border-stamp hover:bg-paper/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy">Candidate Application Tracker</p>
                    <p className="text-xs text-navy/55 mt-0.5">Accept, reject, and inspect worker documents</p>
                  </div>
                  <span className="font-bold text-navy">→</span>
                </Link>

                <Link
                  to="/complaints"
                  className="flex items-center justify-between p-3.5 rounded-card border border-navy/15 hover:border-stamp hover:bg-paper/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy">Grievance &amp; Dispute Mediation</p>
                    <p className="text-xs text-navy/55 mt-0.5">Resolve worker concerns before BMET enforcement escalation</p>
                  </div>
                  <span className="font-bold text-navy">→</span>
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    )
  }

  // Worker & Family Nominee Live Dashboard
  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar user={worker} />
      <main className="flex-1 px-6 md:px-10 py-8 max-w-6xl">
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-navy/45 font-mono">
              {worker.tracking_id}
            </p>
            <h1 className="font-display text-3xl text-navy mt-1">
              Welcome, {worker.name?.split(' ')[0] || 'Worker'}
            </h1>
            <p className="text-sm text-navy/60 mt-1">
              Destination: <span className="font-medium text-navy/80">{worker.destination}</span> · Agency: <span className="font-medium text-navy/80">{worker.agency}</span>
            </p>
            <div className="flex items-center gap-2.5 mt-2.5">
              {worker.verification_status === 'verified' ? (
                <>
                  <StatusBadge level="verified">Verified Worker</StatusBadge>
                  <span className="text-xs text-navy/50 font-mono">Registry Identity Verified</span>
                </>
              ) : (
                <>
                  <StatusBadge level="alert">Unverified Account</StatusBadge>
                  <Link to="/verify" className="text-xs font-semibold text-stamp underline hover:text-stamp-dark">
                    Verify Identity Now →
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-navy text-paper flex items-center justify-center font-display text-lg shadow-sm">
              {worker.name?.[0] || 'W'}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-navy/60 underline underline-offset-2 hover:text-navy font-medium"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Quick Action Navigation Bar */}
        <section className="mt-6 flex flex-wrap gap-2.5">
          <Link
            to="/jobs"
            className="text-xs font-semibold bg-white border border-navy/15 hover:border-navy/40 text-navy px-3.5 py-2 rounded-card shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>⌕</span> Browse Verified Jobs
          </Link>
          <Link
            to="/documents"
            className="text-xs font-semibold bg-white border border-navy/15 hover:border-navy/40 text-navy px-3.5 py-2 rounded-card shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>▤</span> Upload Documents ({missingCount} missing)
          </Link>
          <Link
            to="/payments"
            className="text-xs font-semibold bg-white border border-navy/15 hover:border-navy/40 text-navy px-3.5 py-2 rounded-card shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>৳</span> Record Payment
          </Link>
          <Link
            to="/complaints"
            className="text-xs font-semibold bg-white border border-alert/30 hover:border-alert text-alert px-3.5 py-2 rounded-card shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>!</span> Lodge Grievance / Dispute
          </Link>
          <Link
            to="/contracts"
            className="text-xs font-semibold bg-white border border-navy/15 hover:border-navy/40 text-navy px-3.5 py-2 rounded-card shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>§</span> Verified Contracts
          </Link>
        </section>

        {/* Dynamic Journey Progress Strip */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-navy">Recruitment Journey &amp; Milestones</h2>
            <span className="text-xs font-mono text-navy/45">Computed from live database records</span>
          </div>
          <JourneyStrip stages={journeyStages} />
        </section>

        {/* Dynamic Summary Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="bg-white rounded-card border border-navy/10 p-4 shadow-sm">
            <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Document Readiness</p>
            <p className="font-mono text-2xl font-bold text-navy mt-1">
              {documentStats.percentage ?? 0}%
            </p>
            <p className="text-xs text-navy/50 mt-1">
              {documentStats.completed ?? 0} of {documentStats.total ?? 0} verified
            </p>
          </div>

          <div className="bg-white rounded-card border border-navy/10 p-4 shadow-sm">
            <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Recruitment Cost Paid</p>
            <p className="font-mono text-2xl font-bold text-navy mt-1">
              ৳{Number(paymentSummary.total_paid || 0).toLocaleString()}
            </p>
            <p className="text-xs text-navy/50 mt-1">
              {paymentSummary.is_overcharged ? (
                <span className="text-alert font-semibold">Exceeds legal cap!</span>
              ) : (
                `Cap: ৳${Number(paymentSummary.cost_cap || 0).toLocaleString()}`
              )}
            </p>
          </div>

          <div className="bg-white rounded-card border border-navy/10 p-4 shadow-sm">
            <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Job Applications</p>
            <p className="font-mono text-2xl font-bold text-navy mt-1">
              {stats.applications_count ?? 0}
            </p>
            <Link to="/applications" className="text-xs text-navy underline mt-1 inline-block">
              View submission status →
            </Link>
          </div>

          <div className="bg-white rounded-card border border-navy/10 p-4 shadow-sm">
            <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Grievances / Disputes</p>
            <p className="font-mono text-2xl font-bold text-navy mt-1">
              {complaintsSummary.total ?? 0}
            </p>
            <Link to="/complaints" className="text-xs text-navy underline mt-1 inline-block">
              {complaintsSummary.active ? `${complaintsSummary.active} active dispute` : 'File a grievance →'}
            </Link>
          </div>
        </section>

        {/* 2-Column Grid: Document Checklist & Cost Ledger */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <section className="bg-white rounded-card border border-navy/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-navy">Document Checklist</h2>
              {missingCount > 0 ? (
                <StatusBadge level="warning">{missingCount} missing</StatusBadge>
              ) : (
                <StatusBadge level="verified">All complete</StatusBadge>
              )}
            </div>
            <ul className="flex flex-col gap-2.5">
              {documentChecklist.map((d) => (
                <li key={d.name} className="flex items-center justify-between text-sm py-1 border-b border-navy/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-navy/80">{d.name}</span>
                    {d.file_url && (
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-stamp underline hover:text-stamp-dark"
                        title="View document"
                      >
                        [view]
                      </a>
                    )}
                  </div>
                  {d.status === 'complete' ? (
                    <StatusBadge level="verified">Complete</StatusBadge>
                  ) : (
                    <StatusBadge level="alert">Missing</StatusBadge>
                  )}
                </li>
              ))}
              {documentChecklist.length === 0 && (
                <p className="text-sm text-navy/40 py-2">No documents tracked yet.</p>
              )}
            </ul>
            <Link
              to="/documents"
              className="inline-block mt-4 text-xs font-semibold text-navy underline underline-offset-2 hover:text-navy/80"
            >
              Upload &amp; manage documents →
            </Link>
          </section>

          <section className="bg-white rounded-card border border-navy/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-navy">Recruitment Cost Ledger</h2>
              <span className="font-mono text-xs text-navy/45">BDT (৳)</span>
            </div>
            <ul className="flex flex-col gap-3">
              {recentPayments.map((p) => (
                <li key={p.id || p.purpose} className="flex items-center justify-between text-sm py-1 border-b border-navy/5 last:border-0">
                  <div>
                    <p className="text-navy/80 font-medium">{p.purpose}</p>
                    <p className="text-xs text-navy/45">
                      {p.method} · {p.date} {p.receipt_url && '· 📎 Receipt attached'}
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-navy">
                    ৳{Number(p.amount).toLocaleString()}
                  </span>
                </li>
              ))}
              {recentPayments.length === 0 && (
                <p className="text-sm text-navy/40 py-2">No payment transactions recorded yet.</p>
              )}
            </ul>
            <div className="flex items-center justify-between mt-4 pt-2">
              <Link
                to="/payments"
                className="text-xs font-semibold text-navy underline underline-offset-2 hover:text-navy/80"
              >
                View all payments ({recentPayments.length}) →
              </Link>
              <Link
                to="/payments"
                className="text-xs font-semibold bg-navy text-paper px-2.5 py-1 rounded hover:bg-navy/90"
              >
                + Record Payment
              </Link>
            </div>
          </section>
        </div>

        {/* Live Notifications Feed */}
        <section className="mt-6 bg-white rounded-card border border-navy/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-navy">Registry Alerts &amp; Updates</h2>
            <span className="text-xs font-mono text-navy/40">Real-time status</span>
          </div>
          <ul className="flex flex-col divide-y divide-navy/8">
            {notifications.map((n) => (
              <li key={n.id || n.title} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <StatusBadge level={n.level === 'alert' ? 'alert' : n.level === 'warning' ? 'warning' : n.level === 'verified' ? 'verified' : 'info'}>
                  {n.level}
                </StatusBadge>
                <div className="flex-1">
                  <p className="text-sm text-navy font-medium">{n.title}</p>
                  <p className="text-xs text-navy/60 mt-0.5">{n.detail}</p>
                  {n.link && (
                    <Link to={n.link} className="inline-block mt-1 text-xs font-semibold text-stamp underline hover:text-stamp-dark">
                      Take action →
                    </Link>
                  )}
                </div>
                <span className="text-xs text-navy/40 shrink-0 font-mono">{n.time}</span>
              </li>
            ))}
            {notifications.length === 0 && (
              <p className="text-sm text-navy/40 py-2">No active alerts right now.</p>
            )}
          </ul>
        </section>
      </main>
    </div>
  )
}