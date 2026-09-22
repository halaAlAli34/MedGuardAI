import { Component } from "react";
import { ShieldAlert } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // In a real production deployment this is where you'd forward to an
    // error-tracking service (Sentry, etc). Kept as console.error here since
    // this environment has no such service configured.
    console.error("MedGuard AI encountered an unexpected error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-warm-bg p-6">
          <div className="max-w-sm text-center">
            <div className="w-14 h-14 rounded-full bg-severity-severeBg text-severity-severe flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={26} />
            </div>
            <h1 className="text-xl font-extrabold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-5">
              MedGuard AI ran into an unexpected error. Your data is safe — try reloading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-teal text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-600"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
