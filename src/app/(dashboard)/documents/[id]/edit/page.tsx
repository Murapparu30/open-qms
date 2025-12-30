'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/common/DashboardLayout';

interface Document {
    id: string;
    documentNumber: string;
    title: string;
    category: string;
    description: string | null;
    status: string;
    currentVersion: number;
    effectiveDate: string | null;
    expiresAt: string | null;
    reviewDueDate: string | null;
    versions: Array<{
        version: number;
        content: string;
    }>;
}

const categoryOptions = [
    { value: 'SOP', label: '標準作業手順書 (SOP)' },
    { value: 'WI', label: '作業指図書 (WI)' },
    { value: 'SPEC', label: '規格書' },
    { value: 'POLICY', label: '方針' },
    { value: 'FORM', label: '様式' },
    { value: 'OTHER', label: 'その他' },
];

export default function EditDocumentPage() {
    const { id } = useParams();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [originalDocument, setOriginalDocument] = useState<Document | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        description: '',
        content: '',
        changeReason: '',
        effectiveDate: '',
        expiresAt: '',
        reviewDueDate: '',
    });

    useEffect(() => {
        if (id) {
            fetchDocument();
        }
    }, [id]);

    const fetchDocument = async () => {
        try {
            const res = await fetch(`/api/documents/${id}`);
            const data = await res.json();
            if (res.ok && data.document) {
                const doc = data.document;
                const currentContent = doc.versions.find((v: { version: number }) => v.version === doc.currentVersion)?.content || '';
                setOriginalDocument(doc);
                setFormData({
                    title: doc.title,
                    category: doc.category,
                    description: doc.description || '',
                    content: currentContent,
                    changeReason: '',
                    effectiveDate: doc.effectiveDate ? doc.effectiveDate.split('T')[0] : '',
                    expiresAt: doc.expiresAt ? doc.expiresAt.split('T')[0] : '',
                    reviewDueDate: doc.reviewDueDate ? doc.reviewDueDate.split('T')[0] : '',
                });
            }
        } catch (error) {
            console.error('Failed to fetch document:', error);
            setError('文書の読み込みに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.changeReason.trim()) {
            setError('改訂理由は必須です');
            return;
        }
        setError('');
        setIsSaving(true);

        try {
            const res = await fetch(`/api/documents/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || '文書更新に失敗しました');
            }

            router.push(`/documents/${id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '文書更新に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="card"><div className="card-body">読み込み中...</div></div>
            </DashboardLayout>
        );
    }

    if (!originalDocument) {
        return (
            <DashboardLayout>
                <div className="card"><div className="card-body">文書が見つかりません</div></div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
                <div className="card-header">
                    <h3 className="card-title">✏️ 文書編集 - {originalDocument.documentNumber}</h3>
                    <p style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                        現在版: v{originalDocument.currentVersion} → v{originalDocument.currentVersion + 1}
                    </p>
                </div>
                <div className="card-body">
                    <Link href={`/documents/${id}`} style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                        ← 詳細に戻る
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
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="changeReason" className="form-label required">改訂理由</label>
                            <input
                                type="text"
                                id="changeReason"
                                className="form-input"
                                value={formData.changeReason}
                                onChange={(e) => setFormData({ ...formData, changeReason: e.target.value })}
                                placeholder="例: 手順3.2の内容を詳細化"
                                required
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
                                disabled={isSaving}
                                style={{ flex: 1 }}
                            >
                                {isSaving ? '保存中...' : '✓ 保存（新版作成）'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
