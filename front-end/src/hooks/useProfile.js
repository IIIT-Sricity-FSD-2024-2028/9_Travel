import { useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useWorkflowState } from '../context/WorkflowContext';
import { uploadApi } from '../services/api';
import { canOperateSession, getSnapshot, saveUserProfile } from '../services/workflow';

/**
 * Profile helpers shared by every profile page:
 *  - the user's record from the workflow state (availability, member since, ...)
 *  - save(): saveUserProfileData() – updates session + user / guide / vendor records
 *  - avatar upload through POST /upload (bindProfilePicUpload)
 */
export function useProfile() {
    const { session, updateSession } = useAuth();
    const { toast } = useUI();
    const state = useWorkflowState();
    const fileInput = useRef(null);

    const userKey = String(session.email || session.name || session.id || '').toLowerCase();
    const matches = (record) => (record.email && record.email.toLowerCase() === userKey) || (record.name && record.name.toLowerCase() === userKey) || record.id === session.id;
    const user = (state.users || []).find(matches);
    const guide = (state.guides || []).find(matches);
    const vendor = (state.vendors || []).find(matches);
    const nonDefault = (s) => (s && !['active', 'inactive'].includes(String(s).toLowerCase()) ? s : null);
    const availability = session.availabilityStatus
        || (user && (user.availabilityStatus || user.availability || user.profile?.availabilityStatus))
        || (guide && (guide.availabilityStatus || nonDefault(guide.status)))
        || (vendor && (vendor.availabilityStatus || nonDefault(vendor.status)))
        || 'Available';
    const joined = user?.joined || user?.createdAt || guide?.createdAt || vendor?.createdAt || '2024-01-15';
    const memberSince = (() => {
        const d = new Date(joined);
        return Number.isNaN(d.getTime()) ? 'Jan 2024' : d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    })();

    const save = useCallback((fields, { silent = false } = {}) => {
        if (!canOperateSession()) return false;
        const next = saveUserProfile(session, fields);
        updateSession(next);
        if (!silent) toast('Profile details saved successfully!', 'success');
        return true;
    }, [session, updateSession, toast]);

    const pickAvatar = useCallback(() => fileInput.current?.click(), []);

    const onAvatarSelected = useCallback(async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast('Please choose an image file (JPEG or PNG).', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast('Profile pictures must be 5MB or smaller.', 'error');
            return;
        }
        if (!canOperateSession()) return;
        try {
            const result = await uploadApi.upload(file);
            const next = saveUserProfile(session, { picUrl: result.url });
            updateSession(next);
            toast('Profile photo updated successfully!', 'success');
        } catch (error) {
            toast(`Profile photo upload failed: ${error.message}`, 'error');
        }
    }, [session, updateSession, toast]);

    return { session, state, user, guide, vendor, availability, memberSince, save, pickAvatar, onAvatarSelected, fileInput, snapshot: getSnapshot };
}
