import { useState } from 'react'
import { aiGenerateJob, aiAutoPostJob, createJob } from '../lib/api.js'

const PRESET_PROMPTS = [
  {
    label: '⚡ Electricians & Plumbers',
    country: 'Saudi Arabia',
    prompt: 'Post 2 vacancies: Certified Building Electrician and Commercial Plumber in Riyadh, Saudi Arabia. Salary 2,400 SAR and 2,100 SAR per month, minimum 2 years experience with trade certificates.'
  },
  {
    label: '🏗️ Construction Crew',
    country: 'UAE / Dubai',
    prompt: 'Post jobs for Shuttering Carpenters and 6G Pipe Welders in Dubai UAE with 2,500 AED salary, free accommodation and transport.'
  },
  {
    label: '🚚 Heavy Drivers',
    country: 'Kuwait',
    prompt: 'Urgent requirement for Heavy Transport Drivers in Kuwait City. Salary 250 KWD / month, valid GCC driving license required.'
  },
  {
    label: '🏨 Hospitality Staff',
    country: 'Qatar / Doha',
    prompt: 'Post job for Restaurant Waiters and Continental Cooks in Doha, Qatar. Salary 2,800 QAR / month with food and accommodation.'
  },
  {
    label: '🩺 Healthcare Nurses',
    country: 'Qatar',
    prompt: 'Recruiting Staff Nurses with Prometric exam clearance in Doha Qatar, salary 4,500 QAR / month.'
  }
]

export default function AIJobAssistantModal({ isOpen, onClose, onJobsCreated, agencyName }) {
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState('autopost') // 'autopost' | 'review'
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [generatedDrafts, setGeneratedDrafts] = useState([])
  const [postedJobs, setPostedJobs] = useState([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  if (!isOpen) return null

  const steps = [
    'Analyzing prompt & extracting overseas role requirements…',
    'Checking country visa, trade certifications & legal compliance…',
    `Binding credentials for ${agencyName || 'licensed agency'}…`,
    mode === 'autopost' ? 'Publishing directly to the Dunki Registry…' : 'Finalizing structured job listing draft…'
  ]

  const runSimulationSteps = async (callback) => {
    setActiveStep(0)
    for (let i = 1; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 450))
      setActiveStep(i)
    }
    return callback()
  }

  const handleExecute = async (e) => {
    if (e) e.preventDefault()
    if (!prompt.trim()) return

    setIsProcessing(true)
    setError('')
    setSuccessMessage('')
    setGeneratedDrafts([])
    setPostedJobs([])

    try {
      if (mode === 'autopost') {
        await runSimulationSteps(async () => {
          const res = await aiAutoPostJob(prompt)
          setPostedJobs(res.jobs || [])
          setSuccessMessage(res.message || `Successfully published ${res.jobs?.length || 1} job(s) autonomously!`)
          if (onJobsCreated) onJobsCreated()
        })
      } else {
        await runSimulationSteps(async () => {
          const res = await aiGenerateJob(prompt)
          setGeneratedDrafts(res.jobs || [])
          setSuccessMessage(`Generated ${res.jobs?.length || 0} job draft(s). Review and publish below.`)
        })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'AI Assistant encountered an error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePublishDraft = async (draft, index) => {
    try {
      const payload = {
        ...draft,
        agency: agencyName || draft.agency || 'Licensed Agency'
      }
      const created = await createJob(payload)
      setGeneratedDrafts((prev) => prev.filter((_, i) => i !== index))
      setPostedJobs((prev) => [...prev, created])
      setSuccessMessage(`Job "${created.title}" successfully published!`)
      if (onJobsCreated) onJobsCreated()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish draft.')
    }
  }

  return (
    <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl border border-navy/20 shadow-2xl max-w-2xl w-full p-6 md:p-8 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-navy/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center text-stamp-light font-display text-xl shadow-inner">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl text-navy">AI Job Posting Assistant</h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-stamp/20 text-stamp-dark font-semibold">
                  100% Free Engine
                </span>
              </div>
              <p className="text-xs text-navy/60 mt-0.5">
                Post verified overseas recruitment vacancies in seconds for <span className="font-semibold text-navy">{agencyName || 'your agency'}</span>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-navy/40 hover:text-navy text-2xl font-light leading-none p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pt-5 pb-2 space-y-5">
          {/* Mode Switcher */}
          <div className="flex bg-paper-100 p-1 rounded-card border border-navy/10">
            <button
              type="button"
              onClick={() => setMode('autopost')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'autopost'
                  ? 'bg-navy text-paper shadow-sm'
                  : 'text-navy/70 hover:text-navy'
              }`}
            >
              <span>🚀 Autonomous Auto-Post</span>
              <span className="hidden sm:inline text-[10px] opacity-75">(Direct Publish)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('review')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'review'
                  ? 'bg-navy text-paper shadow-sm'
                  : 'text-navy/70 hover:text-navy'
              }`}
            >
              <span>📋 Draft & Review First</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div>
            <p className="text-xs font-medium text-navy/60 mb-2">⚡ Quick Overseas Role Presets:</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setPrompt(item.prompt)}
                  className="text-xs bg-paper hover:bg-paper-100 border border-navy/15 text-navy/80 hover:text-navy px-2.5 py-1.5 rounded-card transition-colors flex items-center gap-1.5"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-navy/40">({item.country})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Form */}
          <form onSubmit={handleExecute} className="space-y-3">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type in natural language, e.g.: 'Post 2 jobs for Heavy Truck Drivers and Forklift Operators in Kuwait with 280 KWD salary, visa sponsorship and accommodation included'..."
                rows={3}
                required
                className="w-full rounded-card border border-navy/20 bg-paper-50 p-3.5 text-sm text-navy outline-none focus:border-stamp focus:bg-white transition-all resize-none shadow-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-navy/50">
                {mode === 'autopost'
                  ? '⚡ AI will instantly structure and publish to the live job feed.'
                  : '📝 AI will draft the listing for your review before publishing.'}
              </span>
              <button
                type="submit"
                disabled={isProcessing || !prompt.trim()}
                className="inline-flex items-center gap-2 bg-navy hover:bg-navy-600 text-paper px-5 py-2.5 rounded-card text-sm font-medium transition-all disabled:opacity-50 shadow-md"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-stamp-light" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Agent Working…</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'autopost' ? '🚀 Post with AI' : '✨ Generate Drafts'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Processing Animation */}
          {isProcessing && (
            <div className="bg-navy/5 border border-navy/15 rounded-card p-4 space-y-2.5 animate-pulse">
              <div className="flex items-center gap-2 text-xs font-semibold text-navy">
                <span className="w-2 h-2 rounded-full bg-stamp animate-ping"></span>
                <span>AI Agent Live Workflow</span>
              </div>
              <div className="space-y-1.5">
                {steps.map((stepText, idx) => (
                  <div
                    key={stepText}
                    className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
                      idx === activeStep
                        ? 'text-navy font-medium'
                        : idx < activeStep
                        ? 'text-verified line-through opacity-70'
                        : 'text-navy/30'
                    }`}
                  >
                    <span>{idx < activeStep ? '✓' : idx === activeStep ? '➜' : '○'}</span>
                    <span>{stepText}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {error && (
            <p className="text-xs text-alert bg-alert/10 border border-alert/30 rounded-card p-3">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="text-xs text-verified bg-verified/10 border border-verified/30 rounded-card p-3 flex items-center justify-between">
              <span>{successMessage}</span>
            </p>
          )}

          {/* Live Posted Listings */}
          {postedJobs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-verified font-mono">
                  ✓ Successfully Published to Registry:
                </p>
              </div>
              <div className="grid gap-3">
                {postedJobs.map((job) => (
                  <div
                    key={job.id || job.title}
                    className="bg-paper-50 border border-verified/30 rounded-card p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-display text-base text-navy font-semibold">{job.title}</h4>
                        <p className="text-xs text-navy/60">{job.city}, {job.country}</p>
                      </div>
                      <span className="font-mono text-xs font-bold text-stamp-dark bg-stamp/15 px-2 py-0.5 rounded">
                        {job.salary}
                      </span>
                    </div>
                    <p className="text-xs text-navy/70 line-clamp-2">{job.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-navy/50 pt-2 border-t border-dashed border-navy/10">
                      <span>Agency: <strong className="text-navy">{job.agency}</strong></span>
                      <span className="font-mono text-verified font-medium">● Live on Feed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drafts for Review */}
          {generatedDrafts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy/70 font-mono">
                  Generated Drafts Ready for Review:
                </p>
              </div>
              <div className="grid gap-3">
                {generatedDrafts.map((draft, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-navy/20 rounded-card p-4 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-display text-base text-navy font-semibold">{draft.title}</h4>
                        <p className="text-xs text-navy/60">{draft.city}, {draft.country}</p>
                      </div>
                      <span className="font-mono text-xs font-bold text-navy bg-paper-100 px-2.5 py-1 rounded-md">
                        {draft.salary}
                      </span>
                    </div>
                    <p className="text-xs text-navy/75 leading-relaxed">{draft.description}</p>
                    <div className="bg-paper-50 p-2.5 rounded text-[11px] text-navy/80 space-y-1">
                      <strong className="text-navy">Eligibility & Compliance:</strong>
                      <p>{draft.criteria}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-navy/50">Posting as: {agencyName || draft.agency}</span>
                      <button
                        type="button"
                        onClick={() => handlePublishDraft(draft, idx)}
                        className="bg-navy hover:bg-navy-600 text-paper text-xs font-medium px-4 py-1.5 rounded-card transition-colors shadow-sm"
                      >
                        Publish this listing →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-navy/10 flex items-center justify-between text-xs text-navy/50">
          <span>Powered by Dunki AI Recruitment Engine</span>
          <button
            onClick={onClose}
            className="text-navy hover:underline underline-offset-2 font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
