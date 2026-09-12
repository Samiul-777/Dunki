import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../lib/api.js'

const roles = [
  { key: 'worker', label: 'Migrant Worker', desc: 'Job search, applications, contracts' },
  { key: 'agency', label: 'Recruiting Agency', desc: 'Post circulars, manage applicants' },
  { key: 'nominee', label: 'Family Nominee', desc: 'View a worker\u2019s progress' }
]

export default function Register() {
  const [role, setRole] = useState('worker')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await register({ name, email, phone, password, role })
      if ((user.role === 'worker' || user.role === 'agency') && user.verification_status !== 'verified') {
        navigate('/verify')
      } else {
        navigate(user.role === 'agency' ? '/jobs' : '/dashboard')
      }
    } catch (err) {
      const messages = err.response?.data?.errors
      setError(messages ? Object.values(messages).flat().join(' ') : 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <p className="font-display text-4xl md:text-5xl text-navy tracking-tight">Dunki</p>
          <p className="text-[11px] uppercase tracking-[0.25em] text-navy/40 mt-2">
            Migrant Worker Recruitment &amp; Contract Verification
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-navy mt-8">Create your account</h1>
          <p className="text-sm text-navy/60 mt-2">Choose how you'll use Dunki.</p>
        </div>

        {error && (
          <p className="mt-6 text-sm text-alert bg-alert/10 border border-alert/30 rounded-card px-3.5 py-2.5 text-center">
            {error}
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-8 mt-10 bg-white border border-navy/10 rounded-card p-6 md:p-8 shadow-[6px_6px_0_0_rgba(11,26,45,0.06)]">
          <div className="flex flex-col gap-2 md:pr-2 md:border-r border-navy/10">
            <p className="text-xs font-medium text-navy/50 uppercase tracking-widest mb-1">Account type</p>
            {roles.map((r) => (
              <button
                type="button"
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`text-left rounded-card border px-4 py-3 transition-colors ${
                  role === r.key ? 'border-stamp bg-stamp/10' : 'border-navy/15 bg-white hover:border-navy/30'
                }`}
              >
                <p className="text-sm font-semibold text-navy">{r.label}</p>
                <p className="text-xs text-navy/55 mt-0.5">{r.desc}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-xs font-medium text-navy/50 uppercase tracking-widest mb-1">Your details</p>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-navy/70">Full name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-card border border-navy/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-navy/70">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-card border border-navy/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-navy/70">Phone number</span>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="rounded-card border border-navy/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-navy/70">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-card border border-navy/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-card bg-navy text-paper text-sm font-medium py-2.5 hover:bg-navy-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-sm text-navy/60 mt-8 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-navy font-medium underline underline-offset-2">Sign in</Link>
        </p>
      </div>
    </div>
  )
}