import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, MessageCircle, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useRetailAgent } from '../../services/retailAgentAPI'

/**
 * ExpoChatPanel - Large, expo-optimized chat interface
 * 
 * Features:
 * - 24-32px font sizes for visibility
 * - Full-width messages
 * - Large input area
 * - Store context integration
 * - Detects store mentions in AI responses
 */
export function ExpoChatPanel({
  demoConfig,
  focusedStore,
  stores,
  onChatFocus,
  onChatInteraction,
  onStoreMention
}) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'agent',
      content: `**Welcome to ${demoConfig?.display_name || 'Store Intelligence'}!**\n\nI'm your AI assistant, ready to analyze store performance, inventory patterns, and provide actionable recommendations.\n\n*Try asking:* "Why is Store #04782 underperforming?" or "What are the top improvement opportunities?"`,
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { sendMessage: sendAgentMessage, isAvailable } = useRetailAgent()
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Detect store mentions in AI response and notify parent
  const parseStoreMentions = useCallback((content) => {
    const storeMatches = content.match(/Store #?(\d+)/gi)
    if (storeMatches && onStoreMention && stores.length) {
      storeMatches.forEach(match => {
        const storeNum = match.replace(/\D/g, '')
        const matchedStore = stores.find(s => 
          s.id?.toString().includes(storeNum) || 
          s.store_id?.toString().includes(storeNum)
        )
        if (matchedStore) {
          onStoreMention(matchedStore)
        }
      })
    }
  }, [stores, onStoreMention])

  const sendMessage = async (message = inputValue) => {
    if (!message.trim() || isLoading) return

    onChatInteraction?.()

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Build context with focused store if available
      const context = {
        demo_id: demoConfig?.demo_id,
        ...(focusedStore && {
          store_number: focusedStore.id?.toString().replace(/\D/g, '').slice(-5),
          city: focusedStore.city,
          state: focusedStore.state,
          performance_score: focusedStore.healthScore || focusedStore.performance_score
        })
      }

      const result = await sendAgentMessage(message, context)

      const agentMessage = {
        id: Date.now() + 1,
        type: 'agent',
        content: result.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, agentMessage])
      
      // Parse for store mentions
      parseStoreMentions(result.message)

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'agent',
        content: `I encountered an issue processing your request. Please try again.\n\n*Error: ${error.message}*`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFocus = () => {
    onChatFocus?.()
  }

  // Quick questions for demo
  const quickQuestions = [
    "Why is this store underperforming?",
    "What are the top 3 improvement opportunities?",
    "Show me the category breakdown",
    "What's the projected ROI for improvements?"
  ]

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Store Intelligence Agent</h3>
            <p className="text-gray-500 text-sm">AI-powered retail analytics</p>
          </div>
        </div>
      </div>

      {/* Store Context Banner */}
      {focusedStore && (
        <div className="flex-shrink-0 px-6 py-3 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 text-lg">
              📍 Analyzing: <strong className="text-gray-900">Store #{focusedStore.id?.toString().replace(/\D/g, '').slice(-5)}</strong> - {focusedStore.city}, {focusedStore.state}
            </span>
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
              (focusedStore.healthScore || focusedStore.performance_score || 0) >= 90
                ? 'bg-emerald-100 text-emerald-700'
                : (focusedStore.healthScore || focusedStore.performance_score || 0) >= 85
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {(focusedStore.healthScore || focusedStore.performance_score || 0).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 shadow-sm text-gray-900'
              }`}
            >
              {message.type === 'agent' ? (
                <div className="prose prose-lg max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({children}) => <p className="text-lg leading-relaxed mb-3 text-gray-700">{children}</p>,
                      strong: ({children}) => <strong className="text-gray-900 font-bold">{children}</strong>,
                      li: ({children}) => <li className="text-base text-gray-700 mb-2">{children}</li>,
                      ul: ({children}) => <ul className="list-disc list-inside space-y-1 mb-3">{children}</ul>,
                      h1: ({children}) => <h1 className="text-xl font-bold text-gray-900 mb-3">{children}</h1>,
                      h2: ({children}) => <h2 className="text-lg font-bold text-gray-900 mb-2">{children}</h2>,
                      h3: ({children}) => <h3 className="text-base font-bold text-gray-900 mb-2">{children}</h3>,
                      code: ({children}) => <code className="bg-gray-100 px-2 py-1 rounded text-base text-gray-800">{children}</code>,
                      em: ({children}) => <em className="text-gray-500">{children}</em>
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-lg leading-relaxed">{message.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-gray-500 text-lg">Analyzing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length <= 2 && (
        <div className="flex-shrink-0 px-6 py-3 border-t border-gray-200 bg-white">
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(question)}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg text-base font-medium transition-colors disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleFocus}
            placeholder="Ask about store performance, inventory, or opportunities..."
            disabled={isLoading}
            className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            rows="2"
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !inputValue.trim()}
            className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl transition-colors flex items-center justify-center"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExpoChatPanel

