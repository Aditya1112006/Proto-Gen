import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../services/api';
import { useAuthContext } from '../context/AuthContext';
import { usePrototypeContext } from '../context/PrototypeContext';
import { Layout, Clock, Terminal, ArrowRight, Code } from 'lucide-react';

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthContext();
  const { clear, loadSession } = usePrototypeContext();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getHistory();
        if (data.success) {
          setHistory(data.history);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchHistory();
    }
  }, [user]);

  const handleOpenPrototype = async (sessionId) => {
    // Navigate to generator with a special state parameter indicating we should fetch this session
    // Right now, loadSession gets it from memory, but for a real full stack app, 
    // we need to fetch it from the server if it's not in memory.
    try {
      const { getSession } = await import('../services/api');
      const response = await getSession(sessionId);
      if (response.success) {
        navigate('/generator', { state: { loadSessionId: sessionId } });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center font-mono">
        <div className="text-neon-green animate-pulse">LOADING_DATA...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-gray-300 font-mono py-12 px-4 relative">
      <div className="bg-grid-pattern absolute inset-0 z-0 opacity-40 mix-blend-overlay"></div>
      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className="flex items-end justify-between mb-12 border-b border-dark-800 pb-6">
          <div>
            <div className="inline-block px-3 py-1 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-xs tracking-wider uppercase mb-4">
              USER_ARCHIVE
            </div>
            <h1 className="text-3xl font-bold text-white uppercase">Protected Dashboard</h1>
            <p className="text-gray-500 mt-2">Welcome back, {user?.name}. Here are your saved prototypes.</p>
          </div>
          <button 
            onClick={() => { clear(); navigate('/generator'); }}
            className="hidden sm:flex items-center gap-2 px-6 py-3 bg-dark-900 border border-neon-green text-neon-green hover:bg-neon-green hover:text-dark-950 transition-colors uppercase tracking-widest text-xs"
          >
            <Terminal className="w-4 h-4" /> New Prototype
          </button>
        </div>

        {history.length === 0 ? (
          <div className="glass-card p-12 text-center text-gray-500 border border-dashed border-dark-700">
            <Layout className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>NO_DATA_FOUND</p>
            <p className="text-sm mt-2">Generate your first prototype to populate this database.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item) => (
              <div key={item.sessionId} className="glass-card group hover:border-neon-purple/50 transition-colors flex flex-col">
                <div className="p-6 flex-grow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-dark-400 uppercase tracking-wider px-2 py-1 bg-dark-900 border border-dark-800">
                      {item.domain}
                    </span>
                    {item.hasCode && (
                      <Code className="w-4 h-4 text-neon-green" title="Contains Code" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white leading-tight mb-2 group-hover:text-neon-purple transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  {item.preview && (
                    <p className="text-sm text-gray-500 line-clamp-3 mb-4">{item.preview}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-dark-500 mt-auto">
                    <Clock className="w-3 h-3" />
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenPrototype(item.sessionId)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-dark-900/50 border-t border-dark-800 hover:bg-dark-800 text-gray-300 hover:text-white transition-colors"
                >
                  <span className="text-xs uppercase tracking-widest">Load Instance</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
