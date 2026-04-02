import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white p-4 text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">
            Graphics Context Lost
          </h2>
          <p className="text-gray-400 mb-6">
            The 3D graphics area encountered an error or ran out of memory. This
            occasionally happens on hot reloads or heavy scenes.
          </p>
          <button
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-semibold transition-colors"
            onClick={() => {
              this.setState({ hasError: false, error: null });
            }}
          >
            Restart 3D Scene
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
