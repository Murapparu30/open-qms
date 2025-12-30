'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/common/DashboardLayout';

interface Document {
    id: string;
    documentNumber: string;
    title: string;
    category: string;
    status: string;
    currentVersion: number;
    createdBy: { name: string };
    updatedAt: string;
}

const categoryLabels: Record<string, string> = {
    SOP: '標準作業手順書',
    WI: '作業指図書',
    SPEC: '規格書',
    POLICY: '方針',
    FORM: '様式',
    OTHER: 'その他',
};

const statusLabels: Record<string, string> = {
    DRAFT: '下書き',
    IN_REVIEW: 'レビュー中',
    APPROVED: '承認済み',
    PUBLISHED: '発行済み',
    OBSOLETE: '廃止',
};

const statusColors: Record<string, string> = {
    DRAFT: 'var(--color-neutral-500)',
    IN_REVIEW: 'var(--color-warning)',
    APPROVED: 'var(--color-info)',
    PUBLISHED: 'var(--color-success)',
    OBSOLETE: 'var(--color-neutral-400)',
};

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', category: '', search: '' });

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter.status) params.set('status', filter.status);
            if (filter.category) params.set('category', filter.category);
            if (filter.search) params.set('search', filter.search);

            const res = await fetch(`/api/documents?${params.toString()}`);
            const data = await res.json();
            setDocuments(data.documents || []);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setIsLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title">📄 文書管理</h3>
                    <Link href="/documents/new" className="btn btn-primary">
                        ➕ 新規作成
                    </Link>
                </div>
                <div className="card-body">
                    {/* フィルター */}
                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                        <select
                            className="form-select"
                            value={filter.status}
                            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                            style={{ width: 150 }}
                        >
                            <option value="">全ステータス</option>
                            {Object.entries(statusLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <select
                            className="form-select"
                            value={filter.category}
                            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                            style={{ width: 180 }}
                        >
                            <option value="">全カテゴリ</option>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="検索..."
                            value={filter.search}
                            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                            style={{ width: 200 }}
                        />
                    </div>

                    {/* テーブル */}
                    {isLoading ? (
                        <p>読み込み中...</p>
                    ) : documents.length === 0 ? (
                        <p style={{ color: 'var(--color-neutral-500)' }}>文書がありません</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>文書番号</th>
                                        <th>タイトル</th>
                                        <th>カテゴリ</th>
                                        <th>ステータス</th>
                                        <th>版</th>
                                        <th>作成者</th>
                                        <th>更新日</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((doc) => (
                                        <tr key={doc.id}>
                                            <td>
                                                <Link href={`/documents/${doc.id}`} style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                                                    {doc.documentNumber}
                                                </Link>
                                            </td>
                                            <td>{doc.title}</td>
                                            <td>{categoryLabels[doc.category] || doc.category}</td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: `${statusColors[doc.status]}20`,
                                                    color: statusColors[doc.status],
                                                    fontSize: 'var(--font-size-sm)',
                                                }}>
                                                    {statusLabels[doc.status] || doc.status}
                                                </span>
                                            </td>
                                            <td>v{doc.currentVersion}</td>
                                            <td>{doc.createdBy.name}</td>
                                            <td>{new Date(doc.updatedAt).toLocaleDateString('ja-JP')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
