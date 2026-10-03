import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { fetchComplaints, createComplaint, escalateComplaint, deleteComplaint } from '../lib/api.js'

const COMPLAINT_CATEGORIES = [
  'Overcharging / Illegal Fees',
  'Fake Visa / False Promise',
  'Contract Substitution (Salary/Job Changed)',
  'Passport / Document Withholding',
  'Physical Abuse / Workplace Harassment',
  'Delayed Deployment Beyond Agreement',
  'Unpaid Wages / Stranded Abroad',
  'Substandard Food & Living Conditions',
  'Other Grievance',
]

const statusLevelMap = {
  submitted: 'info',
  under_review: 'warning',
  investigating: 'warning',
  escalated_to_bmet: 'alert',
  resolved: 'verified',
  dismissed: 'alert',
}

const statusLabelMap = {
  submitted: 'Submitted',
  under_review: 'Under Agency Review',
  investigating: 'Under BMET Investigation',
  escalated_to_bmet: 'Escalated to Ministry / BMET',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
}

export default function Complaints() {
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [escalatingId, setEscalatingId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const [form, setForm] = useState({
    against_agency: '',
    category: 'Overcharging / Illegal Fees',
    priority: 'medium',
    subject: '',
    description: '',
  })
  const [evidenceFile, setEvidenceFile] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchComplaints()
      setComplaints(data.complaints || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load complaints.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('against_agency', form.against_agency)
      formData.append('category', form.category)
      formData.append('priority', form.priority)
      formData.append('subject', form.subject)
      formData.append('description', form.description)
      if (evidenceFile) formData.append('evidence', evidenceFile)

      await createComplaint(formData)
      setSuccess('Complaint officially registered with tracking ID and logged to the registry.')
      setShowModal(false)
      setForm({
        against_agency: '',
        category: 'Overcharging / Illegal Fees',
        priority: 'medium',
        subject: '',
        description: '',
      })
      setEvidenceFile(null)
      loadData()
    } catch (err) {
      const msgs = err.response?.data?.errors
      setError(msgs ? Object.values(msgs).flat().join(' ') : 'Failed to lodge complaint.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEscalate = async (id) => {
    if (!window.confirm('Are you sure you want to escalate this complaint directly to the Ministry of Expatriates’ Welfare & BMET Vigilance Cell?')) {
      return
    }

    setEscalatingId(id)
    try {
      await escalateComplaint(id)
      setSuccess('Complaint escalated to BMET. Government legal officers have been notified.')
      loadData()
    } catch {
      setError('Failed to escalate complaint.')
    } finally {
      setEscalatingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Withdraw this complaint? This cannot be undone.')) return
    try {
      await deleteComplaint(id)
      setSuccess('Complaint withdrawn.')
      loadData()
    } catch {
      setError('Failed to withdraw complaint.')
    }
  }

  const filteredComplaints = filterStatus === 'all'
    ? complaints
    : complaints.filter((c) => c.status === filterStatus)

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar />
      <main className="flex-1 px-6 md:px-10 py-8 max-w-6xl">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-navy/45 bg-navy/5 px-2 py-0.5 rounded">
                Grievance Redressal Cell
              </span>
              <span className="text-xs font-mono text-stamp font-medium">Overseas Worker Protection</span>
            </div>
            <h1 className="font-display text-3xl text-navy mt-1">Complaints &amp; Disputes</h1>
            <p className="text-sm text-navy/60 mt-1 max-w-2xl">
              File official grievances against exploitative agencies, unauthorized visa brokers, or contract fraud. All submissions are legally binding and monitored by BMET.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="self-start sm:self-auto rounded-card bg-alert text-paper px-4 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <span className="font-bold text-base leading-none">!</span>
            Lodge a Complaint
          </button>
        </header>

        {/* Emergency Helpline Banner */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-start gap-3">
            <span className="text-xl">☎</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">24/7 Expatriate Welfare Helpline</p>
              <p className="text-sm text-amber-900 font-medium">
                Call <span className="font-mono font-bold">16135</span> (Toll-Free within Bangladesh) or <span className="font-mono font-bold">+880 9610-102030</span> (From Abroad)
              </p>
            </div>
          </div>
          <span className="text-xs text-amber-700 bg-amber-100/60 px-3 py-1.5 rounded font-mono shrink-0">
            Wage Earners' Welfare Board (WEWB)
          </span>
        </div>

        {error && (
          <div className="mt-6 text-sm text-alert bg-alert/10 border border-alert/30 rounded-card px-4 py-3 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-alert font-bold ml-2">✕</button>
          </div>
        )}

        {success && (
          <div className="mt-6 text-sm text-verified bg-emerald-50 border border-emerald-200 rounded-card px-4 py-3 text-emerald-800 flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-emerald-800 font-bold ml-2">✕</button>
          </div>
        )}

        {/* KPI Stats */}
        {stats && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-card border border-navy/10 p-4">
              <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Total Lodged</p>
              <p className="font-mono text-2xl font-bold text-navy mt-1">{stats.total}</p>
              <p className="text-xs text-navy/40 mt-1">Official registry cases</p>
            </div>

            <div className="bg-white rounded-card border border-navy/10 p-4">
              <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Under Investigation</p>
              <p className="font-mono text-2xl font-bold text-amber-600 mt-1">
                {stats.submitted + stats.under_review + stats.investigating}
              </p>
              <p className="text-xs text-navy/40 mt-1">Active case review</p>
            </div>

            <div className="bg-white rounded-card border border-navy/10 p-4">
              <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Escalated to BMET</p>
              <p className="font-mono text-2xl font-bold text-alert mt-1">{stats.escalated_to_bmet}</p>
              <p className="text-xs text-navy/40 mt-1">Ministry level enforcement</p>
            </div>

            <div className="bg-white rounded-card border border-navy/10 p-4">
              <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Resolved</p>
              <p className="font-mono text-2xl font-bold text-emerald-600 mt-1">{stats.resolved}</p>
              <p className="text-xs text-navy/40 mt-1">Successfully settled</p>
            </div>
          </section>
        )}

        {/* Filter bar */}
        <section className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-card border border-navy/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-navy/60 font-medium">Filter by status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-paper border border-navy/15 rounded px-2.5 py-1.5 text-navy outline-none focus:border-stamp"
            >
              <option value="all">All Statuses ({complaints.length})</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="escalated_to_bmet">Escalated to BMET</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <p className="text-xs font-mono text-navy/50">
            Showing {filteredComplaints.length} of {complaints.length} complaints
          </p>
        </section>

        {/* Complaints list */}
        <section className="mt-4 flex flex-col gap-4">
          {loading ? (
            <p className="p-8 text-center text-sm text-navy/50 bg-white rounded-card border border-navy/10">
              Loading complaints…
            </p>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-card border border-navy/10">
              <p className="text-sm font-medium text-navy">No complaints found.</p>
              <p className="text-xs text-navy/50 mt-1">
                If an agency changes your agreed salary, demands unauthorized cash, or withholds your passport, lodge a complaint immediately.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 inline-block text-xs font-semibold text-alert bg-alert/10 border border-alert/30 px-3.5 py-2 rounded-card hover:bg-alert/20"
              >
                + Lodge Complaint Now
              </button>
            </div>
          ) : (
            filteredComplaints.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-card border border-navy/10 p-5 shadow-sm hover:border-navy/20 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-navy bg-navy/5 px-2 py-0.5 rounded">
                        {c.tracking_id}
                      </span>
                      <StatusBadge level={statusLevelMap[c.status] || 'info'}>
                        {statusLabelMap[c.status] || c.status}
                      </StatusBadge>
                      <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded ${
                        c.priority === 'urgent'
                          ? 'bg-red-100 text-red-700'
                          : c.priority === 'high'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-navy/5 text-navy/60'
                      }`}>
                        {c.priority} Priority
                      </span>
                    </div>

                    <h2 className="font-display text-lg text-navy mt-2">{c.subject}</h2>
                    <p className="text-xs text-navy/60 mt-0.5">
                      Against: <span className="font-semibold text-navy/80">{c.against_agency}</span> · Category: <span className="font-medium text-navy/70">{c.category}</span>
                    </p>
                  </div>

                  <span className="text-xs text-navy/40 font-mono shrink-0">
                    {new Date(c.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <p className="text-sm text-navy/80 mt-3 whitespace-pre-line leading-relaxed bg-paper/30 p-3 rounded-card border border-navy/5">
                  {c.description}
                </p>

                {c.resolution_notes && (
                  <div className="mt-3 p-3 bg-amber-50/60 rounded-card border border-amber-200/60 text-xs">
                    <p className="font-semibold text-amber-900">Registry Progress &amp; Investigation Notes:</p>
                    <p className="text-amber-800 mt-1 whitespace-pre-line font-mono">{c.resolution_notes}</p>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-navy/8 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    {c.evidence_url ? (
                      <a
                        href={c.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-stamp underline hover:text-stamp-dark"
                      >
                        <span>📎</span> Attached Evidence Document
                      </a>
                    ) : (
                      <span className="text-navy/40 font-mono text-[11px]">No attachments</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {c.status !== 'escalated_to_bmet' && c.status !== 'resolved' && (
                      <button
                        onClick={() => handleEscalate(c.id)}
                        disabled={escalatingId === c.id}
                        className="px-3 py-1.5 rounded bg-alert text-paper font-medium text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {escalatingId === c.id ? 'Escalating…' : '⚡ Escalate to BMET'}
                      </button>
                    )}
                    {c.status === 'submitted' && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-navy/50 hover:text-alert font-medium transition-colors"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Lodge Complaint Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-card border border-navy/15 max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-navy/10">
                <div>
                  <h2 className="font-display text-xl text-navy">Lodge Grievance / অভিযোগ</h2>
                  <p className="text-xs text-navy/55 mt-0.5">Formal report submitted to BMET registry</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-navy/50 hover:text-navy text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-navy/70 block mb-1">Against Agency / Broker *</label>
                    <input
                      required
                      placeholder="e.g. Al-Amin Overseas Ltd. / Sub-agent"
                      value={form.against_agency}
                      onChange={(e) => setForm({ ...form, against_agency: e.target.value })}
                      className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-navy/70 block mb-1">Priority Level *</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp bg-white"
                    >
                      <option value="low">Low (General Inquiry)</option>
                      <option value="medium">Medium (Standard Issue)</option>
                      <option value="high">High (Fee extortion / Contract breach)</option>
                      <option value="urgent">Urgent (Stranded abroad / Physical danger)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Complaint Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp bg-white"
                  >
                    {COMPLAINT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Subject / Summary *</label>
                  <input
                    required
                    placeholder="e.g. Demanded additional cash without receipt"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Detailed Description *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide specific dates, locations, broker names, amounts demanded, and details of what transpired..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2 text-sm outline-none focus:border-stamp resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Supporting Evidence (Receipts, Audio, Screenshots, Documents)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*,audio/*"
                    onChange={(e) => setEvidenceFile(e.target.files[0])}
                    className="w-full text-xs text-navy/70 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-navy/10 file:text-navy hover:file:bg-navy/20 cursor-pointer"
                  />
                  <p className="text-[11px] text-navy/40 mt-1">Upload screenshots, money receipts, or recorded audio evidence (up to 10MB).</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-navy/10">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-card text-xs font-medium text-navy/70 hover:bg-navy/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-card bg-alert text-paper px-5 py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Submitting…' : 'Submit Official Complaint'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
