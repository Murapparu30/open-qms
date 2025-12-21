'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CapaActionFormProps {
    capaId: string;
    currentStatus: string;
}

const statusOptions = [
    { value: 'OPEN', label: 'オープン' },
    { value: 'IN_PROGRESS', label: '進行中' },
    { value: 'VERIFICATION', label: '有効性確認' },
    { value: 'CLOSED', label: 'クローズ' },
];

export default function CapaActionForm({ capaId, currentStatus }: CapaActionFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState(currentStatus);
    const [verificationResult, setVerificationResult] = useState('');

    const handleSubmit = async () => {
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`/api/capas/${capaId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    ...(verificationResult && { verificationResult }),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '更新に失敗しました');
            }

            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

            <div className="form-group">
                <label htmlFor="status" className="form-label">ステータス</label>
                <select
                    id="status"
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ width: '100%' }}
                >
                    {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {(status === 'VERIFICATION' || status === 'CLOSED') && (
                <div className="form-group">
                    <label htmlFor="verificationResult" className="form-label">有効性確認結果</label>
                    <textarea
                        id="verificationResult"
                        className="form-textarea"
                        rows={4}
                        value={verificationResult}
                        onChange={(e) => setVerificationResult(e.target.value)}
                        placeholder="有効性確認の結果を入力"
                        style={{ width: '100%' }}
                    />
                </div>
            )}

            <button
                onClick={handleSubmit}
                className="btn btn-primary btn-lg"
                disabled={isLoading}
                style={{ width: '100%' }}
            >
                {isLoading ? '更新中...' : '✓ 更新'}
            </button>
        </div>
    );
}
