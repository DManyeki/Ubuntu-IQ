import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { ChatMessage, Language } from '../types';
import { sendMessageToGemini } from '../services/geminiService';

interface Props {
  language: Language;
  triggerMessage: string | null;
  onTriggerHandled: () => void;
}

const parseInline = (text: string) => {
    const elements: React.ReactNode[] = [];
    // Split by bold (**...**) or links ([...](...))
    // Note: Regex captures delimiters to keep them in the array
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
            // Handle italics (*...*) within the remaining text parts
            // We split again by single asterisks
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

// Helper component to render text with Markdown support
const FormattedText: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
         // Header (### or ##)
         if (line.match(/^#{1,6}\s/)) {
             return <div key={i} className="font-bold text-lg mt-2 mb-1">{parseInline(line.replace(/^#{1,6}\s+/, ''))}</div>;
         }
         
         // Bullet list (* or -)
         if (line.match(/^[\*\-]\s/)) {
             return (
                 <div key={i} className="flex gap-2 ml-2 mb-1">
                     <span className="mt-2 w-1.5 h-1.5 bg-current rounded-full shrink-0 opacity-60"/>
                     <div>{parseInline(line.replace(/^[\*\-]\s+/, ''))}</div>
                 </div>
             );
         }
         
         // Numbered list (1.)
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

         // Empty line
         if (!line.trim()) return <div key={i} className="h-1" />;

         // Normal text
         return <div key={i} className="leading-relaxed">{parseInline(line)}</div>;
      })}
    </div>
  );
};

export const ChatInterface: React.FC<Props> = ({ language, triggerMessage, onTriggerHandled }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize messages from SessionStorage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
        const saved = sessionStorage.getItem('mindcare_chat_history');
        if (saved) {
            // Need to revive Date objects because JSON.stringify converts them to strings
            return JSON.parse(saved).map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp)
            }));
        }
    } catch (e) {
        console.warn('Failed to parse chat history', e);
    }
    
    // Default welcome message if no history
    return [{
      id: 'welcome',
      role: 'model',
      content: language === 'sheng' 
        ? "Niaje! Mimi ni MindCare. Najua hizi times za kuwait results zinaweza kuwa ngumu. Nisaidie aje leo? Tunaweza bonga stori za career ama vile unajiskia."
        : language === 'sw'
        ? "Hujambo! Mimi ni MindCare. Najua kusubiri matokeo ya KCSE inaweza kuwa na wasiwasi. Naweza kukusaidia aje leo?"
        : "Hello! I'm MindCare. I know waiting for KCSE results can be stressful. How can I support you today? We can talk about careers or how you're feeling.",
      timestamp: new Date()
    }];
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist messages to SessionStorage
  useEffect(() => {
    sessionStorage.setItem('mindcare_chat_history', JSON.stringify(messages));
  }, [messages]);

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
      // Append current message to history for context
      history.push({ role: 'user', content: text });
      
      const responseText = await sendMessageToGemini(text, history.slice(0, -1)); // Send API the history, let it append current
      
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

  // Watch for trigger messages from parent (e.g. from Results page)
  useEffect(() => {
    if (triggerMessage) {
        sendMessage(triggerMessage);
        onTriggerHandled();
    }
  }, [triggerMessage]);

  return (
    <div className="flex flex-col h-[calc(100dvh-220px)] md:h-[600px] min-h-[300px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
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
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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