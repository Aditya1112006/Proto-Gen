import { MessageSquare, GitMerge, RefreshCw } from 'lucide-react'

function CounterDisplay({ totalPrompts, mergedPrompts, domainChanged, oldDomain, newDomain, changeLog }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 overflow-hidden">
      {/* Main Stats */}
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalPrompts}</p>
              <p className="text-sm text-slate-500">Prompts Entered</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <GitMerge className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{mergedPrompts}</p>
              <p className="text-sm text-slate-500">Prompts Merged</p>
            </div>
          </div>
        </div>
      </div>

      {/* Domain Change Alert */}
      {domainChanged && (
        <div className="px-6 py-4 bg-amber-50 border-t border-amber-100 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800">
                Domain Changed
              </p>
              <p className="text-sm text-amber-700 mt-1">
                From "{oldDomain || 'none'}" to "{newDomain}"
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Previous prototype was cleared. Starting fresh.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Change Log */}
      {changeLog && changeLog.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Change Log</p>
          <div className="space-y-2">
            {changeLog.slice(-3).map((change, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full mt-1.5 flex-shrink-0" />
                <p className="text-sm text-slate-600">{change}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CounterDisplay
