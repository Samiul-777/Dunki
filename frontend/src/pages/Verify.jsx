import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadVerification } from '../lib/api.js'

export default function Verify() {
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setSubmitting(true)
    setError('')
    try {
      const res = await uploadVerification(file)
      setResult(res)
      if (res.status === 'verified') {
        setTimeout(() => navigate('/dashboard'), 1500)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-md bg-white rounded-card border border-navy/10 p-8">
        <p className="font-mono text-xs tracking-widest text-navy/45 uppercase">Identity check</p>
        <h1 className="font-display text-2xl text-navy mt-2">Verify your identity</h1>
        <p className="text-sm text-navy/60 mt-2">
          Upload your National ID or passport. We check it before you can access job listings or apply.
        </p>

        {error && (
          <p className="mt-4 text-sm text-alert bg-alert/10 border border-alert/30 rounded-card px-3.5 py-2.5">
            {error}
          </p>
        )}

        {result && (
          <p className={`mt-4 text-sm rounded-card px-3.5 py-2.5 border ${
            result.status === 'verified'
              ? 'text-verified bg-verified/10 border-verified/30'
              : 'text-alert bg-alert/10 border-alert/30'
          }`}>
            {result.note}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <input
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files[0])}
            className="text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-card bg-navy text-paper text-sm font-medium py-2.5 hover:bg-navy-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Checking…' : 'Submit for verification'}
          </button>
        </form>
      </div>
    </div>
  )
}