import {
  Users, ListTodo, CheckCircle2, ClipboardList, Layout,
  Sparkles, Cpu, Lightbulb, Tag
} from 'lucide-react'

function WorkflowOutput({ content, metadata, features, pipelineSteps }) {
  if (!content) return null

  const { summary, roles, workflow, requirements, acceptance_criteria, layout, pipeline } = content

  const safeRender = (val) => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object' && val !== null) {
      return val.name || val.title || val.description || JSON.stringify(val);
    }
    return String(val);
  };

  const formatNodeName = (name) => {
    if (!name) return 'UnknownComponent';
    if (typeof name !== 'string') {
      if (name.name) return formatNodeName(name.name);
      if (name.type) return formatNodeName(name.type);
      if (name.title) return formatNodeName(name.title);
      return 'DataDisplayComponent';
    }
    const nameMap = {
      text: 'TypographyLabel', icon: 'ThemeGraphic', label: 'DescriptorText',
      image: 'MediaAsset', button: 'ActionTrigger', title: 'HeadlineTypography',
      div: 'ContentContainer', value: 'DataMetricDisplay'
    };
    const lowerName = name.toLowerCase().trim();
    if (nameMap[lowerName]) return nameMap[lowerName];
    if (name.includes(' ') || name.toLowerCase() === name) {
      return name.split(/[\s_]+/).map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join('');
    }
    return name;
  };

  const renderLayoutTree = (obj, level = 0) => {
    if (!obj || typeof obj !== 'object') return null
    return (
      <ul className={`${level > 0 ? 'ml-4 border-l border-dark-600 pl-3' : ''}`}>
        {Object.entries(obj).map(([key, value], index) => {
          const hasChildren = value && (typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).length > 0 : Array.isArray(value) && value.length > 0)
          const displayKey = formatNodeName(key);
          return (
            <li key={key} className="relative">
              <div className="flex items-start py-1">
                {level > 0 && (
                  <span className="absolute -left-3 top-3 w-3 h-px bg-dark-600"></span>
                )}
                <div className="flex items-center">
                  {hasChildren ? (
                    <span className="w-2 h-2 bg-neon-cyan rounded-full mr-2 flex-shrink-0 shadow-[0_0_6px_rgba(0,240,255,0.5)]"></span>
                  ) : (
                    <span className="w-2 h-2 bg-gray-600 rounded-full mr-2 flex-shrink-0"></span>
                  )}
                  <span className={`font-medium font-mono text-sm ${hasChildren ? 'text-white' : 'text-gray-400'}`}>
                    {displayKey}
                  </span>
                </div>
              </div>
              {Array.isArray(value) ? (
                <ul className="ml-4 border-l border-dark-600 pl-3">
                  {value.map((item, idx) => (
                    <li key={idx} className="relative py-1">
                      <span className="absolute -left-3 top-3 w-3 h-px bg-dark-600"></span>
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-dark-500 rounded-full mr-2 flex-shrink-0"></span>
                        <span className="text-gray-400 text-sm font-mono">{formatNodeName(item)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : typeof value === 'object' && value !== null ? (
                renderLayoutTree(value, level + 1)
              ) : null}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="space-y-6 font-mono">

      {/* Title and Summary */}
      <div className="glass-card p-4 sm:p-6">
        {metadata?.title && (
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">{metadata.title}</h2>
        )}
        {summary && (
          <p className="text-gray-400 leading-relaxed text-sm">{summary}</p>
        )}
        {metadata?.domain && (
          <div className="mt-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-500" />
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Domain:</span>
            <span className="px-2.5 py-1 bg-neon-cyan/10 text-neon-cyan text-xs font-bold border border-neon-cyan/30 uppercase tracking-wider">
              {metadata.domain}
            </span>
          </div>
        )}
      </div>

      {/* Detected Features */}
      {features && features.length > 0 && (
        <div className="glass-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 mb-4 w-full">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Detected Features</h3>
            </div>
            <span className="text-[10px] text-gray-500 bg-dark-800 border border-dark-600 px-2 py-0.5 uppercase tracking-widest">
              {features.length} found
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {features.map((feature, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-yellow-900/20 text-yellow-500 text-xs font-bold border border-yellow-700/30 uppercase tracking-wider"
              >
                {safeRender(feature)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Roles */}
      {roles && roles.length > 0 && (
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-neon-purple" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Roles</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {roles.map((role, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-neon-purple/10 text-neon-purple text-xs font-bold border border-neon-purple/30 uppercase tracking-wider"
              >
                {safeRender(role)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Workflow */}
      {workflow && workflow.length > 0 && (
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo className="w-5 h-5 text-neon-cyan" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Workflow</h3>
          </div>
          <div className="relative">
            {workflow.map((step, index) => (
              <div key={index} className="flex items-start gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan flex items-center justify-center text-sm font-bold shadow-[0_0_10px_rgba(0,240,255,0.1)]">
                    {index + 1}
                  </div>
                  {index < workflow.length - 1 && (
                    <div className="w-px h-full bg-dark-600 my-2" />
                  )}
                </div>
                <div className="pt-1.5 pb-2 border-b border-dark-700 flex-1 last:border-0">
                  <p className="text-gray-300 leading-relaxed text-sm">
                    {safeRender(step)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements */}
      {requirements && requirements.length > 0 && (
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-neon-green" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Key Requirements</h3>
          </div>
          <ul className="space-y-3">
            {requirements.map((req, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-1.5 w-1.5 h-1.5 bg-neon-green rounded-full flex-shrink-0 shadow-[0_0_6px_rgba(57,255,20,0.5)]" />
                <span className="text-gray-300 text-sm leading-relaxed">{safeRender(req)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Layout - Tree Structure */}
      {layout && typeof layout === 'object' && Object.keys(layout).length > 0 && (
        <div className="glass-card p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Layout className="w-5 h-5 text-neon-purple" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">UI Architecture</h3>
          </div>
          <div className="bg-dark-950 border border-dark-700 p-4 overflow-x-auto font-mono text-sm">
            {renderLayoutTree(layout)}
          </div>
        </div>
      )}

      {/* Acceptance Criteria */}
      {acceptance_criteria && acceptance_criteria.length > 0 && (
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Acceptance Criteria</h3>
          </div>
          <div className="space-y-3">
            {acceptance_criteria.map((criteria, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-dark-950 border border-dark-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm leading-relaxed">{safeRender(criteria)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Pipeline Reasoning */}
      {(pipeline || pipelineSteps?.length > 0) && (
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-neon-green" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">AI Pipeline Reasoning</h3>
          </div>

          {pipelineSteps && pipelineSteps.length > 0 && (
            <div className="space-y-2 mb-4">
              {pipelineSteps.map((step, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-2 bg-dark-950 border border-dark-700">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="w-6 h-6 bg-neon-green/10 border border-neon-green/40 text-neon-green flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-300 text-sm leading-tight">{step.step}</span>
                  </div>
                  <span className="sm:ml-auto text-[10px] text-gray-500 bg-dark-800 border border-dark-600 px-2 py-0.5 uppercase tracking-widest self-start sm:self-auto mt-2 sm:mt-0">
                    {step.result}
                  </span>
                </div>
              ))}
            </div>
          )}

          {pipeline?.generation_notes && (
            <div className="flex items-start gap-2 p-3 bg-neon-cyan/5 border border-neon-cyan/20">
              <Lightbulb className="w-4 h-4 text-neon-cyan mt-0.5 flex-shrink-0" />
              <p className="text-sm text-neon-cyan/80">{pipeline.generation_notes}</p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

export default WorkflowOutput
