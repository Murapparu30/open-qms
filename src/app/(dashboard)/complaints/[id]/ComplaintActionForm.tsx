'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ComplaintActionFormProps {
    complaintId: string;
    currentStatus: string;
    currentInvestigation: string;
    currentResponse: string;
}

const statusOptions = [
    { value: 'RECEIVED', label: '受付' },
    { value: 'INVESTIGATING', label: '調査中' },
    { value: 'RESOLVED', label: '対処完了' },
    { value: 'CLOSED', label: 'クローズ' },
];

export default function ComplaintActionForm({
    complaintId,
    currentStatus,
    currentInvestigation,
    currentResponse,
}: ComplaintActionFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState(currentStatus);
    const [investigation, setInvestigation] = useState(currentInvestigation);
    const [response, setResponse] = useState(currentResponse);

    const handleSubmit = async () => {
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`/api/complaints/${complaintId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    investigation,
                    response,
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

            <div className="form-group">
                <label htmlFor="investigation" className="form-label">調査結果</label>
                <textarea
                    id="investigation"
                    className="form-textarea"
                    rows={4}
                    value={investigation}
                    onChange={(e) => setInvestigation(e.target.value)}
                    placeholder="調査内容、原因分析など"
                    style={{ width: '100%' }}
                />
            </div>

            <div className="form-group">
                <label htmlFor="response" className="form-label">顧客回答</label>
                <textarea
                    id="response"
                    className="form-textarea"
                    rows={4}
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="顧客への回答内容"
                    style={{ width: '100%' }}
                />
            </div>

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
