import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    const msg = (error.message || '').toLowerCase();
    if (
      msg.includes('aborted') || 
      msg.includes('abort') || 
      msg.includes('fetching process') || 
      msg.includes('media resource') || 
      msg.includes('play()') || 
      msg.includes('interrupted') || 
      msg.includes('prevented') ||
      msg.includes('user agent') ||
      msg.includes('error 0')
    ) {
      return { hasError: false };
    }
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return <h1>Sorry... there was an error</h1>;
    }

    return this.props.children;
  }
}
