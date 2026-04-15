import { useState, useEffect } from 'react'
import { Send, Loader2, Code, FileText, AlertCircle } from 'lucide-react'

function PromptInput({ onSubmit, isLoading, promptHistory = [], counters = {}, domainChanged = false, oldDomain = null }) {
  const [prompt, setPrompt] = useState('')
  const [showDomainAlert, setShowDomainAlert] = useState(false)

  // Show domain alert when domain changes
  useEffect(() => {
    if (domainChanged) {
      setShowDomainAlert(true)
      if (promptHistory.length > 0) {
        setPrompt(promptHistory[promptHistory.length - 1].text)
      }
      const timer = setTimeout(() => setShowDomainAlert(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [domainChanged, promptHistory])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim())
      setPrompt('')
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Domain Change Alert */}
      {showDomainAlert && domainChanged && (
        <div className="bg-red-900/30 border-b border-red-500/50 p-4 flex items-start gap-3 transition-all relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 relative z-10" />
          <div className="flex-1 relative z-10">
            <h4 className="text-sm font-bold text-red-500 uppercase tracking-wider">Domain Change Detected</h4>
            <p className="text-sm text-red-300 mt-1">
              Input diverged from &lt;<strong className="text-red-400">{oldDomain || 'previous_domain'}</strong>&gt;. Session context purged.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDomainAlert(false)}
                className="px-4 py-1.5 border border-red-500/50 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest rounded-sm transition-colors"
              >
                ACKNOWLEDGE
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Counters */}
      {(counters.totalPrompts > 0 || counters.mergedPrompts > 0) && (
        <div className="px-4 py-2 bg-dark-950/80 border-b border-dark-700 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono">
            [PROMPTS_RCV: <span className="font-bold text-neon-cyan">{counters.totalPrompts || 0}</span>]
            {' '}—{' '}
            [MERGED_DOCS: <span className="font-bold text-neon-cyan">{counters.mergedPrompts || 0}</span>]
          </span>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-1 relative bg-dark-900/60 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none mix-blend-screen"></div>
        <div className="relative flex flex-col sm:block z-10">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="> Enter system specifications... (e.g. 'Initialize admin dashboard with dark mode')"
            className="w-full h-32 sm:h-40 px-4 sm:px-5 py-4 pb-2 sm:pb-4 bg-transparent border-none text-gray-200 placeholder:text-gray-600 resize-none focus:ring-0 text-sm leading-relaxed antialiased"
            disabled={isLoading}
          />

          {/* Submit Button */}
          <div className="p-2 sm:p-0 sm:absolute sm:bottom-4 sm:right-4 w-full sm:w-auto flex justify-end">
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-6 py-2.5 sm:py-2 bg-neon-green text-dark-950 text-xs font-bold uppercase tracking-widest hover:bg-neon-green/90 hover:shadow-[0_0_25px_rgba(57,255,20,0.6)] disabled:opacity-30 disabled:hover:shadow-none disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Execute
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="px-4 pb-3 flex justify-between items-center border-t border-dark-800/50 pt-2 mx-1 mt-1">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">
            Context merging active. Iterative prompts supported.
          </p>
          <span className="text-[10px] text-neon-green/50 animate-pulse font-mono block">
            _READY
          </span>
        </div>
      </form>
    </div>
  )
}

export default PromptInput
