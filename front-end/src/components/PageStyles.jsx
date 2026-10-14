import { createPortal } from 'react-dom';
import PAGE_STYLES from '../styles/manifest';

// Every original stylesheet is bundled as a string (Vite `?inline`) so that a page can
// mount exactly the CSS files the original HTML page linked – no global leakage between
// pages that were designed with different (sometimes conflicting) stylesheets.
const SHEETS = {
    ...import.meta.glob('../styles/*.css', { query: '?inline', import: 'default', eager: true }),
    ...import.meta.glob('../styles/pages/*.css', { query: '?inline', import: 'default', eager: true }),
};

function sheetCss(name) {
    return SHEETS[`../styles/${name}.css`] || '';
}

/**
 * Injects the stylesheets of the original page `page` (e.g. "traveler__traveler_dashboard")
 * into <head>, in the original cascade order. Unmounting removes them again.
 */
export default function PageStyles({ page }) {
    const sheets = PAGE_STYLES[page] || [];
    return createPortal(
        sheets.map((name, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <style key={`${name}-${index}`} data-page-style={name}>{sheetCss(name)}</style>
        )),
        document.head,
    );
}
