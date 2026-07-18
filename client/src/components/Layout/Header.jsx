import { Link, useLocation } from 'react-router-dom'
import { Sparkles, Github, Menu, X, User, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthContext } from '../../context/AuthContext'

function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const { user, logout } = useAuthContext()

  const isActive = (path) => location.pathname === path

  // Track active section for About link
  useEffect(() => {
    const handleScroll = () => {
      const aboutSection = document.getElementById('about')
      if (aboutSection && location.pathname === '/') {
        const rect = aboutSection.getBoundingClientRect()
        if (rect.top <= 100 && rect.bottom >= 100) {
          setActiveSection('about')
        } else {
          setActiveSection('')
        }
      } else {
        setActiveSection('')
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  return (
    <header className="bg-dark-900/80 backdrop-blur-xl border-b border-dark-700 sticky top-0 z-50 font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="ProtoGen Logo" className="w-14 h-14 object-contain" />
            <span className="text-xl font-bold text-white tracking-tight">
              Proto<span className="text-neon-green">Gen</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${isActive('/') && activeSection !== 'about'
                  ? 'text-neon-green text-glow'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
               {isActive('/') && activeSection !== 'about' && <span className="text-neon-green">&gt;</span>}
              HOME
            </Link>
            <Link
              to="/generator"
              className={`text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${isActive('/generator')
                  ? 'text-neon-cyan text-glow-cyan'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              {isActive('/generator') && <span className="text-neon-cyan">&gt;</span>}
              WORKSPACE
            </Link>
            <Link
              to="/#about"
              className={`text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${isActive('/') && activeSection === 'about'
                  ? 'text-neon-purple text-glow-purple'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              {isActive('/') && activeSection === 'about' && <span className="text-neon-purple">&gt;</span>}
              DOCS
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className={`text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${isActive('/dashboard')
                    ? 'text-neon-cyan text-glow-cyan'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                {isActive('/dashboard') && <span className="text-neon-cyan">&gt;</span>}
                DASHBOARD
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 border border-dark-600 bg-dark-800">
                  <div className="w-5 h-5 flex items-center justify-center font-bold text-dark-950 text-xs" style={{ backgroundColor: user.avatarColor }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-gray-300 uppercase">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-500 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/30 bg-dark-800/50 hover:bg-dark-700"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 border border-dark-600 text-gray-400 text-sm font-bold tracking-widest uppercase hover:bg-dark-800 hover:text-white transition-all flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                LOGIN
              </Link>
            )}
            
            <Link
              to="/generator"
              className="px-6 py-2 bg-neon-green text-dark-950 text-sm font-bold tracking-widest uppercase hover:bg-neon-green/90 transition-all shadow-[0_0_15px_rgba(57,255,20,0.2)] hover:shadow-[0_0_25px_rgba(57,255,20,0.4)] flex items-center gap-2 ml-2"
            >
              <Terminal className="w-4 h-4" />
              INIT
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-700 bg-dark-950 animate-fade-in absolute left-0 right-0 px-4 shadow-2xl">
            <nav className="flex flex-col gap-2">
               <Link
                to="/"
                className={`px-4 py-3 text-sm font-bold uppercase tracking-widest border border-transparent ${isActive('/') && activeSection !== 'about' ? 'bg-neon-green/10 text-neon-green border-neon-green/30' : 'text-gray-400 hover:bg-dark-800'
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                HOME
              </Link>
              <Link
                to="/generator"
                className={`px-4 py-3 text-sm font-bold uppercase tracking-widest border border-transparent ${isActive('/generator') ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30' : 'text-gray-400 hover:bg-dark-800'
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                WORKSPACE
              </Link>
              <Link
                to="/#about"
                className={`px-4 py-3 text-sm font-bold uppercase tracking-widest border border-transparent ${isActive('/') && activeSection === 'about'
                    ? 'bg-neon-purple/10 text-neon-purple border-neon-purple/30'
                    : 'text-gray-400 hover:bg-dark-800'
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                DOCS
              </Link>
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className={`px-4 py-3 text-sm font-bold uppercase tracking-widest border border-transparent ${isActive('/dashboard') ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30' : 'text-gray-400 hover:bg-dark-800'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    DASHBOARD
                  </Link>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="px-4 py-3 text-sm font-bold text-left uppercase tracking-widest border border-transparent text-gray-400 hover:bg-dark-800 hover:text-red-500"
                  >
                    LOGOUT ({user.name})
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-3 text-sm font-bold uppercase tracking-widest border border-transparent text-gray-400 hover:bg-dark-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  LOGIN / REGISTER
                </Link>
              )}
              <Link
                to="/generator"
                className="mt-4 px-4 py-3 text-sm font-bold uppercase tracking-widest bg-neon-green text-dark-950 text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                INIT_WORKSPACE
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

// Fallback for Terminal icon since it wasn't imported from lucide-react in the original header
function Terminal(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
  );
}

export default Header
