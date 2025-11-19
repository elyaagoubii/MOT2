import React from 'react';
import Modal from './Modal';
import { createRipple } from '../utils/effects';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string | React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="text-sm text-slate-600">{message}</div>
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={(e) => { createRipple(e); onClose(); }}
                        className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { createRipple(e); onConfirm(); }}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
                    >
                        Confirmer la Suppression
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;