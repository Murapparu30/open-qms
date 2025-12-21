'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/common/DashboardLayout';

interface Lot {
    id: string;
    lotNumber: string;
    productName: string;
}

const typeOptions = [
    { value: 'CUSTOMER', label: '👤 顧客苦情' },
    { value: 'INTERNAL', label: '🏭 社内発見' },
    { value: 'EXTERNAL', label: '🏢 外部機関' },
];

const severityOptions = [
    { value: 'LOW', label: '軽微' },
    { value: 'MEDIUM', label: '中程度' },
    { value: 'HIGH', label: '重大' },
    { value: 'CRITICAL', label: '致命的' },
];

export default function NewComplaintPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [lots, setLots] = useState<Lot[]>([]);

    useEffect(() => {
        // ロット一覧を取得
        fetch('/api/lots?limit=100')
            .then((res) => res.json())
            .then((data) => setLots(data.lots || []))
            .catch(() => { });
    }, []);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            type: formData.get('type'),
            source: formData.get('source'),
            description: formData.get('description'),
            severity: formData.get('severity'),
            lotId: formData.get('lotId') || null,
            receivedAt: formData.get('receivedAt') || null,
            responseDeadline: formData.get('responseDeadline') || null,
        };

        try {
            const res = await fetch('/api/complaints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || '苦情登録に失敗しました');
            }

            router.push(`/complaints/${result.complaint.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '苦情登録に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
                <div className="card-header">
                    <h3 className="card-title">➕ 苦情登録</h3>
                </div>
                <div className="card-body">
                    <Link href="/complaints" style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                        ← 苦情一覧に戻る
                    </Link>

                    <form onSubmit={handleSubmit} style={{ marginTop: 'var(--space-6)' }}>
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label htmlFor="type" className="form-label required">種別</label>
                                <select id="type" name="type" className="form-select" required style={{ width: '100%' }}>
                                    <option value="">選択してください</option>
                                    {typeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="severity" className="form-label required">重大度</label>
                                <select id="severity" name="severity" className="form-select" required style={{ width: '100%' }}>
                                    <option value="">選択してください</option>
                                    {severityOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="source" className="form-label required">報告元</label>
                            <input
                                type="text"
                                id="source"
                                name="source"
                                className="form-input"
                                placeholder="顧客名、部署名など"
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description" className="form-label required">内容</label>
                            <textarea
                                id="description"
                                name="description"
                                className="form-textarea"
                                rows={5}
                                placeholder="苦情の詳細内容"
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="lotId" className="form-label">関連ロット</label>
                            <select id="lotId" name="lotId" className="form-select" style={{ width: '100%' }}>
                                <option value="">なし</option>
                                {lots.map((lot) => (
                                    <option key={lot.id} value={lot.id}>
                                        {lot.lotNumber} - {lot.productName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label htmlFor="receivedAt" className="form-label">受付日</label>
                                <input
                                    type="date"
                                    id="receivedAt"
                                    name="receivedAt"
                                    className="form-input"
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="responseDeadline" className="form-label">回答期限</label>
                                <input
                                    type="date"
                                    id="responseDeadline"
                                    name="responseDeadline"
                                    className="form-input"
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                            <button
                                type="submit"
                                className="btn btn-primary btn-lg"
                                disabled={isLoading}
                                style={{ flex: 1 }}
                            >
                                {isLoading ? '登録中...' : '✓ 登録'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
