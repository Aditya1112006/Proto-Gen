import { History, Clock, Layers, ChevronRight } from 'lucide-react'

function SessionList({ sessionLog = [], activeSessionId, onLoadSession }) {
  if (!sessionLog || sessionLog.length === 0) {
    return null
  }

  return (
    <div className="glass-card overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-dark-800 bg-dark-900/80">
        <History className="w-4 h-4 text-neon-cyan" />
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Session History</h3>
        <span className="ml-auto text-[10px] text-gray-500 bg-dark-800 border border-dark-700 px-2 py-0.5">
          {sessionLog.length}
        </span>
      </div>

      {/* Session Items */}
      <div className="divide-y divide-dark-800 max-h-[300px] overflow-y-auto scrollbar-hide bg-dark-950/50">
        {sessionLog.map((session) => {
          const isActive = session.id === activeSessionId
          return (
            <button
              key={session.id}
              onClick={() => onLoadSession(session.id)}
              className={`w-full text-left px-5 py-3.5 transition-all group relative
                ${isActive
                  ? 'bg-neon-cyan/5 border-l-2 border-l-neon-cyan'
                  : 'hover:bg-dark-800/60 border-l-2 border-l-transparent hover:border-l-dark-600'
                }`}
            >
              {/* Active indicator glow */}
              {isActive && (
                <div className="absolute inset-0 bg-neon-cyan/[0.02] pointer-events-none" />
              )}

              <div className="flex items-start gap-3 relative z-10">
                <div className={`flex-shrink-0 w-7 h-7 flex items-center justify-center text-xs border mt-0.5
                  ${isActive
                    ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'
                    : 'bg-dark-900 border-dark-700 text-gray-500 group-hover:border-dark-600'
                  }`}>
                  <Layers className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug truncate
                    ${isActive ? 'text-neon-cyan font-bold' : 'text-gray-300 group-hover:text-white'}`}>
                    {session.title}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider">
                      <Clock className="w-3 h-3" />
                      {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-dark-800 border border-dark-700 text-gray-400 uppercase tracking-wider">
                      {session.domain}
                    </span>
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-1 transition-transform
                  ${isActive ? 'text-neon-cyan' : 'text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5'}`} />
              </div>

              {isActive && (
                <div className="mt-2 ml-10">
                  <span className="text-[9px] text-neon-cyan/60 uppercase tracking-widest font-bold animate-pulse">
                    ● ACTIVE
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-dark-900/50 border-t border-dark-800">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">
          In-memory only · Clears on reload
        </p>
      </div>
    </div>
  )
}

export default SessionList
