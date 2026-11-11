import { Component, type ReactNode } from "react";

export default class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    console.error("HeroScene failed:", error);
  }

  render() {
    if (this.state.error) {
      // TEMPORARY: shows the real error on screen. Change to `return null;` once fixed.
      return (
        <pre className="absolute left-4 right-4 top-20 z-50 overflow-auto rounded-md bg-red-950 p-4 text-xs text-red-100">
          {this.state.error.message}
        </pre>
      );
    }
    return this.props.children;
  }
}