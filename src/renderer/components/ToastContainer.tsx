interface ToastData {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export function ToastContainer({ toasts }: { toasts: ToastData[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
