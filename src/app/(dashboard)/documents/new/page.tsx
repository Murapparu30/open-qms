'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/common/DashboardLayout';

const categoryOptions = [
    { value: 'SOP', label: '標準作業手順書 (SOP)' },
    { value: 'WI', label: '作業指図書 (WI)' },
    { value: 'SPEC', label: '規格書' },
    { value: 'POLICY', label: '方針' },
    { value: 'FORM', label: '様式' },
    { value: 'OTHER', label: 'その他' },
];

export default function NewDocumentPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        category: 'SOP',
        description: '',
        content: '',
        effectiveDate: '',
        expiresAt: '',
        reviewDueDate: '',
    });

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || '文書作成に失敗しました');
            }

            router.push(`/documents/${result.document.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '文書作成に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
                <div className="card-header">
                    <h3 className="card-title">📄 新規文書作成</h3>
                </div>
                <div className="card-body">
                    <Link href="/documents" style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                        ← 文書一覧に戻る
                    </Link>

                    <form onSubmit={handleSubmit} style={{ marginTop: 'var(--space-6)' }}>
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label htmlFor="title" className="form-label required">タイトル</label>
                                <input
                                    type="text"
                                    id="title"
                                    className="form-input"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="例: 製造エリア清掃手順書"
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="category" className="form-label required">カテゴリ</label>
                                <select
                                    id="category"
                                    className="form-select"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                    style={{ width: '100%' }}
                                >
                                    {categoryOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="description" className="form-label">説明</label>
                            <input
                                type="text"
                                id="description"
                                className="form-input"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="文書の概要・目的"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="content" className="form-label required">内容（Markdown対応）</label>
                            <textarea
                                id="content"
                                className="form-textarea"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                rows={15}
                                placeholder="# 目的&#10;&#10;## 適用範囲&#10;&#10;## 手順&#10;1. ..."
                                required
                                style={{ width: '100%', fontFamily: 'monospace' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label htmlFor="effectiveDate" className="form-label">発効日</label>
                                <input
                                    type="date"
                                    id="effectiveDate"
                                    className="form-input"
                                    value={formData.effectiveDate}
                                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="expiresAt" className="form-label">有効期限</label>
                                <input
                                    type="date"
                                    id="expiresAt"
                                    className="form-input"
                                    value={formData.expiresAt}
                                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="reviewDueDate" className="form-label">次回見直し日</label>
                                <input
                                    type="date"
                                    id="reviewDueDate"
                                    className="form-input"
                                    value={formData.reviewDueDate}
                                    onChange={(e) => setFormData({ ...formData, reviewDueDate: e.target.value })}
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
                                {isLoading ? '作成中...' : '✓ 下書き保存'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
