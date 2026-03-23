import { MessageSquare, Clock, AlertCircle } from 'lucide-react'

function HistoryList({ prompts, domainChanged }) {
  if (!prompts || prompts.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-slate-800">Prompt History</h3>
        </div>
        <p className="text-slate-400 text-sm">No prompts yet. Start by describing your product idea above.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
        <MessageSquare className="w-5 h-5 text-primary-500" />
        <h3 className="text-lg font-semibold text-slate-800">Prompt History</h3>
      </div>

      <div className="divide-y divide-slate-100">
        {prompts.map((prompt, index) => (
          <div
            key={index}
            className={`px-6 py-4 ${index === prompts.length - 1 ? 'bg-primary-50/50' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700">{prompt.text}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {new Date(prompt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {prompt.domain}
                  </span>
                  {index === prompts.length - 1 && domainChanged && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      New Domain
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HistoryList
