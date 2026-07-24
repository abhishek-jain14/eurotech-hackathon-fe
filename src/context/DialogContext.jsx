import { createContext, useContext, useMemo, useState } from 'react';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [modal, setModal] = useState(null);

  const close = () => setModal(null);

  const confirm = (options) => new Promise((resolve) => {
    setModal({ type: 'confirm', resolve, ...options });
  });

  const notify = (options) => {
    setModal({ type: 'alert', resolve: null, ...options });
  };

  const handleAction = (value) => {
    if (typeof modal?.resolve === 'function') {
      modal.resolve(value);
    }
    setModal(null);
  };

  const value = useMemo(() => ({ confirm, notify, close }), []);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {modal && (
        <div className="dialog-overlay" onClick={() => handleAction(modal.type === 'confirm' ? false : true)}>
          <div className={`dialog-card ${modal.variant || 'info'}`} onClick={(e) => e.stopPropagation()}>
            <div className={`dialog-icon ${modal.variant || 'info'}`}>
              {modal.variant === 'danger' ? '⚠' : modal.variant === 'success' ? '✓' : 'ℹ'}
            </div>
            <div className="dialog-title">{modal.title}</div>
            <div className="dialog-message">{modal.message}</div>
            <div className="dialog-actions">
              {modal.type === 'confirm' && (
                <button className="btn btn-ghost" onClick={() => handleAction(false)}>{modal.cancelLabel || 'Cancel'}</button>
              )}
              <button className={`btn ${modal.variant === 'danger' ? 'btn-red' : 'btn-primary'}`} onClick={() => handleAction(true)}>
                {modal.confirmLabel || (modal.type === 'confirm' ? 'Confirm' : 'OK')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
