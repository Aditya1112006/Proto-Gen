function GenerationStatus({ stage }) {
  const steps = [
    { key: "detecting", label: "Detecting domain", icon: "🧠" },
    { key: "extracting", label: "Extracting features", icon: "🔍" },
    { key: "generating", label: "Generating prototype", icon: "⚙️" },
    { key: "validating", label: "Validating output", icon: "✅" },
    { key: "complete", label: "Pipeline complete!", icon: "🚀" },
    { key: "error", label: "Generation failed", icon: "❌" }
  ]

  if (!stage) return null

  const currentIndex = steps.findIndex(s => s.key === stage)

  return (
    <div className="glass-card p-4 font-mono">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AI Pipeline</span>
      </div>
      <div className="flex items-center gap-1">
        {steps.filter(s => s.key !== 'error').map((step, index) => {
          const isActive = step.key === stage
          const isComplete = currentIndex > index
          const isError = stage === 'error'

          return (
            <div key={step.key} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300
                ${isActive ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/40 shadow-[0_0_10px_rgba(0,240,255,0.15)] scale-105' : ''}
                ${isComplete ? 'bg-neon-green/10 text-neon-green border border-neon-green/30' : ''}
                ${!isActive && !isComplete ? 'text-gray-600 border border-transparent' : ''}
                ${isError && step.key === stage ? 'bg-red-900/30 text-red-500 border border-red-500/30' : ''}
              `}>
                <span>{isComplete ? '✓' : step.icon}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 2 && (
                <div className={`h-px flex-1 min-w-[8px] transition-colors duration-300 ${isComplete ? 'bg-neon-green/50' : 'bg-dark-700'}`} />
              )}
            </div>
          )
        })}
      </div>
      {stage === 'error' && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500 font-bold uppercase tracking-widest">
          <span>❌</span> PIPELINE_FAULT
        </div>
      )}
    </div>
  )
}

export default GenerationStatus
