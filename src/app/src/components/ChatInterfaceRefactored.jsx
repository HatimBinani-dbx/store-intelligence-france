import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, Minimize2, Maximize2, AlertCircle, CheckCircle, Clock, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRetailAgent } from '../services/retailAgentAPI';
// Tooltip removed - not used in this component

/**
 * Store Intelligence Agent Chat Interface
 * 
 * Features:
 * - Professional business branding focused on inventory intelligence
 * - Retail terminology tooltips and quick reference
 * - Enhanced context integration with inventory data
 * - Comprehensive store analysis and optimization recommendations
 */
const ChatInterfaceRefactored = ({ 
  storeData = null, 
  demoId = null,
  isOpen = false, 
  onToggle = () => {}
}) => {
  // Debug store context (production-safe)
  console.log('🔧 ChatInterface Debug:', {
    hasStoreData: !!storeData,
    storeId: storeData?.store_number,
    note: 'Backend handles all authentication'
  });
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'agent',
      content: '👋 **Welcome to your Store Intelligence Agent!**\n\n',
      timestamp: new Date(),
      status: 'delivered'
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Use the Retail Agent API hook (simplified - no auth needed)
  const { 
    sendMessage: sendAgentMessage, 
    connectionStatus, 
    isAvailable,
    clearHistory 
  } = useRetailAgent();
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);
  
  const sendMessage = async (message = inputValue) => {
    if (!message.trim() || isLoading || !isAvailable) return;
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date(),
      status: 'sent'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Enhanced context with store-specific data and demo_id
      const context = storeData ? {
        demo_id: demoId,
        store_id: storeData.store_id,
        store_number: storeData.store_number,
        store_name: storeData.store_name,
        city: storeData.city,
        state: storeData.state,
        dos_status: storeData.dos_status,
        performance_score: storeData.performance_score || storeData.healthScore,
        attention_needed: storeData.attention_needed,
        footprint_type: storeData.footprint_type,
        source_brand: storeData.source_brand,
        country: storeData.country
      } : { demo_id: demoId };
      
      // Use the agent API client
      const result = await sendAgentMessage(message, context);
      
      // Add agent response
      const agentMessage = {
        id: Date.now() + 1,
        type: 'agent',
        content: result.message,
        timestamp: new Date(),
        status: result.success ? 'delivered' : 'error',
        suggested_questions: result.suggested_questions || []
      };

      setMessages(prev => [...prev, agentMessage]);
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message with professional language
      const errorMessage = {
        id: Date.now() + 1,
        type: 'agent',
        content: `❌ **Connection Issue**\n\nI'm having trouble processing your request right now. Please try again in a moment.\n\n💡 **Tip:** Check your connection or try a simpler question like "What's the store status?"\n\n**Error:** ${error.message}`,
        timestamp: new Date(),
        status: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const clearChat = () => {
    clearHistory();
    setMessages([
      {
        id: 1,
        type: 'agent',
        content: '🔄 **Chat cleared!** Ready to assist with store performance analysis and inventory optimization. How can I help?',
        timestamp: new Date(),
        status: 'delivered'
      }
    ]);
  };
  
  // Professional business quick questions organized by category
  const quickQuestions = {
    performance: [
      "How does this store's performance score compare to the average in the same footprint?",
      "Show me the top 10 and bottom 10 stores by performance score in this footprint",
      "What is the average performance score by region in this footprint?"
    ],
    inventory: [
      "What is the average days of supply score for stores in this city?",
      "Show me all stores with a dos_score above 60 in this footprint",
      "How does this store's dos_score rank among all stores in the same state or region?"
    ],
    geographic: [
      "How many stores are there per region in this footprint?",
      "Which cities have the most stores?",
      "Show me all stores within the same state or region as this store"
    ],
    brands: [
      "What is the average performance score by brand in this footprint?",
      "How many stores does each brand have in this footprint?",
      "Which brand has the highest average performance score?"
    ]
  };

  const getAllQuestions = () => {
    return Object.values(quickQuestions).flat();
  };
  
  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'connecting':
        return <Clock className="w-3 h-3 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <AlertCircle className="w-3 h-3 text-gray-400" />;
    }
  };
  
  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected to Store Intelligence Agent';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Not Connected';
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className={`fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl border border-gray-200/50 z-[10000] transition-all duration-300 backdrop-blur-sm ${
      isMinimized ? 'w-80 h-16' : 'w-[800px] max-h-[calc(100vh-40px)]'
    } flex flex-col`}>
      
      {/* Chat Header - Professional Branding */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-t-xl">
        <div className="flex items-center space-x-3">
          <MessageCircle className="w-5 h-5" />
          <div>
            <h3 className="font-semibold text-sm">Store Intelligence Agent</h3>
            <div className="flex items-center space-x-1 text-xs opacity-90">
              {getConnectionStatusIcon()}
              <span>{getConnectionStatusText()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          {/* Store Context Banner */}
          {storeData && (
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/50 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-700 font-medium">
                  📍 {storeData.store_name} - {storeData.city}, {storeData.state}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  storeData.attention_needed 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {storeData.attention_needed ? 'ATTENTION NEEDED' : 'OPTIMAL'}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-gray-600">
                <span>DOS: <strong className={storeData.dos_status < 18 ? 'text-red-600' : storeData.dos_status < 25 ? 'text-yellow-600' : 'text-green-600'}>{storeData.dos_status} days</strong></span>
                <span>Performance: <strong className={storeData.performance_score < 85 ? 'text-red-600' : storeData.performance_score < 90 ? 'text-yellow-600' : 'text-green-600'}>{storeData.performance_score}%</strong></span>
                {storeData.attention_needed && (
                  <span>Status: <strong className="text-orange-600">Optimization Recommended</strong></span>
                )}
              </div>
            </div>
          )}
          
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50/30 to-white min-h-[300px]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-4 py-3 shadow-sm ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : message.status === 'error'
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-white border border-gray-200/50 text-gray-800'
                  }`}
                >
                  {message.type === 'agent' ? (
                    <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:text-gray-700 prose-li:text-gray-700 prose-li:my-0.5">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Custom components for better formatting
                          h1: ({children}) => <h1 className="text-lg font-semibold text-gray-800 mb-2 mt-1">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base font-semibold text-gray-800 mb-2 mt-3">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-semibold text-gray-800 mb-1 mt-2">{children}</h3>,
                          p: ({children}) => <p className="text-sm text-gray-700 leading-relaxed mb-2">{children}</p>,
                          strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          ul: ({children}) => <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-2 ml-2">{children}</ul>,
                          li: ({children}) => <li className="text-sm text-gray-700">{children}</li>,
                          code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-blue-200 pl-3 py-1 bg-blue-50 text-sm text-gray-700 italic">{children}</blockquote>,
                          table: ({children}) => <div className="overflow-x-auto mb-2"><table className="min-w-full text-xs border-collapse border border-gray-300">{children}</table></div>,
                          thead: ({children}) => <thead className="bg-gray-50">{children}</thead>,
                          th: ({children}) => <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-800">{children}</th>,
                          td: ({children}) => <td className="border border-gray-300 px-2 py-1 text-gray-700">{children}</td>,
                          tr: ({children}) => <tr className="hover:bg-gray-50">{children}</tr>
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                  
                  <div className={`text-xs mt-2 opacity-70 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Follow-up questions suggested by Genie */}
                  {message.type === 'agent' && message.suggested_questions?.length > 0 && !isLoading && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2 font-medium">Follow-up questions:</p>
                      <div className="flex flex-col gap-1.5">
                        {message.suggested_questions.slice(0, 3).map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => sendMessage(q)}
                            className="text-left text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 text-gray-600 hover:text-blue-700"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200/50 rounded-xl px-4 py-3 max-w-[90%] shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-xs text-gray-500">Store Intelligence Agent analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Quick Questions - Simplified for Demo */}
          {messages.length <= 1 && (
            <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200/50 bg-gray-50/50">
              <div className="flex flex-wrap gap-2">
                {getAllQuestions().slice(0, 4).map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(question)}
                    disabled={isLoading || connectionStatus !== 'connected'}
                    className="text-sm px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Input Area */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200/50 bg-white rounded-b-xl">
            <div className="flex space-x-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isAvailable 
                    ? "Ask about this store's performance, inventory, or opportunities..."
                    : "Connecting to Store Intelligence Agent..."
                }
                disabled={isLoading || !isAvailable}
                className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200"
                rows="2"
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !inputValue.trim() || !isAvailable}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex justify-center items-center mt-2">
              <button
                onClick={clearChat}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear chat
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatInterfaceRefactored;
