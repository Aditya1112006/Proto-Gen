import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FileCode, Copy, Check, Download, Code2, Monitor, Maximize2, Minimize2 } from 'lucide-react'

function CodeOutput({ files, content }) {
  const [activeTab, setActiveTab] = useState('preview') // 'preview' or file index
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Build the merged HTML document for the iframe preview
  const previewSrcDoc = useMemo(() => {
    if (!files || files.length === 0) return ''

    const htmlFile = files.find(f => (f.name || f.filename || '').endsWith('.html'))
    const cssFile = files.find(f => (f.name || f.filename || '').endsWith('.css'))
    const jsFile = files.find(f => (f.name || f.filename || '').endsWith('.js'))

    if (!htmlFile) return '<html><body style="background:#0a0a0f;color:#39ff14;font-family:monospace;padding:20px;"><p>[SYS_ERR] No HTML root found in build artifact.</p></body></html>'

    let html = htmlFile.content || ''

    // Inject CSS inline
    if (cssFile?.content) {
      const styleTag = `<style>\n${cssFile.content}\n</style>`
      html = html.replace(/<link[^>]*href=["']styles\.css["'][^>]*\/?>/gi, '')
      html = html.replace(/<link[^>]*href=["']style\.css["'][^>]*\/?>/gi, '')
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`)
      } else {
        html = `${styleTag}\n${html}`
      }
    }

    // Inject JS inline
    if (jsFile?.content) {
      const scriptTag = `<script>\n${jsFile.content}\n</script>`
      html = html.replace(/<script[^>]*src=["']app\.js["'][^>]*><\/script>/gi, '')
      html = html.replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/gi, '')
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}\n</body>`)
      } else {
        html = `${html}\n${scriptTag}`
      }
    }

    return html
  }, [files])

  if (!files || files.length === 0) {
    if (!content?.layout_plan) return null

    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4 border-b border-dark-700 pb-2">
          <Code2 className="w-5 h-5 text-neon-green" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Source Code</h3>
        </div>
        <div className="bg-dark-950 border border-dark-800 p-6 text-center">
          <p className="text-gray-500 font-mono text-sm">
            &gt; Awaiting flag `--emit=code` or switch to "Workflow + Code" mode.
          </p>
        </div>
      </div>
    )
  }

  const currentFile = typeof activeTab === 'number' ? files[activeTab] : null

  const copyToClipboard = async () => {
    if (!currentFile) return
    try {
      await navigator.clipboard.writeText(currentFile.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadFile = () => {
    if (!currentFile) return
    const blob = new Blob([currentFile.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentFile.name || currentFile.filename || 'file.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadAll = () => {
    files.forEach((file) => {
      const blob = new Blob([file.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name || file.filename || 'file.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-[9999] bg-dark-950 flex flex-col font-mono'
    : 'glass-card overflow-hidden font-mono text-sm'

  const contentToRender = (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 px-4 sm:px-6 py-4 border-b border-dark-700 bg-dark-900/80">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-neon-green" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Compiler Output</h3>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 border border-transparent hover:border-neon-cyan/50 rounded-sm transition-colors uppercase tracking-widest"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={downloadAll}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs font-bold text-dark-950 bg-neon-green hover:bg-neon-green/80 rounded-sm transition-colors uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            Pull Artifacts
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-800 overflow-x-auto bg-dark-950/50 scrollbar-hide">
        {/* Live Preview Tab */}
        <button
          onClick={() => { setActiveTab('preview'); setCopied(false) }}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
            activeTab === 'preview'
              ? 'bg-neon-cyan/10 text-neon-cyan border-b-2 border-neon-cyan'
              : 'text-gray-500 hover:text-gray-300 hover:bg-dark-800 border-b-2 border-transparent'
          }`}
        >
          <Monitor className="w-4 h-4" />
          Live_Render
        </button>

        {/* Divider */}
        <div className="w-px bg-dark-800 my-2 mx-1" />

        {/* File Tabs */}
        {files.map((file, index) => (
          <button
            key={index}
            onClick={() => { setActiveTab(index); setCopied(false) }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === index
                ? 'bg-neon-green/5 text-neon-green border-b-2 border-neon-green'
                : 'text-gray-500 hover:text-gray-300 hover:bg-dark-800 border-b-2 border-transparent'
            }`}
          >
            <FileCode className="w-4 h-4" />
            {file.name || file.filename || `blob_${index}.txt`}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {activeTab === 'preview' ? (
        /* ─── Live Preview Iframe ─── */
        <div className={`bg-white ${isFullscreen ? 'flex-1 overflow-hidden' : ''} relative`}>
          <iframe
            srcDoc={previewSrcDoc}
            title="Live Code Preview"
            sandbox="allow-scripts allow-modals"
            className={`w-full border-0 bg-white ${isFullscreen ? 'h-full' : ''}`}
            style={{ minHeight: isFullscreen ? '100%' : '600px' }}
          />
        </div>
      ) : (
        /* ─── Code Editor View ─── */
        <div className="relative bg-dark-950 min-h-[500px]">
          {/* Toolbar */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-1.5 bg-dark-800/80 border border-dark-600 text-gray-300 text-xs font-bold uppercase tracking-widest rounded-sm hover:border-neon-green hover:text-neon-green transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  YANKED
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  YANK
                </>
              )}
            </button>
            <button
              onClick={downloadFile}
              className="flex items-center gap-2 px-3 py-1.5 bg-dark-800/80 border border-dark-600 text-gray-300 text-xs font-bold uppercase tracking-widest rounded-sm hover:border-neon-cyan hover:text-neon-cyan transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              SAVE
            </button>
          </div>

          {/* Code Block */}
          <pre className="p-6 pt-16 overflow-x-auto text-sm text-gray-300 font-mono h-full">
            <code>{currentFile?.content}</code>
          </pre>
        </div>
      )}
    </div>
  )

  if (isFullscreen) {
    return createPortal(contentToRender, document.body)
  }

  return contentToRender
}

export default CodeOutput
