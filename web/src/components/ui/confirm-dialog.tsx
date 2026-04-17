import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';
import { useEffect } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

export function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    onConfirm,
    onCancel,
    isDestructive = true
}: ConfirmDialogProps) {
    const prefersReducedMotion = useReducedMotionSafe();

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Dialog Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95, y: prefersReducedMotion ? 0 : 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95, y: prefersReducedMotion ? 0 : 10 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2, type: 'spring', bounce: 0 }}
                        className="relative w-full max-w-md bg-[#0A0A0C] border border-white/10 shadow-2xl rounded-2xl overflow-hidden p-6 z-10"
                    >
                        {/* Glow indicator based on descructive nature */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${isDestructive ? 'bg-red-500' : 'bg-teal-500'}`} />
                        
                        <div className="flex gap-4 mb-6">
                            <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-teal-500/10 text-teal-500'}`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 w-full">
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 bg-transparent text-zinc-300 hover:text-white border border-transparent hover:border-white/10 rounded-lg text-sm font-medium transition-colors"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onCancel(); // Auto-close
                                }}
                                className={`px-5 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 ${
                                    isDestructive 
                                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20' 
                                        : 'bg-teal-500 hover:bg-teal-400 text-black shadow-teal-500/20'
                                }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
