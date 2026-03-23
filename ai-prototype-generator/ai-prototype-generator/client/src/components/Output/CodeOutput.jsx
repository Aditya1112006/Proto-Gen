import { useState, useMemo } from 'react'
import { FileCode, Copy, Check, Download, Code2, Play, Monitor, Maximize2, Minimize2 } from 'lucide-react'

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

    if (!htmlFile) return '<html><body><p>No HTML file found.</p></body></html>'

    let html = htmlFile.content || ''

    // Inject CSS inline (replace the <link> tag or inject before </head>)
    if (cssFile?.content) {
      const styleTag = `<style>\n${cssFile.content}\n</style>`
      // Remove external stylesheet link references
      html = html.replace(/<link[^>]*href=["']styles\.css["'][^>]*\/?>/gi, '')
      html = html.replace(/<link[^>]*href=["']style\.css["'][^>]*\/?>/gi, '')
      // Inject before </head> or at the start
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`)
      } else {
        html = `${styleTag}\n${html}`
      }
    }

    // Inject JS inline (replace the <script src> tag or inject before </body>)
    if (jsFile?.content) {
      const scriptTag = `<script>\n${jsFile.content}\n</script>`
      // Remove external script references
      html = html.replace(/<script[^>]*src=["']app\.js["'][^>]*><\/script>/gi, '')
      html = html.replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/gi, '')
      // Inject before </body> or at the end
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
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-slate-800">Code</h3>
        </div>
        <div className="bg-slate-50 rounded-xl p-6 text-center">
          <p className="text-slate-500">
            No code files generated yet. Switch to "Workflow + Code" mode to generate code.
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
    ? 'fixed inset-0 z-50 bg-white flex flex-col'
    : 'bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 overflow-hidden'

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-slate-800">Generated Code</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={downloadAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download All
          </button>
        </div>
      </div>

      {/* Tabs: Preview + File Tabs */}
      <div className="flex border-b border-slate-100 overflow-x-auto">
        {/* Live Preview Tab */}
        <button
          onClick={() => { setActiveTab('preview'); setCopied(false) }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'preview'
              ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Monitor className="w-4 h-4" />
          Live Preview
        </button>

        {/* Divider */}
        <div className="w-px bg-slate-200 my-2" />

        {/* File Tabs */}
        {files.map((file, index) => (
          <button
            key={index}
            onClick={() => { setActiveTab(index); setCopied(false) }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === index
                ? 'bg-slate-50 text-primary-600 border-b-2 border-primary-500'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileCode className="w-4 h-4" />
            {file.name || file.filename || `File ${index + 1}`}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {activeTab === 'preview' ? (
        /* ─── Live Preview Iframe ─── */
        <div className={`bg-white ${isFullscreen ? 'flex-1' : ''}`}>
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <Play className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">
              Interactive preview — your generated app is running below
            </span>
          </div>
          <iframe
            srcDoc={previewSrcDoc}
            title="Live Code Preview"
            sandbox="allow-scripts allow-modals"
            className={`w-full border-0 bg-white ${isFullscreen ? 'flex-1 h-full' : ''}`}
            style={{ minHeight: isFullscreen ? 'calc(100vh - 160px)' : '500px' }}
          />
        </div>
      ) : (
        /* ─── Code Editor View ─── */
        <div className="relative">
          {/* Toolbar */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={downloadFile}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          {/* Code Block */}
          <pre className="p-6 pt-16 overflow-x-auto text-sm bg-slate-950 text-slate-200 font-mono">
            <code>{currentFile?.content}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

export default CodeOutput
