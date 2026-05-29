import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, MessageSquare, Mic, MicOff, Send } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot' | 'system' | 'error';
  content: string;
  timestamp: Date;
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const OpenClaw: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setMessages([
      {
        id: Date.now().toString(),
        type: 'system',
        content: 'OpenClaw chat is connected via Admin API.',
        timestamp: new Date(),
      },
    ]);

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionCtor) {
      const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
      recognition.lang = 'de-DE';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          transcript += event.results[i][0].transcript;
        }
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setSpeechSupported(true);
    }

    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const addErrorMessage = (content: string) => {
    addMessage({
      id: Date.now().toString(),
      type: 'error',
      content,
      timestamp: new Date(),
    });
  };

  const toggleSpeechInput = () => {
    if (!recognitionRef.current || !speechSupported) {
      setError('Spracheingabe wird in diesem Browser nicht unterstützt.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    setError(null);
    setIsListening(true);
    recognitionRef.current.start();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) {
      return;
    }

    const userText = input.trim();

    addMessage({
      id: Date.now().toString(),
      type: 'user',
      content: userText,
      timestamp: new Date(),
    });

    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/openclaw/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userText }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        const details = data?.details || data?.error || `HTTP ${response.status}`;
        const friendly =
          String(details).includes('No API key found')
            ? 'OpenClaw is installed, but no model API key is configured yet. Please run: openclaw configure'
            : String(details);

        setError(friendly);
        addErrorMessage(friendly);
      } else {
        addMessage({
          id: Date.now().toString(),
          type: 'bot',
          content: data.reply || 'No response text returned.',
          timestamp: new Date(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setError(message);
      addErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMessageStyles = (type: Message['type']): string => {
    switch (type) {
      case 'user':
        return 'bg-blue-100 text-blue-900';
      case 'bot':
        return 'bg-gray-100 text-gray-900';
      case 'system':
        return 'bg-green-100 text-green-900 italic';
      case 'error':
        return 'bg-red-100 text-red-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-semibold">OpenClaw AI</h1>
        </div>
        <span className="text-xs text-gray-500">HTTP mode</span>
      </div>

      {error && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs rounded-lg px-4 py-2 lg:max-w-md ${getMessageStyles(message.type)}`}>
              <p className="break-words whitespace-pre-wrap text-sm">{message.content}</p>
              <span className="mt-1 block text-xs opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-4 py-2">
              <div className="flex gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '0.1s' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-md border border-gray-300 bg-gray-50 p-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading}
          />

          <button
            onClick={toggleSpeechInput}
            disabled={!speechSupported || isLoading}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400 ${
              isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            title={speechSupported ? 'Spracheingabe' : 'Spracheingabe nicht unterstützt'}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenClaw;
