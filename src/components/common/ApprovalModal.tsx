import React, { useState } from 'react';

interface ApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string, data?: any) => Promise<void>;
    title: string;
    confirmLabel?: string;
    requireComment?: boolean;
    children?: React.ReactNode; // For extra fields like "Publish immediately"
    isDangerous?: boolean; // For "Reject" actions, styling them red
}

export default function ApprovalModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    confirmLabel = '承認',
    requireComment = false,
    children,
    isDangerous = false,
}: ApprovalModalProps) {
    const [password, setPassword] = useState('');
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!password) {
            setError('パスワードを入力してください');
            return;
        }

        if (requireComment && !comment.trim()) {
            setError('コメントを入力してください');
            return;
        }

        setIsLoading(true);
        try {
            await onConfirm(password, { comment });
            onClose();
            setPassword('');
            setComment('');
        } catch (err: any) {
            setError(err.message || '処理に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: 'var(--space-6)',
                borderRadius: 'var(--radius-lg)',
                width: 400,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
                <h4 style={{ marginBottom: 'var(--space-4)', fontSize: '1.25rem', fontWeight: 600 }}>{title}</h4>

                <form onSubmit={handleSubmit}>
                    {children}

                    {requireComment && (
                        <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                            <label className="form-label required">コメント / 理由</label>
                            <textarea
                                className="form-textarea"
                                rows={3}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                    )}

                    <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                        <label className="form-label required">パスワード (署名)</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="ログインパスワード"
                            style={{ width: '100%' }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', marginTop: 'var(--space-1)' }}>
                            電子署名としてパスワードを入力してください
                        </p>
                    </div>

                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className={`btn ${isDangerous ? 'btn-danger' : 'btn-success'}`}
                            disabled={isLoading}
                        >
                            {isLoading ? '処理中...' : confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
