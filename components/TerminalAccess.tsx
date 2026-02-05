import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, Power, Trash2, Plus, Maximize2 } from 'lucide-react';

const TerminalAccess: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<{id: number, name: string, active: boolean}[]>([
    { id: 1, name: 'root@zubenko.de', active: true }
  ]);
  const [activeSession, setActiveSession] = useState(1);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const termRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);

  useEffect(() => {
    // Dynamically load xterm.js
    const loadXterm = async () => {
      try {
        const { Terminal } = await import('xterm');
        const { FitAddon } = await import('xterm-addon-fit');
        await import('xterm/css/xterm.css');

        if (!terminalRef.current || termRef.current) return;

        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          theme: {
            background: '#0f172a',
            foreground: '#e2e8f0',
            cursor: '#f97316',
            selection: 'rgba(249, 115, 22, 0.3)',
            black: '#1e293b',
            red: '#ef4444',
            green: '#22c55e',
            yellow: '#eab308',
            blue: '#3b82f6',
            magenta: '#a855f7',
            cyan: '#06b6d4',
            white: '#f1f5f9',
            brightBlack: '#475569',
            brightRed: '#f87171',
            brightGreen: '#4ade80',
            brightYellow: '#facc15',
            brightBlue: '#60a5fa',
            brightMagenta: '#c084fc',
            brightCyan: '#22d3ee',
            brightWhite: '#f8fafc'
          },
          rows: 24,
          cols: 80
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        // Connect to WebSocket
        connectWebSocket(term);

        // Handle terminal resize
        const handleResize = () => {
          fitAddon.fit();
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: 'resize', 
              rows: term.rows, 
              cols: term.cols 
            }));
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          term.dispose();
          if (ws) ws.close();
        };
      } catch (error) {
        console.error('Failed to load xterm:', error);
        // Fallback: show error message
        if (terminalRef.current) {
          terminalRef.current.innerHTML = `
            <div style="padding: 20px; color: #ef4444;">
              <p><strong>Terminal konnte nicht geladen werden.</strong></p>
              <p>xterm.js Bibliothek fehlt. Installiere mit: npm install xterm xterm-addon-fit</p>
            </div>
          `;
        }
      }
    };

    loadXterm();

    return () => {
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const connectWebSocket = (term: any) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal`;
    
    try {
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        setConnected(true);
        term.write('\r\n\x1b[1;32m✓ Verbunden mit Server Terminal\x1b[0m\r\n\r\n');
        
        // Send initial resize
        websocket.send(JSON.stringify({ 
          type: 'resize', 
          rows: term.rows, 
          cols: term.cols 
        }));
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'output') {
            term.write(data.data);
          }
        } catch {
          // Raw data
          term.write(event.data);
        }
      };

      websocket.onerror = () => {
        setConnected(false);
        term.write('\r\n\x1b[1;31m✗ WebSocket Verbindungsfehler\x1b[0m\r\n');
        term.write('\x1b[33mFallback: Lokales Terminal (nur Simulation)\x1b[0m\r\n\r\n');
        setupFallbackTerminal(term);
      };

      websocket.onclose = () => {
        setConnected(false);
        term.write('\r\n\x1b[1;33m⚠ Verbindung zum Server getrennt\x1b[0m\r\n');
      };

      // Send input to server
      term.onData((data: string) => {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({ type: 'input', data }));
        }
      });

      setWs(websocket);
    } catch (error) {
      console.error('WebSocket error:', error);
      term.write('\r\n\x1b[1;31m✗ Keine WebSocket Verbindung möglich\x1b[0m\r\n');
      term.write('\x1b[33mFallback: Lokales Terminal (nur Simulation)\x1b[0m\r\n\r\n');
      setupFallbackTerminal(term);
    }
  };

  const setupFallbackTerminal = (term: any) => {
    let currentLine = '';
    const prompt = '\x1b[1;32mroot@zubenko.de\x1b[0m:\x1b[1;34m~\x1b[0m$ ';
    
    term.write(prompt);
    
    term.onData((data: string) => {
      if (data === '\r') {
        term.write('\r\n');
        if (currentLine.trim()) {
          handleFallbackCommand(term, currentLine.trim());
        }
        currentLine = '';
        term.write(prompt);
      } else if (data === '\u007F') {
        // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data >= ' ') {
        currentLine += data;
        term.write(data);
      }
    });
  };

  const handleFallbackCommand = (term: any, cmd: string) => {
    const responses: Record<string, string> = {
      'help': 'Verfügbare Befehle: help, clear, date, whoami, uname, uptime\r\n(WebSocket nicht verfügbar - nur Simulation)',
      'clear': '\x1b[2J\x1b[H',
      'date': new Date().toString(),
      'whoami': 'root',
      'uname': 'Linux zubenko.de 5.15.0-91-generic',
      'uptime': 'up 1 day, 17 hours',
    };

    const response = responses[cmd.toLowerCase()] || `bash: ${cmd}: Befehl nicht gefunden (WebSocket Verbindung erforderlich)`;
    
    if (cmd.toLowerCase() === 'clear') {
      term.write(response);
    } else {
      term.write(response + '\r\n');
    }
  };

  const createNewSession = () => {
    const newId = Math.max(...sessions.map(s => s.id)) + 1;
    setSessions(prev => [
      ...prev.map(s => ({ ...s, active: false })),
      { id: newId, name: `root@zubenko.de`, active: true }
    ]);
    setActiveSession(newId);
    
    // Reload terminal for new session
    if (termRef.current) {
      termRef.current.reset();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      // Reconnect will happen automatically via connectWebSocket
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      // Enter fullscreen
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }

    // Resize terminal after fullscreen change
    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        if (ws && ws.readyState === WebSocket.OPEN && termRef.current) {
          ws.send(JSON.stringify({ 
            type: 'resize', 
            rows: termRef.current.rows, 
            cols: termRef.current.cols 
          }));
        }
      }
    }, 100);
  };

  const clearTerminal = () => {
    if (termRef.current) {
      termRef.current.clear();
    }
  };

  const closeSession = (sessionId: number) => {
    if (sessions.length === 1) {
      alert('Mindestens eine Session muss geöffnet bleiben');
      return;
    }
    
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      if (activeSession === sessionId && filtered.length > 0) {
        filtered[0].active = true;
        setActiveSession(filtered[0].id);
      }
      return filtered;
    });
  };

  const sendCommand = (cmd: string) => {
    if (termRef.current && ws && ws.readyState === WebSocket.OPEN) {
      // Send command character by character
      for (let char of cmd) {
        ws.send(JSON.stringify({ type: 'input', data: char }));
      }
      // Send enter key
      ws.send(JSON.stringify({ type: 'input', data: '\r' }));
    }
  };

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
          <span className="text-sm text-slate-400">
            {connected ? 'Verbunden' : 'Nicht verbunden'}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={createNewSession}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition border border-slate-700"
          >
            <Plus className="w-4 h-4" />
            <span>Neue Session</span>
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
            title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between bg-slate-900/50 px-6 py-3 border-b border-slate-700/50">
          <div className="flex space-x-2">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition ${
                  session.active
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <TerminalIcon className="w-4 h-4" />
                <span>{session.name}</span>
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => closeSession(activeSession)}
              className="p-2 text-slate-500 hover:text-red-400 transition" 
              title="Session beenden"
            >
              <Power className="w-4 h-4" />
            </button>
            <button 
              onClick={clearTerminal}
              className="p-2 text-slate-500 hover:text-white transition" 
              title="Terminal leeren"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-950">
          <div 
            ref={terminalRef}
            className="rounded-lg overflow-hidden"
            style={{ minHeight: '500px' }}
          />
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center">
          <TerminalIcon className="w-4 h-4 mr-2 text-orange-400" />
          Schnellzugriff
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button 
            onClick={() => sendCommand('systemctl status admin-api.service')}
            className="px-3 py-2 bg-slate-900/50 hover:bg-slate-700 rounded-lg text-xs transition border border-slate-700"
          >
            systemctl status
          </button>
          <button 
            onClick={() => sendCommand('docker ps -a')}
            className="px-3 py-2 bg-slate-900/50 hover:bg-slate-700 rounded-lg text-xs transition border border-slate-700"
          >
            docker ps
          </button>
          <button 
            onClick={() => sendCommand('htop')}
            className="px-3 py-2 bg-slate-900/50 hover:bg-slate-700 rounded-lg text-xs transition border border-slate-700"
          >
            htop
          </button>
          <button 
            onClick={() => sendCommand('journalctl -f -n 50')}
            className="px-3 py-2 bg-slate-900/50 hover:bg-slate-700 rounded-lg text-xs transition border border-slate-700"
          >
            journalctl -f
          </button>
        </div>
      </div>
    </div>
  );
};

export default TerminalAccess;
