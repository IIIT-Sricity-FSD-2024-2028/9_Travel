import { fileUrl } from '../api';
/**
 * Pure helper functions ported from js/workflow.js, js/app.js and js/crud_controller.js.
 * They contain no DOM access so they can be shared by every React page.
 */

export function nowISO() {
    return new Date().toISOString();
}

export function dateValue(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const str = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d, 12, 0, 0);
    }
    const normalized = str.includes('T') ? str : `${str}T12:00:00`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function dateOnly(value) {
    const date = dateValue(value);
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function addDays(value, days) {
    const date = dateValue(value) || new Date();
    const result = new Date(date);
    result.setDate(result.getDate() + Number(days || 0));
    const y = result.getFullYear();
    const m = String(result.getMonth() + 1).padStart(2, '0');
    const d = String(result.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function formatShortDate(value) {
    const date = dateValue(value);
    if (!date) return 'Pending';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateRange(trip) {
    if (!trip || !trip.startDate || !trip.endDate) return 'Pending dates';
    return `${formatShortDate(trip.startDate)} - ${formatShortDate(trip.endDate)}`;
}

/** app.js formatDate() – used by the Super Admin CRUD pages. */
export function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

export function tripDays(trip) {
    const start = dateValue(trip?.startDate);
    const end = dateValue(trip?.endDate);
    if (!start || !end) return 0;
    const diff = Math.max(0, end.getTime() - start.getTime());
    return Math.round(diff / 86400000) + 1;
}

export function relativeTime(value) {
    const date = dateValue(value);
    if (!date) return 'Just now';
    const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
}

export function badgeClassFor(value) {
    const text = String(value || '').toLowerCase();
    if (text.includes('request') || text.includes('pending')) return 'badge-amber';
    if (text.includes('planning') || text.includes('assigned') || text.includes('ready')) return 'badge-blue';
    if (text.includes('accept') || text.includes('progress') || text.includes('active') || text.includes('ongoing')) return 'badge-green';
    if (text.includes('complete')) return 'badge-gray';
    if (text.includes('reject') || text.includes('cancel') || text.includes('delay')) return 'badge-red';
    return 'badge-gray';
}

export function initialsFor(name) {
    return String(name || 'User').split(/\s+/).map((part) => part[0]).join('').toUpperCase().slice(0, 2);
}

/** app.js getInitials() */
export function getInitials(name) {
    return (name || 'U').split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

/** crud_controller.js getRoleBadgeClass() */
export function getRoleBadgeClass(role) {
    if (!role) return 'sa-role-user';
    const r = role.toLowerCase();
    if (r.includes('super')) return 'sa-role-admin';
    if (r.includes('partner')) return 'sa-role-partner';
    if (r.includes('vendor')) return 'sa-role-vendor';
    if (r.includes('guide')) return 'sa-role-guide';
    return 'sa-role-user';
}

// Platform currency is locked to INR (same as the original getSelectedCurrency()).
export function getSelectedCurrency() {
    return 'INR';
}

export function setSelectedCurrency(curr) {
    try { localStorage.setItem('dd_currency', curr); } catch { /* ignore */ }
}

export function getCurrencySymbol(curr) {
    const c = curr || getSelectedCurrency();
    return c === 'USD' ? '$' : '₹';
}

export function formatMoney(value, overrideCurr) {
    const num = Number(value || 0);
    const curr = overrideCurr || getSelectedCurrency();
    const symbol = getCurrencySymbol(curr);
    if (curr === 'INR') {
        if (num >= 10000000) return `${symbol}${(num / 10000000).toFixed(1)}Cr`;
        if (num >= 100000) return `${symbol}${(num / 100000).toFixed(1)}L`;
        return `${symbol}${num.toLocaleString('en-IN')}`;
    }
    if (num >= 100000) return `${symbol}${Math.round(num / 1000)}K`;
    return `${symbol}${num.toLocaleString('en-US')}`;
}

export function isTripPaid(trip) {
    if (!trip) return false;
    if (trip.refundRecord && trip.refundRecord.processed) return true;
    if (trip.paymentStatus === 'Unpaid' || trip.paymentStatus === 'not_paid' || trip.isPaid === false || trip.paymentCompleted === false || trip.unpaid === true) return false;
    if (trip.paidAmount !== undefined && Number(trip.paidAmount) <= 0) return false;
    if (trip.paymentStatus === 'Paid' || trip.paymentStatus === 'completed' || trip.paid === true || trip.isPaid === true || trip.paymentCompleted === true) return true;
    if (trip.status === 'requested' || trip.requestStatus === 'Requested' || trip.status === 'planning') return false;
    return true;
}

export function getDestinationCoverPhoto(trip, width = 1600) {
    const q = `auto=format&fit=crop&w=${width}&q=80`;
    if (!trip) return `https://images.unsplash.com/photo-1488646953014-85cb44e25828?${q}`;
    if (trip.coverImage || trip.imageUrl || trip.photoUrl || trip.image || trip.customPhoto) {
        return trip.coverImage || trip.imageUrl || trip.photoUrl || trip.image || trip.customPhoto;
    }
    const text = `${trip.title || ''} ${trip.destination || ''} ${trip.notes || ''}`.toLowerCase();
    if (/swiss|alps|zurich|snow|iceland|norway|manali|himalaya|mountain|peak|ski/.test(text)) return `https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?${q}`;
    if (/maldives|beach|island|hawaii|thailand|bali|goa|kerala|cancun|caribbean|coast|ocean|resort/.test(text)) return `https://images.unsplash.com/photo-1514282401047-d79a71a590e8?${q}`;
    if (/japan|tokyo|kyoto|singapore|china|vietnam|asia|temple|pagoda|sakura/.test(text)) return `https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?${q}`;
    if (/paris|france|london|rome|italy|spain|amsterdam|greece|europe|eiffel|colosseum/.test(text)) return `https://images.unsplash.com/photo-1502602898657-3e91760cbb34?${q}`;
    if (/new york|nyc|dubai|chicago|city|skyline|urban|downtown|tower|los angeles/.test(text)) return `https://images.unsplash.com/photo-1514565131-fce0801e5785?${q}`;
    if (/kenya|safari|africa|desert|egypt|canyon|wildlife|jungle|national park/.test(text)) return `https://images.unsplash.com/photo-1516426122078-c23e76319801?${q}`;
    const fallbackPool = [
        `https://images.unsplash.com/photo-1488646953014-85cb44e25828?${q}`,
        `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?${q}`,
        `https://images.unsplash.com/photo-1476514525535-ce74f452623d?${q}`,
        `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?${q}`,
        `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?${q}`,
    ];
    let hash = 0;
    const str = String(trip.id || trip.title || trip.destination || '');
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return fallbackPool[Math.abs(hash) % fallbackPool.length];
}

export function validateTripDates(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) {
        return { valid: false, message: 'Please select both start and end dates.' };
    }
    const start = new Date(String(startDateStr).includes('T') ? startDateStr : `${startDateStr}T00:00:00`);
    const end = new Date(String(endDateStr).includes('T') ? endDateStr : `${endDateStr}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return { valid: false, message: 'Please enter valid travel dates.' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    if (startDateOnly < today) {
        return { valid: false, message: 'Start date cannot be in the past. Please select today or a future date.' };
    }
    if (endDateOnly <= startDateOnly) {
        return { valid: false, message: 'End date must be after start date.' };
    }
    const maxAllowedDate = new Date(today);
    maxAllowedDate.setMonth(maxAllowedDate.getMonth() + 8);
    maxAllowedDate.setHours(23, 59, 59, 999);
    if (startDateOnly > maxAllowedDate || endDateOnly > maxAllowedDate) {
        return { valid: false, message: 'Advance booking is available up to 8 months in advance.' };
    }
    return { valid: true };
}

/** min / max attributes the original applyTripDateLimits() put on every date input. */
export function tripDateLimits() {
    const today = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 8);
    return { min: fmt(today), max: fmt(maxDate) };
}

export function stageLabel(trip) {
    if (trip.cancellationRequested && trip.cancellationStatus === 'Pending') return 'Cancellation Requested';
    if (trip.status === 'requested') return 'New Request';
    if (trip.status === 'cancelled') return 'Cancelled';
    if (trip.status === 'completed') return 'Completed';
    if (trip.status === 'ongoing') return 'Ongoing';
    if (trip.guideStatus === 'Accepted' && ['Accepted', 'In Progress', 'Completed'].includes(trip.vendorStatus)) {
        return trip.paymentStatus === 'Paid' ? 'Ready' : 'Payment Pending';
    }
    if (trip.guideStatus === 'Assigned' || trip.vendorStatus === 'Requested') return 'Assignments Pending';
    return 'Planning';
}

export function statusLabel(trip) {
    if (trip.cancellationRequested && trip.cancellationStatus === 'Pending') return 'Cancellation Requested';
    if (trip.status === 'requested') return 'Requested';
    if (trip.status === 'cancelled') return 'Cancelled';
    if (trip.status === 'completed') return 'Completed';
    if (trip.status === 'ongoing') return 'In Progress';
    return stageLabel(trip);
}

/** crud_controller.js tripDisplayStatus() */
export function tripDisplayStatus(trip) {
    if (trip.status === 'completed') return 'Completed';
    if (trip.status === 'ongoing') return 'Ongoing';
    if (trip.status === 'requested') return 'Requested';
    if (trip.status === 'planning') return 'Upcoming';
    if (trip.status === 'cancelled') return 'Cancelled';
    return trip.status || 'Planned';
}

export function scheduleOwnerLabel(owner) {
    return owner === 'guide' ? 'Tour Guide' : owner === 'vendor' ? 'Vendor' : 'Member';
}

export function scheduleStatusText(status) {
    if (status === 'in-progress') return 'In Progress';
    if (status === 'completed') return 'Completed';
    return 'Upcoming';
}

/**
 * Image paths stored in the workflow state use the original page-relative form
 * (../../images/x.png). In the SPA every image lives in /public/images.
 */
export function assetUrl(path) {
    if (!path) return '/images/maldives_package.png';
    const str = String(path);
    if (/^(https?:|data:|blob:)/i.test(str)) return str;
    if (str.startsWith('/uploads/')) return fileUrl(str);
    const match = str.match(/(?:\.\.\/)*images\/(.+)$/);
    if (match) return `/images/${match[1]}`;
    return str;
}

export function downloadBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

export function toCsv(lines) {
    return lines.map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function safeJson(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        return value === null || value === undefined ? fallback : value;
    } catch {
        return fallback;
    }
}

export function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
