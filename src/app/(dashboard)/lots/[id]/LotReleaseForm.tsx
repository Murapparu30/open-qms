'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface LotReleaseFormProps {
    lotId: string;
    hasOpenDeviations: boolean;
}

const releaseChecklist = [
    { id: 'inspection', label: '検査成績書が添付されている' },
    { id: 'deviations', label: '逸脱がない、または全て対処済み' },
    { id: 'changes', label: '変更が適用済み（該当する場合）' },
    { id: 'documents', label: '必要書類が全て揃っている' },
];

export default function LotReleaseForm({ lotId, hasOpenDeviations }: LotReleaseFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'CONDITIONAL'>('APPROVED');
    const [comment, setComment] = useState('');
    const [checklist, setChecklist] = useState<Record<string, boolean>>({
        inspection: false,
        deviations: false,
        changes: false,
        documents: false,
    });

    const allChecked = Object.values(checklist).every(Boolean);

    const handleCheckChange = (id: string) => {
        setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (decision === 'APPROVED' && !allChecked) {
            setError('承認するには全てのチェック項目を確認してください');
            return;
        }

        if (decision !== 'APPROVED' && !comment) {
            setError('条件付き承認または却下の場合はコメントが必須です');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`/api/lots/${lotId}/release`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision,
                    comment,
                    evidence: checklist,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '出荷判定に失敗しました');
            }

            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : '出荷判定に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">出荷判定</h3>
            </div>
            <div className="card-body">
                {hasOpenDeviations && (
                    <div className="alert alert-warning" style={{ marginBottom: 'var(--space-4)' }}>
                        ⚠️ このロットには未クローズの逸脱があります
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                            {error}
                        </div>
                    )}

                    {/* Checklist */}
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <label className="form-label">判定根拠チェックリスト</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                            {releaseChecklist.map((item) => (
                                <label
                                    key={item.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-3)',
                                        padding: 'var(--space-3)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '1px solid var(--color-neutral-200)',
                                        cursor: 'pointer',
                                        backgroundColor: checklist[item.id] ? 'var(--color-success-50)' : 'white',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checklist[item.id]}
                                        onChange={() => handleCheckChange(item.id)}
                                        style={{ width: 20, height: 20 }}
                                    />
                                    <span>{item.label}</span>
                                    {checklist[item.id] && <span style={{ marginLeft: 'auto', color: 'var(--color-success-600)' }}>✓</span>}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Decision */}
                    <div className="form-group">
                        <label className="form-label required">判定</label>
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button
                                type="button"
                                className={`btn ${decision === 'APPROVED' ? 'btn-success' : 'btn-outline'}`}
                                onClick={() => setDecision('APPROVED')}
                                style={{ flex: 1 }}
                            >
                                ✓ 承認
                            </button>
                            <button
                                type="button"
                                className={`btn ${decision === 'CONDITIONAL' ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setDecision('CONDITIONAL')}
                                style={{ flex: 1 }}
                            >
                                条件付き
                            </button>
                            <button
                                type="button"
                                className={`btn ${decision === 'REJECTED' ? 'btn-danger' : 'btn-outline'}`}
                                onClick={() => setDecision('REJECTED')}
                                style={{ flex: 1 }}
                            >
                                ✕ 却下
                            </button>
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="form-group">
                        <label htmlFor="comment" className={`form-label ${decision !== 'APPROVED' ? 'required' : ''}`}>
                            コメント
                        </label>
                        <textarea
                            id="comment"
                            className="form-textarea"
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={decision !== 'APPROVED' ? '判定理由を入力してください（必須）' : '任意のコメント'}
                            required={decision !== 'APPROVED'}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className={`btn ${decision === 'APPROVED' ? 'btn-success' : decision === 'REJECTED' ? 'btn-danger' : 'btn-primary'} btn-lg`}
                        disabled={isLoading || (decision === 'APPROVED' && !allChecked)}
                        style={{ width: '100%', marginTop: 'var(--space-4)' }}
                    >
                        {isLoading ? '処理中...' : `出荷判定を確定（${decision === 'APPROVED' ? '承認' : decision === 'REJECTED' ? '却下' : '条件付き承認'}）`}
                    </button>
                </form>
            </div>
        </div>
    );
}
