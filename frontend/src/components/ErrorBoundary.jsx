import React from 'react';
import api from '../services/api';

/**
 * Error Boundary Component
 * Catches React errors and sends notifications to backend
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error caught by boundary:', error, errorInfo);

    // Generate unique error ID
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Send error notification to backend (only in production)
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToBackend(error, errorInfo, errorId);
    }
  }

  async sendErrorToBackend(error, errorInfo, errorId) {
    try {
      const errorPayload = {
        errorId,
        errorName: error.name,
        errorMessage: error.message,
        stackTrace: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        // Add any user context if available
        sessionId: sessionStorage.getItem('sessionId'),
        context: 'React Component Error'
      };

      await api.post('/enrollment/report-error', errorPayload);
      console.log('Error reported to backend successfully');
    } catch (reportError) {
      console.error('Failed to report error to backend:', reportError);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
    // Navigate to home
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Production error UI
      if (process.env.NODE_ENV === 'production') {
        return (
          <div style={styles.container}>
            <div style={styles.card}>
              <div style={styles.iconContainer}>
                <span style={styles.icon}>⚠️</span>
              </div>
              <h1 style={styles.title}>Oops! Something went wrong</h1>
              <p style={styles.message}>
                We're sorry for the inconvenience. An unexpected error occurred and our team has been notified.
              </p>
              {this.state.errorId && (
                <p style={styles.errorId}>
                  Error ID: <code style={styles.code}>{this.state.errorId}</code>
                </p>
              )}
              <div style={styles.buttonContainer}>
                <button onClick={this.handleReset} style={styles.button}>
                  Return to Home
                </button>
                <button 
                  onClick={() => window.location.reload()} 
                  style={styles.buttonSecondary}
                >
                  Refresh Page
                </button>
              </div>
              <p style={styles.support}>
                If the problem persists, please contact support at{' '}
                <a href="mailto:support@wellbridge.com" style={styles.link}>
                  support@wellbridge.com
                </a>
              </p>
            </div>
          </div>
        );
      }

      // Development error UI with details
      return (
        <div style={styles.container}>
          <div style={styles.cardDev}>
            <div style={styles.iconContainer}>
              <span style={styles.icon}>🐛</span>
            </div>
            <h1 style={styles.titleDev}>Development Error</h1>
            <p style={styles.message}>
              An error occurred in the React component tree
            </p>
            
            <div style={styles.errorDetails}>
              <h3 style={styles.detailsTitle}>Error Message:</h3>
              <pre style={styles.pre}>{this.state.error?.toString()}</pre>
              
              <h3 style={styles.detailsTitle}>Stack Trace:</h3>
              <pre style={styles.pre}>{this.state.error?.stack}</pre>
              
              <h3 style={styles.detailsTitle}>Component Stack:</h3>
              <pre style={styles.pre}>{this.state.errorInfo?.componentStack}</pre>
            </div>

            <div style={styles.buttonContainer}>
              <button onClick={this.handleReset} style={styles.button}>
                Return to Home
              </button>
              <button 
                onClick={() => window.location.reload()} 
                style={styles.buttonSecondary}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline styles
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  cardDev: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '40px',
    maxWidth: '900px',
    width: '100%',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'left'
  },
  iconContainer: {
    marginBottom: '20px'
  },
  icon: {
    fontSize: '64px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '16px'
  },
  titleDev: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: '16px',
    textAlign: 'center'
  },
  message: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
    lineHeight: '1.5'
  },
  errorId: {
    fontSize: '14px',
    color: '#999',
    marginBottom: '24px'
  },
  code: {
    backgroundColor: '#f0f0f0',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px'
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  buttonSecondary: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  support: {
    fontSize: '14px',
    color: '#666',
    marginTop: '20px'
  },
  link: {
    color: '#007bff',
    textDecoration: 'none'
  },
  errorDetails: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    padding: '20px',
    marginBottom: '24px',
    maxHeight: '500px',
    overflowY: 'auto'
  },
  detailsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#495057',
    marginTop: '16px',
    marginBottom: '8px'
  },
  pre: {
    backgroundColor: '#272822',
    color: '#f8f8f2',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '13px',
    fontFamily: 'monospace',
    margin: '0'
  }
};

export default ErrorBoundary;
