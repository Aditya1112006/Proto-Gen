const STEPS = [
  { key: "detecting",  short: "Domain",    icon: "◈" },
  { key: "extracting", short: "Features",  icon: "◉" },
  { key: "generating", short: "Generating",icon: "◎" },
  { key: "validating", short: "Validating",icon: "◑" },
  { key: "complete",   short: "Complete",  icon: "✦" },
]

function GenerationStatus({ stage }) {
  if (!stage) return null

  const currentIndex = STEPS.findIndex(s => s.key === stage)
  const isError = stage === 'error'

  return (
    <div className="glass-card p-4 font-mono">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em]">
          AI Pipeline
        </span>
        {isError && (
          <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest ml-auto animate-pulse">
            ● FAULT
          </span>
        )}
        {stage === 'complete' && (
          <span className="text-[9px] font-bold text-neon-green uppercase tracking-widest ml-auto">
            ● DONE
          </span>
        )}
      </div>

      {/* Stepper Row */}
      <div className="flex items-center w-full">
        {STEPS.map((step, index) => {
          const isActive   = step.key === stage
          const isComplete = currentIndex > index && !isError
          const isPending  = !isActive && !isComplete

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              {/* Step pill */}
              <div
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider
                  border transition-all duration-500 flex-shrink-0
                  ${isActive
                    ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/50 shadow-[0_0_14px_rgba(0,240,255,0.25)] animate-pulse-slow'
                    : isComplete
                    ? 'bg-neon-green/10 text-neon-green border-neon-green/25'
                    : 'text-dark-600 border-dark-700 bg-transparent'}
                `}
              >
                <span className={`text-[10px] ${isActive ? 'animate-spin-slow' : ''}`}>
                  {isComplete ? '✓' : step.icon}
                </span>
                <span>{step.short}</span>
              </div>

              {/* Connector line — shown between steps, not after the last */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-1 min-w-[8px] h-px bg-dark-700">
                  <div
                    className={`h-full transition-all duration-700 ${
                      isComplete ? 'bg-neon-green/50 w-full' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Error bar */}
      {isError && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest">
          <span>▲</span>
          <span>PIPELINE_FAULT — Generation failed. Please retry.</span>
        </div>
      )}
    </div>
  )
}

export default GenerationStatus
