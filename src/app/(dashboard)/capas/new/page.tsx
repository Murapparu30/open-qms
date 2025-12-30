'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import DashboardLayout from '@/components/common/DashboardLayout';

interface User {
    id: string;
    name: string;
}

interface Deviation {
    id: string;
    deviationNumber: string;
    description: string;
}

interface Complaint {
    id: string;
    complaintNumber: string;
    source: string;
}

const typeOptions = [
    { value: 'CORRECTIVE', label: '是正措置' },
    { value: 'PREVENTIVE', label: '予防措置' },
];

const sourceTypeOptions = [
    { value: 'DEVIATION', label: '逸脱' },
    { value: 'COMPLAINT', label: '苦情' },
    { value: 'AUDIT', label: '監査' },
    { value: 'TREND', label: 'トレンド分析' },
];

function NewCapaForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [deviations, setDeviations] = useState<Deviation[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [sourceType, setSourceType] = useState(searchParams.get('sourceType') || 'DEVIATION');

    useEffect(() => {
        // ユーザー一覧を取得
        fetch('/api/users/assignees')
            .then((res) => res.json())
            .then((data) => setUsers(data.users || []))
            .catch(() => { });

        // 逸脱一覧を取得
        fetch('/api/deviations?limit=100')
            .then((res) => res.json())
            .then((data) => setDeviations(data.deviations || []))
            .catch(() => { });

        // 苦情一覧を取得
        fetch('/api/complaints?limit=100')
            .then((res) => res.json())
            .then((data) => setComplaints(data.complaints || []))
            .catch(() => { });
    }, []);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            sourceType: formData.get('sourceType'),
            sourceId: formData.get('sourceId') || null,
            type: formData.get('type'),
            description: formData.get('description'),
            assigneeId: formData.get('assigneeId'),
            dueDate: formData.get('dueDate'),
            verificationMethod: formData.get('verificationMethod') || null,
            verificationPeriod: formData.get('verificationPeriod') || null,
        };

        try {
            const res = await fetch('/api/capas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'CAPA作成に失敗しました');
            }

            router.push(`/capas/${result.capa.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'CAPA作成に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
                <div className="card-header">
                    <h3 className="card-title">➕ CAPA作成</h3>
                </div>
                <div className="card-body">
                    <Link href="/capas" style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                        ← CAPA一覧に戻る
                    </Link>

                    <form onSubmit={handleSubmit} style={{ marginTop: 'var(--space-6)' }}>
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label htmlFor="sourceType" className="form-label required">起因タイプ</label>
                                <select
                                    id="sourceType"
                                    name="sourceType"
                                    className="form-select"
                                    required
                                    value={sourceType}
                                    onChange={(e) => setSourceType(e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    {sourceTypeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="type" className="form-label required">種別</label>
                                <select id="type" name="type" className="form-select" required style={{ width: '100%' }}>
                                    {typeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {sourceType === 'DEVIATION' && (
                            <div className="form-group">
                                <label htmlFor="sourceId" className="form-label">起因元（逸脱）</label>
                                <select id="sourceId" name="sourceId" className="form-select" style={{ width: '100%' }}>
                                    <option value="">選択してください</option>
                                    {deviations.map((d) => (
                                        <option key={d.id} value={d.id}>{d.deviationNumber}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {sourceType === 'COMPLAINT' && (
                            <div className="form-group">
                                <label htmlFor="sourceId" className="form-label">起因元（苦情）</label>
                                <select id="sourceId" name="sourceId" className="form-select" style={{ width: '100%' }}>
                                    <option value="">選択してください</option>
                                    {complaints.map((c) => (
                                        <option key={c.id} value={c.id}>{c.complaintNumber}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="description" className="form-label required">内容</label>
                            <textarea
                                id="description"
                                name="description"
                                className="form-textarea"
                                rows={4}
                                placeholder="是正・予防措置の内容"
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label htmlFor="assigneeId" className="form-label required">担当者</label>
                                <select id="assigneeId" name="assigneeId" className="form-select" required style={{ width: '100%' }}>
                                    <option value="">選択してください</option>
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="dueDate" className="form-label required">期限</label>
                                <input
                                    type="date"
                                    id="dueDate"
                                    name="dueDate"
                                    className="form-input"
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="verificationMethod" className="form-label">有効性確認方法</label>
                            <input
                                type="text"
                                id="verificationMethod"
                                name="verificationMethod"
                                className="form-input"
                                placeholder="再発有無の確認、監査、トレンド分析など"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="verificationPeriod" className="form-label">有効性確認期間</label>
                            <input
                                type="text"
                                id="verificationPeriod"
                                name="verificationPeriod"
                                className="form-input"
                                placeholder="例：3ヶ月"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                            <button
                                type="submit"
                                className="btn btn-primary btn-lg"
                                disabled={isLoading}
                                style={{ flex: 1 }}
                            >
                                {isLoading ? '作成中...' : '✓ 作成'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function NewCapaPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewCapaForm />
        </Suspense>
    );
}
