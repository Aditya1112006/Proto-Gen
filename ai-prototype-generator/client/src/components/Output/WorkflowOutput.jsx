import {
  Users, ListTodo, CheckCircle2, ClipboardList, Layout,
  Sparkles, Cpu, Lightbulb, Tag
} from 'lucide-react'

function WorkflowOutput({ content, metadata, features, pipelineSteps }) {
  if (!content) return null

  const { summary, roles, workflow, requirements, acceptance_criteria, layout, pipeline } = content

  // Helper to ensure any hallucinated object arrays don't crash React
  const safeRender = (val) => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object' && val !== null) {
      return val.name || val.title || val.description || JSON.stringify(val);
    }
    return String(val);
  };

  // Helper to force generic names into professional component names
  const formatNodeName = (name) => {
    if (!name) return 'UnknownComponent';
    
    // Safety check: If AI hallucinates an object (like {id, date}) instead of a string
    if (typeof name !== 'string') {
      if (name.name) return formatNodeName(name.name);
      if (name.type) return formatNodeName(name.type);
      if (name.title) return formatNodeName(name.title);
      return 'DataDisplayComponent';
    }
    const nameMap = {
      text: 'TypographyLabel',
      icon: 'ThemeGraphic',
      label: 'DescriptorText',
      image: 'MediaAsset',
      button: 'ActionTrigger',
      title: 'HeadlineTypography',
      div: 'ContentContainer',
      value: 'DataMetricDisplay'
    };

    const lowerName = name.toLowerCase().trim();
    if (nameMap[lowerName]) {
      return nameMap[lowerName];
    }

    // Ensure PascalCase if it's multiple words or lowercase
    if (name.includes(' ') || name.toLowerCase() === name) {
      return name.split(/[\s_]+/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join('');
    }

    return name;
  };

  // Recursive function to render layout tree
  const renderLayoutTree = (obj, level = 0) => {
    if (!obj || typeof obj !== 'object') return null

    return (
      <ul className={`${level > 0 ? 'ml-4 border-l-2 border-slate-200 pl-3' : ''}`}>
        {Object.entries(obj).map(([key, value], index) => {
          const hasChildren = value && (typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).length > 0 : Array.isArray(value) && value.length > 0)
          const displayKey = formatNodeName(key);

          return (
            <li key={key} className="relative">
              <div className="flex items-start py-1">
                {level > 0 && (
                  <span className="absolute -left-3 top-3 w-3 h-px bg-slate-300"></span>
                )}
                <div className="flex items-center">
                  {hasChildren ? (
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></span>
                  ) : (
                    <span className="w-2 h-2 bg-slate-400 rounded-full mr-2 flex-shrink-0"></span>
                  )}
                  <span className={`font-medium ${hasChildren ? 'text-slate-800' : 'text-slate-600'}`}>
                    {displayKey}
                  </span>
                </div>
              </div>

              {Array.isArray(value) ? (
                <ul className="ml-4 border-l-2 border-slate-200 pl-3">
                  {value.map((item, idx) => (
                    <li key={idx} className="relative py-1">
                      <span className="absolute -left-3 top-3 w-3 h-px bg-slate-300"></span>
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full mr-2 flex-shrink-0"></span>
                        <span className="text-slate-600 text-sm">{formatNodeName(item)}</span>
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
    <div className="space-y-6">

      {/* Title and Summary */}
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
        {metadata?.title && (
          <h2 className="text-2xl font-bold text-slate-800 mb-3">{metadata.title}</h2>
        )}
        {summary && (
          <p className="text-slate-600 leading-relaxed">{summary}</p>
        )}
        {metadata?.domain && (
          <div className="mt-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Domain:</span>
            <span className="px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100">
              {metadata.domain}
            </span>
          </div>
        )}
      </div>

      {/* Detected Features */}
      {features && features.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-800">Detected Features</h3>
            <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {features.length} found
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {features.map((feature, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 text-sm font-medium rounded-lg border border-amber-100"
              >
                {safeRender(feature)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Roles */}
      {roles && roles.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-violet-500" />
            <h3 className="text-lg font-semibold text-slate-800">Roles</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {roles.map((role, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 text-sm font-medium rounded-lg border border-violet-100"
              >
                {safeRender(role)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Workflow */}
      {workflow && workflow.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-800">Workflow</h3>
          </div>
          <div className="relative">
            {workflow.map((step, index) => (
              <div key={index} className="flex items-start gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  {index < workflow.length - 1 && (
                    <div className="w-0.5 h-full bg-slate-200 my-2" />
                  )}
                </div>
                <div className="pt-1.5 pb-2 border-b border-slate-100 flex-1 last:border-0">
                  <p className="text-slate-700 leading-relaxed text-sm">
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
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-slate-800">Key Requirements</h3>
          </div>
          <ul className="space-y-3">
            {requirements.map((req, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-1 w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />
                <span className="text-slate-700 text-sm leading-relaxed">{safeRender(req)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Layout - Tree Structure */}
      {layout && typeof layout === 'object' && Object.keys(layout).length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layout className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-slate-800">UI Architecture</h3>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 overflow-x-auto font-mono text-sm">
            {renderLayoutTree(layout)}
          </div>
        </div>
      )}

      {/* Acceptance Criteria */}
      {acceptance_criteria && acceptance_criteria.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-teal-500" />
            <h3 className="text-lg font-semibold text-slate-800">Acceptance Criteria</h3>
          </div>
          <div className="space-y-3">
            {acceptance_criteria.map((criteria, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700 text-sm leading-relaxed">{safeRender(criteria)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Pipeline Reasoning */}
      {(pipeline || pipelineSteps?.length > 0) && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-800">AI Pipeline Reasoning</h3>
          </div>

          {/* Pipeline steps */}
          {pipelineSteps && pipelineSteps.length > 0 && (
            <div className="space-y-2 mb-4">
              {pipelineSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-700 text-sm">{step.step}</span>
                  <span className="ml-auto text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {step.result}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Generation notes */}
          {pipeline?.generation_notes && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">{pipeline.generation_notes}</p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

export default WorkflowOutput
