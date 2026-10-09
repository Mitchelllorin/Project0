import React from 'react';
import {Box} from 'lucide-react';

// Catches render/lifecycle errors so a failure in the 3D workspace shows a
// recoverable message instead of a blank screen.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {error: null};
    this.retry = this.retry.bind(this);
  }
  static getDerivedStateFromError(error) {
    return {error};
  }
  componentDidCatch(error, info) {
    console.error('Studio crashed:', error, info);
  }
  retry() {
    this.setState({error: null});
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="studio-crash" role="alert" data-testid="studio-crash">
        <Box size={38} strokeWidth={1} />
        <h2>Something interrupted the studio</h2>
        <p>The 3D workspace hit an unexpected error. Your saved design is safe.</p>
        <button className="accent-button" data-testid="studio-crash-retry" onClick={this.retry}>Try again</button>
        <button className="crash-reload" onClick={() => window.location.reload()}>Reload the studio</button>
      </div>
    );
  }
}
