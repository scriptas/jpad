import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener("error", (e) => {
  document.body.innerHTML += `<div style="color: red; position: fixed; z-index: 9999; top: 0; left: 0; background: black; padding: 20px; width: 100vw; height: 100vh; overflow: auto; font-family: monospace;"><b>Error:</b> ${e.message}<br><pre>${e.error?.stack}</pre></div>`;
});
window.addEventListener("unhandledrejection", (e) => {
  document.body.innerHTML += `<div style="color: red; position: fixed; z-index: 9999; top: 0; left: 0; background: black; padding: 20px; width: 100vw; height: 100vh; overflow: auto; font-family: monospace;"><b>Unhandled Promise Rejection:</b> ${e.reason?.message || e.reason}<br><pre>${e.reason?.stack}</pre></div>`;
});

const ErrorFallback = ({ error }: { error: Error }) => {
  return (
    <div style={{ color: "red", padding: 20, background: "black", width: "100vw", height: "100vh", position: "fixed", zIndex: 9999 }}>
      <h2>React Error Boundary</h2>
      <pre>{error.message}</pre>
      <pre>{error.stack}</pre>
    </div>
  );
};

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error!} />;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
