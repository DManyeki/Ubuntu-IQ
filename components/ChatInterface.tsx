import React, { useState, useRef, useEffect, memo } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { ChatMessage, Language } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { useSessionStorage } from '../hooks/useSessionStorage';

interface Props {
  language: Language;
  triggerMessage: string | null;
  onTriggerHandled: () => void;
  isExpanded?: boolean;
  onInteraction?: () => void;
}

const parseInline = (text: string) => {
    const elements: React.ReactNode[] = [];
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
    
    parts.forEach((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            elements.push(<strong key={i}>{part.slice(2, -2)}</strong>);
        } else if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
            const match = part.match(/\[(.*?)\]\((.*?)\)/);
            if (match) {
                elements.push(
                    <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:opacity-80">
                        {match[1]}
                    </a>
                );
            } else {
                elements.push(<span key={i}>{part}</span>);
            }
        } else {
            const subParts = part.split(/(\*[^*]+\*)/g);
            subParts.forEach((subPart, j) => {
                if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2) {
                     elements.push(<em key={`${i}-${j}`}>{subPart.slice(1, -1)}</em>);
                } else {
                     elements.push(<span key={`${i}-${j}`}>{subPart}</span>);
                }
            });
        }
    });
    return elements;
}

// Memoized to prevent re-parsing on every input change
const FormattedText = memo(({ content }: { content: string }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
         if (line.match(/^#{1,6}\s/)) {
             return <div key={i} className="font-bold text-lg mt-2 mb-1">{parseInline(line.replace(/^#{1,6}\s+/, ''))}</div>;
         }
         
         if (line.match(/^[\*\-]\s/)) {
             return (
                 <div key={i} className="flex gap-2 ml-2 mb-1">
                     <span className="mt-2 w-1.5 h-1.5 bg-current rounded-full shrink-0 opacity-60"/>
                     <div>{parseInline(line.replace(/^[\*\-]\s+/, ''))}</div>
                 </div>
             );
         }
         
         if (line.match(/^\d+\.\s/)) {
            const match = line.match(/^(\d+)\.\s+(.*)/);
            if (match) {
                return (
                 <div key={i} className="flex gap-2 ml-2 mb-1">
                     <span className="font-bold opacity-80">{match[1]}.</span>
                     <div>{parseInline(match[2])}</div>
                 </div>
                );
            }
         }

         if (!line.trim()) return <div key={i} className="h-1" />;

         return <div key={i} className="leading-relaxed">{parseInline(line)}</div>;
      })}
    </div>
  );
});

export const ChatInterface: React.FC<Props> = ({ language, triggerMessage, onTriggerHandled, isExpanded = false, onInteraction }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom hook handles parsing and storage automatically
  const [messages, setMessages] = useSessionStorage<ChatMessage[]>('mindcare_chat_history', []);
  
  // Initialization logic for welcome message if history is empty
  useEffect(() => {
    if (messages.length === 0) {
        setMessages([{
            id: 'welcome',
            role: 'model',
            content: language === 'sheng' 
              ? "Niaje! Mimi ni MindCare. Najua hizi times za kuwait results zinaweza kuwa ngumu. Nisaidie aje leo? Tunaweza bonga stori za career ama vile unajiskia."
              : language === 'sw'
              ? "Hujambo! Mimi ni MindCare. Najua kusubiri matokeo ya KCSE inaweza kuwa na wasiwasi. Naweza kukusaidia aje leo?"
              : "Hello! I'm MindCare. I know waiting for KCSE results can be stressful. How can I support you today? We can talk about careers or how you're feeling.",
            timestamp: new Date()
        }]);
    } else {
        // Hydrate timestamps from JSON strings
        const hydrated = messages.map(m => ({
            ...m,
            timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp
        }));
        // Only update if hydration actually changed something (deep comparison avoidance)
        if (hydrated.some((m, i) => m.timestamp !== messages[i].timestamp)) {
             setMessages(hydrated);
        }
    }
  }, [language, messages.length]); // Dependencies minimal to avoid loops
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });
      
      const responseText = await sendMessageToGemini(text, history.slice(0, -1));
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendClick = async () => {
    if (!input.trim()) return;
    if (onInteraction) onInteraction();
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  useEffect(() => {
    if (triggerMessage) {
        if (onInteraction) onInteraction();
        sendMessage(triggerMessage);
        onTriggerHandled();
    }
  }, [triggerMessage]);

  return (
    <div className={`flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-500 ease-in-out ${
        isExpanded 
        ? 'h-[calc(100dvh-130px)] md:h-[calc(100dvh-180px)]' 
        : 'h-[calc(100dvh-220px)] md:h-[600px] min-h-[300px]'
    }`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-kenya-green'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-tr-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
            }`}>
              <FormattedText content={msg.content} />
              <div className={`text-[10px] mt-1 opacity-70 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm ml-10">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>MindCare is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 md:p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={onInteraction}
            disabled={isLoading}
            placeholder={
                language === 'sheng' ? "Bonga nami..." :
                language === 'sw' ? "Andika ujumbe..." :
                "Type a message..."
            }
            className="flex-1 bg-transparent border-none outline-none text-sm py-1 disabled:opacity-50"
          />
          <button 
            onClick={handleSendClick}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-primary text-white rounded-full hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};