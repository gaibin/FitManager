/**
 * 全局错误边界 — 使用 react-error-boundary（函数式，兼容 React 19）
 */

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import type { ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-200">页面加载异常</h3>
        <p className="text-sm text-zinc-500 leading-relaxed">
          当前页面组件渲染时出现了意外错误。
        </p>
        {error && (
          <p className="text-xs text-red-400 bg-red-500/5 rounded-lg p-3 font-mono text-left">
            {error.message}
          </p>
        )}
        <button
          onClick={resetErrorBoundary}
          className="px-6 py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl transition-all"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}

export default function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary FallbackComponent={fallback ? undefined : ErrorFallback} fallback={fallback}>
      {children}
    </ReactErrorBoundary>
  );
}
