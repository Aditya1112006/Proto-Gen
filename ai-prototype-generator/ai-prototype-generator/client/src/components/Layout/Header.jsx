import { Link, useLocation } from 'react-router-dom'
import { Sparkles, Github, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'

function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')

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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/30 transition-shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              ProtoGen
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/') && activeSection !== 'about'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              Home
            </Link>
            <Link
              to="/generator"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/generator')
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              Generator
            </Link>
            <Link
              to="/#about"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/') && activeSection === 'about'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              About
            </Link>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://github.com/psjtech/Proto-Gen.git"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <Link
              to="/generator"
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-slate-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 animate-fade-in">
            <nav className="flex flex-col gap-1">
              <Link
                to="/"
                className={`px-4 py-3 rounded-lg text-sm font-medium ${isActive('/') && activeSection !== 'about' ? 'bg-primary-50 text-primary-600' : 'text-slate-600'
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/generator"
                className={`px-4 py-3 rounded-lg text-sm font-medium ${isActive('/generator') ? 'bg-primary-50 text-primary-600' : 'text-slate-600'
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Generator
              </Link>
              <Link
                to="/#about"
                className={`px-4 py-3 rounded-lg text-sm font-medium ${isActive('/') && activeSection === 'about'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-slate-600'
                  }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                to="/generator"
                className="px-4 py-3 rounded-lg text-sm font-medium bg-primary-600 text-white text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
