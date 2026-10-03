import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import {
  fetchPayments,
  createPayment,
  deletePayment,
  initiateSSLCommerzPayment,
  fetchMe,
  searchAgencies,
  searchWorkers,
} from '../lib/api.js'

const PAYMENT_PURPOSES = [
  'Agency processing fee',
  'Medical test fee',
  'Training fee',
  'Visa stamping & processing',
  'Air ticket',
  'BMET Welfare & Smart Card',
  'Police clearance fee',
  'Biometrics & Fingerprint',
  'Other',
]

const OFFLINE_METHODS = [
  'Bank transfer (Branch counter)',
  'Cash receipt',
  'Pay Order / Bank Draft',
  'Agent counter deposit',
]

const WORKER_PAYMENT_PURPOSES = [
  'Worker salary / wages',
  'Worker advance',
  'Worker reimbursement',
]

export default function Payments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentUser, setCurrentUser] = useState(null)
  const [payments, setPayments] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filterPurpose, setFilterPurpose] = useState('all')

  // Modals
  const [showSSLModal, setShowSSLModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState(null)
  const [initiatingSSL, setInitiatingSSL] = useState(false)
  const [submittingManual, setSubmittingManual] = useState(false)
  const [agencyMatches, setAgencyMatches] = useState([])
  const [selectedAgency, setSelectedAgency] = useState(null)
  const [searchingAgencies, setSearchingAgencies] = useState(false)
  const [workerMatches, setWorkerMatches] = useState([])
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [searchingWorkers, setSearchingWorkers] = useState(false)

  // SSLCommerz Form
  const [sslForm, setSslForm] = useState({
    purpose: 'Agency processing fee',
    amount: '',
    agency_name: '',
    worker_name: '',
    notes: '',
  })

  // Manual Offline Receipt Form
  const [manualForm, setManualForm] = useState({
    purpose: 'Agency processing fee',
    amount: '',
    payment_method: 'Bank transfer (Branch counter)',
    transaction_id: '',
    agency_name: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [receiptFile, setReceiptFile] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [u, data] = await Promise.all([fetchMe().catch(() => null), fetchPayments()])
      if (u) setCurrentUser(u)
      setPayments(data.payments || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Handle return from SSLCommerz redirect
    const paymentStatus = searchParams.get('payment_status')
    const tranId = searchParams.get('tran_id')
    const amount = searchParams.get('amount')

    if (paymentStatus === 'success') {
      setSuccess(
        `🎉 Payment of ৳${amount ? Number(amount).toLocaleString() : ''} successfully completed via SSLCommerz! Verified transaction recorded into the official BMET ledger.`
      )
      // Clean query params
      setSearchParams({})
    } else if (paymentStatus === 'failed') {
      setError(`Payment via SSLCommerz could not be completed (${tranId || 'transaction failed'}). Please try again or use another payment channel.`)
      setSearchParams({})
    } else if (paymentStatus === 'cancelled') {
      setError('Payment was cancelled at the SSLCommerz gateway portal.')
      setSearchParams({})
    }
  }, [])

  useEffect(() => {
    if (!currentUser || !['worker', 'agency'].includes(currentUser.role)) return

    const agencyPayer = currentUser.role === 'agency'
    const query = (agencyPayer ? sslForm.worker_name : sslForm.agency_name).trim()
    const selectedRecipient = agencyPayer ? selectedWorker : selectedAgency
    if (selectedRecipient?.display_name === query) {
      setAgencyMatches([])
      setWorkerMatches([])
      return
    }
    if (query.length < 2) {
      setAgencyMatches([])
      setWorkerMatches([])
      setSearchingAgencies(false)
      setSearchingWorkers(false)
      return
    }

    let active = true
    const timeout = setTimeout(() => {
      if (agencyPayer) {
        setSearchingWorkers(true)
        searchWorkers(query)
          .then((matches) => { if (active) setWorkerMatches(matches) })
          .catch(() => { if (active) setWorkerMatches([]) })
          .finally(() => { if (active) setSearchingWorkers(false) })
      } else {
        setSearchingAgencies(true)
        searchAgencies(query)
          .then((matches) => { if (active) setAgencyMatches(matches) })
          .catch(() => { if (active) setAgencyMatches([]) })
          .finally(() => { if (active) setSearchingAgencies(false) })
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [currentUser, sslForm.agency_name, sslForm.worker_name, selectedAgency, selectedWorker])

  // Initiate real financial transaction via SSLCommerz
  const handleProceedSSLCommerz = async (e) => {
    e.preventDefault()
    const agencyPayer = currentUser?.role === 'agency'
    const selectedRecipient = agencyPayer ? selectedWorker : selectedAgency
    if (!selectedRecipient) {
      setError(agencyPayer
        ? 'Select a relevant worker from the search results before paying.'
        : 'Select a registered agency from the search results before paying.')
      return
    }

    setInitiatingSSL(true)
    setError('')
    try {
      const recipient = agencyPayer
        ? { worker_id: selectedWorker.id }
        : { agency_id: selectedAgency.id }
      const res = await initiateSSLCommerzPayment({
        purpose: sslForm.purpose,
        amount: Number(sslForm.amount),
        ...recipient,
        notes: sslForm.notes,
      })

      if (res.gateway_url) {
        // Redirect browser to SSLCommerz hosted checkout page
        window.location.href = res.gateway_url
      } else {
        setError(res.message || 'Failed to obtain SSLCommerz payment portal link.')
        setInitiatingSSL(false)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to initiate SSLCommerz payment.'
      setError(msg)
      setInitiatingSSL(false)
    }
  }

  const openSSLModal = () => {
    setSelectedAgency(null)
    setSelectedWorker(null)
    setAgencyMatches([])
    setWorkerMatches([])
    setSslForm((current) => ({
      ...current,
      purpose: currentUser?.role === 'agency' ? WORKER_PAYMENT_PURPOSES[0] : PAYMENT_PURPOSES[0],
      agency_name: '',
      worker_name: '',
    }))
    setShowSSLModal(true)
  }

  // Record offline payment with receipt
  const handleManualSubmit = async (e) => {
    e.preventDefault()
    setSubmittingManual(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('purpose', manualForm.purpose)
      formData.append('amount', manualForm.amount)
      formData.append('payment_method', manualForm.payment_method)
      formData.append('payment_date', manualForm.payment_date)
      if (manualForm.transaction_id) formData.append('transaction_id', manualForm.transaction_id)
      if (manualForm.agency_name) formData.append('agency_name', manualForm.agency_name)
      if (manualForm.notes) formData.append('notes', manualForm.notes)
      if (receiptFile) formData.append('receipt', receiptFile)

      await createPayment(formData)
      setSuccess('Offline payment slip recorded into official ledger.')
      setShowManualModal(false)
      setManualForm({
        purpose: 'Agency processing fee',
        amount: '',
        payment_method: 'Bank transfer (Branch counter)',
        transaction_id: '',
        agency_name: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      })
      setReceiptFile(null)
      loadData()
    } catch (err) {
      const msgs = err.response?.data?.errors
      setError(msgs ? Object.values(msgs).flat().join(' ') : 'Failed to record payment slip.')
    } finally {
      setSubmittingManual(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this payment entry?')) return
    try {
      await deletePayment(id)
      setPayments(payments.filter((p) => p.id !== id))
      loadData()
    } catch {
      setError('Failed to delete payment record.')
    }
  }

  const filteredPayments = filterPurpose === 'all'
    ? payments
    : payments.filter((p) => p.purpose === filterPurpose)
  const agencyPayer = currentUser?.role === 'agency'
  const recipientSearch = agencyPayer ? sslForm.worker_name : sslForm.agency_name
  const recipientMatches = agencyPayer ? workerMatches : agencyMatches
  const selectedRecipient = agencyPayer ? selectedWorker : selectedAgency
  const searchingRecipients = agencyPayer ? searchingWorkers : searchingAgencies
  const sslPurposes = agencyPayer ? WORKER_PAYMENT_PURPOSES : PAYMENT_PURPOSES

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar user={currentUser} />

      <main className="flex-1 px-6 md:px-10 py-8 max-w-6xl">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-navy/45 bg-navy/5 px-2 py-0.5 rounded">
                Official Ledger
              </span>
              <span className="text-xs font-mono text-stamp font-medium">SSLCommerz Secured &bull; BMET Anti-Exploitation</span>
            </div>
            <h1 className="font-display text-3xl text-navy mt-1">Recruitment Cost Ledger</h1>
            <p className="text-sm text-navy/60 mt-1 max-w-2xl">
              Pay migration fees directly online via SSLCommerz (bKash, Nagad, cards) or log stamped receipts.
              Every documented taka creates legal protection against extortion under the Overseas Employment Act.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Real Payment Gateway Button */}
            <button
              onClick={openSSLModal}
              className="rounded-card bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-800 transition-all shadow-sm flex items-center gap-2"
            >
              <span>💳</span>
              <span>Pay with SSLCommerz</span>
            </button>

            {/* Manual Paper Receipt Button */}
            <button
              onClick={() => setShowManualModal(true)}
              className="rounded-card bg-navy/10 text-navy border border-navy/20 px-3.5 py-2.5 text-sm font-medium hover:bg-navy/15 transition-colors flex items-center gap-1.5"
            >
              <span>📎</span>
              <span>Upload Offline Slip</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="mt-6 text-sm text-alert bg-alert/10 border border-alert/30 rounded-card px-4 py-3 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-alert font-bold ml-2">✕</button>
          </div>
        )}

        {success && (
          <div className="mt-6 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-card px-4 py-3 flex items-center justify-between shadow-sm">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-emerald-800 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Cost Summary Cards */}
        {summary && (
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-card border border-navy/10 p-5 shadow-sm">
              <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Total Paid to Date</p>
              <p className="font-mono text-2xl font-bold text-navy mt-1">
                ৳{Number(summary.total_paid || 0).toLocaleString()}
              </p>
              <p className="text-xs text-navy/40 mt-1">{summary.count} recorded transaction{summary.count === 1 ? '' : 's'}</p>
            </div>

            <div className="bg-white rounded-card border border-navy/10 p-5 shadow-sm">
              <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">BMET Legal Cap ({summary.destination})</p>
              <p className="font-mono text-2xl font-bold text-navy/80 mt-1">
                ৳{Number(summary.cost_cap || 0).toLocaleString()}
              </p>
              <p className="text-xs text-navy/40 mt-1">Statutory ceiling for {summary.destination}</p>
            </div>

            <div className="bg-white rounded-card border border-navy/10 p-5 shadow-sm">
              <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Registry Compliance</p>
              <div className="mt-2">
                {summary.is_overcharged ? (
                  <StatusBadge level="alert">Fee Overcharge Detected</StatusBadge>
                ) : (
                  <StatusBadge level="verified">Within Legal Limit</StatusBadge>
                )}
              </div>
              <p className="text-xs text-navy/50 mt-1.5">
                {summary.is_overcharged
                  ? `Exceeds legal cap by ৳${Number(summary.overcharge_amount).toLocaleString()}`
                  : `৳${(summary.cost_cap - summary.total_paid).toLocaleString()} remaining`}
              </p>
            </div>

            <div className="bg-white rounded-card border border-navy/10 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">Online Gateway</p>
                <p className="text-xs text-navy/70 mt-1">
                  Protected with SSLCommerz end-to-end encryption &amp; Bank Trx ID.
                </p>
              </div>
              {summary.is_overcharged && (
                <Link
                  to="/complaints"
                  className="inline-flex items-center text-xs font-semibold text-alert underline mt-2 hover:text-red-700"
                >
                  File fee overcharge grievance →
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Filter Bar */}
        <section className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-card border border-navy/10 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-navy/60 font-medium">Filter by purpose:</span>
            <select
              value={filterPurpose}
              onChange={(e) => setFilterPurpose(e.target.value)}
              className="text-xs bg-paper border border-navy/15 rounded px-2.5 py-1.5 text-navy outline-none focus:border-stamp"
            >
              <option value="all">All Purposes ({payments.length})</option>
              {PAYMENT_PURPOSES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <p className="text-xs font-mono text-navy/50">
            Showing {filteredPayments.length} of {payments.length} entries
          </p>
        </section>

        {/* Payments List Table */}
        <section className="mt-4 bg-white rounded-card border border-navy/10 overflow-hidden shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-sm text-navy/50">Loading payment ledger…</p>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium text-navy">No payment records found.</p>
              <p className="text-xs text-navy/50 mt-1">
                Pay official fees online or log your deposits to prevent exploitation.
              </p>
              <button
                onClick={openSSLModal}
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-card shadow-sm"
              >
                <span>💳</span> Pay First Fee with SSLCommerz
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-navy/5 text-navy/70 text-xs font-medium uppercase tracking-wider border-b border-navy/10">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Channel &amp; Trx ID</th>
                    <th className="py-3 px-4">Counterparty &amp; direction</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Certificate &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy/8">
                  {filteredPayments.map((p) => {
                    const isSSL = p.payment_method?.includes('SSLCommerz')
                    return (
                      <tr key={p.id} className="hover:bg-paper/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-navy/70 whitespace-nowrap">
                          {p.payment_date || p.date}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-navy">{p.purpose}</p>
                          {p.notes && <p className="text-xs text-navy/50 mt-0.5 max-w-xs truncate">{p.notes}</p>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${
                              isSSL
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-paper text-navy/80 border-navy/10'
                            }`}
                          >
                            {p.payment_method || p.method}
                          </span>
                          {p.transaction_id && (
                            <p className="font-mono text-[11px] text-navy/50 mt-0.5">
                              Ref: {p.transaction_id}
                            </p>
                          )}
                          {p.bank_tran_id && (
                            <p className="font-mono text-[10px] text-emerald-700 font-semibold mt-0.2">
                              Bank Ref: {p.bank_tran_id}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-navy/70">
                          {p.counterparty_name || p.agency_name || 'Direct'}
                          {p.direction && <p className="mt-1 font-mono text-[10px] uppercase text-navy/45">{p.direction.replaceAll('_', ' ')}</p>}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-navy whitespace-nowrap">
                          ৳{Number(p.amount).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <StatusBadge level={p.status === 'verified' || p.status === 'completed' ? 'verified' : p.status === 'pending' ? 'warning' : 'alert'}>
                            {p.status}
                          </StatusBadge>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => setViewingReceipt(p)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-navy underline hover:text-navy-700"
                          >
                            <span>📜</span> Official Receipt
                          </button>

                          {p.receipt_url && (
                            <a
                              href={p.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-stamp underline hover:text-stamp-dark"
                            >
                              Slip
                            </a>
                          )}

                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-xs text-alert/70 hover:text-alert font-medium p-1 transition-colors"
                            title="Delete record"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* MODAL 1: Real Payment via SSLCommerz */}
        {showSSLModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-card border border-navy/15 max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-navy/10">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">💳</span>
                  <div>
                    <h2 className="font-display text-xl text-navy">Pay with SSLCommerz</h2>
                    <p className="text-xs text-navy/55">Official Government-Approved Payment Gateway</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSSLModal(false)}
                  className="text-navy/50 hover:text-navy text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Supported payment channels badges */}
              <div className="mt-4 bg-paper/60 p-3 rounded-card border border-navy/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-navy/70">Supported Channels:</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                  <span className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded border border-pink-200">bKash</span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded border border-orange-200">Nagad</span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">Rocket</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">VISA / MC</span>
                </div>
              </div>

              <form onSubmit={handleProceedSSLCommerz} className="flex flex-col gap-4 mt-4">
                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Fee Purpose / Service Type *</label>
                  <select
                    value={sslForm.purpose}
                    onChange={(e) => setSslForm({ ...sslForm, purpose: e.target.value })}
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp bg-white"
                  >
                    {sslPurposes.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">
                    Amount to Pay (BDT ৳) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-bold text-navy/40 text-sm">৳</span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="e.g. 15000"
                      value={sslForm.amount}
                      onChange={(e) => setSslForm({ ...sslForm, amount: e.target.value })}
                      className="w-full rounded-card border border-navy/20 pl-8 pr-3.5 py-2.5 text-base font-mono font-bold outline-none focus:border-stamp"
                    />
                  </div>
                  {summary && summary.cost_cap && (
                    <p className="text-[11px] text-navy/50 mt-1">
                      Legal ceiling for {summary.destination}: ৳{Number(summary.cost_cap).toLocaleString()}. Total paid so far: ৳{Number(summary.total_paid).toLocaleString()}.
                    </p>
                  )}
                </div>

                <div className="relative">
                  <label htmlFor="ssl-agency-search" className="text-xs font-medium text-navy/70 block mb-1">
                    {agencyPayer ? 'Relevant Worker / Recipient *' : 'Authorized Agency / Recipient *'}
                  </label>
                  <input
                    id="ssl-agency-search"
                    autoComplete="off"
                    required
                    placeholder={agencyPayer ? 'Search workers who applied or have a contract' : 'Type at least 2 characters to find an agency'}
                    value={recipientSearch}
                    onChange={(e) => {
                      setSelectedAgency(null)
                      setSelectedWorker(null)
                      setSslForm({
                        ...sslForm,
                        agency_name: agencyPayer ? '' : e.target.value,
                        worker_name: agencyPayer ? e.target.value : '',
                      })
                    }}
                    aria-expanded={recipientMatches.length > 0 && !selectedRecipient}
                    aria-controls="ssl-agency-results"
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2 text-sm outline-none focus:border-stamp"
                  />
                  {searchingRecipients && <p className="mt-1 text-xs text-navy/50">Searching {agencyPayer ? 'relevant workers' : 'registered agencies'}…</p>}
                  {selectedRecipient && <p className="mt-1 text-xs text-verified">Recipient selected: {selectedRecipient.display_name}</p>}
                  {!searchingRecipients && recipientSearch.trim().length >= 2 && !selectedRecipient && recipientMatches.length === 0 && (
                    <p role="status" className="mt-1 text-xs text-alert">No relevant {agencyPayer ? 'workers' : 'agencies'} found. Select a result to continue.</p>
                  )}
                  {recipientMatches.length > 0 && !selectedRecipient && (
                    <ul id="ssl-agency-results" role="listbox" className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto border border-navy/20 bg-white shadow-lg">
                      {recipientMatches.map((recipient) => (
                        <li key={recipient.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected="false"
                            onClick={() => {
                              if (agencyPayer) {
                                setSelectedWorker(recipient)
                                setSelectedAgency(null)
                                setSslForm({ ...sslForm, worker_name: recipient.display_name })
                              } else {
                                setSelectedAgency(recipient)
                                setSelectedWorker(null)
                                setSslForm({ ...sslForm, agency_name: recipient.display_name })
                              }
                              setAgencyMatches([])
                              setWorkerMatches([])
                            }}
                            className="w-full border-b border-navy/10 px-3.5 py-2.5 text-left text-sm text-navy hover:bg-paper"
                          >
                            {recipient.display_name}
                            {recipient.tracking_id && <span className="ml-2 text-xs font-mono text-navy/50">{recipient.tracking_id}</span>}
                            {recipient.email && <span className="ml-2 text-xs text-navy/50">{recipient.email}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Payment Reference / Note</label>
                  <input
                    placeholder="e.g. First stage installment for Saudi Arabia visa processing"
                    value={sslForm.notes}
                    onChange={(e) => setSslForm({ ...sslForm, notes: e.target.value })}
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2 text-sm outline-none focus:border-stamp"
                  />
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-[11px] text-emerald-800">
                  🔒 <strong>Financial Guarantee:</strong> Upon clicking Proceed, you will be redirected to the secure SSLCommerz payment portal. Your payment is immediately stamped with Bank Transaction ID and recorded in the government anti-extortion registry.
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-navy/10">
                  <button
                    type="button"
                    onClick={() => setShowSSLModal(false)}
                    className="px-4 py-2 rounded-card text-xs font-medium text-navy/70 hover:bg-navy/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={initiatingSSL || !sslForm.amount || !selectedRecipient}
                    className="rounded-card bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {initiatingSSL ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Connecting Gateway…
                      </>
                    ) : (
                      <>
                        <span>Proceed to SSLCommerz</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Record Manual Offline Bank Slip */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-card border border-navy/15 max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-navy/10">
                <div>
                  <h2 className="font-display text-xl text-navy">Upload Offline Payment Slip</h2>
                  <p className="text-xs text-navy/55 mt-0.5">Physical bank counter or stamped agency receipt</p>
                </div>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="text-navy/50 hover:text-navy text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 mt-4">
                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Purpose / Fee Type *</label>
                  <select
                    value={manualForm.purpose}
                    onChange={(e) => setManualForm({ ...manualForm, purpose: e.target.value })}
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp bg-white"
                  >
                    {PAYMENT_PURPOSES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-navy/70 block mb-1">Amount (BDT ৳) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 45000"
                      value={manualForm.amount}
                      onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                      className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-stamp"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-navy/70 block mb-1">Payment Method *</label>
                    <select
                      value={manualForm.payment_method}
                      onChange={(e) => setManualForm({ ...manualForm, payment_method: e.target.value })}
                      className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp bg-white"
                    >
                      {OFFLINE_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-navy/70 block mb-1">Deposit Slip / Receipt #</label>
                    <input
                      placeholder="e.g. DBBL-DEP-99120"
                      value={manualForm.transaction_id}
                      onChange={(e) => setManualForm({ ...manualForm, transaction_id: e.target.value })}
                      className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-stamp"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-navy/70 block mb-1">Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={manualForm.payment_date}
                      onChange={(e) => setManualForm({ ...manualForm, payment_date: e.target.value })}
                      className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Recipient / Agency Name</label>
                  <input
                    placeholder="e.g. Al-Amin Overseas Ltd. / Medical Center"
                    value={manualForm.agency_name}
                    onChange={(e) => setManualForm({ ...manualForm, agency_name: e.target.value })}
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Stamped Receipt Attachment (PDF, Image)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setReceiptFile(e.target.files[0])}
                    className="w-full text-xs text-navy/70 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-navy/10 file:text-navy hover:file:bg-navy/20 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/70 block mb-1">Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Bank seal affixed by Mirpur branch."
                    value={manualForm.notes}
                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                    className="w-full rounded-card border border-navy/20 px-3.5 py-2 text-sm outline-none focus:border-stamp resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-navy/10">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-4 py-2 rounded-card text-xs font-medium text-navy/70 hover:bg-navy/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingManual}
                    className="rounded-card bg-navy text-paper px-5 py-2 text-sm font-medium hover:bg-navy/90 transition-colors disabled:opacity-50"
                  >
                    {submittingManual ? 'Saving…' : 'Record Slip'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Official BMET Certificate / Receipt Viewer */}
        {viewingReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-card border border-navy/15 max-w-xl w-full p-8 shadow-2xl relative">
              <button
                onClick={() => setViewingReceipt(null)}
                className="absolute top-4 right-4 text-navy/50 hover:text-navy text-lg font-bold"
              >
                ✕
              </button>

              {/* Printable Certificate Layout */}
              <div className="border-4 border-double border-navy/20 p-6 bg-paper/20 rounded">
                <div className="text-center pb-4 border-b border-navy/15">
                  <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-navy/50">
                    People's Republic of Bangladesh &bull; BMET Compliance Registry
                  </p>
                  <h3 className="font-display text-2xl font-bold text-navy mt-1">Official Money Receipt</h3>
                  <p className="text-xs font-mono text-stamp mt-0.5">Dunki Anti-Exploitation Verified Transaction</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-5 text-xs">
                  <div>
                    <span className="text-navy/50 block font-medium">Receipt ID</span>
                    <span className="font-mono font-bold text-navy">{viewingReceipt.transaction_id || `TXN-${viewingReceipt.id}`}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-navy/50 block font-medium">Transaction Date</span>
                    <span className="font-mono font-semibold text-navy">{viewingReceipt.payment_date || viewingReceipt.date}</span>
                  </div>
                  <div>
                    <span className="text-navy/50 block font-medium">Counterparty</span>
                    <span className="font-semibold text-navy">{viewingReceipt.counterparty_name || viewingReceipt.agency_name || 'Direct Overseas Recruitment'}</span>
                    {viewingReceipt.direction && <span className="mt-1 block text-[10px] uppercase text-navy/50">{viewingReceipt.direction.replaceAll('_', ' ')}</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-navy/50 block font-medium">Payment Channel</span>
                    <span className="font-semibold text-navy">{viewingReceipt.payment_method}</span>
                  </div>
                  {viewingReceipt.bank_tran_id && (
                    <div className="col-span-2 bg-emerald-50 border border-emerald-200 p-2 rounded text-emerald-800 font-mono text-[11px]">
                      SSLCommerz Bank Reference: <strong>{viewingReceipt.bank_tran_id}</strong>
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-b border-navy/15 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-navy">{viewingReceipt.purpose}</p>
                    <p className="text-[11px] text-navy/50">{viewingReceipt.notes || 'Verified recruitment service fee'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-navy/50 uppercase block">Total Amount</span>
                    <span className="font-mono text-2xl font-extrabold text-navy">
                      ৳{Number(viewingReceipt.amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-[11px] text-navy/60">
                  <div className="flex items-center gap-1.5">
                    <span className="text-verified font-bold text-sm">✓</span>
                    <span>Status: <strong>{viewingReceipt.status?.toUpperCase()}</strong></span>
                  </div>
                  <span className="font-mono text-[10px] text-navy/40">Sec. 31 Overseas Employment Act 2013</span>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-card text-xs font-semibold bg-navy/10 text-navy hover:bg-navy/20 flex items-center gap-1.5"
                >
                  <span>🖨️</span> Print Certificate
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="px-5 py-2 rounded-card text-xs font-semibold bg-navy text-paper hover:bg-navy/90"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
