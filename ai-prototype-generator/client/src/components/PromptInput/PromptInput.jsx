import { useState } from 'react'
import { Send, Loader2, Code, FileText, AlertCircle } from 'lucide-react'

function PromptInput({ onSubmit, isLoading, mode, setMode, promptHistory = [], counters = {}, domainChanged = false, oldDomain = null }) {
  const [prompt, setPrompt] = useState('')
  const [showDomainAlert, setShowDomainAlert] = useState(domainChanged)

  // Show domain alert when domain changes
  useState(() => {
    setShowDomainAlert(domainChanged)
    if (domainChanged) {
      const timer = setTimeout(() => setShowDomainAlert(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [domainChanged])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim())
      setPrompt('')
    }
  }

  // Get latest 5 prompts for display
  const latestPrompts = promptHistory.slice(-5).reverse()

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
      {/* Domain Change Alert */}
      {showDomainAlert && (
        <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 font-medium">
              Domain Changed{oldDomain ? ` from "${oldDomain}"` : ''}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Previous prototype cleared. Starting new prototype.
            </p>
          </div>
          <button
            onClick={() => setShowDomainAlert(false)}
            className="text-amber-600 hover:text-amber-800 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex border-b border-slate-100">
        <button
          type="button"
          onClick={() => setMode('workflow')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
            mode === 'workflow'
              ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-500'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Workflow Only
        </button>
        <button
          type="button"
          onClick={() => setMode('workflow+code')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
            mode === 'workflow+code'
              ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-500'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Code className="w-4 h-4" />
            Workflow + Code
        </button>
      </div>

      {/* Counters */}
      {(counters.totalPrompts > 0 || counters.mergedPrompts > 0) && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Prompts entered: <span className="font-medium text-slate-700">{counters.totalPrompts || 0}</span>
            {' '}—{' '}
            Prompts merged: <span className="font-medium text-slate-700">{counters.mergedPrompts || 0}</span>
          </span>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your product idea... (e.g., 'Build a meal-planning app for busy students')"
            className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            disabled={isLoading}
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-600/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Tip: Add more details to refine your prototype. Same domain prompts will be merged automatically.
        </p>
      </form>

      {/* Prompt History */}
      {latestPrompts.length > 0 && (
        <div className="px-4 pb-4">
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500 mb-2">Recent Prompts:</p>
            <div className="space-y-2">
              {latestPrompts.map((item, index) => (
                <div
                  key={index}
                  className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 truncate"
                  title={item.text}
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromptInput
