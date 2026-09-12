import { useEffect } from 'react'
import StatusBadge from './StatusBadge.jsx'

export default function JobDetailModal({
  job,
  onClose,
  onApply,
  isApplied = false,
  userRole = null
}) {
  useEffect(() => {
    if (!job) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [job, onClose])

  if (!job) return null

  return (
    <div
      className="fixed inset-0 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-modal-title"
    >
      <div
        className="relative bg-white rounded-card border border-navy/15 shadow-2xl max-w-2xl w-full my-8 overflow-hidden transform transition-all text-navy"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Perforated Registry Specimen Header */}
        <div className="perforated h-2 w-full bg-paper" />
        
        <div className="bg-paper-50 px-6 py-4 border-b border-navy/10 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-navy/50 uppercase">
            <span>Dunki Case Registry</span>
            <span>·</span>
            <span>Ref #{job.id}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-navy/10 flex items-center justify-center text-navy/60 hover:text-navy text-lg font-bold transition-colors"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Header & Verification Stamp */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-navy/50 font-semibold uppercase tracking-wider">
                  Official Vacancy Circular
                </span>
                {job.verified ? (
                  <StatusBadge level="verified">Verified Agency Circular</StatusBadge>
                ) : (
                  <StatusBadge level="alert">Unverified Listing</StatusBadge>
                )}
              </div>
              <h2 id="job-modal-title" className="font-display text-2xl sm:text-3xl text-navy font-bold leading-snug">
                {job.title}
              </h2>
              <p className="text-sm sm:text-base text-navy/70 font-medium">
                {job.agency}
              </p>
            </div>

            {/* Stamp Badge */}
            <div
              className={`shrink-0 self-start border-2 px-3.5 py-1.5 text-center font-display text-xs tracking-wider uppercase rotate-[-2deg] select-none ${
                job.verified
                  ? 'border-verified text-verified bg-verified/5'
                  : 'border-alert/70 text-alert bg-alert/5'
              }`}
            >
              {job.verified ? 'REGISTRY VERIFIED' : 'PENDING AUDIT'}
            </div>
          </div>

          {/* Key Facts Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-paper/60 border border-navy/10 p-4 rounded-card">
            <div>
              <span className="block font-mono text-[11px] text-navy/50 uppercase tracking-wider">
                Location
              </span>
              <span className="font-medium text-sm text-navy mt-0.5 block">
                {job.city ? `${job.city}, ` : ''}{job.country}
              </span>
            </div>

            <div>
              <span className="block font-mono text-[11px] text-navy/50 uppercase tracking-wider">
                Remuneration
              </span>
              <span className="font-mono font-semibold text-sm text-navy mt-0.5 block">
                {job.salary || 'Negotiable'}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="block font-mono text-[11px] text-navy/50 uppercase tracking-wider">
                Agency
              </span>
              <span className="text-sm font-medium text-navy mt-0.5 truncate block" title={job.agency}>
                {job.agency || 'Registered Agency'}
              </span>
            </div>
          </div>

          {/* Full Job Description */}
          <div className="space-y-2">
            <h3 className="font-display text-lg text-navy flex items-center gap-2">
              <span>Job Description & Scope of Work</span>
            </h3>
            <div className="bg-paper-50/70 border border-navy/10 rounded-card p-5">
              {job.description ? (
                <p className="text-navy/85 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
                  {job.description}
                </p>
              ) : (
                <p className="text-navy/45 text-sm italic">
                  No detailed description was provided for this job circular.
                </p>
              )}
            </div>
          </div>

          {/* Criteria & Requirements (if present) */}
          {job.criteria && (
            <div className="space-y-2">
              <h3 className="font-display text-lg text-navy flex items-center gap-2">
                <span>Eligibility, Skills & Requirements</span>
              </h3>
              <div className="bg-stamp/10 border border-stamp/30 rounded-card p-5 text-sm sm:text-base text-navy/90 leading-relaxed whitespace-pre-line">
                {job.criteria}
              </div>
            </div>
          )}

          {/* Dunki Worker Protection Seal Note */}
          <div className="border-t border-dashed border-navy/15 pt-4 text-xs text-navy/60 flex items-start gap-2.5">
            <span className="text-stamp-dark text-base leading-none">🛡️</span>
            <p className="leading-relaxed">
              <strong className="text-navy font-semibold">Dunki Contract Protection:</strong> All terms, salary specifications, and destination details in this circular are logged into the registry. When you apply, this record prevents unauthorized wage deductions or silent contract substitutions.
            </p>
          </div>
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="bg-paper px-6 py-4 border-t border-navy/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-navy/70 hover:text-navy px-4 py-2 rounded-card transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            {userRole === 'worker' && (
              <button
                type="button"
                onClick={() => onApply && onApply(job)}
                disabled={isApplied}
                className="rounded-card bg-navy text-paper text-sm font-medium px-6 py-2.5 hover:bg-navy-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isApplied ? (
                  <>
                    <span>✓</span>
                    <span>Already applied</span>
                  </>
                ) : (
                  <>
                    <span>Apply for this role</span>
                    <span className="font-mono text-paper/70">→</span>
                  </>
                )}
              </button>
            )}

            {!userRole && (
              <button
                type="button"
                onClick={() => onApply && onApply(job)}
                className="rounded-card bg-navy text-paper text-sm font-medium px-5 py-2.5 hover:bg-navy-600 transition-colors shadow-sm"
              >
                Apply now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
