"use client"
import React from 'react'
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: { children: React.ReactNode }) {
        super(props)
        this.state = { hasError: false, error: null }
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true, error }
    }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("ErrorBoundary caught an error:", error, errorInfo)
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-red-500 bg-red-100 font-mono text-sm overflow-auto max-h-[80vh] w-full z-[100] fixed top-0 left-0">
                    <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
                    <pre>{this.state.error?.stack || this.state.error?.toString()}</pre>
                </div>
            )
        }
        return this.props.children
    }
}
