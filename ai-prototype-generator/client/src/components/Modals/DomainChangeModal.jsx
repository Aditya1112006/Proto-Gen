import { RefreshCw, AlertTriangle, X } from 'lucide-react'

function DomainChangeModal({ isOpen, onClose, onStartNew, oldDomain, newDomain }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-dark-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-dark-900 border border-dark-600 shadow-[0_0_50px_rgba(57,255,20,0.05)] max-w-md w-full overflow-hidden font-mono animate-fade-in">
        {/* Header */}
        <div className="bg-yellow-900/20 px-6 py-4 border-b border-yellow-700/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-900/40 border border-yellow-700/50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest">CONTEXT_SHIFT</h3>
              <p className="text-xs text-yellow-600 mt-0.5">Starting a new prototype session</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Domain Transition */}
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">Previous</p>
                <span className="px-3 py-1.5 bg-dark-800 border border-dark-600 text-gray-400 text-xs font-bold">
                  {oldDomain || 'None'}
                </span>
              </div>

              <div className="flex items-center">
                <RefreshCw className="w-5 h-5 text-yellow-500" />
              </div>

              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">New</p>
                <span className="px-3 py-1.5 bg-yellow-900/30 border border-yellow-700/50 text-yellow-500 text-xs font-bold">
                  {newDomain}
                </span>
              </div>
            </div>

            {/* Message */}
            <div className="bg-dark-950 border border-dark-700 p-4">
              <p className="text-xs text-gray-400 text-center">
                Your prompt is a <strong className="text-white">complete pivot</strong> from <strong className="text-white">&ldquo;{oldDomain || 'previous'}&rdquo;</strong>.
                The previous context was discarded and a new prototype for <strong className="text-white">&ldquo;{newDomain}&rdquo;</strong> was generated.
              </p>
            </div>

            {/* Info */}
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <span className="text-yellow-500 mt-0.5">•</span>
                <p>Prompt history and merged requirements have been reset</p>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <span className="text-yellow-500 mt-0.5">•</span>
                <p>Click <strong className="text-gray-300">Dismiss</strong> to continue with the new prototype</p>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <span className="text-yellow-500 mt-0.5">•</span>
                <p>Click <strong className="text-gray-300">New Session</strong> to clear everything and start over</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-700 bg-dark-950 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-gray-400 font-bold uppercase tracking-widest text-xs border border-dark-600 hover:text-white hover:border-gray-500 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={onStartNew}
            className="flex-1 px-4 py-2.5 bg-yellow-600 text-dark-950 font-bold uppercase tracking-widest text-xs hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            New Session
          </button>
        </div>
      </div>
    </div>
  )
}

export default DomainChangeModal
