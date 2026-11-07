import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ChunkErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ChunkErrorBoundaryState {
  failed: boolean;
}

export class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  state: ChunkErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ChunkErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('A lazily loaded part of the app failed to load', error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback ?? null : this.props.children;
  }
}
