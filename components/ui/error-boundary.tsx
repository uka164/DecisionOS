"use client"

import React from "react"
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react"
import { store } from "@/lib/store"

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[DecisionOS]", error, info.componentStack)
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  private handleClear = () => {
    store.clear()
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-3 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 text-center shadow-2xl shadow-black/50">
          <div className="w-14 h-14 mx-auto mb-5 bg-destructive/20 border border-destructive/30 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-white/50 mb-6 leading-relaxed">
            An unexpected error occurred. Reload to try again, or clear local data if the issue persists.
          </p>

          {this.state.error && (
            <pre className="mb-6 px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-xs text-destructive/70 font-mono text-left overflow-x-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={this.handleReload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 border border-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Reload
            </button>
            <button
              onClick={this.handleClear}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive hover:bg-destructive/30 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Clear Local Data
            </button>
          </div>
        </div>
      </div>
    )
  }
}
