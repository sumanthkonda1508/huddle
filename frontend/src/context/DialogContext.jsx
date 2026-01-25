import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

const DialogContext = createContext();

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

export const DialogProvider = ({ children }) => {
    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert', // 'alert' | 'confirm' | 'error' | 'success'
        onConfirm: null,
        onCancel: null
    });

    const showDialog = useCallback(({ title, message, type = 'alert', onConfirm, onCancel }) => {
        setDialog({
            isOpen: true,
            title,
            message,
            type,
            onConfirm,
            onCancel
        });
    }, []);

    const closeDialog = useCallback(() => {
        setDialog(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleConfirm = () => {
        if (dialog.onConfirm) dialog.onConfirm();
        closeDialog();
    };

    const handleCancel = () => {
        if (dialog.onCancel) dialog.onCancel();
        closeDialog();
    };

    return (
        <DialogContext.Provider value={{ showDialog, closeDialog }}>
            {children}
            {dialog.isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={handleCancel}>
                    <div style={{
                        background: 'var(--card-bg, #1e293b)',
                        border: '1px solid var(--border-color, #334155)',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '420px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        transform: 'scale(1)',
                        animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        color: 'var(--text-primary, #f8fafc)'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Header with Icon */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '16px' }}>
                            {dialog.type === 'error' && <div style={{ marginBottom: '16px', color: '#ef4444' }}><AlertTriangle size={40} /></div>}
                            {dialog.type === 'success' && <div style={{ marginBottom: '16px', color: '#22c55e' }}><CheckCircle size={40} /></div>}
                            {dialog.type === 'confirm' && <div style={{ marginBottom: '16px', color: '#3b82f6' }}><HelpCircle size={40} /></div>}

                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>{dialog.title}</h3>
                        </div>

                        {/* Message */}
                        <div style={{ marginBottom: '24px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.6 }}>
                            {dialog.message}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            {dialog.type === 'confirm' && (
                                <button
                                    onClick={handleCancel}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color, #334155)',
                                        background: 'transparent',
                                        color: 'var(--text-primary, #f8fafc)',
                                        cursor: 'pointer',
                                        fontSize: '0.95rem',
                                        fontWeight: '500',
                                        flex: 1
                                    }}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={handleConfirm}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: dialog.type === 'error' || dialog.type === 'confirm' && dialog.title.toLowerCase().includes('delete') ? '#ef4444' : 'var(--primary, #3b82f6)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.95rem',
                                    fontWeight: '600',
                                    flex: 1,
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                {dialog.type === 'confirm' ? (dialog.title.toLowerCase().includes('delete') ? 'Delete' : 'Confirm') : 'OK'}
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    `}</style>
                </div>
            )}
        </DialogContext.Provider>
    );
};
