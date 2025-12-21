import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import DeviationCloseForm from './DeviationCloseForm';

async function getDeviation(id: string, tenantId: string) {
    return prisma.deviation.findFirst({
        where: { id, tenantId, isActive: true },
        include: {
            lot: { select: { id: true, lotNumber: true, productName: true, productCode: true, status: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            capas: {
                include: { assignee: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
            },
            attachments: { orderBy: { uploadedAt: 'desc' } },
        },
    });
}

const getSeverityBadge = (severity: string) => {
    const map: Record<string, { label: string; className: string }> = {
        LOW: { label: '軽微', className: 'badge badge-neutral' },
        MEDIUM: { label: '中程度', className: 'badge badge-warning' },
        HIGH: { label: '重大', className: 'badge badge-error' },
        CRITICAL: { label: '致命的', className: 'badge badge-error' },
    };
    return map[severity] || { label: severity, className: 'badge badge-neutral' };
};

const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
        OPEN: { label: '起票済み', className: 'badge badge-primary' },
        CONTAINMENT: { label: '封じ込め中', className: 'badge badge-warning' },
        RCA: { label: '原因調査中', className: 'badge badge-warning' },
        CAPA: { label: 'CAPA対応中', className: 'badge badge-warning' },
        VERIFICATION: { label: '有効性確認中', className: 'badge badge-primary' },
        CLOSED: { label: 'クローズ', className: 'badge badge-success' },
        CANCELLED: { label: '取消', className: 'badge badge-neutral' },
    };
    return map[status] || { label: status, className: 'badge badge-neutral' };
};

export default async function DeviationDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const { id } = await params;
    const deviation = await getDeviation(id, session.user.tenantId);

    if (!deviation) notFound();

    const severity = getSeverityBadge(deviation.severity);
    const status = getStatusBadge(deviation.status);
    const isOverdue = deviation.dueDate && new Date(deviation.dueDate) < new Date() && deviation.status !== 'CLOSED';
    const canClose = ['ADMIN', 'QA'].includes(session.user.role) && deviation.status !== 'CLOSED';

    // Close conditions
    const hasContainment = !!deviation.containment;
    const hasRootCause = !!deviation.rootCause;
    const allCapasClosed = deviation.capas.length === 0 || deviation.capas.every(capa => capa.status === 'CLOSED');

    const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('ja-JP') : '-';
    const formatDateTime = (date: Date | null) => date ? new Date(date).toLocaleString('ja-JP') : '-';

    return (
        <DashboardLayout>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
                <div>
                    <Link href="/deviations" style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                        ← 逸脱一覧
                    </Link>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', margin: 'var(--space-2) 0 0 0' }}>
                        {deviation.deviationNumber}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <span className={severity.className} style={{ padding: '4px 12px' }}>{severity.label}</span>
                    <span className={status.className} style={{ padding: '4px 12px' }}>{status.label}</span>
                    {isOverdue && <span className="badge badge-error">⚠️ 期限超過</span>}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
                {/* Deviation Info */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">逸脱情報</h3></div>
                    <div className="card-body">
                        <table style={{ width: '100%' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)', width: '35%' }}>逸脱番号</td>
                                    <td style={{ padding: 'var(--space-2) 0', fontWeight: 'var(--font-weight-medium)' }}>{deviation.deviationNumber}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>対象ロット</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>
                                        <Link href={`/lots/${deviation.lot.id}`} style={{ color: 'var(--color-primary-600)' }}>
                                            {deviation.lot.lotNumber} - {deviation.lot.productName}
                                        </Link>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>発生日</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{formatDate(deviation.occurredAt)}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>発見工程</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{deviation.discoveryProcess}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>出荷影響</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>
                                        <span className={deviation.shipmentImpact === 'YES' ? 'badge badge-error' : deviation.shipmentImpact === 'NO' ? 'badge badge-success' : 'badge badge-neutral'}>
                                            {deviation.shipmentImpact === 'YES' ? 'あり' : deviation.shipmentImpact === 'NO' ? 'なし' : '不明'}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>期限</td>
                                    <td style={{ padding: 'var(--space-2) 0', color: isOverdue ? 'var(--color-error-600)' : 'inherit' }}>
                                        {formatDate(deviation.dueDate)} {isOverdue && '⚠️'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>起票者</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{deviation.createdBy.name}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>起票日時</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{formatDateTime(deviation.createdAt)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Content & Response */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">内容・対応</h3></div>
                    <div className="card-body">
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-1)' }}>内容</div>
                            <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)' }}>
                                {deviation.description}
                            </div>
                        </div>

                        {deviation.containment && (
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-1)' }}>
                                    暫定処置 {deviation.containmentAt && <span style={{ color: 'var(--color-neutral-400)' }}>({formatDateTime(deviation.containmentAt)})</span>}
                                </div>
                                <div style={{ backgroundColor: 'var(--color-warning-50)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-warning-200)' }}>
                                    {deviation.containment}
                                </div>
                            </div>
                        )}

                        {deviation.rootCause && (
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-1)' }}>
                                    原因 {deviation.rootCauseAt && <span style={{ color: 'var(--color-neutral-400)' }}>({formatDateTime(deviation.rootCauseAt)})</span>}
                                </div>
                                <div style={{ backgroundColor: 'var(--color-primary-50)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-200)' }}>
                                    {deviation.rootCause}
                                </div>
                            </div>
                        )}

                        {deviation.closedAt && (
                            <div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-1)' }}>
                                    クローズ {formatDateTime(deviation.closedAt)}
                                </div>
                                {deviation.closeReason && (
                                    <div style={{ backgroundColor: 'var(--color-success-50)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-success-200)' }}>
                                        {deviation.closeReason}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CAPA Section */}
            <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                <div className="card-header">
                    <h3 className="card-title">CAPA（是正・予防処置）</h3>
                    {deviation.status !== 'CLOSED' && (
                        <button className="btn btn-outline btn-sm">➕ CAPA追加</button>
                    )}
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {deviation.capas.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-title">CAPAがありません</div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>CAPA番号</th>
                                    <th>種別</th>
                                    <th>内容</th>
                                    <th>担当者</th>
                                    <th>ステータス</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deviation.capas.map((capa) => (
                                    <tr key={capa.id}>
                                        <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{capa.capaNumber}</td>
                                        <td>
                                            <span className={capa.type === 'CORRECTIVE' ? 'badge badge-error' : 'badge badge-primary'}>
                                                {capa.type === 'CORRECTIVE' ? '是正' : '予防'}
                                            </span>
                                        </td>
                                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {capa.description}
                                        </td>
                                        <td>{capa.assignee.name}</td>
                                        <td>
                                            <span className={capa.status === 'CLOSED' ? 'badge badge-success' : 'badge badge-warning'}>
                                                {capa.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Close Form for QA/ADMIN */}
            {canClose && (
                <div style={{ marginTop: 'var(--space-6)' }}>
                    <DeviationCloseForm
                        deviationId={deviation.id}
                        hasContainment={hasContainment}
                        hasRootCause={hasRootCause}
                        allCapasClosed={allCapasClosed}
                    />
                </div>
            )}
        </DashboardLayout>
    );
}

