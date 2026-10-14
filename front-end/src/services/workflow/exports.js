/**
 * CSV / PDF report exports for the Super Admin portal (ported from workflow.js
 * and crud_controller.js). Data comes from the live workflow state / users API.
 */
import { acceptedTrips, allActiveTrips, assignableGuides, assignableVendors, tripRevenue, tripStatusCounts, userRoleCounts } from './selectors';
import { downloadBlob, formatMoney, toCsv, tripDisplayStatus } from './utils';

const today = () => new Date().toISOString().slice(0, 10);

function assignedTo(trips, kind, record) {
    return trips.filter((t) => t[kind]?.id === record.id || t[kind]?.name === record.name
        || (t[kind] && String(t[kind].name).toLowerCase() === String(record.name).toLowerCase()));
}

export function exportVendorsCsv(state) {
    const vendors = assignableVendors(state);
    const trips = acceptedTrips(state);
    const lines = [
        ['Vendor ID', 'Vendor Name', 'Service Type', 'Operating Status', 'Rating', 'Location', 'Email Address', 'Phone Number', 'Active Trips Count', 'Assigned Trip IDs'],
        ...vendors.map((vendor) => {
            const assigned = assignedTo(trips, 'vendor', vendor);
            return [
                vendor.id || 'N/A', vendor.name || 'Vendor', vendor.type || 'Travel Services', vendor.status || 'Available',
                Number(vendor.rating || 4.8).toFixed(1), vendor.location || 'Destination Partner',
                vendor.email || `${String(vendor.name).toLowerCase().replace(/\s+/g, '')}@vendor.com`,
                vendor.phone || '+91 98765 43210', assigned.length,
                assigned.map((t) => `#${t.id} (${t.title || 'Trip'})`).join('; ') || 'None',
            ];
        }),
    ];
    downloadBlob(new Blob([toCsv(lines)], { type: 'text/csv;charset=utf-8' }), `dream-destination-vendors-report-${today()}.csv`);
}

export function exportGuidesCsv(state) {
    const guides = assignableGuides(state);
    const trips = acceptedTrips(state);
    const lines = [
        ['Guide ID', 'Guide Name', 'Experience Level', 'Status', 'Rating', 'Languages Spoken', 'Email Address', 'Phone Number', 'Completed Tours', 'Active Tours Count', 'Assigned Trip IDs'],
        ...guides.map((guide) => {
            const assigned = assignedTo(trips, 'guide', guide);
            return [
                guide.id || 'N/A', guide.name || 'Tour Guide', guide.experience || 'Certified Tour Guide', guide.status || 'Available',
                Number(guide.rating || 4.9).toFixed(1), guide.languages || 'English, Regional',
                guide.email || `${String(guide.name).toLowerCase().replace(/\s+/g, '')}@guide.com`,
                guide.phone || '+91 98765 43211', guide.tours || 12, assigned.length,
                assigned.map((t) => `#${t.id} (${t.title || 'Trip'})`).join('; ') || 'None',
            ];
        }),
    ];
    downloadBlob(new Blob([toCsv(lines)], { type: 'text/csv;charset=utf-8' }), `dream-destination-guides-report-${today()}.csv`);
}

export function exportTripsCsv(trips) {
    const lines = [
        ['Trip ID', 'Title', 'Destination', 'Status', 'Traveler', 'Guide', 'Vendor', 'Start Date', 'End Date', 'Budget (INR)', 'Progress'],
        ...(trips || []).map((trip) => [
            trip.id, trip.title, trip.destination, tripDisplayStatus(trip), trip.travelerName || 'N/A',
            trip.guide?.name || 'Unassigned', trip.vendor?.name || 'Unassigned', trip.startDate || 'N/A',
            trip.endDate || 'N/A', trip.budget || 0, `${trip.progress || 0}%`,
        ]),
    ];
    downloadBlob(new Blob([toCsv(lines)], { type: 'text/csv;charset=utf-8' }), `dream-destination-trips-report-${today()}.csv`);
}

export function exportUsersCsv(users) {
    const lines = [
        ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Joined'],
        ...(users || []).map((user) => [user.id, user.name, user.email, user.phone || '', user.role, user.status || 'Active', user.joined]),
    ];
    downloadBlob(new Blob([toCsv(lines)], { type: 'text/csv;charset=utf-8' }), 'dream-destination-users.csv');
}

function pdfEscape(value) {
    return String(value ?? '').replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7E]/g, ' ');
}

function buildSimplePdf(lines) {
    const commands = ['BT', '/F1 18 Tf', '72 760 Td', `(${pdfEscape(lines[0] || 'Dream Destination Report')}) Tj`, '/F1 10 Tf', '0 -26 Td'];
    lines.slice(1).forEach((line) => {
        commands.push(`(${pdfEscape(line).slice(0, 95)}) Tj`, '0 -15 Td');
    });
    commands.push('ET');
    const content = commands.join('\n');
    const objects = [
        '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
        '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
        '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
        `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object) => {
        offsets.push(pdf.length);
        pdf += `${object}\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf], { type: 'application/pdf' });
}

/** downloadSuperuserReportPdf() (effective definition) */
export function downloadSuperuserReportPdf(state) {
    const users = state.users || [];
    const trips = allActiveTrips(state);
    const issues = state.issues || [];
    const lines = [
        'Dream Destination Super Admin Report',
        `Generated: ${new Date().toLocaleString()}`,
        `Total Users: ${users.length}`,
        `Active Users: ${users.filter((user) => (user.status || 'Active') === 'Active').length}`,
        `Inactive Users: ${users.filter((user) => user.status === 'Inactive').length}`,
        `Suspended Users: ${users.filter((user) => user.status === 'Suspended').length}`,
        `Total Trips: ${trips.length}`,
        `Total Revenue: ${formatMoney(tripRevenue(trips))}`,
        `Open Issues: ${issues.filter((issue) => issue.status !== 'Resolved').length}`,
        '',
        'Users By Role:',
        ...Object.entries(userRoleCounts(users)).map(([role, count]) => `${role}: ${count}`),
        '',
        'Trips By Status:',
        ...Object.entries(tripStatusCounts(trips)).map(([status, count]) => `${status}: ${count}`),
    ];
    downloadBlob(buildSimplePdf(lines), `dream-destination-report-${today()}.pdf`);
}
