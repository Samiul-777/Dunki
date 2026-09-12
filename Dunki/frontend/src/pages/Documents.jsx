import { useEffect, useState, useRef } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { fetchDocuments, createDocument, updateDocument, deleteDocument } from '../lib/api.js'

export default function Documents() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [previewDoc, setPreviewDoc] = useState(null)
  const fileInputRef = useRef(null)

  const load = () => {
    setLoading(true)
    fetchDocuments()
      .then(setDocuments)
      .catch(() => setError('Failed to load documents.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const getFileUrl = (doc) => {
    if (!doc) return null
    if (doc.file_url) return doc.file_url
    if (doc.file_path) {
      if (doc.file_path.startsWith('http')) return doc.file_path
      return `http://localhost:8000/storage/${doc.file_path}`
    }
    return null
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      if (file) {
        const formData = new FormData()
        formData.append('name', name.trim())
        formData.append('file', file)
        await createDocument(formData)
      } else {
        await createDocument({ name: name.trim() })
      }
      setName('')
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      load()
    } catch {
      setError('Failed to add document.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (doc) => {
    await updateDocument(doc.id, { status: doc.status === 'complete' ? 'missing' : 'complete' })
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this document?')) return
    await deleteDocument(id)
    load()
  }

  const missingCount = documents.filter((d) => d.status !== 'complete').length

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar />
      <main className="flex-1 px-6 md:px-10 py-8 max-w-4xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-navy">Documents</h1>
            <p className="text-sm text-navy/60 mt-1">
              Official records, registration verification, and paperwork for your profile.
            </p>
          </div>
          {documents.length > 0 && (
            missingCount > 0
              ? <StatusBadge level="warning">{missingCount} missing</StatusBadge>
              : <StatusBadge level="verified">All complete</StatusBadge>
          )}
        </header>

        {error && (
          <p className="mt-4 text-sm text-alert bg-alert/10 border border-alert/30 rounded-card px-3.5 py-2.5">
            {error}
          </p>
        )}

        {/* CREATE */}
        <form onSubmit={handleCreate} className="mt-6 bg-white rounded-card border border-navy/10 p-5">
          <p className="text-xs font-semibold text-navy/60 uppercase tracking-wider mb-3">Add New Document</p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Document title, e.g. Police clearance or Medical certificate"
              className="flex-1 rounded-card border border-navy/20 bg-paper-50 px-3.5 py-2.5 text-sm outline-none focus:border-stamp"
            />
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-navy/20 hover:border-stamp rounded-card bg-paper-50 text-xs text-navy/70 cursor-pointer transition-colors shrink-0">
              <span>📎 {file ? file.name.slice(0, 16) + '…' : 'Attach PDF/File'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files[0] || null)}
                className="hidden"
              />
            </label>
            {file && (
              <button
                type="button"
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="text-xs text-alert px-2 self-center hover:underline"
                title="Remove attached file"
              >
                ✕ Clear
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="rounded-card bg-navy text-paper text-sm font-medium px-6 py-2.5 hover:bg-navy-600 transition-colors disabled:opacity-50 shrink-0"
            >
              {submitting ? 'Adding…' : 'Add Document'}
            </button>
          </div>
        </form>

        {/* DOCUMENTS LIST */}
        <div className="mt-6 bg-white rounded-card border border-navy/10 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-navy/10 mb-4">
            <h2 className="font-display text-lg text-navy">Document List</h2>
            <span className="font-mono text-xs text-navy/50">{documents.length} Total</span>
          </div>

          {loading && <p className="text-sm text-navy/50 py-4 text-center">Loading documents…</p>}

          {!loading && documents.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-navy/50">No documents tracked yet.</p>
              <p className="text-xs text-navy/40 mt-1">Upload your verification PDF or add documents above.</p>
            </div>
          )}

          <ul className="flex flex-col divide-y divide-navy/8">
            {documents.map((d) => {
              const fileUrl = getFileUrl(d)
              const isPdf = d.file_path?.toLowerCase().endsWith('.pdf')
              const isVerification = d.type === 'verification'

              return (
                <li key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-navy">{d.name}</span>

                      {isVerification && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-stamp/15 text-stamp-dark border border-stamp/30 font-medium">
                          ★ Registration Verification
                        </span>
                      )}

                      {fileUrl && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy/5 text-navy/70 border border-navy/10">
                          {isPdf ? 'PDF' : 'IMAGE'}
                        </span>
                      )}
                    </div>

                    {fileUrl && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(d)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-stamp hover:text-stamp-dark underline underline-offset-2"
                        >
                          📄 View {isPdf ? 'PDF' : 'File'}
                        </button>
                        <span className="text-navy/30 text-xs">·</span>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-navy/60 hover:text-navy hover:underline"
                        >
                          Open in new tab ↗
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {d.status === 'complete' ? (
                      <StatusBadge level="verified">Complete</StatusBadge>
                    ) : (
                      <StatusBadge level="alert">Missing</StatusBadge>
                    )}
                    <button
                      onClick={() => handleToggle(d)}
                      className="text-xs text-navy/70 hover:text-navy underline underline-offset-2"
                    >
                      Mark {d.status === 'complete' ? 'missing' : 'complete'}
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="text-xs text-alert/80 hover:text-alert underline underline-offset-2"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </main>

      {/* PDF / DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-card border border-navy/15 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-navy/10 flex items-center justify-between bg-paper-50">
              <div className="flex items-center gap-3">
                <span className="text-xl">📄</span>
                <div>
                  <h3 className="font-display text-lg text-navy">{previewDoc.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {previewDoc.type === 'verification' && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-stamp font-medium">
                        Registration Verification Document
                      </span>
                    )}
                    <span className="text-xs text-navy/40">·</span>
                    <span className="text-xs text-navy/60 font-mono">
                      Status: {previewDoc.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getFileUrl(previewDoc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded text-xs font-medium bg-navy text-paper hover:bg-navy-600 transition-colors"
                >
                  Open in New Tab ↗
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-full hover:bg-navy/10 text-navy/60 hover:text-navy text-base leading-none transition-colors"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 bg-navy/5 p-4 overflow-hidden flex items-center justify-center min-h-[450px]">
              {previewDoc.file_path?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={getFileUrl(previewDoc)}
                  title={previewDoc.name}
                  className="w-full h-[65vh] rounded-md border border-navy/10 bg-white"
                />
              ) : (
                <img
                  src={getFileUrl(previewDoc)}
                  alt={previewDoc.name}
                  className="max-h-[65vh] max-w-full object-contain rounded-md shadow-sm"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-navy/10 bg-white flex items-center justify-between text-xs text-navy/60">
              <span>Dunki Document Verification Registry</span>
              <a
                href={getFileUrl(previewDoc)}
                download
                className="text-stamp font-semibold hover:underline"
              >
                Download Document ↓
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}