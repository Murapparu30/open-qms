'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChangeApprovalFormProps {
    changeId: string;
    action: 'submit' | 'approve' | 'implement';
}

export default function ChangeApprovalForm({ changeId, action }: ChangeApprovalFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [comment, setComment] = useState('');
    const [decision, setDecision] = useState('APPROVED');

    const handleSubmit = async () => {
        setError('');
        setIsLoading(true);

        try {
            if (action === 'submit') {
                // 承認待ちに変更
                const res = await fetch(`/api/changes/${changeId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'PENDING' }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || '申請に失敗しました');
                }
            } else if (action === 'approve') {
                // 承認/却下
                const res = await fetch(`/api/changes/${changeId}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ decision, comment }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || '承認処理に失敗しました');
                }
            } else if (action === 'implement') {
                // 実施完了
                const res = await fetch(`/api/changes/${changeId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'IMPLEMENTED' }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || '実施完了に失敗しました');
                }
            }

            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    if (action === 'submit') {
        return (
            <div>
                {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}
                <button
                    onClick={handleSubmit}
                    className="btn btn-primary btn-lg"
                    disabled={isLoading}
                    style={{ width: '100%' }}
                >
                    {isLoading ? '申請中...' : '📤 承認申請'}
                </button>
            </div>
        );
    }

    if (action === 'approve') {
        return (
            <div>
                {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

                <div className="form-group">
                    <label className="form-label">判定</label>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="decision"
                                value="APPROVED"
                                checked={decision === 'APPROVED'}
                                onChange={(e) => setDecision(e.target.value)}
                                style={{ width: 20, height: 20 }}
                            />
                            <span style={{ color: 'var(--color-success-600)' }}>✅ 承認</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="decision"
                                value="REJECTED"
                                checked={decision === 'REJECTED'}
                                onChange={(e) => setDecision(e.target.value)}
                                style={{ width: 20, height: 20 }}
                            />
                            <span style={{ color: 'var(--color-error-600)' }}>❌ 却下</span>
                        </label>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="comment" className="form-label">コメント</label>
                    <textarea
                        id="comment"
                        className="form-textarea"
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="承認/却下の理由"
                        style={{ width: '100%' }}
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    className={`btn btn-lg ${decision === 'APPROVED' ? 'btn-success' : 'btn-error'}`}
                    disabled={isLoading}
                    style={{ width: '100%' }}
                >
                    {isLoading ? '処理中...' : decision === 'APPROVED' ? '✅ 承認' : '❌ 却下'}
                </button>
            </div>
        );
    }

    if (action === 'implement') {
        return (
            <div>
                {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}
                <button
                    onClick={handleSubmit}
                    className="btn btn-primary btn-lg"
                    disabled={isLoading}
                    style={{ width: '100%' }}
                >
                    {isLoading ? '処理中...' : '✓ 実施完了'}
                </button>
            </div>
        );
    }

    return null;
}
