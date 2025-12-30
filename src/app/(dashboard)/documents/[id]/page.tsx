'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/common/DashboardLayout';
import ApprovalModal from '@/components/common/ApprovalModal';

interface User {
    id: string;
    name: string;
}

interface DocumentVersion {
    id: string;
    version: number;
    content: string;
    changeReason: string | null;
    createdBy: { name: string };
    createdAt: string;
}

interface Document {
    id: string;
    documentNumber: string;
    title: string;
    category: string;
    description: string | null;
    status: string;
    currentVersion: number;
    createdBy: User;
    reviewer: User | null;
    approvedBy: User | null;
    approvedAt: string | null;
    publishedAt: string | null;
    effectiveDate: string | null;
    expiresAt: string | null;
    reviewDueDate: string | null;
    createdAt: string;
    updatedAt: string;
    versions: DocumentVersion[];
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

export default function DocumentDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'content' | 'versions'>('content');
    const [actionLoading, setActionLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedReviewerId, setSelectedReviewerId] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [publishOnApprove, setPublishOnApprove] = useState(true);

    useEffect(() => {
        if (id) {
            fetchDocument();
            fetchUsers();
        }
    }, [id]);

    const fetchDocument = async () => {
        try {
            const res = await fetch(`/api/documents/${id}`);
            const data = await res.json();
            if (res.ok) {
                setDocument(data.document);
            }
        } catch (error) {
            console.error('Failed to fetch document:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users/assignees');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const handleSubmitForReview = async () => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/documents/${id}/submit-for-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewerId: selectedReviewerId || null }),
            });
            if (res.ok) {
                setShowReviewModal(false);
                fetchDocument();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async (password: string) => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/documents/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    publish: publishOnApprove,
                    password
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '承認に失敗しました');
            }

            setShowApproveModal(false);
            fetchDocument();
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/documents/${id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectReason }),
            });
            if (res.ok) {
                setShowRejectModal(false);
                setRejectReason('');
                fetchDocument();
            }
        } finally {
            setActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="card"><div className="card-body">読み込み中...</div></div>
            </DashboardLayout>
        );
    }

    if (!document) {
        return (
            <DashboardLayout>
                <div className="card"><div className="card-body">文書が見つかりません</div></div>
            </DashboardLayout>
        );
    }

    const currentVersionContent = document.versions.find(v => v.version === document.currentVersion)?.content || '';

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <Link href="/documents" style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                            ← 文書一覧
                        </Link>
                        <h3 className="card-title" style={{ marginTop: 'var(--space-2)' }}>
                            📄 {document.documentNumber}
                        </h3>
                        <p style={{ color: 'var(--color-neutral-600)', marginTop: 'var(--space-1)' }}>{document.title}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                        <span style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            backgroundColor: `${statusColors[document.status]}20`,
                            color: statusColors[document.status],
                            fontWeight: 500,
                        }}>
                            {statusLabels[document.status]}
                        </span>
                        <span style={{ color: 'var(--color-neutral-500)' }}>v{document.currentVersion}</span>
                    </div>
                </div>

                <div className="card-body">
                    {/* 情報グリッド */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)' }}>
                        <div>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>カテゴリ</p>
                            <p style={{ fontWeight: 500 }}>{categoryLabels[document.category]}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>作成者</p>
                            <p style={{ fontWeight: 500 }}>{document.createdBy.name}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>作成日</p>
                            <p style={{ fontWeight: 500 }}>{new Date(document.createdAt).toLocaleDateString('ja-JP')}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>更新日</p>
                            <p style={{ fontWeight: 500 }}>{new Date(document.updatedAt).toLocaleDateString('ja-JP')}</p>
                        </div>
                        {document.effectiveDate && (
                            <div>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>発効日</p>
                                <p style={{ fontWeight: 500 }}>{new Date(document.effectiveDate).toLocaleDateString('ja-JP')}</p>
                            </div>
                        )}
                        {document.expiresAt && (
                            <div>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>有効期限</p>
                                <p style={{ fontWeight: 500 }}>{new Date(document.expiresAt).toLocaleDateString('ja-JP')}</p>
                            </div>
                        )}
                        {document.approvedBy && (
                            <div>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>承認者</p>
                                <p style={{ fontWeight: 500 }}>{document.approvedBy.name}</p>
                            </div>
                        )}
                        {document.approvedAt && (
                            <div>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>承認日</p>
                                <p style={{ fontWeight: 500 }}>{new Date(document.approvedAt).toLocaleDateString('ja-JP')}</p>
                            </div>
                        )}
                    </div>

                    {/* アクションボタン */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                        {document.status === 'DRAFT' && (
                            <>
                                <Link href={`/documents/${id}/edit`} className="btn btn-secondary">
                                    ✏️ 編集
                                </Link>
                                <button className="btn btn-primary" onClick={() => setShowReviewModal(true)}>
                                    📤 レビュー申請
                                </button>
                            </>
                        )}
                        {document.status === 'IN_REVIEW' && (
                            <>
                                <button className="btn btn-success" onClick={() => setShowApproveModal(true)}>
                                    ✅ 承認
                                </button>
                                <button className="btn btn-danger" onClick={() => setShowRejectModal(true)}>
                                    ❌ 却下
                                </button>
                            </>
                        )}
                    </div>

                    {/* タブ */}
                    <div style={{ borderBottom: '1px solid var(--color-neutral-200)', marginBottom: 'var(--space-4)' }}>
                        <button
                            onClick={() => setActiveTab('content')}
                            style={{
                                padding: 'var(--space-2) var(--space-4)',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'content' ? '2px solid var(--color-primary)' : 'none',
                                color: activeTab === 'content' ? 'var(--color-primary)' : 'var(--color-neutral-500)',
                                fontWeight: activeTab === 'content' ? 600 : 400,
                            }}
                        >
                            📝 内容
                        </button>
                        <button
                            onClick={() => setActiveTab('versions')}
                            style={{
                                padding: 'var(--space-2) var(--space-4)',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'versions' ? '2px solid var(--color-primary)' : 'none',
                                color: activeTab === 'versions' ? 'var(--color-primary)' : 'var(--color-neutral-500)',
                                fontWeight: activeTab === 'versions' ? 600 : 400,
                            }}
                        >
                            📚 版履歴 ({document.versions.length})
                        </button>
                    </div>

                    {/* コンテンツタブ */}
                    {activeTab === 'content' && (
                        <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
                            {currentVersionContent || '内容がありません'}
                        </div>
                    )}

                    {/* 版履歴タブ */}
                    {activeTab === 'versions' && (
                        <div>
                            {document.versions.map((v) => (
                                <div key={v.id} style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-neutral-200)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, color: v.version === document.currentVersion ? 'var(--color-primary)' : 'inherit' }}>
                                                v{v.version}
                                                {v.version === document.currentVersion && ' (現行)'}
                                            </span>
                                            <span style={{ marginLeft: 'var(--space-3)', color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                                                {v.changeReason || '変更理由なし'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>
                                            {v.createdBy.name} / {new Date(v.createdAt).toLocaleDateString('ja-JP')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* レビュー申請モーダル */}
            {showReviewModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', width: 400 }}>
                        <h4 style={{ marginBottom: 'var(--space-4)' }}>📤 レビュー申請</h4>
                        <div className="form-group">
                            <label className="form-label">レビュアー（任意）</label>
                            <select className="form-select" value={selectedReviewerId} onChange={(e) => setSelectedReviewerId(e.target.value)} style={{ width: '100%' }}>
                                <option value="">指定なし</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                            <button className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>キャンセル</button>
                            <button className="btn btn-primary" onClick={handleSubmitForReview} disabled={actionLoading}>
                                {actionLoading ? '送信中...' : '申請'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 承認モーダル */}
            <ApprovalModal
                isOpen={showApproveModal}
                onClose={() => setShowApproveModal(false)}
                onConfirm={handleApprove}
                title="文書承認"
                confirmLabel="承認して発行"
            >
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={publishOnApprove}
                            onChange={(e) => setPublishOnApprove(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        <span>承認と同時に発行する</span>
                    </label>
                </div>
            </ApprovalModal>

            {/* 却下モーダル */}
            {showRejectModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', width: 400 }}>
                        <h4 style={{ marginBottom: 'var(--space-4)' }}>❌ 文書却下</h4>
                        <div className="form-group">
                            <label className="form-label required">却下理由</label>
                            <textarea className="form-textarea" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} style={{ width: '100%' }} placeholder="却下理由を入力してください" />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                            <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>キャンセル</button>
                            <button className="btn btn-danger" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
                                {actionLoading ? '処理中...' : '却下'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
