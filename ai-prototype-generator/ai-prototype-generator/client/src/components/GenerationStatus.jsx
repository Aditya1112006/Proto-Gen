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
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Pipeline</span>
      </div>
      <div className="flex items-center gap-1">
        {steps.filter(s => s.key !== 'error').map((step, index) => {
          const isActive = step.key === stage
          const isComplete = currentIndex > index
          const isError = stage === 'error'

          return (
            <div key={step.key} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300
                ${isActive ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 scale-105' : ''}
                ${isComplete ? 'bg-emerald-50 text-emerald-600' : ''}
                ${!isActive && !isComplete ? 'text-slate-400' : ''}
                ${isError && step.key === stage ? 'bg-red-50 text-red-600' : ''}
              `}>
                <span>{isComplete ? '✓' : step.icon}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 2 && (
                <div className={`h-px flex-1 min-w-[8px] transition-colors duration-300 ${isComplete ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>
      {stage === 'error' && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
          <span>❌</span> Generation failed
        </div>
      )}
    </div>
  )
}

export default GenerationStatus
