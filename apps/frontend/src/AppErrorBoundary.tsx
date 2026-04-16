import type { ReactNode } from 'react';
import React from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
  errorInfo: string | null;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, errorInfo: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep logging minimal; this is for kiosk/mobile startup debugging.
    // eslint-disable-next-line no-console
    console.error('[AppErrorBoundary]', error, info);
    this.setState({ error, errorInfo: info.componentStack ?? null });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0f1419',
          color: '#e6edf3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          boxSizing: 'border-box',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <div style={{ maxWidth: 900 }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 24 }}>Ошибка запуска</h2>
          <p style={{ margin: '12px 0 0', opacity: 0.9 }}>
            Приложение не смогло отрисоваться. Перезагрузите страницу. Если ошибка повторяется — сообщите оператору.
          </p>
          <pre
            style={{
              margin: '16px 0 0',
              padding: 12,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'auto',
              maxHeight: '50vh',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {String(this.state.error?.message ?? 'Unknown error')}
            {this.state.errorInfo ? `\n\n${this.state.errorInfo}` : ''}
          </pre>
        </div>
      </div>
    );
  }
}

