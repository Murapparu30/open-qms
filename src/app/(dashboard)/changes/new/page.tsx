'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/common/DashboardLayout';

const typeOptions = [
    { value: 'EQUIPMENT', label: '🔧 設備変更' },
    { value: 'PROCESS', label: '⚙️ 工程変更' },
    { value: 'DOCUMENT', label: '📄 文書変更' },
    { value: 'MATERIAL', label: '📦 材料変更' },
    { value: 'OTHER', label: '📋 その他' },
];

const priorityOptions = [
    { value: 'LOW', label: '低' },
    { value: 'MEDIUM', label: '中' },
    { value: 'HIGH', label: '高' },
    { value: 'CRITICAL', label: '緊急' },
];

export default function NewChangePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            type: formData.get('type'),
            title: formData.get('title'),
            description: formData.get('description'),
            priority: formData.get('priority'),
            affectedArea: formData.get('affectedArea'),
            targetDate: formData.get('targetDate') || null,
        };

        try {
            const res = await fetch('/api/changes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || '変更起票に失敗しました');
            }

            router.push(`/changes/${result.change.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '変更起票に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
                <div className="card-header">
                    <h3 className="card-title">➕ 変更起票</h3>
                </div>
                <div className="card-body">
                    <Link href="/changes" style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                        ← 変更一覧に戻る
                    </Link>

                    <form onSubmit={handleSubmit} style={{ marginTop: 'var(--space-6)' }}>
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="type" className="form-label required">変更種別</label>
                            <select id="type" name="type" className="form-select" required style={{ width: '100%' }}>
                                <option value="">選択してください</option>
                                {typeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="title" className="form-label required">タイトル</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                className="form-input"
                                placeholder="変更の概要"
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description" className="form-label required">変更内容</label>
                            <textarea
                                id="description"
                                name="description"
                                className="form-textarea"
                                rows={5}
                                placeholder="変更の詳細、理由、影響範囲などを記載"
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label htmlFor="priority" className="form-label">優先度</label>
                                <select id="priority" name="priority" className="form-select" defaultValue="MEDIUM" style={{ width: '100%' }}>
                                    {priorityOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="targetDate" className="form-label">目標完了日</label>
                                <input
                                    type="date"
                                    id="targetDate"
                                    name="targetDate"
                                    className="form-input"
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="affectedArea" className="form-label">影響範囲</label>
                            <input
                                type="text"
                                id="affectedArea"
                                name="affectedArea"
                                className="form-input"
                                placeholder="影響を受けるエリア/工程/製品"
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
                                {isLoading ? '起票中...' : '✓ 下書き保存'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
