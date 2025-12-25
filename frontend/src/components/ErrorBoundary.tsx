import React from 'react';

type ErrorBoundaryState = { hasError: boolean; error?: Error | null };

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error', error, info);
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Đã có lỗi xảy ra</h2>
            <p style={{ color: '#666', marginBottom: 16 }}>Vui lòng thử tải lại trang. Nếu lỗi tiếp diễn, hãy liên hệ hỗ trợ.</p>
            <button onClick={this.reset} style={{ padding: '10px 16px', borderRadius: 8, background: '#111827', color: '#fff' }}>Thử lại</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
