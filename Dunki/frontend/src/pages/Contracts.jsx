import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import {
  fetchMe,
  fetchContracts,
  createContract,
  updateContract,
  deleteContract,
  fetchAvailableWorkersForContracts,
} from '../lib/api.js'

const statusLevel = { pending: 'warning', verified: 'verified', rejected: 'alert' }

const CURRENCIES = ['SAR', 'AED', 'QAR', 'KWD', 'OMR', 'BHD', 'MYR', 'SGD', 'EUR', 'USD', 'BDT']

export default function Contracts() {
  const [currentUser, setCurrentUser] = useState(null)
  const [contracts, setContracts] = useState([])
  const [availableWorkers, setAvailableWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [viewingContract, setViewingContract] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Agency Issue Contract Form
  const [issueForm, setIssueForm] = useState({
    worker_id: '',
    job_title: '',
    destination_country: '',
    agency_name: '',
    salary_amount: '',
    salary_currency: 'SAR',
    contract_terms: '',
  })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const user = await fetchMe()
      setCurrentUser(user)

      const contractList = await fetchContracts()
      setContracts(Array.isArray(contractList) ? contractList : [])

      if (user?.role === 'agency' || user?.role === 'admin') {
        const workers = await fetchAvailableWorkersForContracts()
        setAvailableWorkers(Array.isArray(workers) ? workers : [])
      }
    } catch {
      setError('Failed to load contract records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleIssueContract = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await createContract(issueForm)
      setSuccess('Official employment contract successfully issued to worker.')
      setShowIssueModal(false)
      setIssueForm({
        worker_id: '',
        job_title: '',
        destination_country: '',
        agency_name: '',
        salary_amount: '',
        salary_currency: 'SAR',
        contract_terms: '',
      })
      load()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to issue contract.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (id) => {
    try {
      await updateContract(id, { status: 'verified' })
      setSuccess('Contract status marked as verified.')
      load()
    } catch {
      setError('Failed to update contract status.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contract record?')) return
    try {
      await deleteContract(id)
      setSuccess('Contract removed successfully.')
      load()
    } catch {
      setError('Failed to delete contract.')
    }
  }

  const isWorker = currentUser?.role === 'worker'
  const isAgencyOrAdmin = currentUser?.role === 'agency' || currentUser?.role === 'admin'

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar user={currentUser} />

      <main className="flex-1 px-6 md:px-10 py-8 max-w-5xl">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-navy/45 bg-navy/5 px-2 py-0.5 rounded">
                Official Registry
              </span>
              <span className="text-xs font-mono text-stamp font-medium">BMET Employment Instruments</span>
            </div>
            <h1 className="font-display text-3xl text-navy mt-1">Employment Contracts</h1>
            <p className="text-sm text-navy/60 mt-1 max-w-2xl">
              {isWorker
                ? 'Official bilateral employment contracts issued to your case. Review guaranteed salaries, work conditions, and regulatory verification.'
                : 'Issue and oversee binding employment contracts for candidate workers in compliance with BMET standards.'}
            </p>
          </div>

          {/* Agencies can issue contracts; Workers CANNOT */}
          {isAgencyOrAdmin && (
            <button
              onClick={() => setShowIssueModal(true)}
              className="self-start sm:self-auto rounded-card bg-navy text-paper px-4 py-2.5 text-sm font-medium hover:bg-navy/90 transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="font-bold text-base leading-none">+</span>
              Issue Official Contract
            </button>
          )}
        </header>

        {error && (
          <div className="mt-6 text-sm text-alert bg-alert/10 border border-alert/30 rounded-card px-4 py-3 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-alert font-bold ml-2">✕</button>
          </div>
        )}

        {success && (
          <div className="mt-6 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-card px-4 py-3 flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-emerald-800 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Worker Policy & Protection Banner */}
        {isWorker && (
          <div className="mt-6 bg-white border border-navy/15 rounded-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-xl p-2 bg-navy/5 rounded-card">🛡️</div>
              <div className="flex-1">
                <h3 className="font-display text-base text-navy font-semibold">
                  Official Contract Issuance & Rights Protection
                </h3>
                <p className="text-xs text-navy/70 mt-1 leading-relaxed">
                  Under the <strong>Overseas Employment and Migrants Act 2013</strong>, migrant workers <strong>do not self-issue contracts</strong>.
                  All binding contracts must be officially issued by registered recruiting agencies and registered with the BMET database.
                  You can inspect all mandatory clauses below. If the salary or job role provided in your destination country deviates from this registered contract, you are protected against <em>Contract Substitution</em> and can submit an immediate formal grievance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Metric Strip */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-white rounded-card border border-navy/10 p-4">
            <p className="text-[11px] font-medium text-navy/50 uppercase tracking-wider">Total Contracts</p>
            <p className="font-mono text-xl font-bold text-navy mt-0.5">{contracts.length}</p>
          </div>
          <div className="bg-white rounded-card border border-navy/10 p-4">
            <p className="text-[11px] font-medium text-navy/50 uppercase tracking-wider">BMET Verified</p>
            <p className="font-mono text-xl font-bold text-verified mt-0.5">
              {contracts.filter((c) => c.status === 'verified').length}
            </p>
          </div>
          <div className="bg-white rounded-card border border-navy/10 p-4">
            <p className="text-[11px] font-medium text-navy/50 uppercase tracking-wider">Pending Review</p>
            <p className="font-mono text-xl font-bold text-amber-600 mt-0.5">
              {contracts.filter((c) => c.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-card border border-navy/10 p-4">
            <p className="text-[11px] font-medium text-navy/50 uppercase tracking-wider">Registry Role</p>
            <p className="font-mono text-sm font-bold text-navy mt-1 truncate">
              {currentUser?.role ? currentUser.role.toUpperCase() : 'VISITOR'}
            </p>
          </div>
        </section>

        {/* Contract List Section */}
        <section className="mt-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-navy">
              {isWorker ? 'Contracts Assigned to Your Case' : 'Issued Agency Contracts'}
            </h2>
            <span className="text-xs font-mono text-navy/50">{contracts.length} record{contracts.length === 1 ? '' : 's'}</span>
          </div>

          {loading ? (
            <div className="bg-white rounded-card border border-navy/10 p-10 text-center text-sm text-navy/50">
              Loading official contract records…
            </div>
          ) : contracts.length === 0 ? (
            <div className="bg-white rounded-card border border-navy/10 p-10 text-center">
              <p className="text-sm font-medium text-navy">No employment contracts logged yet.</p>
              <p className="text-xs text-navy/50 mt-1 max-w-md mx-auto">
                {isWorker
                  ? 'Your recruiting agency has not submitted your official bilateral contract yet. Once your agency drafts your contract with BMET, it will appear here for your review.'
                  : 'You have not issued any contracts to workers yet. Click "+ Issue Official Contract" above to generate a bilateral contract for an applicant.'}
              </p>
            </div>
          ) : (
            contracts.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-card border border-navy/12 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-navy/30 transition-all"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg text-navy font-semibold">{c.job_title}</h3>
                    <StatusBadge level={statusLevel[c.status]}>
                      {c.status === 'verified' ? 'Verified by BMET' : c.status === 'pending' ? 'Pending BMET Verification' : 'Disputed / Rejected'}
                    </StatusBadge>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-xs text-navy/70">
                    <p>
                      <span className="text-navy/40 font-medium">Agency:</span>{' '}
                      <span className="font-semibold text-navy">{c.agency_name || c.agency?.agency || 'Certified Agency'}</span>
                    </p>
                    <p>
                      <span className="text-navy/40 font-medium">Destination:</span>{' '}
                      <span className="font-medium text-navy">{c.destination_country}</span>
                    </p>
                    {isAgencyOrAdmin && c.user && (
                      <p>
                        <span className="text-navy/40 font-medium">Assigned Worker:</span>{' '}
                        <span className="font-semibold text-navy">{c.user.name}</span>{' '}
                        <span className="font-mono text-[11px] text-navy/50">({c.user.tracking_id || 'ID Pending'})</span>
                      </p>
                    )}
                    <p>
                      <span className="text-navy/40 font-medium">Agreed Monthly Wage:</span>{' '}
                      <span className="font-mono font-bold text-navy">
                        {Number(c.salary_amount).toLocaleString()} {c.salary_currency}
                      </span>
                    </p>
                  </div>

                  {c.contract_terms && (
                    <p className="text-xs text-navy/60 mt-2 bg-paper/60 p-2 rounded border border-navy/5 line-clamp-2">
                      "{c.contract_terms}"
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap md:flex-col items-end gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-navy/10 shrink-0">
                  <button
                    onClick={() => setViewingContract(c)}
                    className="text-xs bg-navy text-paper px-3 py-1.5 rounded font-medium hover:bg-navy/90 transition-colors"
                  >
                    View Clauses &amp; Terms
                  </button>

                  {isWorker && (
                    <Link
                      to="/complaints"
                      className="text-xs text-alert font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <span>⚠️</span> Report Discrepancy
                    </Link>
                  )}

                  {isAgencyOrAdmin && (
                    <div className="flex items-center gap-2">
                      {c.status !== 'verified' && (
                        <button
                          onClick={() => handleVerify(c.id)}
                          className="text-xs text-verified hover:underline font-medium"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs text-alert hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Modal: View Full Contract Clauses & Terms */}
        {viewingContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-card border border-navy/15 max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-navy/10">
                <div>
                  <span className="text-[11px] font-mono text-stamp uppercase tracking-wider">
                    Official Bilateral Contract
                  </span>
                  <h2 className="font-display text-xl text-navy mt-0.5">{viewingContract.job_title}</h2>
                </div>
                <button
                  onClick={() => setViewingContract(null)}
                  className="text-navy/50 hover:text-navy text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs text-navy/80">
                <div className="grid grid-cols-2 gap-3 bg-paper/60 p-3 rounded-card border border-navy/10">
                  <div>
                    <span className="text-navy/50 block font-medium">Recruiting Agency</span>
                    <span className="font-semibold text-sm text-navy">{viewingContract.agency_name}</span>
                  </div>
                  <div>
                    <span className="text-navy/50 block font-medium">Destination Country</span>
                    <span className="font-semibold text-sm text-navy">{viewingContract.destination_country}</span>
                  </div>
                  <div>
                    <span className="text-navy/50 block font-medium">Monthly Guaranteed Wage</span>
                    <span className="font-mono font-bold text-sm text-navy">
                      {Number(viewingContract.salary_amount).toLocaleString()} {viewingContract.salary_currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-navy/50 block font-medium">Government BMET Status</span>
                    <div className="mt-0.5">
                      <StatusBadge level={statusLevel[viewingContract.status]}>
                        {viewingContract.status}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                <div className="border border-navy/10 rounded-card p-4 space-y-3">
                  <h4 className="font-display text-sm font-semibold text-navy">Mandatory Statutory Clauses</h4>

                  <div>
                    <p className="font-semibold text-navy">1. Working Hours &amp; Weekly Rest</p>
                    <p className="text-navy/70 mt-0.5">
                      Standard working hours shall not exceed 8 hours per day, 48 hours per week. Worker is entitled to at least one 24-hour mandatory rest day per week.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-navy">2. Overtime Rate Guarantee</p>
                    <p className="text-navy/70 mt-0.5">
                      Any work performed beyond regular hours must be paid at an overtime rate of no less than 150% (1.5x) the base hourly salary.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-navy">3. Accommodation, Food &amp; Utilities</p>
                    <p className="text-navy/70 mt-0.5">
                      The employer shall provide free, safe bachelor housing conforming to health standards, potable water, and electricity or a monthly food allowance.
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-navy">4. Health Insurance &amp; Emergency Repatriation</p>
                    <p className="text-navy/70 mt-0.5">
                      Full medical coverage including occupational injury insurance. In case of premature termination or medical distress, employer/agency guarantees round-trip airfare.
                    </p>
                  </div>

                  {viewingContract.contract_terms && (
                    <div className="pt-2 border-t border-navy/10">
                      <p className="font-semibold text-navy">Special Terms &amp; Agency Addendum:</p>
                      <p className="text-navy/70 mt-0.5 whitespace-pre-wrap">{viewingContract.contract_terms}</p>
                    </div>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded text-[11px] text-amber-800">
                  ⚠️ <strong>Notice of Rights:</strong> If your employer in {viewingContract.destination_country} requests you to sign a new contract with lower pay or different job duties upon arrival, this is illegal <em>Contract Substitution</em>. Refuse and immediately contact the Bangladesh Embassy Labor Wing or submit a complaint in Dunki.
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3 pt-3 border-t border-navy/10">
                {isWorker && (
                  <Link
                    to="/complaints"
                    className="px-4 py-2 rounded-card text-xs font-semibold text-alert border border-alert/30 hover:bg-alert/5"
                  >
                    Report Terms Discrepancy
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setViewingContract(null)}
                  className="px-4 py-2 rounded-card text-xs font-semibold bg-navy text-paper hover:bg-navy/90"
                >
                  Close Contract View
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Agency Issue Contract */}
        {showIssueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-card border border-navy/15 max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-navy/10">
                <div>
                  <h2 className="font-display text-xl text-navy">Issue Official Employment Contract</h2>
                  <p className="text-xs text-navy/55 mt-0.5">Formal BMET bilateral instrument</p>
                </div>
                <button
                  onClick={() => setShowIssueModal(false)}
                  className="text-navy/50 hover:text-navy text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleIssueContract} className="flex flex-col gap-4 mt-4">
                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Target Migrant Worker *</label>
                  <select
                    required
                    value={issueForm.worker_id}
                    onChange={(e) => setIssueForm({ ...issueForm, worker_id: e.target.value })}
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp bg-white"
                  >
                    <option value="">Select a registered worker…</option>
                    {availableWorkers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} — {w.tracking_id || 'ID Pending'} ({w.destination || 'Unassigned'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-navy/40 mt-1">
                    Contracts are strictly issued to registered workers with verified tracking IDs.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-navy/70 block mb-1">Job Title *</label>
                    <input
                      required
                      placeholder="e.g. Certified Electrician"
                      value={issueForm.job_title}
                      onChange={(e) => setIssueForm({ ...issueForm, job_title: e.target.value })}
                      className="w-full rounded-card border border-navy/20 px-3.5 py-2 text-sm outline-none focus:border-stamp"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-navy/70 block mb-1">Destination Country *</label>
                    <input
                      required
                      placeholder="e.g. Saudi Arabia"
                      value={issueForm.destination_country}
                      onChange={(e) => setIssueForm({ ...issueForm, destination_country: e.target.value })}
                      className="w-full rounded-card border border-navy/20 px-3.5 py-2 text-sm outline-none focus:border-stamp"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-navy/70 block mb-1">Monthly Salary *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 1800"
                      value={issueForm.salary_amount}
                      onChange={(e) => setIssueForm({ ...issueForm, salary_amount: e.target.value })}
                      className="w-full rounded-card border border-navy/20 px-3.5 py-2 text-sm font-mono outline-none focus:border-stamp"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-navy/70 block mb-1">Currency *</label>
                    <select
                      value={issueForm.salary_currency}
                      onChange={(e) => setIssueForm({ ...issueForm, salary_currency: e.target.value })}
                      className="w-full rounded-card border border-navy/20 px-3.5 py-2 text-sm outline-none focus:border-stamp bg-white"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Issuing Agency Name</label>
                  <input
                    placeholder="e.g. Al-Amin Overseas Ltd."
                    value={issueForm.agency_name}
                    onChange={(e) => setIssueForm({ ...issueForm, agency_name: e.target.value })}
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2 text-sm outline-none focus:border-stamp"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Contract Clauses &amp; Addendum</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Food allowance 300 SAR provided monthly. Free bachelor quarters in Riyadh. Overtime 1.5x."
                    value={issueForm.contract_terms}
                    onChange={(e) => setIssueForm({ ...issueForm, contract_terms: e.target.value })}
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2 text-sm outline-none focus:border-stamp resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-navy/10">
                  <button
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    className="px-4 py-2 rounded-card text-xs font-medium text-navy/70 hover:bg-navy/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-card bg-navy text-paper px-5 py-2 text-sm font-medium hover:bg-navy/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Issuing…' : 'Issue Contract'}
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