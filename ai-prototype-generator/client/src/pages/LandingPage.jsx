import { Link } from 'react-router-dom'
import { Sparkles, Zap, Brain, Code, ArrowRight, Check } from 'lucide-react'

function LandingPage() {
  const features = [
    {
      icon: Brain,
      title: 'Smart Domain Detection',
      description: 'Automatically detects when you\'re working on the same product vs. a new idea.'
    },
    {
      icon: Zap,
      title: 'Iterative Refinement',
      description: 'Add more details and watch your prototype evolve with merged requirements.'
    },
    {
      icon: Code,
      title: 'Instant Code Generation',
      description: 'Get runnable HTML/CSS/JS or React scaffolds ready to customize.'
    }
  ]

  const steps = [
    'Describe your product idea in natural language',
    'Add more prompts to refine the requirements',
    'Generate a working code prototype',
    'Download and customize to your needs'
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium text-primary-600">AI-Powered Prototype Generator</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 tracking-tight">
              Turn Ideas Into
              <br />
              <span className="bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
                Working Prototypes
              </span>
            </h1>

            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
              Describe your product in plain English. Our AI understands context,
              merges requirements, and generates runnable code prototypes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/generator"
                className="flex items-center gap-2 px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
              >
                <Sparkles className="w-5 h-5" />
                Generate Prototype
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#about"
                className="px-8 py-4 text-slate-600 font-semibold hover:text-slate-900 transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Smart prompt management that understands context and builds prototypes iteratively.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow"
              >
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                From Concept to Code in Minutes
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                No technical skills required. Just describe what you want, and let the AI do the heavy lifting.
              </p>

              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-slate-700 pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-purple-500 rounded-3xl transform rotate-3 opacity-20" />
              <div className="relative bg-slate-900 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                </div>
                <div className="space-y-3 font-mono text-sm">
                  <div className="text-slate-400"> Build a meal-planning app for students</div>
                  <div className="text-emerald-400">✓ Generated workflow with roles, requirements, and user flow</div>
                  <div className="text-slate-400"> Add weekly grocery export and dark mode</div>
                  <div className="text-emerald-400">✓ Merged requirements (Prompts: 2, Merged: 2)</div>
                  <div className="text-slate-400"> Generate code</div>
                  <div className="text-emerald-400">✓ Created index.html, styles.css, app.js</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">About ProtoGen</h2>
            <p className="text-lg text-slate-600 mb-6">
              ProtoGen was built to bridge the gap between ideas and implementation.
              We believe that anyone should be able to turn their product vision into
              a tangible prototype without needing to write code or lose track of
              evolving requirements.
            </p>
            <p className="text-slate-600 mb-8">
              By leveraging advanced AI for domain detection and requirement merging,
              ProtoGen maintains context across multiple prompts, automatically
              resetting when you switch to a completely different idea.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {['Context-Aware', 'Domain Detection', 'Code Generation', 'Iterative Design'].map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm font-medium text-slate-700 shadow-sm"
                >
                  <Check className="w-3 h-3 text-emerald-500" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Ready to Build Something?</h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Start generating prototypes now. No signup required.
          </p>
          <Link
            to="/generator"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
          >
            <Sparkles className="w-5 h-5" />
            Start Generating
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            © {new Date().getFullYear()} ProtoGen. Built for hackathons and rapid prototyping.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
