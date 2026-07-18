import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Terminal, Lock, Mail, User, Shield, ArrowRight } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Get requested path or default to generator
  const from = location.state?.from?.pathname || '/generator';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let result;
    if (isLogin) {
      result = await login(formData.email, formData.password);
    } else {
      result = await register(formData.name, formData.email, formData.password);
    }

    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-[85vh] bg-dark-950 flex flex-col justify-center items-center px-4 relative font-mono relative">
      <div className="bg-grid-pattern absolute inset-0 z-0 opacity-40 mix-blend-overlay"></div>
      <div className="scanline"></div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        
        {/* Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center justify-center w-16 h-16 bg-dark-900 border border-dark-700 mb-6 group hover:border-neon-green transition-colors">
            <Terminal className="w-8 h-8 text-gray-400 group-hover:text-neon-green transition-colors" />
          </Link>
          <h1 className="text-3xl font-black text-white uppercase tracking-widest">
            {isLogin ? 'SYSTEM_LOGIN' : 'INITIALIZE_USER'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {isLogin ? 'Authenticate to access saved prototypes' : 'Generate credentials for Proto-Gen'}
          </p>
        </div>

        {/* Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  <User className="w-3 h-3 inline mr-2 text-neon-purple" />
                  Alias / Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-dark-950/50 border border-dark-700 text-white px-4 py-3 focus:outline-none focus:border-neon-purple transition-colors"
                  placeholder="admin_01"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                <Mail className="w-3 h-3 inline mr-2 text-neon-cyan" />
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full bg-dark-950/50 border border-dark-700 text-white px-4 py-3 focus:outline-none focus:border-neon-cyan transition-colors"
                placeholder="root@system.local"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                <Lock className="w-3 h-3 inline mr-2 text-neon-green" />
                Security Key
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full bg-dark-950/50 border border-dark-700 text-white px-4 py-3 focus:outline-none focus:border-neon-green transition-colors"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-neon-green text-dark-950 font-bold hover:bg-neon-green/90 transition-all shadow-[0_0_15px_rgba(57,255,20,0.2)] hover:shadow-[0_0_30px_rgba(57,255,20,0.4)] disabled:opacity-50 uppercase tracking-widest text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-dark-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  {isLogin ? 'EXECUTE_LOGIN' : 'REGISTER_ACCESS'}
                </>
              )}
            </button>
          </form>

          {/* Toggle View */}
          <div className="mt-8 text-center pt-6 border-t border-dark-800">
            <p className="text-gray-500 text-sm">
              {isLogin ? "No active credentials? " : "Already initialized? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-neon-green hover:underline focus:outline-none uppercase tracking-wider"
              >
                {isLogin ? 'Create Account' : 'Authenticate Here'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
