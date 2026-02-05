
import React, { useState } from 'react';
import { Sparkles, Send, Loader2, Info } from 'lucide-react';
import { getGeminiHelp } from '../services/geminiService';

const GeminiAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse(null);
    
    // Provide some fake "server context" to make the AI more accurate
    const context = "OS: Ubuntu 22.04 LTS. Docker: Running. Asterisk: Version 20. WSS: Active. CPU: 24%. RAM: 4.2GB.";
    const result = await getGeminiHelp(query, context);
    
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-8 right-8 w-96 flex flex-col pointer-events-none z-50">
      <div className="pointer-events-auto bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[600px]">
        <div className="p-4 bg-orange-600 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center space-x-2 font-bold">
            <Sparkles className="w-5 h-5 fill-white/20" />
            <span>AI Admin Assistant</span>
          </div>
          <Info className="w-4 h-4 cursor-help opacity-70" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!response && !loading && (
            <div className="text-center py-10 px-6 space-y-4">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto border border-slate-700">
                <Sparkles className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-white mb-1">Need help with your server?</h4>
                <p className="text-xs text-slate-400">Ask me how to fix Docker errors, configure Asterisk, or check system health.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-xs text-orange-400 font-medium animate-pulse">Analyzing server state...</p>
            </div>
          )}

          {response && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700 text-sm text-slate-200 leading-relaxed overflow-x-hidden">
                <div className="prose prose-invert prose-xs">
                  {response.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0">{line}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleAsk} className="p-4 border-t border-slate-700/50 bg-slate-900/50 shrink-0">
          <div className="relative">
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
              disabled={loading}
            />
            <button 
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-orange-600 rounded-xl text-white hover:bg-orange-500 transition disabled:opacity-50 disabled:bg-slate-700"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeminiAssistant;
