import { MessageSquare, GitMerge, RefreshCw } from 'lucide-react'

function CounterDisplay({ totalPrompts, mergedPrompts, domainChanged, oldDomain, newDomain, changeLog }) {
  return (
    <div className="glass-card overflow-hidden font-mono">

      {/* Main Stats */}
      <div className="grid grid-cols-2 divide-x divide-dark-700">

        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neon-green/10 border border-neon-green/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-neon-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalPrompts}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Prompts Entered</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
              <GitMerge className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{mergedPrompts}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Prompts Merged</p>
            </div>
          </div>
        </div>

      </div>

      {/* Domain Change Alert */}
      {domainChanged && (
        <div className="px-6 py-4 bg-yellow-900/20 border-t border-yellow-700/30 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-yellow-900/40 border border-yellow-700/50 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-4 h-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest">
                CONTEXT_SHIFT_DETECTED
              </p>
              <p className="text-xs text-yellow-600 mt-1 font-mono">
                From "{oldDomain || 'none'}" to "{newDomain}"
              </p>
              <p className="text-[10px] text-yellow-700 mt-2 uppercase tracking-widest">
                Previous context discarded. Starting fresh.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Change Log */}
      {changeLog && changeLog.length > 0 && (
        <div className="px-6 py-4 border-t border-dark-700">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
            // CHANGE_LOG
          </p>
          <div className="space-y-2">
            {changeLog.slice(-3).map((change, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-neon-green rounded-full mt-1.5 flex-shrink-0 shadow-[0_0_4px_rgba(57,255,20,0.5)]" />
                <p className="text-xs text-gray-400">
                  <span className="text-gray-600 mr-2 text-[10px]">
                    {change.when}
                  </span>
                  {change.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default CounterDisplay