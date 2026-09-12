import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { fetchContracts, createContract, updateContract, deleteContract } from '../lib/api.js'

const statusLevel = { pending: 'warning', verified: 'verified', rejected: 'alert' }

export default function Contracts() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    job_title: '', destination_country: '', agency_name: '',
    salary_amount: '', salary_currency: 'SAR'
  })
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    fetchContracts()
      .then(setContracts)
      .catch(() => setError('Failed to load contracts.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createContract(form)
      setForm({ job_title: '', destination_country: '', agency_name: '', salary_amount: '', salary_currency: 'SAR' })
      load()
    } catch {
      setError('Failed to create contract.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (id) => {
    await updateContract(id, { status: 'verified' })
    load()
  }

  const handleDelete = async (id) => {
    await deleteContract(id)
    load()
  }

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar />
      <main className="flex-1 px-6 md:px-10 py-8 max-w-4xl">
        <header>
          <h1 className="font-display text-3xl text-navy">Contracts</h1>
          <p className="text-sm text-navy/60 mt-1">Every contract tied to your case, logged and verifiable.</p>
        </header>

        {error && (
          <p className="mt-4 text-sm text-alert bg-alert/10 border border-alert/30 rounded-card px-3.5 py-2.5">
            {error}
          </p>
        )}

        {/* CREATE form */}
        <form onSubmit={handleCreate} className="mt-6 bg-white rounded-card border border-navy/10 p-5 grid sm:grid-cols-2 gap-4">
          <input required placeholder="Job title" value={form.job_title}
            onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            className="rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
          <input required placeholder="Destination country" value={form.destination_country}
            onChange={(e) => setForm({ ...form, destination_country: e.target.value })}
            className="rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
          <input required placeholder="Agency name" value={form.agency_name}
            onChange={(e) => setForm({ ...form, agency_name: e.target.value })}
            className="rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
          <div className="flex gap-2">
            <input required type="number" placeholder="Salary" value={form.salary_amount}
              onChange={(e) => setForm({ ...form, salary_amount: e.target.value })}
              className="flex-1 rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
            <input value={form.salary_currency}
              onChange={(e) => setForm({ ...form, salary_currency: e.target.value })}
              className="w-20 rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
          </div>
          <button type="submit" disabled={submitting}
            className="sm:col-span-2 mt-1 rounded-card bg-navy text-paper text-sm font-medium py-2.5 hover:bg-navy-600 transition-colors disabled:opacity-50">
            {submitting ? 'Adding…' : 'Add contract'}
          </button>
        </form>

        {/* READ / list */}
        <div className="mt-6 flex flex-col gap-3">
          {loading && <p className="text-sm text-navy/50">Loading contracts…</p>}
          {!loading && contracts.length === 0 && (
            <p className="text-sm text-navy/50 py-6 text-center">No contracts yet — add one above.</p>
          )}
          {contracts.map((c) => (
            <div key={c.id} className="bg-white rounded-card border border-navy/10 p-5 flex items-center justify-between">
              <div>
                <p className="font-display text-lg text-navy">{c.job_title}</p>
                <p className="text-sm text-navy/60">{c.agency_name} · {c.destination_country}</p>
                <p className="font-mono text-xs text-navy/45 mt-1">{c.salary_amount} {c.salary_currency}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge level={statusLevel[c.status]}>{c.status}</StatusBadge>
                {c.status !== 'verified' && (
                  <button onClick={() => handleVerify(c.id)} className="text-xs text-navy underline underline-offset-2">
                    Verify
                  </button>
                )}
                <button onClick={() => handleDelete(c.id)} className="text-xs text-alert underline underline-offset-2">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}