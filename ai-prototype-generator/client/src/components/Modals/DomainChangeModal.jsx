import { RefreshCw, AlertTriangle, X } from 'lucide-react'

function DomainChangeModal({ isOpen, onClose, onStartNew, oldDomain, newDomain }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-900">Domain Changed</h3>
              <p className="text-sm text-amber-700">Starting a new prototype session</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Domain Transition */}
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Previous</p>
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                  {oldDomain || 'None'}
                </span>
              </div>

              <div className="flex items-center">
                <RefreshCw className="w-5 h-5 text-amber-500" />
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">New</p>
                <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium">
                  {newDomain}
                </span>
              </div>
            </div>

            {/* Message */}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm text-slate-600 text-center">
                Your prompt is a <strong>complete pivot</strong> from <strong>&ldquo;{oldDomain || 'previous'}&rdquo;</strong>.
                The previous context was discarded and a new prototype for <strong>&ldquo;{newDomain}&rdquo;</strong> was generated.
              </p>
            </div>

            {/* Info */}
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-sm text-slate-500">
                <span className="text-amber-500 mt-0.5">•</span>
                <p>Prompt history and merged requirements have been reset</p>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-500">
                <span className="text-amber-500 mt-0.5">•</span>
                <p>Click <strong>Dismiss</strong> to continue with the new prototype</p>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-500">
                <span className="text-amber-500 mt-0.5">•</span>
                <p>Click <strong>New Session</strong> to clear everything and start over</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={onStartNew}
            className="flex-1 px-4 py-2.5 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Start New Prototype
          </button>
        </div>
      </div>
    </div>
  )
}

export default DomainChangeModal
