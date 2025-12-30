'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';

interface Attachment {
    id: string;
    originalName: string;
    filePath: string;
    mimeType: string;
    size: number;
    createdAt: string;
    uploadedBy: { id: string; name: string };
}

interface AttachmentSectionProps {
    entityType: string;
    entityId: string;
}

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('csv')) return '📊';
    return '📎';
};

export default function AttachmentSection({ entityType, entityId }: AttachmentSectionProps) {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAttachments = async () => {
        try {
            const res = await fetch(`/api/attachments?entityType=${entityType}&entityId=${entityId}`);
            if (!res.ok) throw new Error('取得に失敗しました');
            const data = await res.json();
            setAttachments(data.attachments || []);
        } catch {
            setError('添付ファイルの取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAttachments();
    }, [entityType, entityId]);

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('entityType', entityType);
            formData.append('entityId', entityId);

            const res = await fetch('/api/attachments', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'アップロードに失敗しました');
            }

            fetchAttachments();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${name} を削除しますか？`)) return;

        try {
            const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('削除に失敗しました');
            fetchAttachments();
        } catch {
            setError('削除に失敗しました');
        }
    };

    return (
        <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <div className="card-header">
                <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>📎 添付ファイル</h4>
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-sm btn-outline"
                        disabled={isUploading}
                    >
                        {isUploading ? 'アップロード中...' : '➕ ファイル追加'}
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error" style={{ margin: 'var(--space-3)' }}>{error}</div>}

            <div style={{ padding: 'var(--space-4)' }}>
                {isLoading ? (
                    <div style={{ color: 'var(--color-neutral-500)' }}>読み込み中...</div>
                ) : attachments.length === 0 ? (
                    <div style={{ color: 'var(--color-neutral-500)', textAlign: 'center', padding: 'var(--space-4)' }}>
                        添付ファイルはありません
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {attachments.map((att) => (
                            <div
                                key={att.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    padding: 'var(--space-2) var(--space-3)',
                                    backgroundColor: 'var(--color-neutral-50)',
                                    borderRadius: 'var(--radius-md)',
                                }}
                            >
                                <span style={{ fontSize: '1.5em' }}>{getFileIcon(att.mimeType)}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <a
                                        href={att.filePath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontWeight: 'var(--font-weight-medium)', wordBreak: 'break-all' }}
                                    >
                                        {att.originalName}
                                    </a>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>
                                        {formatFileSize(att.size)} • {att.uploadedBy.name} • {new Date(att.createdAt).toLocaleDateString('ja-JP')}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(att.id, att.originalName)}
                                    className="btn btn-sm btn-ghost"
                                    style={{ color: 'var(--color-error-600)' }}
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
