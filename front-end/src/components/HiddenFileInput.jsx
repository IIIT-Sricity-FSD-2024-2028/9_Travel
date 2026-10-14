import { createPortal } from 'react-dom';

/**
 * Hidden file picker rendered into <body> so it never becomes a sibling of the page markup
 * (the original stylesheets rely on :first-child / :last-child structure).
 */
export default function HiddenFileInput({ inputRef, onChange, accept = 'image/*' }) {
    return createPortal(
        <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={onChange} aria-hidden="true" tabIndex={-1} />,
        document.body,
    );
}
