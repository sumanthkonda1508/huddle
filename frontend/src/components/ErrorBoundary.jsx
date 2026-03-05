import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    backgroundColor: 'var(--bg-color)',
                    textAlign: 'center',
                    padding: '2rem'
                }}>
                    <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
                        <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Something went wrong!</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            We've encountered an unexpected error. Please try refreshing the page or navigating back.
                        </p>
                        <button
                            className="btn"
                            onClick={() => window.location.href = '/'}
                        >
                            Return Home
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
