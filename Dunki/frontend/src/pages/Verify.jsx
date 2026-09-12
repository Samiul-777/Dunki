import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMe, uploadVerification, bypassVerification } from '../lib/api.js'

export default function Verify() {
  const [me, setMe] = useState(null)
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [bypassing, setBypassing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchMe()
      .then(setMe)
      .catch(() => {
        // If not logged in, redirect to login
        navigate('/login')
      })
  }, [navigate])

  const isAgency = me?.role === 'agency'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setSubmitting(true)
    setError('')
    setResult(null)

    try {
      const res = await uploadVerification(file)
      setResult(res)
      if (res.status === 'verified') {
        setTimeout(() => {
          navigate(isAgency ? '/jobs' : '/dashboard')
        }, 2200)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.note || 'Upload failed. Please ensure the file is under 10MB.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBypass = async () => {
    setBypassing(true)
    setError('')
    try {
      await bypassVerification()
      navigate(isAgency ? '/jobs' : '/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not bypass verification.')
    } finally {
      setBypassing(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-lg bg-white rounded-card border border-navy/10 p-8 shadow-[6px_6px_0_0_rgba(11,26,45,0.06)]">
        <div className="flex items-center justify-between border-b border-navy/10 pb-4 mb-6">
          <div>
            <p className="font-mono text-xs tracking-widest text-navy/45 uppercase">
              {isAgency ? 'Agency Credential Verification' : 'Worker Identity Verification'}
            </p>
            <h1 className="font-display text-2xl md:text-3xl text-navy mt-1">
              {isAgency ? 'Verify Agency License' : 'Verify Your Identity'}
            </h1>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-stamp/10 text-stamp font-medium uppercase tracking-wider">
            Powered by Gemini AI
          </span>
        </div>

        <p className="text-sm text-navy/70 leading-relaxed">
          {isAgency
            ? `Upload official recruitment agency credentials for "${me?.agency || me?.name}". Our Gemini AI compliance model checks license authenticity and validity so your overseas job circulars earn a green "Verified" badge.`
            : 'Upload your National ID (NID), International Passport, or BMET Clearance card. Our Gemini AI identity model inspects document authenticity to award you a green "Verified" badge on your applications.'}
        </p>

        {/* Verification Status info box */}
        <div className="mt-4 p-3.5 bg-paper-50 rounded-card border border-navy/10 flex items-center justify-between text-xs text-navy/70">
          <span>Current Account Status:</span>
          <span className={`font-mono font-semibold uppercase px-2 py-0.5 rounded ${
            me?.verification_status === 'verified'
              ? 'bg-verified/15 text-verified border border-verified/30'
              : 'bg-alert/10 text-alert border border-alert/20'
          }`}>
            {me?.verification_status || 'Unverified'}
          </span>
        </div>

        {error && (
          <div className="mt-5 text-sm text-alert bg-alert/10 border border-alert/30 rounded-card p-4">
            <p className="font-semibold text-alert">Verification Issue</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        )}

        {result && (
          <div className={`mt-5 rounded-card p-4 border text-sm ${
            result.status === 'verified'
              ? 'bg-verified/10 border-verified/40 text-verified'
              : 'bg-alert/10 border-alert/30 text-alert'
          }`}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">
                {result.status === 'verified' ? '✓ Verified by Gemini AI' : '⚠ Document Rejected'}
              </span>
              {result.details?.document_type && (
                <span className="text-xs font-mono px-2 py-0.5 bg-white/70 rounded border border-current">
                  {result.details.document_type}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-navy/80">{result.note}</p>
            {result.status === 'verified' && (
              <p className="mt-3 text-xs font-medium text-verified flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-verified animate-ping" />
                Redirecting you to the platform...
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-navy/75">
              {isAgency ? 'Upload License / Certificate (PDF, JPG, PNG, max 10MB)' : 'Upload National ID or Passport (PDF, JPG, PNG, max 10MB)'}
            </span>
            <div className="border-2 border-dashed border-navy/20 hover:border-stamp/60 rounded-card p-4 text-center cursor-pointer transition-colors bg-white">
              <input
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-xs text-navy/70 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-navy file:text-paper hover:file:bg-navy-600 file:cursor-pointer"
              />
              {file && (
                <p className="mt-2 text-xs text-navy/60 font-mono">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting || !file}
            className="rounded-card bg-navy text-paper text-sm font-medium py-3 hover:bg-navy-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-paper" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Gemini AI Inspecting Document…</span>
              </>
            ) : (
              'Submit for AI Verification'
            )}
          </button>
        </form>

        {/* Bypass / Skip Option */}
        <div className="mt-6 pt-5 border-t border-navy/10 text-center">
          <p className="text-xs text-navy/55 mb-2.5">
            Not ready to verify now? You can skip and verify later from your dashboard.
          </p>
          <button
            type="button"
            onClick={handleBypass}
            disabled={bypassing || submitting}
            className="w-full py-2.5 px-4 text-xs font-medium rounded-card border border-navy/20 text-navy hover:bg-navy/5 transition-colors disabled:opacity-50"
          >
            {bypassing ? 'Skipping…' : 'Skip for Now (Continue as Unverified)'}
          </button>
          <p className="text-[11px] text-navy/40 mt-2">
            Note: As unverified, your {isAgency ? 'job listings' : 'applications'} will show an "Unverified" badge.
          </p>
        </div>
      </div>
    </div>
  )
}