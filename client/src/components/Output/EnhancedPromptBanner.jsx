import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp, Wand2 } from 'lucide-react'

/**
 * EnhancedPromptBanner
 * Shows the user what their prompt was expanded to by Gemini.
 * Appears right below the generation status bar when a result is ready.
 */
function EnhancedPromptBanner({ originalPrompt, enhancedPrompt }) {
  const [expanded, setExpanded] = useState(false)

  // Don't render if enhancement didn't happen (same as original)
  if (!enhancedPrompt || enhancedPrompt === originalPrompt) return null

  return (
    <div className="glass-card overflow-hidden border border-neon-purple/20 font-mono animate-fade-in">
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-800/60 transition-all duration-200 group text-left"
      >
        <span className="flex items-center gap-1.5 text-neon-purple shrink-0">
          <Wand2 className="w-3.5 h-3.5" />
          <Sparkles className="w-3 h-3 animate-pulse" />
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neon-purple/70 font-bold mb-0.5">
            Gemini Enhanced Your Prompt
          </p>
          <p className="text-xs text-gray-400 truncate">
            <span className="text-gray-600 mr-1">original:</span>
            "{originalPrompt}"
          </p>
        </div>

        <span className="text-gray-600 group-hover:text-gray-400 transition-colors shrink-0">
          {expanded
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />
          }
        </span>
      </button>

      {/* Expanded enhanced prompt */}
      {expanded && (
        <div className="border-t border-dark-700 px-4 py-4 space-y-3 animate-fade-in">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-gray-600 mb-2">
              ✦ Expanded to:
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">
              {enhancedPrompt}
            </p>
          </div>
          <p className="text-[10px] text-dark-500 border-t border-dark-700 pt-2 mt-2">
            This expanded spec was used to generate your prototype — the AI filled in interactions, aesthetics, and UX best practices automatically.
          </p>
        </div>
      )}
    </div>
  )
}

export default EnhancedPromptBanner
