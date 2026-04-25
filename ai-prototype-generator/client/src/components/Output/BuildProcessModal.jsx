import { useState, useEffect, useRef, useCallback } from 'react'

/* ────────────────────────────────────────────────
 * BUILD_STAGES
 * Each stage has a label, icon, a simulated base
 * duration (ms) and a terminal-style log line.
 * ──────────────────────────────────────────────── */
const BUILD_STAGES = [
  { key: 'init',      label: 'Initializing',    icon: '⚡', log: 'Loading build manifest…',           baseDuration: 1800  },
  { key: 'parse',     label: 'Parsing Files',    icon: '📄', log: 'Tokenising source AST…',            baseDuration: 2200  },
  { key: 'compile',   label: 'Compiling',        icon: '⚙️', log: 'Transpiling modules → IR…',          baseDuration: 3500  },
  { key: 'link',      label: 'Linking',          icon: '🔗', log: 'Resolving dependency graph…',        baseDuration: 2800  },
  { key: 'optimise',  label: 'Optimizing',       icon: '🚀', log: 'Tree-shaking & minification…',       baseDuration: 2500  },
  { key: 'complete',  label: 'Build Complete',   icon: '✅', log: 'All artifacts emitted successfully.', baseDuration: 600   },
]

const TOTAL_SIMULATED = BUILD_STAGES.reduce((s, st) => s + st.baseDuration, 0)

/* ────────── tiny helpers ────────── */
const fmt = (ms) => {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/* ────────────────────────────────────────────────
 * BuildProcessModal
 *
 * Props
 * ─────
 *  isOpen        : boolean – whether the modal is visible
 *  onComplete    : () => void – called once the real work resolves
 *  onClose       : () => void – called from the final CTA
 *  realWorkPromise : Promise – the actual async generation promise.
 *                    The animation plays while this resolves. If the
 *                    real work finishes before the animation we hold
 *                    on the last stage; if it finishes after we loop
 *                    the "Optimizing" stage until done.
 * ──────────────────────────────────────────────── */
export default function BuildProcessModal({ isOpen, realWorkPromise, onComplete, onClose }) {
  /* ── state ── */
  const [activeIndex, setActiveIndex]     = useState(0)
  const [elapsed, setElapsed]             = useState(0)
  const [logLines, setLogLines]           = useState([])
  const [isDone, setIsDone]               = useState(false)
  const [realDone, setRealDone]           = useState(false)
  const [showSuccess, setShowSuccess]     = useState(false)
  const [particles, setParticles]         = useState([])
  const [stageTimestamps, setStageTimestamps] = useState([])

  const startRef   = useRef(Date.now())
  const timerRef   = useRef(null)
  const logEndRef  = useRef(null)

  /* ── particle burst on completion ── */
  const spawnParticles = useCallback(() => {
    const newP = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 1.5 + 0.8,
      delay: Math.random() * 0.4,
    }))
    setParticles(newP)
  }, [])

  /* ── reset when opening ── */
  useEffect(() => {
    if (!isOpen) return
    setActiveIndex(0)
    setElapsed(0)
    setLogLines([])
    setIsDone(false)
    setRealDone(false)
    setShowSuccess(false)
    setParticles([])
    setStageTimestamps([])
    startRef.current = Date.now()
  }, [isOpen])

  /* ── track the real promise ── */
  useEffect(() => {
    if (!isOpen || !realWorkPromise) return
    let cancelled = false
    realWorkPromise
      .then(() => { if (!cancelled) setRealDone(true) })
      .catch(() => { if (!cancelled) setRealDone(true) })
    return () => { cancelled = true }
  }, [isOpen, realWorkPromise])

  /* ── wall-clock timer ── */
  useEffect(() => {
    if (!isOpen) return
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current)
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [isOpen])

  /* ── stage progression ── */
  useEffect(() => {
    if (!isOpen) return

    const last = BUILD_STAGES.length - 1

    const advance = (idx) => {
      if (idx > last) return

      // Log line for this stage
      setLogLines(prev => [
        ...prev,
        { text: BUILD_STAGES[idx].log, ts: Date.now() - startRef.current },
      ])

      setStageTimestamps(prev => [...prev, Date.now() - startRef.current])
      setActiveIndex(idx)

      if (idx === last) {
        // Final stage — only finish if real work is also done
        const finalize = () => {
          setIsDone(true)
          clearInterval(timerRef.current)
          setTimeout(() => {
            setShowSuccess(true)
            spawnParticles()
            onComplete?.()
          }, 500)
        }

        if (realDone) {
          finalize()
        } else {
          // Poll until real work is done
          const poll = setInterval(() => {
            // realDone is stale inside this closure, but we work around
            // it by reading from the component's re-render via state setter:
            setRealDone(prev => {
              if (prev) {
                clearInterval(poll)
                finalize()
              }
              return prev
            })
          }, 300)
          return () => clearInterval(poll)
        }
        return
      }

      // If we're at the second-to-last stage and real work isn't done,
      // wait on the penultimate stage (Optimizing) until real work finishes
      if (idx === last - 1 && !realDone) {
        const waitPoll = setInterval(() => {
          setRealDone(prev => {
            if (prev) {
              clearInterval(waitPoll)
              advance(idx + 1)
            }
            return prev
          })
        }, 400)
        return () => clearInterval(waitPoll)
      }

      // Normal timed advance
      const timeout = setTimeout(() => advance(idx + 1), BUILD_STAGES[idx].baseDuration)
      return () => clearTimeout(timeout)
    }

    // kick off
    const cleanup = advance(0)
    return () => { if (typeof cleanup === 'function') cleanup() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, realDone])

  /* ── auto-scroll log ── */
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logLines])

  if (!isOpen) return null

  const estimatedRemaining = Math.max(0, TOTAL_SIMULATED - elapsed)
  const progress = isDone ? 100 : Math.min(99, (elapsed / TOTAL_SIMULATED) * 100)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/95 backdrop-blur-xl animate-fade-in" />

      {/* Completion particles */}
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: '#39ff14',
            boxShadow: '0 0 6px #39ff14',
            opacity: 0,
            animation: `buildParticlePop ${p.duration}s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}

      {/* ─── Modal Card ─── */}
      <div
        className="relative z-10 w-full max-w-2xl mx-4 bg-dark-900 border border-neon-green/20 shadow-[0_0_80px_rgba(57,255,20,0.08)] font-mono overflow-hidden animate-slide-up"
        style={{ animationDuration: '0.5s' }}
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-dark-700 bg-dark-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${isDone ? 'bg-neon-green shadow-[0_0_8px_#39ff14]' : 'bg-neon-cyan animate-pulse'}`} />
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.15em]">
              {isDone ? 'Build Succeeded' : 'Building Prototype…'}
            </h2>
          </div>
          <div className="text-xs text-gray-500 tabular-nums tracking-wider flex items-center gap-4">
            <span className="text-neon-green">{fmt(elapsed)}</span>
            {!isDone && (
              <span className="text-dark-600">ETA {fmt(estimatedRemaining)}</span>
            )}
          </div>
        </div>

        {/* ── Progress Bar ── */}
        <div className="h-1 bg-dark-800 relative overflow-hidden">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: isDone
                ? '#39ff14'
                : 'linear-gradient(90deg, #39ff14 60%, #00f0ff 100%)',
              boxShadow: isDone
                ? '0 0 12px #39ff14'
                : '0 0 12px rgba(57,255,20,.5)',
            }}
          />
          {!isDone && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          )}
        </div>

        {/* ── Success Summary (slides over the stages) ── */}
        {showSuccess ? (
          <div className="p-8 flex flex-col items-center gap-6 animate-fade-in">
            {/* Big checkmark */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-neon-green/40 flex items-center justify-center bg-neon-green/5 shadow-[0_0_40px_rgba(57,255,20,0.15)]">
                <svg className="w-10 h-10 text-neon-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" className="animate-draw-check" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'drawCheck 0.6s ease-out 0.2s forwards' }} />
                </svg>
              </div>
              <div className="absolute inset-0 rounded-full border border-neon-green/20 animate-ping opacity-30" />
            </div>

            <h3 className="text-lg font-bold text-white uppercase tracking-widest">Build Complete</h3>

            {/* Stats row */}
            <div className="flex items-center gap-8 text-xs text-gray-400">
              <div className="flex flex-col items-center gap-1">
                <span className="text-neon-green font-bold text-base tabular-nums">{fmt(elapsed)}</span>
                <span className="uppercase tracking-wider text-[10px]">Total Time</span>
              </div>
              <div className="w-px h-8 bg-dark-700" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-neon-cyan font-bold text-base tabular-nums">{BUILD_STAGES.length}</span>
                <span className="uppercase tracking-wider text-[10px]">Stages</span>
              </div>
              <div className="w-px h-8 bg-dark-700" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-neon-purple font-bold text-base tabular-nums">0</span>
                <span className="uppercase tracking-wider text-[10px]">Errors</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={onClose}
              className="mt-2 px-10 py-3 bg-neon-green text-dark-950 font-bold uppercase tracking-widest text-xs border border-neon-green hover:shadow-[0_0_30px_rgba(57,255,20,0.5)] transition-all"
            >
              View Build →
            </button>
          </div>
        ) : (
          <>
            {/* ── Stage Timeline ── */}
            <div className="px-6 py-5">
              <div className="space-y-0">
                {BUILD_STAGES.map((stage, idx) => {
                  const isActive   = idx === activeIndex && !isDone
                  const isComplete = idx < activeIndex || isDone
                  const isPending  = idx > activeIndex && !isDone

                  return (
                    <div key={stage.key} className="flex items-stretch gap-4">
                      {/* Vertical connector + dot */}
                      <div className="flex flex-col items-center w-5 flex-shrink-0">
                        {/* Dot */}
                        <div className={`
                          relative flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-500
                          ${isComplete
                            ? 'border-neon-green bg-neon-green/20 shadow-[0_0_8px_rgba(57,255,20,0.4)]'
                            : isActive
                              ? 'border-neon-cyan bg-neon-cyan/10 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                              : 'border-dark-600 bg-dark-800'}
                        `}>
                          {isComplete && (
                            <svg className="w-3 h-3 text-neon-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                          {isActive && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
                              <div className="absolute inset-0 rounded-full border border-neon-cyan/30 animate-ping" />
                            </>
                          )}
                        </div>
                        {/* Line */}
                        {idx < BUILD_STAGES.length - 1 && (
                          <div className={`w-0.5 flex-1 min-h-[20px] transition-all duration-700 ${isComplete ? 'bg-neon-green/40' : 'bg-dark-700'}`} />
                        )}
                      </div>

                      {/* Label row */}
                      <div className={`flex items-center gap-3 pb-4 transition-all duration-500 ${isPending ? 'opacity-30' : 'opacity-100'}`}>
                        <span className={`text-sm ${isActive ? 'animate-bounce' : ''}`}>{stage.icon}</span>
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          isComplete ? 'text-neon-green' : isActive ? 'text-neon-cyan' : 'text-dark-600'
                        }`}>
                          {stage.label}
                        </span>
                        {isComplete && stageTimestamps[idx] !== undefined && (
                          <span className="text-[10px] text-dark-600 tabular-nums ml-auto">{fmt(stageTimestamps[idx])}</span>
                        )}
                        {isActive && (
                          <span className="ml-2 text-[10px] text-neon-cyan/60 animate-pulse tracking-widest">RUNNING</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Live Log ── */}
            <div className="border-t border-dark-700 bg-dark-950 px-6 py-4 max-h-32 overflow-y-auto scrollbar-hide">
              <p className="text-[9px] text-dark-600 uppercase tracking-[0.2em] mb-2 font-bold">Build Log</p>
              {logLines.map((line, i) => (
                <p key={i} className="text-[11px] text-gray-500 leading-5">
                  <span className="text-dark-600 mr-2 tabular-nums">[{fmt(line.ts)}]</span>
                  <span className="text-neon-green/70">&gt;</span> {line.text}
                </p>
              ))}
              {!isDone && (
                <p className="text-[11px] text-neon-cyan/50 animate-pulse leading-5">
                  <span className="text-dark-600 mr-2 tabular-nums">[{fmt(elapsed)}]</span>█
                </p>
              )}
              <div ref={logEndRef} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
