import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import AIJobAssistantModal from '../components/AIJobAssistantModal.jsx'
import JobDetailModal from '../components/JobDetailModal.jsx'
import { fetchJobs, applyToJob, fetchMyApplications, createJob, fetchMe, aiGenerateJob } from '../lib/api.js'

export default function JobSearch() {
  const [me, setMe] = useState(null)
  const [jobs, setJobs] = useState([])
  const [appliedIds, setAppliedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [applyTarget, setApplyTarget] = useState(null) // job being applied to
  const [selectedJob, setSelectedJob] = useState(null) // job enlarged for viewing description
  const [showPostForm, setShowPostForm] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)

  useEffect(() => {
    fetchMe().then(setMe).catch(() => {})
  }, [])

  useEffect(() => {
    if (me?.role === 'worker') {
      fetchMyApplications()
        .then((apps) => setAppliedIds(new Set(apps.map((a) => a.job_listing_id))))
        .catch(() => {})
    }
  }, [me])

  const loadJobs = () => {
    setLoading(true)
    setError('')
    fetchJobs({ search: query || undefined, verified: verifiedOnly ? 1 : undefined })
      .then(setJobs)
      .catch(() => setError('Failed to load job listings.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timeout = setTimeout(loadJobs, 300)
    return () => clearTimeout(timeout)
  }, [query, verifiedOnly])

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar />
      <main className="flex-1 px-6 md:px-10 py-8 max-w-6xl">
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-navy">Job search</h1>
            <p className="text-sm text-navy/60 mt-1">
              Every listing is cross-checked against licensed agency records.
            </p>
          </div>
          {me?.role === 'agency' && (
            <div className="flex items-center gap-2.5 self-start">
              <button
                type="button"
                onClick={() => setShowAIModal(true)}
                className="rounded-card bg-navy text-paper border border-stamp/40 text-sm font-medium px-3.5 py-2.5 hover:bg-navy-600 transition-all flex items-center gap-2 shadow-sm group"
                title="Open AI Assistant to auto-generate and post jobs"
              >
                <span className="text-stamp-light group-hover:scale-110 transition-transform">✨</span>
                <span>AI Assistant</span>
                <span className="text-[10px] bg-stamp/25 text-stamp-light px-1.5 py-0.5 rounded font-mono uppercase font-semibold">Free</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPostForm((s) => !s)}
                className="rounded-card bg-navy text-paper text-sm font-medium px-3.5 py-2.5 hover:bg-navy-600 transition-all flex items-center gap-2 shadow-sm"
                title="Post a job manually"
              >
                <span className="w-5 h-5 rounded-full bg-paper/20 flex items-center justify-center font-bold text-base leading-none pb-0.5">
                  {showPostForm ? '×' : '+'}
                </span>
                <span>{showPostForm ? 'Close' : 'Post job'}</span>
              </button>
            </div>
          )}
        </header>

        {me?.role === 'agency' && (
          <div className={`mt-4 p-3.5 rounded-card border flex items-center justify-between text-xs ${
            me.verification_status === 'verified'
              ? 'bg-verified/10 border-verified/30 text-navy'
              : 'bg-alert/10 border-alert/30 text-navy'
          }`}>
            <span className="flex items-center gap-2">
              <StatusBadge level={me.verification_status === 'verified' ? 'verified' : 'alert'}>
                {me.verification_status === 'verified' ? 'Verified Agency' : 'Unverified Agency'}
              </StatusBadge>
              <span>
                {me.verification_status === 'verified'
                  ? 'Your agency is verified. All your job circulars are published with a green Verified badge.'
                  : 'You are currently unverified. Job circulars you post will be marked as "Unverified" until you verify your credentials.'}
              </span>
            </span>
            {me.verification_status !== 'verified' && (
              <Link to="/verify" className="font-semibold text-stamp underline shrink-0 ml-3">
                Verify License →
              </Link>
            )}
          </div>
        )}

        {me?.role === 'agency' && showPostForm && (
          <PostJobForm
            agencyName={me?.agency || me?.name}
            onCreated={() => { setShowPostForm(false); loadJobs() }}
            onError={setError}
          />
        )}

        {/* AI Job Assistant Modal */}
        {me?.role === 'agency' && (
          <AIJobAssistantModal
            isOpen={showAIModal}
            onClose={() => setShowAIModal(false)}
            onJobsCreated={loadJobs}
            agencyName={me?.agency || me?.name}
          />
        )}


        {error && (
          <p className="mt-4 text-sm text-alert bg-alert/10 border border-alert/30 rounded-card px-3.5 py-2.5">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by role or country..."
            className="flex-1 rounded-card border border-navy/20 bg-white px-4 py-2.5 text-sm outline-none focus:border-stamp"
          />
          <label className="flex items-center gap-2 text-sm text-navy/70 bg-white border border-navy/20 rounded-card px-4 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="accent-stamp"
            />
            Verified only
          </label>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {loading && <p className="text-sm text-navy/50 col-span-2 py-10 text-center">Loading listings…</p>}

          {!loading && jobs.map((job) => {
            const applied = appliedIds.has(job.id)
            return (
              <article
                key={job.id}
                onClick={() => setSelectedJob(job)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedJob(job)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View full details for ${job.title}`}
                className="group bg-white rounded-card border border-navy/10 hover:border-navy/30 hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-3 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-stamp relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg text-navy group-hover:text-navy-900 transition-colors">
                      {job.title}
                    </p>
                    <p className="text-sm text-navy/60">{job.city ? `${job.city}, ` : ''}{job.country}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {job.verified ? (
                      <StatusBadge level="verified">Verified</StatusBadge>
                    ) : (
                      <StatusBadge level="alert">Unverified</StatusBadge>
                    )}
                    <span className="text-[10px] font-mono text-navy/40 group-hover:text-stamp-dark transition-colors flex items-center gap-0.5">
                      <span>Enlarge</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">↗</span>
                    </span>
                  </div>
                </div>

                {job.description ? (
                  <div className="space-y-1">
                    <p className="text-sm text-navy/70 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                    <span className="text-xs text-stamp-dark font-medium inline-flex items-center gap-1 group-hover:underline">
                      Click for full description & criteria →
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-navy/40 italic">Click to view post specifications</p>
                )}

                <div className="flex items-center justify-between text-sm mt-auto pt-1">
                  <span className="font-mono text-navy/80 font-medium">{job.salary || 'Salary negotiable'}</span>
                  <span className="text-navy/45 text-xs truncate max-w-[150px]" title={job.agency}>{job.agency}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-dashed border-navy/15">
                  <span className="text-xs text-navy/50 font-mono">#{job.id}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-navy/50 group-hover:text-navy font-medium transition-colors">
                      View details
                    </span>
                    {me?.role === 'worker' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setApplyTarget(job)
                        }}
                        disabled={applied}
                        className="text-sm font-medium text-navy underline underline-offset-2 hover:text-stamp-dark disabled:no-underline disabled:text-navy/40 transition-colors z-10"
                      >
                        {applied ? 'Applied' : 'Apply now'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}

          {!loading && jobs.length === 0 && (
            <p className="text-sm text-navy/50 col-span-2 py-10 text-center">
              No listings match your search yet.
            </p>
          )}
        </div>

        {/* Enlarged Job Post Modal */}
        {selectedJob && (
          <JobDetailModal
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onApply={(job) => {
              setSelectedJob(null)
              setApplyTarget(job)
            }}
            isApplied={appliedIds.has(selectedJob.id)}
            userRole={me?.role}
          />
        )}

        {applyTarget && (
          <ApplyModal
            job={applyTarget}
            onClose={() => setApplyTarget(null)}
            onApplied={() => {
              setAppliedIds((prev) => new Set(prev).add(applyTarget.id))
              setApplyTarget(null)
            }}
          />
        )}
      </main>
    </div>
  )
}

function PostJobForm({ agencyName, onCreated, onError }) {
  const [form, setForm] = useState({
    title: '', description: '', criteria: '', country: '', city: '', salary: '', agency: agencyName || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiBar, setShowAiBar] = useState(false)

  const handleAiAutofill = async (e) => {
    e.preventDefault()
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const res = await aiGenerateJob(aiPrompt)
      if (res.jobs && res.jobs.length > 0) {
        const first = res.jobs[0]
        setForm((prev) => ({
          ...prev,
          title: first.title || prev.title,
          description: first.description || prev.description,
          criteria: first.criteria || prev.criteria,
          country: first.country || prev.country,
          city: first.city || prev.city,
          salary: first.salary || prev.salary,
          agency: agencyName || first.agency || prev.agency,
        }))
        setShowAiBar(false)
      }
    } catch (err) {
      onError(err.response?.data?.message || 'AI Autofill failed.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createJob(form)
      onCreated()
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to post job.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 bg-white rounded-card border border-navy/10 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-navy/10">
        <div>
          <h3 className="font-display text-lg text-navy">Post a Manual Job Listing</h3>
          <p className="text-xs text-navy/60">Fill in the recruitment criteria or use AI to draft quickly.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAiBar((s) => !s)}
          className="text-xs font-medium text-navy/80 hover:text-navy bg-stamp/15 hover:bg-stamp/25 border border-stamp/30 px-3 py-1.5 rounded-card flex items-center gap-1.5 transition-colors"
        >
          <span>✨</span>
          <span>{showAiBar ? 'Hide AI Autofill' : 'Autofill with AI'}</span>
        </button>
      </div>

      {showAiBar && (
        <div className="bg-paper-50 border border-stamp/30 rounded-card p-3.5 space-y-2">
          <p className="text-xs font-semibold text-navy">Describe the vacancy in plain text:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Mason in Riyadh, 2000 SAR salary with accommodation..."
              className="flex-1 rounded-card border border-navy/20 px-3 py-1.5 text-xs outline-none focus:border-stamp bg-white"
            />
            <button
              type="button"
              onClick={handleAiAutofill}
              disabled={aiLoading || !aiPrompt.trim()}
              className="bg-navy hover:bg-navy-600 text-paper text-xs px-4 py-1.5 rounded-card font-medium transition-colors disabled:opacity-50"
            >
              {aiLoading ? 'Drafting…' : 'Apply AI Draft'}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <input required placeholder="Job title" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="sm:col-span-2 rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
        <textarea required placeholder="Job description" value={form.description} rows={3}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="sm:col-span-2 rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
        <textarea required placeholder="Criteria (skills, experience, documents required)" value={form.criteria} rows={2}
          onChange={(e) => setForm({ ...form, criteria: e.target.value })}
          className="sm:col-span-2 rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
        <input required placeholder="Country" value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
        <input required placeholder="City" value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
        <input required placeholder="Salary, e.g. 1,800 SAR / month" value={form.salary}
          onChange={(e) => setForm({ ...form, salary: e.target.value })}
          className="rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
        <input required placeholder="Agency name" value={form.agency}
          onChange={(e) => setForm({ ...form, agency: e.target.value })}
          className="rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp" />
        <button type="submit" disabled={submitting}
          className="sm:col-span-2 mt-1 rounded-card bg-navy text-paper text-sm font-medium py-2.5 hover:bg-navy-600 transition-colors disabled:opacity-50">
          {submitting ? 'Posting…' : 'Post job'}
        </button>
      </form>
    </div>
  )
}

function ApplyModal({ job, onClose, onApplied }) {
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const formData = new FormData()
      if (note) formData.append('note', note)
      if (file) formData.append('document', file)
      await applyToJob(job.id, formData)
      onApplied()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-navy/40 flex items-center justify-center px-6 z-50">
      <div className="bg-white rounded-card max-w-md w-full p-6">
        <p className="font-display text-xl text-navy">Apply — {job.title}</p>
        <p className="text-sm text-navy/60 mt-1">{job.criteria}</p>

        {error && (
          <p className="mt-3 text-sm text-alert bg-alert/10 border border-alert/30 rounded-card px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <textarea
            placeholder="Note to the agency (optional)"
            value={note}
            rows={3}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-card border border-navy/20 px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-navy/70">Supporting document (PDF/JPG/PNG, optional)</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files[0])}
              className="text-sm"
            />
          </label>

          <div className="flex items-center justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="text-sm text-navy/60 underline underline-offset-2">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="rounded-card bg-navy text-paper text-sm font-medium px-5 py-2.5 hover:bg-navy-600 disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}