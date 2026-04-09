import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Mic, MicOff, Send, Sparkles, X, Check, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface CommandResult {
  reply: string
  action: string
  data?: any
  created?: { type: string; id?: string; name?: string }
  confidence?: number
}

export function CommandBar() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CommandResult | null>(null)
  const [listening, setListening] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  // Keyboard shortcut: Cmd+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setResult(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Voice input not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('')
      setInput(transcript)

      // Auto-submit when speech ends (final result)
      if (event.results[0].isFinal) {
        setTimeout(() => handleSubmit(transcript), 300)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setListening(false)
  }

  async function handleSubmit(text?: string) {
    const message = text || input
    if (!message.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ message }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setResult(data)

      // Show toast with action
      if (data.created) {
        if (data.created.type === 'opportunity') {
          toast.success(`Added to pipeline: ${data.created.name}`)
        } else if (data.created.type === 'touchpoint') {
          toast.success('Touchpoint logged')
        } else if (data.created.type === 'architect') {
          toast.success(`Added contact: ${data.created.name}`)
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Command failed')
      setResult({ reply: err.message || 'Something went wrong', action: 'error' })
    }

    setLoading(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="nav-item flex items-center gap-2 rounded-lg px-3 py-1.5"
        style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A', color: '#7C7C7C' }}
        title="Cmd+K"
      >
        <Plus className="h-3.5 w-3.5" style={{ color: '#6366F1' }} />
        <span className="text-[12px]">Quick add</span>
        <kbd className="rounded px-1 py-0.5 text-[9px]" style={{ backgroundColor: '#141414', color: '#4A4A4A' }}>
          K
        </kbd>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={() => { setOpen(false); setResult(null) }}
      />

      {/* Command bar */}
      <div
        className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 rounded-xl page-enter"
        style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
      >
        {/* Input area */}
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: '#2A2A2A' }}>
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: '#6366F1' }} />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder='Try: "Sarah Chen called about a $3M renovation at 42 Oak Lane"'
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: '#E8E8F0' }}
            disabled={loading}
          />
          <div className="flex items-center gap-1.5">
            {/* Voice button */}
            <button
              onClick={listening ? stopListening : startListening}
              className="nav-item flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                backgroundColor: listening ? 'rgba(239, 68, 68, 0.15)' : '#141414',
                color: listening ? '#EF4444' : '#7C7C7C',
                border: `1px solid ${listening ? 'rgba(239, 68, 68, 0.3)' : '#2A2A2A'}`,
              }}
              title="Voice input"
            >
              {listening ? <MicOff className="h-3.5 w-3.5 animate-pulse" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
            {/* Submit */}
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !input.trim()}
              className="nav-item flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#6366F1', color: '#fff', opacity: loading || !input.trim() ? 0.5 : 1 }}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Listening indicator */}
        {listening && (
          <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
            <div className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: '#EF4444' }} />
            <span className="text-[12px]" style={{ color: '#EF4444' }}>Listening... speak naturally</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="px-4 py-3">
            <div className="flex items-start gap-2.5">
              {result.created ? (
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}>
                  <Check className="h-3 w-3" style={{ color: '#22C55E' }} />
                </div>
              ) : (
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#6366F1' }} />
              )}
              <div className="flex-1">
                <p className="text-[13px] leading-relaxed" style={{ color: '#E8E8F0' }}>
                  {result.reply}
                </p>
                {result.created?.type === 'opportunity' && (
                  <button
                    onClick={() => { navigate('/pipeline'); setOpen(false); setResult(null) }}
                    className="mt-2 text-[11px] font-medium" style={{ color: '#6366F1' }}
                  >
                    View in Pipeline
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick suggestions when empty */}
        {!result && !loading && !input && (
          <div className="px-4 py-3">
            <p className="mb-2 text-[10px] font-medium uppercase" style={{ color: '#4A4A4A', letterSpacing: '0.5px' }}>Try saying</p>
            <div className="flex flex-col gap-1">
              {[
                'Just met an architect named John Smith from River Design Studio',
                'We got a referral for a $2.5M custom home on Route 9W in Nyack',
                'Had a call with Sarah Chen about the Garrison project, moving to proposal',
                'Add Blejer Architecture as a lead, they have a renovation in Piermont',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); handleSubmit(suggestion) }}
                  className="nav-item rounded-lg px-3 py-2 text-left text-[12px]"
                  style={{ color: '#7C7C7C', backgroundColor: '#141414' }}
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2" style={{ borderColor: '#2A2A2A' }}>
          <div className="flex items-center gap-3">
            <span className="text-[10px]" style={{ color: '#4A4A4A' }}>
              <kbd className="rounded px-1 py-0.5" style={{ backgroundColor: '#141414' }}>Enter</kbd> to send
            </span>
            <span className="text-[10px]" style={{ color: '#4A4A4A' }}>
              <kbd className="rounded px-1 py-0.5" style={{ backgroundColor: '#141414' }}>Esc</kbd> to close
            </span>
          </div>
          <span className="text-[10px]" style={{ color: '#4A4A4A' }}>
            Powered by AI
          </span>
        </div>
      </div>
    </>
  )
}
