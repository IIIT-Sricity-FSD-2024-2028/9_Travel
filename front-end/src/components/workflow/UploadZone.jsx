import { useRef, useState } from 'react';
import Icon from '../icons/Icon';
import { fileUrl, uploadApi } from '../../services/api';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = /\.(jpg|jpeg|png|gif|webp|svg|bmp|heic|heif|tiff)$/i;

/**
 * Photo / screenshot attachment for issue reports.
 * Uses the existing NestJS UploadController: POST /upload (multipart/form-data, field "file").
 * The returned `/uploads/<file>` URL is stored on the issue as `attachmentUrl`.
 */
export default function UploadZone({ value, onChange, style, toast }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState('');
    const [dragOver, setDragOver] = useState(false);

    const handleFile = async (file) => {
        if (!file) return;
        if (!ALLOWED.test(file.name) || (file.type && !file.type.startsWith('image/'))) {
            toast?.('Only image files (SVG, PNG, JPG, GIF, WebP) can be attached.', 'error');
            return;
        }
        if (file.size > MAX_BYTES) {
            toast?.('The selected image is larger than 5MB. Please choose a smaller file.', 'error');
            return;
        }
        setUploading(true);
        setProgress(0);
        try {
            const result = await uploadApi.upload(file, setProgress);
            setFileName(result.originalname || file.name);
            onChange(result.url);
            toast?.('Photo attached successfully!', 'success');
        } catch (error) {
            toast?.(`Upload failed: ${error.message}`, 'error');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const remove = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onChange('');
        setFileName('');
    };

    return (
        <div
            className="upload-zone"
            data-upload-zone
            data-attachment-url={value || undefined}
            role="button"
            tabIndex={0}
            onClick={() => { if (!value && !uploading) inputRef.current?.click(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !value) inputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
            style={{ ...style, cursor: 'pointer', ...(dragOver ? { borderColor: '#0ea5e9' } : {}) }}
        >
            <input ref={inputRef} type="file" className="issue-file-input" accept="image/*,.png,.jpg,.jpeg,.gif,.webp" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
            {value ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, width: '100%' }}>
                    <img src={fileUrl(value)} alt="Attachment Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1', flexShrink: 0 }} />
                    <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || 'Uploaded Photo/Screenshot'}</div>
                        <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}><Icon name="check" /> Attached &amp; Ready</div>
                    </div>
                    <button type="button" className="remove-upload-btn" onClick={remove} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>Remove</button>
                </div>
            ) : (
                <>
                    <div className="upload-icon"><Icon name="uploadcloud" /></div>
                    <div className="upload-text" style={style ? { fontWeight: 600, color: '#334155', marginTop: 6 } : undefined}>
                        {uploading ? 'Uploading photo attachment...' : 'Click to upload or drag and drop'}
                    </div>
                    <div className="upload-sub" style={style ? { fontSize: 12, color: '#64748b' } : undefined}>SVG, PNG, JPG or GIF (max. 5MB)</div>
                    {uploading && <div className="dd-upload-progress">Uploading… {progress}%</div>}
                </>
            )}
        </div>
    );
}
