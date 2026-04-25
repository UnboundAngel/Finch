import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    Sentry.captureException(error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    localStorage.removeItem('finch_remembered_profile');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0a',
            color: '#ffffff',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '24px',
            textAlign: 'center'
          }}
        >
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '40px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              animation: 'fadeInSlideUp 0.4s ease-out'
            }}
          >
            <h1 style={{ fontSize: '24px', marginBottom: '12px', fontWeight: '600' }}>Something went wrong</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px', lineHeight: '1.5' }}>
              The application encountered an unexpected error. We've notified our team and are working on a fix.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '999px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, opacity 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Reload App
              </button>
              <button
                onClick={this.handleClearAndReload}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '12px 24px',
                  borderRadius: '999px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, background 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                Clear State & Reload
              </button>
            </div>
          </div>
          <style>
            {`
              @keyframes fadeInSlideUp {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}
          </style>
        </div>
      );
    }

    return this.children;
  }
}
