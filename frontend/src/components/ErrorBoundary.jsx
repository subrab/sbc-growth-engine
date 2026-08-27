import { Component } from 'react';

// Without this, any render error in a route component unmounts the whole
// tree silently (React's default with no error boundary), which is exactly
// what a blank white screen looks like. This makes the actual error visible.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#b91c1c', background: '#fef2f2', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>Something broke while rendering:</h1>
          <p style={{ fontWeight: 'bold' }}>{this.state.error.message}</p>
          <pre style={{ marginTop: 12, fontSize: 12 }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
