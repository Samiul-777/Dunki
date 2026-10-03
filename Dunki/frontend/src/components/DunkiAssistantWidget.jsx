import { useState, useEffect, useRef } from 'react'
import { chatWithAssistant, fetchAssistantSuggestions } from '../lib/api.js'

function renderMarkdown(text) {
  if (!text) return null

  // Split into paragraphs / lines
  const lines = text.split('\n')
  const elements = []

  let inList = false
  let listItems = []

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 my-1.5 text-xs">
          {listItems.map((item, i) => (
            <li key={i}>{formatInline(item)}</li>
          ))}
        </ul>
      )
      inList = false
      listItems = []
    }
  }

  const formatInline = (str) => {
    // Bold **text**
    const parts = []
    const boldRegex = /\*\*(.*?)\*\*/g
    let lastIndex = 0
    let match

    while ((match = boldRegex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index))
      }
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-navy">
          {match[1]}
        </strong>
      )
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex))
    }

    return parts.length > 0 ? parts : str
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(
        <h4 key={`h3-${idx}`} className="font-display font-bold text-sm text-navy mt-2.5 mb-1">
          {trimmed.replace(/^###\s+/, '')}
        </h4>
      )
    } else if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(
        <h3 key={`h2-${idx}`} className="font-display font-bold text-base text-navy mt-3 mb-1.5">
          {trimmed.replace(/^##\s+/, '')}
        </h3>
      )
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true
      listItems.push(trimmed.substring(2))
    } else if (/^\d+\.\s+/.test(trimmed)) {
      flushList()
      elements.push(
        <p key={`ol-${idx}`} className="text-xs my-1 pl-1">
          <span className="font-bold text-navy/70 mr-1.5">{trimmed.match(/^\d+\./)[0]}</span>
          {formatInline(trimmed.replace(/^\d+\.\s+/, ''))}
        </p>
      )
    } else if (trimmed === '---') {
      flushList()
      elements.push(<hr key={`hr-${idx}`} className="my-2 border-navy/15" />)
    } else if (trimmed.length > 0) {
      flushList()
      elements.push(
        <p key={`p-${idx}`} className="text-xs my-1 text-navy/85 leading-relaxed">
          {formatInline(trimmed)}
        </p>
      )
    }
  })

  flushList()

  return elements
}

export default function DunkiAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! 👋 Welcome to Dunki. I'm your **AI Migration Advisor**.\n\nHow can I help you today? Ask me about contracts, payments, BMET fees, documents, complaints, or worker rights.",
      sources: ['Dunki Platform Mission'],
      is_out_of_domain: false,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([
    'Can I make payments without logging in?',
    'Why cannot migrant workers add contracts?',
    'What is the legal BMET fee for Saudi Arabia?',
    'What 5 documents are required in the Document Vault?',
  ])

  const chatEndRef = useRef(null)

  useEffect(() => {
    fetchAssistantSuggestions()
      .then((data) => {
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions.slice(0, 4))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim()
    if (!query || loading) return

    setInput('')
    const newMessages = [...messages, { role: 'user', content: query }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const history = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await chatWithAssistant(query, history)

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: response.reply,
          sources: response.sources || [],
          is_out_of_domain: response.is_out_of_domain || false,
        },
      ])
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue connecting to the Dunki RAG service. Please try again.',
          is_out_of_domain: false,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat cleared. I am ready to assist with Dunki platform records, BMET fees, contracts, or SSLCommerz payments.",
        sources: [],
      },
    ])
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 bg-navy text-paper px-4 py-3 rounded-full shadow-2xl hover:bg-navy/90 border border-paper/20 hover:scale-105 transition-all duration-200"
          title="Open Dunki RAG Assistant"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="font-display font-semibold text-sm tracking-wide">Dunki AI Advisor</span>
          <span className="bg-stamp/30 text-stamp-light text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-stamp/40">
            RAG
          </span>
        </button>
      )}

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="bg-white rounded-2xl border border-navy/20 shadow-2xl w-[92vw] sm:w-[420px] h-[550px] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Drawer Header */}
          <div className="bg-navy text-paper p-4 flex items-center justify-between shrink-0 border-b border-navy/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-paper/15 flex items-center justify-center text-sm font-bold border border-paper/20">
                🛡️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm text-white">Dunki AI Advisor</h3>
                  <span className="text-[10px] font-mono bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                    RAG Grounded
                  </span>
                </div>
                <p className="text-[11px] text-paper/60">Your smart migration assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleClear}
                className="text-[11px] text-paper/60 hover:text-white px-2 py-1 rounded hover:bg-paper/10 transition-colors"
                title="Clear conversation"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-paper/70 hover:text-white p-1 rounded-full hover:bg-paper/10 text-lg leading-none"
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Domain Guardrail Notice Bar */}
          <div className="bg-navy/5 border-b border-navy/10 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-navy/70 shrink-0">
            <span className="flex items-center gap-1">
              <span>✨</span>
              <span>Powered by AI with Dunki &amp; BMET knowledge</span>
            </span>
            <span className="font-mono text-[10px] text-navy/40">v3.0</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-paper/20">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user'
              const isRefusal = m.is_out_of_domain

              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 shadow-sm text-xs ${
                      isUser
                        ? 'bg-navy text-paper rounded-br-none'
                        : isRefusal
                        ? 'bg-amber-50 text-amber-950 border border-amber-300 rounded-bl-none'
                        : 'bg-white text-navy border border-navy/10 rounded-bl-none'
                    }`}
                  >
                    {isRefusal && (
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800 mb-1 border-b border-amber-200 pb-1">
                        <span>⚠️</span>
                        <span>Out of Domain Query Restricted</span>
                      </div>
                    )}

                    {isUser ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <div className="space-y-1">{renderMarkdown(m.content)}</div>
                    )}

                    {/* Sources Badge */}
                    {!isUser && m.sources && m.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-navy/10 flex flex-wrap items-center gap-1 text-[10px] text-navy/50 font-mono">
                        <span className="font-medium text-navy/60">Grounded in:</span>
                        {m.sources.map((s, si) => (
                          <span key={si} className="bg-navy/5 text-navy/70 px-1.5 py-0.5 rounded border border-navy/10">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="flex items-start">
                <div className="bg-white border border-navy/10 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-2 text-xs text-navy/60">
                  <div className="h-3.5 w-3.5 border-2 border-navy/30 border-t-navy rounded-full animate-spin"></div>
                  <span>Thinking…</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="p-2.5 bg-white border-t border-navy/10 shrink-0">
            <p className="text-[10px] font-mono uppercase text-navy/40 px-1 mb-1.5">Suggested Questions:</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className={`text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full border transition-all ${
                    s.includes('rice')
                      ? 'bg-amber-50/60 text-amber-900 border-amber-200 hover:bg-amber-100'
                      : 'bg-paper text-navy/80 border-navy/15 hover:bg-navy/5 hover:border-navy/30'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-navy/10 shrink-0">
            <div className="flex items-center gap-2 bg-paper rounded-xl border border-navy/20 px-3 py-1.5 focus-within:border-stamp focus-within:bg-white transition-all">
              <input
                type="text"
                placeholder="Ask me anything about migration..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="flex-1 bg-transparent text-xs text-navy outline-none py-1.5"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="bg-navy text-paper p-1.5 rounded-lg hover:bg-navy/90 disabled:opacity-30 transition-all"
                title="Send query"
              >
                <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
