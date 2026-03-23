import { MessageSquare, Clock, AlertCircle } from 'lucide-react'

function HistoryList({ prompts, domainChanged }) {
  if (!prompts || prompts.length === 0) {
    return (
      <div className="glass-card p-6 border-l-4 border-l-dark-600 font-mono">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-neon-purple" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Memory Log</h3>
        </div>
        <div className="bg-dark-950 border border-dark-800 p-4 text-left">
           <p className="text-gray-500 text-xs tracking-wider uppercase">&gt; No history detected.</p>
           <p className="text-gray-600 text-xs mt-1">Awaiting context initialization...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card border-l-4 border-l-neon-purple font-mono overflow-hidden flex flex-col max-h-[400px]">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-dark-800 bg-dark-900/80">
        <MessageSquare className="w-4 h-4 text-neon-purple" />
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Memory Log</h3>
      </div>

      <div className="divide-y divide-dark-800 overflow-y-auto scrollbar-hide flex-1 bg-dark-950/50">
        {prompts.map((prompt, index) => (
          <div
            key={index}
            className={`px-6 py-4 transition-colors ${index === prompts.length - 1 ? 'bg-neon-purple/5' : 'hover:bg-dark-800/50'}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-dark-900 border border-dark-700 flex items-center justify-center text-xs font-bold text-gray-500 shadow-inner">
                {index < 10 ? `0${index + 1}` : index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 leading-relaxed break-words">{prompt.text}</p>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    <Clock className="w-3 h-3" />
                    {new Date(prompt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-dark-800 border border-dark-600 text-gray-400 uppercase tracking-widest">
                    {prompt.domain}
                  </span>
                  {index === prompts.length - 1 && domainChanged && (
                    <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 bg-yellow-900/40 border border-yellow-700 text-yellow-500 uppercase tracking-widest shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                      <AlertCircle className="w-3 h-3" />
                      CONTEXT_SHIFT
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
