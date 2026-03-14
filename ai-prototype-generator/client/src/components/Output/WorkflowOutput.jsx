import { Users, ListTodo, CheckCircle2, ClipboardList, FileText } from 'lucide-react'

function WorkflowOutput({ content, metadata }) {
  if (!content) return null

  const { summary, roles, user_flow, requirements, acceptance_criteria, layout_plan } = content

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
            <span className="text-xs text-slate-400 uppercase tracking-wider">Domain:</span>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-sm font-medium rounded-full">
              {metadata.domain}
            </span>
          </div>
        )}
      </div>

      {/* Roles */}
      {roles && roles.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-slate-800">Roles</h3>
          </div>
          <ul className="space-y-2">
            {roles.map((role, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-slate-700">{role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* User Flow */}
      {user_flow && user_flow.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-slate-800">User Flow</h3>
          </div>
          <div className="relative">
            {user_flow.map((step, index) => (
              <div key={index} className="flex items-start gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  {index < user_flow.length - 1 && (
                    <div className="w-0.5 h-full bg-slate-200 my-2" />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-slate-700">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements */}
      {requirements && (requirements.functional?.length > 0 || requirements.non_functional?.length > 0) && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-slate-800">Requirements</h3>
          </div>

          <div className="space-y-6">
            {/* Functional */}
            {requirements.functional?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">Functional</p>
                <ul className="space-y-2">
                  {requirements.functional.map((req, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-slate-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Non-Functional */}
            {requirements.non_functional?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">Non-Functional</p>
                <ul className="space-y-2">
                  {requirements.non_functional.map((req, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-slate-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Acceptance Criteria */}
      {acceptance_criteria && acceptance_criteria.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-slate-800">Acceptance Criteria</h3>
          </div>
          <ul className="space-y-2">
            {acceptance_criteria.map((criteria, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">{criteria}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Layout Plan */}
      {layout_plan && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/30 border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-slate-800">Layout Plan</h3>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-slate-700 whitespace-pre-wrap">{layout_plan}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkflowOutput
