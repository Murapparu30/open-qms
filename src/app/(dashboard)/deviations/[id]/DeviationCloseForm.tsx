'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface DeviationCloseFormProps {
    deviationId: string;
    hasContainment: boolean;
    hasRootCause: boolean;
    allCapasClosed: boolean;
}

export default function DeviationCloseForm({
    deviationId,
    hasContainment,
    hasRootCause,
    allCapasClosed,
}: DeviationCloseFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [closeReason, setCloseReason] = useState('');
    const [verificationResult, setVerificationResult] = useState('');
    const [forceClose, setForceClose] = useState(false);

    const conditions = [
        { key: 'containment', label: '暫定処置が入力されている', met: hasContainment },
        { key: 'rootCause', label: '原因が特定されている', met: hasRootCause },
        { key: 'capas', label: '全CAPAがクローズされている', met: allCapasClosed },
        { key: 'verification', label: '有効性確認が入力されている', met: !!verificationResult },
    ];

    const allConditionsMet = conditions.every(c => c.met);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`/api/deviations/${deviationId}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    closeReason,
                    verificationResult,
                    forceClose,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'クローズに失敗しました');
            }

            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'クローズに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">✓ 逸脱クローズ</h3>
            </div>
            <div className="card-body">
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                            {error}
                        </div>
                    )}

                    {/* Close conditions checklist */}
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <label className="form-label">クローズ条件</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                            {conditions.map((condition) => (
                                <div
                                    key={condition.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-3)',
                                        padding: 'var(--space-2) var(--space-3)',
                                        borderRadius: 'var(--radius-lg)',
                                        backgroundColor: condition.met ? 'var(--color-success-50)' : 'var(--color-error-50)',
                                        border: `1px solid ${condition.met ? 'var(--color-success-200)' : 'var(--color-error-200)'}`,
                                    }}
                                >
                                    <span style={{ color: condition.met ? 'var(--color-success-600)' : 'var(--color-error-600)' }}>
                                        {condition.met ? '✓' : '✗'}
                                    </span>
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>{condition.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {!allConditionsMet && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={forceClose}
                                onChange={(e) => setForceClose(e.target.checked)}
                                style={{ width: 20, height: 20 }}
                            />
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-warning-600)' }}>
                                ⚠️ 条件未達でも強制クローズする
                            </span>
                        </label>
                    )}

                    <div className="form-group">
                        <label htmlFor="verificationResult" className="form-label">
                            有効性確認結果
                        </label>
                        <textarea
                            id="verificationResult"
                            className="form-textarea"
                            rows={3}
                            value={verificationResult}
                            onChange={(e) => setVerificationResult(e.target.value)}
                            placeholder="是正・予防処置の有効性確認結果を入力"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="closeReason" className="form-label required">
                            クローズ理由
                        </label>
                        <textarea
                            id="closeReason"
                            className="form-textarea"
                            rows={3}
                            value={closeReason}
                            onChange={(e) => setCloseReason(e.target.value)}
                            placeholder="クローズする理由を入力（必須）"
                            required
                            style={{ width: '100%' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-success btn-lg"
                        disabled={isLoading || (!allConditionsMet && !forceClose)}
                        style={{ width: '100%', marginTop: 'var(--space-4)' }}
                    >
                        {isLoading ? '処理中...' : '✓ 逸脱をクローズ'}
                    </button>
                </form>
            </div>
        </div>
    );
}
