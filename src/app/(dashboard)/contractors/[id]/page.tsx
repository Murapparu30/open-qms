'use client';

import { useState, useEffect, FormEvent, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/common/DashboardLayout';

const typeLabels: Record<string, string> = {
    MANUFACTURER: '製造委託先',
    TESTING: '試験委託先',
    STORAGE: '保管委託先',
    SUPPLIER: '原材料供給者',
};

const statusOptions = [
    { value: 'PENDING', label: '評価前' },
    { value: 'APPROVED', label: '承認済み' },
    { value: 'SUSPENDED', label: '一時停止' },
    { value: 'REJECTED', label: '不適格' },
];

interface Contractor {
    id: string;
    name: string;
    type: string;
    address: string | null;
    contactPerson: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    qualityAgreement: string | null;
    qualityAgreementVersion: string | null;
    evaluationStatus: string;
    lastAuditDate: string | null;
    nextAuditDate: string | null;
    lots: { id: string; lotNumber: string; productName: string; status: string; createdAt: string }[];
}

export default function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [contractor, setContractor] = useState<Contractor | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        evaluationStatus: '',
        lastAuditDate: '',
        nextAuditDate: '',
    });

    useEffect(() => {
        fetch(`/api/contractors/${id}`)
            .then((res) => res.json())
            .then((data) => {
                setContractor(data.contractor);
                setFormData({
                    evaluationStatus: data.contractor.evaluationStatus,
                    lastAuditDate: data.contractor.lastAuditDate?.split('T')[0] || '',
                    nextAuditDate: data.contractor.nextAuditDate?.split('T')[0] || '',
                });
            })
            .catch(() => setError('データの取得に失敗しました'))
            .finally(() => setIsLoading(false));
    }, [id]);

    const handleStatusUpdate = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/contractors/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('更新に失敗しました');

            const { contractor: updated } = await res.json();
            setContractor(updated);
            setIsEditing(false);
        } catch {
            setError('更新に失敗しました');
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="card">
                    <div className="card-body"><div className="empty-state">読み込み中...</div></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!contractor) {
        return (
            <DashboardLayout>
                <div className="card">
                    <div className="card-body"><div className="empty-state">見つかりません</div></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                {/* Header Card */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">🏭 {contractor.name}</h3>
                            <span className="badge badge-neutral" style={{ marginTop: 'var(--space-2)' }}>
                                {typeLabels[contractor.type]}
                            </span>
                        </div>
                        <button onClick={() => setIsEditing(!isEditing)} className="btn btn-outline">
                            {isEditing ? 'キャンセル' : '✏️ 編集'}
                        </button>
                    </div>
                    <div className="card-body">
                        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>担当者</div>
                                <div>{contractor.contactPerson || '-'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>メール</div>
                                <div>{contractor.contactEmail || '-'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>電話</div>
                                <div>{contractor.contactPhone || '-'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>住所</div>
                                <div>{contractor.address || '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Evaluation Card */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">📋 評価・監査</h3>
                    </div>
                    <div className="card-body">
                        {isEditing ? (
                            <form onSubmit={handleStatusUpdate} style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">評価ステータス</label>
                                    <select
                                        className="form-select"
                                        value={formData.evaluationStatus}
                                        onChange={(e) => setFormData({ ...formData, evaluationStatus: e.target.value })}
                                    >
                                        {statusOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">前回監査日</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.lastAuditDate}
                                        onChange={(e) => setFormData({ ...formData, lastAuditDate: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">次回監査日</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.nextAuditDate}
                                        onChange={(e) => setFormData({ ...formData, nextAuditDate: e.target.value })}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary">保存</button>
                            </form>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-4)' }}>
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>評価ステータス</div>
                                    <div>
                                        <span className={`badge ${contractor.evaluationStatus === 'APPROVED' ? 'badge-success' : contractor.evaluationStatus === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>
                                            {statusOptions.find((o) => o.value === contractor.evaluationStatus)?.label}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>前回監査日</div>
                                    <div>{contractor.lastAuditDate ? new Date(contractor.lastAuditDate).toLocaleDateString('ja-JP') : '-'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>次回監査日</div>
                                    <div>{contractor.nextAuditDate ? new Date(contractor.nextAuditDate).toLocaleDateString('ja-JP') : '-'}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related Lots */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">📦 関連ロット</h3>
                    </div>
                    <div className="table-container">
                        {contractor.lots.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📦</div>
                                <div className="empty-state-title">関連ロットはありません</div>
                            </div>
                        ) : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>ロット番号</th>
                                        <th>品目名</th>
                                        <th>作成日</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contractor.lots.map((lot) => (
                                        <tr key={lot.id}>
                                            <td>
                                                <a href={`/lots/${lot.id}`} style={{ fontWeight: 'var(--font-weight-medium)' }}>
                                                    {lot.lotNumber}
                                                </a>
                                            </td>
                                            <td>{lot.productName}</td>
                                            <td>{new Date(lot.createdAt).toLocaleDateString('ja-JP')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
