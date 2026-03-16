/**
 * Retail Store Intelligence Agent API Client
 * Integrates with Databricks Model Serving endpoint
 * Handles authentication, error handling, and response formatting
 */

class RetailAgentAPI {
  constructor(endpointUrl = null, authToken = null) {
    // Always use backend proxy for security and simplicity
    this.useProxy = true;
    this.endpointUrl = '/api/agent/chat';
    this.healthEndpoint = '/api/agent/health';
    
    // Store original params for debugging (not used for auth)
    this.originalEndpoint = endpointUrl;
    this.authToken = authToken;
    this.sessionId = this.generateSessionId();
    this.conversationHistory = [];
    
    console.log('🔧 RetailAgentAPI initialized:', {
      useProxy: this.useProxy,
      endpointUrl: this.endpointUrl,
      healthEndpoint: this.healthEndpoint,
      originalEndpoint: endpointUrl,
      note: 'Backend handles all authentication'
    });
    
    // Configuration
    this.config = {
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      maxHistoryLength: 10
    };
  }

  /**
   * Send a message to the Store Intelligence Agent
   * @param {string} message - User message
   * @param {Object} context - Store context and additional data
   * @returns {Promise<Object>} Agent response
   */
  async sendMessage(message, context = {}) {
    if (!message?.trim()) {
      throw new Error('Message cannot be empty');
    }

    // Add to conversation history
    this.conversationHistory.push({
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Trim history if too long
    if (this.conversationHistory.length > this.config.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.config.maxHistoryLength);
    }

    try {
      // Format for ResponsesAgent (following your notebook pattern)
      const response = await this._makeRequest({
        input: [
          {
            role: "user",
            content: message
          }
        ],
        // Add context as custom inputs if needed
        custom_inputs: {
          ...context,
          session_id: this.sessionId,
          conversation_history: this.conversationHistory.slice(-5)
        }
      });

      // Add agent response to history
      this.conversationHistory.push({
        type: 'agent',
        content: response.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: response.message,
        metadata: response.metadata || {},
        suggested_questions: response.suggested_questions || [],
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId
      };

    } catch (error) {
      console.error('Agent API Error:', error);
      
      // Return structured error response
      return {
        success: false,
        error: error.message,
        message: this._getErrorMessage(error),
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId
      };
    }
  }

  /**
   * Check agent endpoint health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const response = await fetch(this.healthEndpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });

      if (response.ok) {
        const data = await response.json();
        return {
          status: 'healthy',
          endpoint: this.endpointUrl,
          timestamp: new Date().toISOString(),
          details: data
        };
      } else {
        return {
          status: 'unhealthy',
          endpoint: this.endpointUrl,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        status: 'error',
        endpoint: this.endpointUrl,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Get conversation history
   * @returns {Array} Conversation history
   */
  getHistory() {
    return [...this.conversationHistory];
  }

  /**
   * Make authenticated request to Model Serving endpoint
   * @private
   */
  async _makeRequest(payload, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      // Always use proxy - backend handles authentication
      const headers = { 'Content-Type': 'application/json' };
      const contextData = payload.custom_inputs || {};
      // Pass Genie conversation ID for follow-up messages
      if (this._genieConversationId) {
        contextData.genie_conversation_id = this._genieConversationId;
      }
      const proxyPayload = {
        messages: payload.input,
        context: contextData
      };
      console.log('🔧 Proxy request payload:', proxyPayload);

      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(proxyPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Store Genie conversation ID for follow-ups
      if (data.genie_conversation_id) {
        this._genieConversationId = data.genie_conversation_id;
      }

      // Handle proxy response format
      if (data.success && data.response) {
        const agentResponse = data.response;

        // Handle ResponsesAgent format (Genie and agent responses)
        if (agentResponse.output && Array.isArray(agentResponse.output)) {
          const textOutputs = agentResponse.output
            .filter(item => item.type === 'message' && item.content)
            .flatMap(item => item.content)
            .filter(content => content.type === 'output_text')
            .map(content => content.text)
            .join('\n\n');

          return {
            message: textOutputs || 'No response received',
            metadata: agentResponse,
            suggested_questions: data.suggested_questions || []
          };
        }

        return { message: agentResponse, metadata: data };
      }
      
      // Fallback for other formats
      if (data.predictions && Array.isArray(data.predictions)) {
        const agentResponse = data.predictions[0];
        if (typeof agentResponse === 'string') {
          return { message: agentResponse };
        } else if (typeof agentResponse === 'object' && agentResponse.response) {
          return { message: agentResponse.response, metadata: agentResponse };
        }
      }
      
      // Last resort
      return { message: JSON.stringify(data) };

    } catch (error) {
      // Retry logic for network errors
      if (attempt < this.config.retryAttempts && this._shouldRetry(error)) {
        console.warn(`Request failed (attempt ${attempt}), retrying...`, error.message);
        await this._delay(this.config.retryDelay * attempt);
        return this._makeRequest(payload, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Determine if error should trigger retry
   * @private
   */
  _shouldRetry(error) {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      error.name === 'AbortError' ||
      error.name === 'TypeError' ||
      error.message.includes('fetch') ||
      error.message.includes('5')
    );
  }

  /**
   * Get user-friendly error message
   * @private
   */
  _getErrorMessage(error) {
    if (error.name === 'AbortError') {
      return '⏱️ **Request Timeout**\n\nThe Store Intelligence Agent is taking longer than usual to respond. This might be due to high demand or complex analysis.\n\n💡 **Please try again** or ask a simpler question.';
    }
    
    if (error.message.includes('401') || error.message.includes('403')) {
      return '🔐 **Authentication Error**\n\nThere\'s an issue with accessing the Store Intelligence Agent service. This might be due to:\n- Expired authentication token\n- Insufficient permissions\n- Service configuration issue\n\n💡 **Please contact your system administrator.**';
    }
    
    if (error.message.includes('404')) {
      return '🔍 **Service Not Found**\n\nThe Store Intelligence Agent service endpoint is not available. This might be due to:\n- Service deployment issues\n- Incorrect configuration\n- Temporary maintenance\n\n💡 **Please contact your system administrator.**';
    }
    
    if (error.message.includes('5')) {
      return '⚠️ **Service Error**\n\nThe Store Intelligence Agent service is experiencing technical difficulties. This might be due to:\n- High system load\n- Temporary service issues\n- Data processing problems\n\n💡 **Please try again in a few moments.**';
    }
    
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return '🌐 **Connection Error**\n\nUnable to connect to the Store Intelligence Agent service. This might be due to:\n- Network connectivity issues\n- Firewall restrictions\n- Service unavailability\n\n💡 **Please check your connection and try again.**';
    }
    
    // Generic error message
    return '❌ **Unexpected Error**\n\nThe Store Intelligence Agent encountered an unexpected issue. Please try again or contact support if the problem persists.\n\n💡 **Error details:** ' + error.message;
  }

  /**
   * Generate unique session ID
   * @private
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Delay utility for retry logic
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * React Hook for Retail Agent Integration
 */
export const useRetailAgent = (endpointUrl = null, authToken = null) => {
  const [agent] = React.useState(() => {
    console.log('🔧 useRetailAgent Debug:', {
      endpointUrl,
      authToken: authToken ? `${authToken.substring(0, 10)}...` : null,
      note: 'Backend handles all authentication - no validation needed'
    });
    
    // Always create agent - backend handles authentication
    return new RetailAgentAPI(endpointUrl, authToken);
  });

  const [connectionStatus, setConnectionStatus] = React.useState('disconnected');
  const [lastHealthCheck, setLastHealthCheck] = React.useState(null);

  // Check connection health on mount and periodically
  React.useEffect(() => {
    if (!agent) return;

    const checkHealth = async () => {
      try {
        setConnectionStatus('connecting');
        const health = await agent.checkHealth();
        setConnectionStatus(health.status === 'healthy' ? 'connected' : 'error');
        setLastHealthCheck(health);
      } catch (error) {
        setConnectionStatus('error');
        setLastHealthCheck({ status: 'error', error: error.message });
      }
    };

    // Initial health check
    checkHealth();

    // Periodic health checks every 5 minutes
    const healthCheckInterval = setInterval(checkHealth, 5 * 60 * 1000);

    return () => clearInterval(healthCheckInterval);
  }, [agent]);

  const sendMessage = React.useCallback(async (message, context = {}) => {
    if (!agent) {
      return {
        success: false,
        error: 'Agent not initialized',
        message: 'Store Intelligence Agent is not available. Please check configuration.'
      };
    }

    return await agent.sendMessage(message, context);
  }, [agent]);

  const clearHistory = React.useCallback(() => {
    if (agent) {
      agent.clearHistory();
    }
  }, [agent]);

  const getHistory = React.useCallback(() => {
    return agent ? agent.getHistory() : [];
  }, [agent]);

  return {
    sendMessage,
    clearHistory,
    getHistory,
    connectionStatus,
    lastHealthCheck,
    isAvailable: !!agent && connectionStatus === 'connected'
  };
};

export default RetailAgentAPI;

