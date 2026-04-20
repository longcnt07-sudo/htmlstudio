import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let message = "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.";
      
      try {
        const errorData = JSON.parse(this.state.error?.message || '');
        if (errorData.error && errorData.error.includes('Missing or insufficient permissions')) {
          message = "Bạn không có quyền thực hiện thao tác này. Vui lòng kiểm tra quyền truy cập hoặc liên hệ giáo viên.";
        }
      } catch {
        // Not a JSON error
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-red-50 rounded-lg border border-red-200 m-4">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Ối! Có lỗi xảy ra</h2>
          <p className="text-gray-700 mb-6 max-w-md">{message}</p>
          <button
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-gray-900 text-green-400 text-xs text-left overflow-auto max-w-full rounded">
              {this.state.error?.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
