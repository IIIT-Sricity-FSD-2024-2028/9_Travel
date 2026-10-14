import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Toasts from '../components/Toasts';
import { AttachmentLightbox, ConfirmModal, DetailsModal, SuccessModal } from '../components/Modal';
import PaymentModal from '../components/modals/PaymentModal';
import BudgetShareModal from '../components/modals/BudgetShareModal';
import RefundModal from '../components/modals/RefundModal';
import { findTrip, getSnapshot, isTripPaid } from '../services/workflow';
import { normRole, readStoredSession } from '../services/session';

/**
 * Global UI services: toasts, confirm / success dialogs, details modal,
 * attachment lightbox and the workflow modals (payment, payouts, refunds).
 * Replaces the DOM-injected helpers from app.js / workflow.js.
 */
const UIContext = createContext(null);

let toastSeq = 0;

export function UIProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [confirmState, setConfirmState] = useState(null);
    const [successState, setSuccessState] = useState(null);
    const [details, setDetails] = useState(null);
    const [lightboxUrl, setLightboxUrl] = useState('');
    const [workflowModal, setWorkflowModal] = useState(null);
    const confirmResolver = useRef(null);

    const toast = useCallback((message, type = 'success', duration = 2800) => {
        if (!message) return;
        const id = ++toastSeq;
        setToasts((list) => [...list.slice(-4), { id, message, type }]);
        setTimeout(() => setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t))), duration);
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), duration + 400);
    }, []);

    /** Promise based confirm dialog: `if (await confirm({...})) doSomething()`. */
    const confirm = useCallback(({ title, message, confirmText = 'Confirm', tone = 'green' }) => new Promise((resolve) => {
        confirmResolver.current = resolve;
        setConfirmState({ title, message, confirmText, tone });
    }), []);

    const closeConfirm = (result) => {
        setConfirmState(null);
        if (confirmResolver.current) confirmResolver.current(result);
        confirmResolver.current = null;
    };

    const success = useCallback((title, message, onOk) => setSuccessState({ title, message, onOk }), []);
    const showDetails = useCallback((title, sections) => setDetails({ title, sections }), []);
    const viewAttachment = useCallback((url) => { if (url) setLightboxUrl(url); }, []);

    /** window.openPaymentModal(tripId) – includes the original fallback trip lookup. */
    const openPaymentModal = useCallback((tripId) => {
        const state = getSnapshot();
        let trip = findTrip(state, tripId);
        if (!trip) {
            const session = readStoredSession();
            trip = (state.trips || []).find((t) => (t.travelerEmail === session.email || t.travelerName === session.name) && t.paymentStatus !== 'Paid' && t.status !== 'cancelled')
                || (state.trips || []).find((t) => t.paymentStatus !== 'Paid' && t.status !== 'cancelled')
                || state.trips?.[0];
        }
        if (!trip) {
            toast('No active trip found for payment.', 'error');
            return;
        }
        setWorkflowModal({ type: 'payment', tripId: trip.id });
    }, [toast]);

    const openBudgetShareModal = useCallback((tripId) => {
        const trip = findTrip(getSnapshot(), tripId);
        if (!trip) { toast('Trip not found', 'error'); return; }
        if (trip.budgetShare?.disbursed) { toast('Payment already completed for this trip.', 'warning'); return; }
        setWorkflowModal({ type: 'budget', tripId: trip.id });
    }, [toast]);

    const openRefundModal = useCallback((tripId) => {
        const trip = findTrip(getSnapshot(), tripId);
        if (!trip) { toast('Trip not found', 'error'); return; }
        const isSuperAdmin = normRole(readStoredSession().role) === 'superuser';
        const isRefunded = Boolean(trip.refundRecord && trip.refundRecord.processed);
        if (!isTripPaid(trip)) {
            toast(`Trip #${trip.id || tripId} was cancelled before payment was completed. No monetary refund is required.`, 'info');
            return;
        }
        if (!isSuperAdmin && !isRefunded) {
            toast('Only Super Admin is authorized to process trip refunds.', 'warning');
            return;
        }
        setWorkflowModal({ type: 'refund', tripId: trip.id });
    }, [toast]);

    const value = useMemo(() => ({
        toast, confirm, success, showDetails, viewAttachment, openPaymentModal, openBudgetShareModal, openRefundModal,
    }), [toast, confirm, success, showDetails, viewAttachment, openPaymentModal, openBudgetShareModal, openRefundModal]);

    const modalTrip = workflowModal ? findTrip(getSnapshot(), workflowModal.tripId) : null;
    const closeWorkflowModal = () => setWorkflowModal(null);

    return (
        <UIContext.Provider value={value}>
            {children}
            <Toasts toasts={toasts} />
            {confirmState && (
                <ConfirmModal
                    {...confirmState}
                    onConfirm={() => closeConfirm(true)}
                    onCancel={() => closeConfirm(false)}
                />
            )}
            {successState && (
                <SuccessModal
                    title={successState.title}
                    message={successState.message}
                    onClose={() => {
                        const cb = successState.onOk;
                        setSuccessState(null);
                        if (cb) cb();
                    }}
                />
            )}
            {details && <DetailsModal title={details.title} sections={details.sections} onClose={() => setDetails(null)} />}
            {lightboxUrl && <AttachmentLightbox url={lightboxUrl} onClose={() => setLightboxUrl('')} />}
            {modalTrip && workflowModal.type === 'payment' && <PaymentModal trip={modalTrip} onClose={closeWorkflowModal} toast={toast} />}
            {modalTrip && workflowModal.type === 'budget' && <BudgetShareModal trip={modalTrip} onClose={closeWorkflowModal} toast={toast} />}
            {modalTrip && workflowModal.type === 'refund' && (
                <RefundModal trip={modalTrip} onClose={closeWorkflowModal} toast={toast} canProcess={normRole(readStoredSession().role) === 'superuser'} />
            )}
        </UIContext.Provider>
    );
}

export function useUI() {
    const ctx = useContext(UIContext);
    if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
    return ctx;
}
