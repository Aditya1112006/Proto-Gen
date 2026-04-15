import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Terminal, Code, Cpu, Shield, ArrowRight, Activity, GitBranch, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [typedText, setTypedText] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const fullText = "$ proto-gen --prompt 'turn my idea into a UI'";

  const handlePromptSubmit = () => {
    if (promptInput.trim()) {
      navigate('/generator', { state: { initialPrompt: promptInput.trim() } });
    } else {
      navigate('/generator');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePromptSubmit();
    }
  };

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  // Terminal Typing Effect
  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      setTypedText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) {
        clearInterval(typingInterval);
      }
    }, 50);
    return () => clearInterval(typingInterval);
  }, []);

  const features = [
    {
      icon: Cpu,
      title: 'AI-Powered Generation',
      description: 'Model: gemini-2.0-flash. Context-aware merging of iterative prompts.',
      color: 'text-neon-green',
      bgUrl: 'bg-neon-green/10 border-neon-green/30'
    },
    {
      icon: Terminal,
      title: 'Tailwind CSS Styling',
      description: 'Framework: tailwindcss@3.4. Production-ready utility classes applied instantly.',
      color: 'text-neon-purple',
      bgUrl: 'bg-neon-purple/10 border-neon-purple/30'
    },
    {
      icon: Activity,
      title: 'Instant Preview',
      description: 'Render: sandbox-iframe. Live reloading as the prototype evolves.',
      color: 'text-neon-cyan',
      bgUrl: 'bg-neon-cyan/10 border-neon-cyan/30'
    }
  ];

  const steps = [
    { title: 'Describe', desc: 'Input natural language constraints', icon: Code },
    { title: 'AI Analyzes', desc: 'Context matrix & domain extraction', icon: Brain },
    { title: 'Generate Code', desc: 'Compile React/HTML/Tailwind skeleton', icon: Cpu },
    { title: 'Preview & Download', desc: 'Live render & artifact export', icon: GitBranch }
  ];

  return (
    <div className="min-h-screen bg-dark-950 text-gray-300 font-mono relative">
      <div className="bg-grid-pattern absolute inset-0 z-0 opacity-40"></div>
      <div className="scanline"></div>

      {/* Main Content Wrapper */}
      <div className="relative z-10 animate-fade-in">

        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-20">
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-dark-800/80 backdrop-blur-md border border-neon-green/30 mb-10 shadow-[0_0_15px_rgba(57,255,20,0.1)]">
            <div className="w-2.5 h-2.5 bg-neon-green rounded-full shadow-[0_0_8px_rgba(57,255,20,0.8)] animate-pulse"></div>
            <span className="text-xs font-medium text-neon-green tracking-wider uppercase">SYSTEM ONLINE — AI Prototype Engine Active</span>
          </div>

          <div className="text-center max-w-4xl mx-auto z-10">
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white mb-6 tracking-tighter leading-none">
              Proto<span className="text-neon-green text-glow">-Gen</span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
              Turn your idea into a UI prototype in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full px-4 sm:px-0">
              <Link
                to="/generator"
                className="w-full sm:w-auto group relative flex items-center justify-center gap-2 px-6 sm:px-10 py-4 sm:py-5 min-h-[44px] bg-neon-green text-dark-950 font-bold hover:bg-neon-green/90 transition-all duration-300 shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:shadow-[0_0_40px_rgba(57,255,20,0.5)] border border-transparent hover:-translate-y-1"
              >
                <Terminal className="w-5 h-5" />
                <span className="tracking-widest uppercase text-xs sm:text-sm">Generate Prototype</span>
              </Link>
              
              <a
                href="#features"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-10 py-4 sm:py-5 min-h-[44px] border border-dark-600 bg-dark-900/50 hover:bg-dark-800 hover:border-gray-500 text-gray-300 font-medium transition-all duration-300 uppercase tracking-widest text-xs sm:text-sm"
              >
                <Code className="w-5 h-5 opacity-50" />
                $ cat features.md
              </a>
            </div>
          </div>

          {/* Faux Terminal Window */}
          <div className="w-full max-w-5xl mx-auto mt-20 glass-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700 bg-dark-900/80">
              <div className="flex gap-2 relative z-20">
                <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer"></div>
              </div>
              <div className="text-xs text-gray-500">bash — 80x24</div>
            </div>
            <div className="p-6 text-sm text-gray-400 font-mono text-left leading-relaxed h-[250px] overflow-hidden">
              <div className="text-neon-green mb-2">{typedText}<span className="cursor-blink"></span></div>
              {typedText.length === fullText.length && (
                <div className="animate-fade-in mt-4 space-y-2">
                  <div className="flex gap-2"><span className="text-blue-400">[INFO]</span> Analyzing prompt context...</div>
                  <div className="flex gap-2"><span className="text-cyan-400">[SYS]</span>  Resolved domain: "Landing Page" -&gt; 100% match</div>
                  <div className="flex gap-2"><span className="text-neon-purple">[AWAIT]</span> Connecting to Gemini-2.0-Flash instance...</div>
                  <div className="flex gap-2 text-white"><span className="text-neon-green shadow-[0_0_8px_rgba(57,255,20,0.5)]">[OK]</span>    Blueprint generated. Compiling React nodes.</div>
                  <div className="flex gap-2"><span className="text-neon-green">[DONE]</span> Injecting Tailwind utilities structure...</div>
                  <div className="mt-4 text-gray-500">Render preview ready. Awaiting user interaction.</div>
                  <div className="mt-2 text-neon-green">$ <span className="cursor-blink"></span></div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Prompt Input Section */}
        <section className="py-24 relative border-t border-dark-800 bg-dark-950/50">
          <div className="max-w-4xl mx-auto px-4 z-10 relative">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <span className="text-neon-green">{'>'}</span> Describe Your UI
            </h2>
            <div className="glass-card p-2 sm:p-2 !bg-dark-900/90 flex flex-col sm:block group relative">
              <textarea 
                className="w-full h-32 sm:h-40 bg-dark-950/50 text-white p-4 sm:p-6 pb-2 sm:pb-6 rounded-none resize-none border-none placeholder:text-dark-600 focus:ring-0 text-base sm:text-lg"
                placeholder="Ex: Create a dashboard for a crypto portfolio app with a dark theme..."
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="w-full sm:absolute sm:bottom-6 sm:right-6 flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-4 p-2 sm:p-0">
                <span className="text-xs text-dark-500 hidden sm:block">Press <kbd className="bg-dark-800 px-2 py-1 rounded border border-dark-700">Enter</kbd> to execute</span>
                <button 
                  onClick={handlePromptSubmit} 
                  className="w-full sm:w-auto px-6 py-3 sm:py-2.5 min-h-[44px] bg-neon-green text-dark-950 font-bold hover:bg-neon-green/90 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" /> Generate
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 relative border-t border-dark-800 z-10 bg-dark-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-16">
              <div className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">// CORE_FEATURES</div>
              <h2 className="text-3xl font-bold text-white">System Capabilities</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="glass-card p-10 group cursor-default">
                  <div className={`w-14 h-14 ${feature.bgUrl} border flex items-center justify-center mb-8`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-4 tracking-wide">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-24 relative border-t border-dark-800 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
             <div className="mb-16">
              <div className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">// EXECUTION_PROCESS</div>
              <h2 className="text-3xl font-bold text-white">Pipeline Architecture</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <div key={index} className="relative glass-card p-8 border-t-2 border-t-dark-700 hover:border-t-neon-green transition-colors">
                  <div className="absolute -top-10 right-4 text-7xl font-black text-dark-800/30 z-0">
                    0{index + 1}
                  </div>
                  <div className="relative z-10">
                    <step.icon className="w-8 h-8 text-gray-500 mb-6" />
                    <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-400">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Docs / About Section */}
        <section id="about" className="py-24 relative border-t border-dark-800 z-10 bg-dark-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-16">
              <div className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">// DOCUMENTATION</div>
              <h2 className="text-3xl font-bold text-white">About &amp; Docs</h2>
              <p className="text-gray-400 mt-3 max-w-2xl text-sm leading-relaxed">
                Everything you need to know about ProtoGen — how it works, what powers it, and how to get started.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* What is ProtoGen */}
              <div className="glass-card p-8">
                <div className="w-10 h-10 bg-neon-green/10 border border-neon-green/30 flex items-center justify-center mb-6">
                  <Terminal className="w-5 h-5 text-neon-green" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3 uppercase tracking-wide">What is ProtoGen?</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  ProtoGen is an AI-powered prototype generator that converts natural language descriptions into
                  structured UI workflows and production-ready HTML/CSS/JS code. It uses Google's Gemini Flash
                  models to instantly compile complete prototypes. Create an account to permanently save your 
                  generated workspaces to your dashboard.
                </p>
              </div>

              {/* Tech Stack */}
              <div className="glass-card p-8">
                <div className="w-10 h-10 bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center mb-6">
                  <Code className="w-5 h-5 text-neon-purple" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3 uppercase tracking-wide">Tech Stack</h3>
                <div className="space-y-2 text-sm font-mono">
                  {[
                    ['Frontend', 'React 18, Tailwind CSS, Vite'],
                    ['Backend', 'Node.js, Express'],
                    ['AI Model', 'Gemini 2.0 Flash (Google AI)'],
                    ['Rendering', 'Sandboxed iframe preview'],
                    ['Export', 'HTML + CSS + JS artifact bundle'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className="text-neon-green shrink-0">&gt;</span>
                      <span className="text-gray-500 w-24 shrink-0">{label}:</span>
                      <span className="text-gray-300">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* How to Use */}
            <div className="glass-card p-8 mb-8">
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wide flex items-center gap-2">
                <span className="text-neon-cyan">&gt;</span> How to Use ProtoGen
              </h3>
              <div className="grid sm:grid-cols-3 gap-6 text-sm">
                {[
                  {
                    step: '01',
                    title: 'Enter a Prompt',
                    desc: 'Describe your UI in plain English. Be specific about layout, theme, features, and target users.',
                    color: 'text-neon-green border-neon-green/30 bg-neon-green/5',
                  },
                  {
                    step: '02',
                    title: 'Choose Mode',
                    desc: 'Select "Workflow Only" to get a structured plan, or "Workflow + Code" to also generate source files.',
                    color: 'text-neon-purple border-neon-purple/30 bg-neon-purple/5',
                  },
                  {
                    step: '03',
                    title: 'Preview & Export',
                    desc: 'View the live sandbox preview, copy individual files, or download the full artifact bundle.',
                    color: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/5',
                  },
                ].map(({ step, title, desc, color }) => (
                  <div key={step} className={`border p-6 ${color}`}>
                    <div className="text-3xl font-black opacity-30 mb-3">{step}</div>
                    <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-xs">{title}</h4>
                    <p className="text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="glass-card p-8">
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wide flex items-center gap-2">
                <span className="text-neon-green">&gt;</span> FAQ
              </h3>
              <div className="space-y-5 text-sm font-mono">
                {[
                  {
                    q: 'Can I iterate on the same prototype?',
                    a: 'Yes. ProtoGen supports iterative prompting — each follow-up prompt is merged with previous context, refining the same prototype rather than starting over.',
                  },
                  {
                    q: 'What happens when I change the UI domain?',
                    a: 'If a new prompt describes a fundamentally different app (e.g. from a dashboard to a landing page), a domain-change modal will notify you and offer to start a fresh session.',
                  },
                  {
                    q: 'Is the generated code production-ready?',
                    a: 'The generated code is a solid starting point with Tailwind-styled HTML/CSS/JS. It is intended to be a prototype that developers refine further.',
                  },
                  {
                    q: 'Is there a backend data store?',
                    a: 'No. ProtoGen is stateless — all session context is held in React state. Refreshing the page clears your session.',
                  },
                ].map(({ q, a }) => (
                  <div key={q} className="border-b border-dark-700 pb-5 last:border-0 last:pb-0">
                    <p className="text-neon-green mb-2">$ {q}</p>
                    <p className="text-gray-400 pl-4 leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

// SVG Component Fallback for Brain
function Brain(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
      <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
      <path d="M6 18a4 4 0 0 1-1.967-.516"/>
      <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
    </svg>
  );
}

export default LandingPage;
