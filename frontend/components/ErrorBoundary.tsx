"use client";
import { Component, ReactNode } from "react";

interface State { hasError: boolean; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: "48px 24px", textAlign: "center" }}>
          <h2>Algo deu errado</h2>
          <p style={{ color: "#524865", margin: "12px 0 24px" }}>
            Tente recarregar a página. Se o problema persistir, contate o suporte.
          </p>
          <button
            className="button"
            onClick={() => this.setState({ hasError: false })}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
