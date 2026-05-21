import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useNexusEditor } from '../../context/NexusEditorContext';

const ToastContainer = () => {
    const { toasts, removeToast } = useNexusEditor();

    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />;
            case 'warning':
                return <AlertTriangle className="text-amber-500 shrink-0" size={18} />;
            case 'error':
                return <XCircle className="text-rose-500 shrink-0" size={18} />;
            case 'info':
            default:
                return <Info className="text-blue-500 shrink-0" size={18} />;
        }
    };

    const getBorderColor = (type) => {
        switch (type) {
            case 'success':
                return 'border-emerald-500/20';
            case 'warning':
                return 'border-amber-500/20';
            case 'error':
                return 'border-rose-500/20';
            case 'info':
            default:
                return 'border-blue-500/20';
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2 max-w-sm w-full print:hidden">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                        className={`flex items-start gap-3 p-4 rounded-2xl backdrop-blur-md bg-white/80 border ${getBorderColor(toast.type)} shadow-lg shadow-slate-200/50`}
                    >
                        {getIcon(toast.type)}
                        <div className="flex-1 text-xs font-semibold text-slate-700 mt-[2px] leading-relaxed">
                            {toast.message}
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100/50 p-1 rounded-lg transition-colors shrink-0"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;
