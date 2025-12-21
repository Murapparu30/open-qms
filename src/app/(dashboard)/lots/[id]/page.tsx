import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import LotReleaseForm from './LotReleaseForm';

async function getLot(id: string, tenantId: string) {
    return prisma.lot.findFirst({
        where: { id, tenantId, isActive: true },
        include: {
            createdBy: { select: { id: true, name: true, email: true } },
            releasedBy: { select: { id: true, name: true, email: true } },
            contractor: { select: { id: true, name: true } },
            attachments: { orderBy: { uploadedAt: 'desc' } },
            deviations: {
                where: { isActive: true },
                orderBy: { createdAt: 'desc' },
                include: {
                    createdBy: { select: { name: true } },
                },
            },
        },
    });
}

const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
        MANUFACTURING: { label: '製造中', className: 'badge badge-neutral' },
        INSPECTION: { label: '検査中', className: 'badge badge-primary' },
        PENDING_RELEASE: { label: '判定待ち', className: 'badge badge-warning' },
        RELEASED: { label: '出荷OK', className: 'badge badge-success' },
        REJECTED: { label: '出荷NG', className: 'badge badge-error' },
        ON_HOLD: { label: '出荷停止', className: 'badge badge-error' },
    };
    return statusMap[status] || { label: status, className: 'badge badge-neutral' };
};

const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { label: string; className: string }> = {
        LOW: { label: '軽微', className: 'badge badge-neutral' },
        MEDIUM: { label: '中程度', className: 'badge badge-warning' },
        HIGH: { label: '重大', className: 'badge badge-error' },
        CRITICAL: { label: '致命的', className: 'badge badge-error' },
    };
    return severityMap[severity] || { label: severity, className: 'badge badge-neutral' };
};

export default async function LotDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const { id } = await params;
    const lot = await getLot(id, session.user.tenantId);

    if (!lot) notFound();

    const status = getStatusBadge(lot.status);
    const canRelease = ['ADMIN', 'QA'].includes(session.user.role) && lot.status === 'PENDING_RELEASE';
    const hasOpenDeviations = lot.deviations.some((d) => d.status !== 'CLOSED');

    const formatDate = (date: Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('ja-JP');
    };

    const formatDateTime = (date: Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('ja-JP');
    };

    return (
        <DashboardLayout>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                        <Link href="/lots" style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                            ← ロット一覧
                        </Link>
                    </div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
                        {lot.lotNumber}
                    </h1>
                    <p style={{ color: 'var(--color-neutral-600)', marginTop: 'var(--space-1)' }}>
                        {lot.productName}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <span className={status.className} style={{ fontSize: 'var(--font-size-sm)', padding: '4px 12px' }}>
                        {status.label}
                    </span>
                    {canRelease && (
                        <a href="#release" className="btn btn-success">
                            📋 出荷判定
                        </a>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
                {/* Lot Info */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">ロット情報</h3>
                    </div>
                    <div className="card-body">
                        <table style={{ width: '100%' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)', width: '40%' }}>ロット番号</td>
                                    <td style={{ padding: 'var(--space-2) 0', fontWeight: 'var(--font-weight-medium)' }}>{lot.lotNumber}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>品目名</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{lot.productName}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>型式</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{lot.productCode || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>製造日</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{formatDate(lot.manufacturingDate)}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>委託先</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{lot.contractor?.name || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>登録者</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{lot.createdBy.name}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>登録日時</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{formatDateTime(lot.createdAt)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Release Info */}
                {lot.releasedAt && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">出荷判定</h3>
                        </div>
                        <div className="card-body">
                            <table style={{ width: '100%' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)', width: '40%' }}>判定結果</td>
                                        <td style={{ padding: 'var(--space-2) 0' }}>
                                            <span className={lot.releaseDecision === 'APPROVED' ? 'badge badge-success' : lot.releaseDecision === 'REJECTED' ? 'badge badge-error' : 'badge badge-warning'}>
                                                {lot.releaseDecision === 'APPROVED' ? '承認' : lot.releaseDecision === 'REJECTED' ? '却下' : '条件付き'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>判定者</td>
                                        <td style={{ padding: 'var(--space-2) 0' }}>{lot.releasedBy?.name || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>判定日時</td>
                                        <td style={{ padding: 'var(--space-2) 0' }}>{formatDateTime(lot.releasedAt)}</td>
                                    </tr>
                                    {lot.releaseComment && (
                                        <tr>
                                            <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>コメント</td>
                                            <td style={{ padding: 'var(--space-2) 0' }}>{lot.releaseComment}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Deviations */}
            <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                <div className="card-header">
                    <h3 className="card-title">関連逸脱</h3>
                    <Link href={`/deviations/new?lotId=${lot.id}`} className="btn btn-outline btn-sm">
                        ➕ 逸脱起票
                    </Link>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {lot.deviations.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                            <div className="empty-state-icon">✅</div>
                            <div className="empty-state-title">逸脱なし</div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>逸脱番号</th>
                                    <th>内容</th>
                                    <th>重大度</th>
                                    <th>ステータス</th>
                                    <th>作成日</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lot.deviations.map((deviation) => {
                                    const severity = getSeverityBadge(deviation.severity);
                                    return (
                                        <tr key={deviation.id} className="clickable">
                                            <td>
                                                <Link href={`/deviations/${deviation.id}`} style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-primary-600)' }}>
                                                    {deviation.deviationNumber}
                                                </Link>
                                            </td>
                                            <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {deviation.description}
                                            </td>
                                            <td>
                                                <span className={severity.className}>{severity.label}</span>
                                            </td>
                                            <td>
                                                <span className="badge badge-neutral">{deviation.status}</span>
                                            </td>
                                            <td>{formatDate(deviation.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Release Form */}
            {canRelease && (
                <div id="release" style={{ marginTop: 'var(--space-6)' }}>
                    <LotReleaseForm lotId={lot.id} hasOpenDeviations={hasOpenDeviations} />
                </div>
            )}
        </DashboardLayout>
    );
}
