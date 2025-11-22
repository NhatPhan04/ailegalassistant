import React from 'react';
import { ChatMessage } from '../types';
import { RobotIcon, UserIcon } from './Icons';

interface MessageBubbleProps {
  message: ChatMessage;
}

const formatContent = (text: string) => {
  return text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      })}
      <br />
    </React.Fragment>
  ));
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex w-full mb-6 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[90%] md:max-w-[85%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar - Hidden on mobile for assistant to save space or keep it if design demands */}
        <div className={`hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full items-center justify-center mt-1 ${isAssistant ? 'bg-blue-600 text-white mr-3' : 'bg-slate-200 text-slate-600 ml-3'}`}>
          {isAssistant ? <RobotIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className={`p-5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isAssistant 
            ? 'bg-white text-slate-700 border border-slate-100' 
            : 'bg-slate-100 text-slate-800'
        }`}>
          <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
            {formatContent(message.content)}
          </div>
          {/* Timestamp hidden to keep it clean as per screenshot, or very subtle */}
        </div>
      </div>
    </div>
  );
};
