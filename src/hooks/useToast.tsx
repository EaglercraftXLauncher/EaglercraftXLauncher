import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Toast {
  id:       string;
  message:  string;
  type:     'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextType {
  toasts:      Toast[];
  addToast:    (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'], duration = 3500) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    if (duration > 0) setTimeout(() => removeToast(id), duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="toast-root">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item toast-${t.type}`} onClick={() => removeToast(t.id)}>
            <div className="toast-dot" />
            <span style={{ fontSize: 13 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
