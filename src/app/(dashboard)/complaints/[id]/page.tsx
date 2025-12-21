import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import ComplaintActionForm from './ComplaintActionForm';

async function getComplaint(id: string, tenantId: string) {
    return prisma.complaint.findFirst({
        where: { id, tenantId, isActive: true },
        include: {
            lot: { select: { id: true, lotNumber: true, productName: true } },
            deviation: { select: { id: true, deviationNumber: true, description: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            capas: { select: { id: true, capaNumber: true, status: true, description: true } },
        },
    });
}

const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
        RECEIVED: { label: '受付', className: 'badge badge-neutral' },
        INVESTIGATING: { label: '調査中', className: 'badge badge-warning' },
        RESOLVED: { label: '対処完了', className: 'badge badge-success' },
        CLOSED: { label: 'クローズ', className: 'badge badge-primary' },
    };
    return map[status] || { label: status, className: 'badge badge-neutral' };
};

const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
        CUSTOMER: '👤 顧客苦情',
        INTERNAL: '🏭 社内発見',
        EXTERNAL: '🏢 外部機関',
    };
    return map[type] || type;
};

const getSeverityBadge = (severity: string) => {
    const map: Record<string, { label: string; className: string }> = {
        LOW: { label: '軽微', className: 'badge badge-neutral' },
        MEDIUM: { label: '中程度', className: 'badge badge-warning' },
        HIGH: { label: '重大', className: 'badge badge-error' },
        CRITICAL: { label: '致命的', className: 'badge badge-error' },
    };
    return map[severity] || { label: severity, className: 'badge badge-neutral' };
};

export default async function ComplaintDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const { id } = await params;
    const complaint = await getComplaint(id, session.user.tenantId);

    if (!complaint) notFound();

    const status = getStatusBadge(complaint.status);
    const severity = getSeverityBadge(complaint.severity);
    const canEdit = ['ADMIN', 'QA', 'QC'].includes(session.user.role) && complaint.status !== 'CLOSED';

    const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('ja-JP') : '-';
    const formatDateTime = (date: Date | null) => date ? new Date(date).toLocaleString('ja-JP') : '-';

    return (
        <DashboardLayout>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
                <div>
                    <Link href="/complaints" style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                        ← 苦情一覧
                    </Link>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', margin: 'var(--space-2) 0 0 0' }}>
                        {complaint.complaintNumber}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <span className={severity.className} style={{ padding: '4px 12px' }}>{severity.label}</span>
                    <span className={status.className} style={{ padding: '4px 12px' }}>{status.label}</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
                {/* Complaint Info */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">苦情情報</h3></div>
                    <div className="card-body">
                        <table style={{ width: '100%' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)', width: '35%' }}>苦情番号</td>
                                    <td style={{ padding: 'var(--space-2) 0', fontWeight: 'var(--font-weight-medium)' }}>{complaint.complaintNumber}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>種別</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{getTypeBadge(complaint.type)}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>報告元</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{complaint.source}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>関連ロット</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>
                                        {complaint.lot ? (
                                            <Link href={`/lots/${complaint.lot.id}`} style={{ color: 'var(--color-primary-600)' }}>
                                                {complaint.lot.lotNumber}
                                            </Link>
                                        ) : '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>受付日</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{formatDate(complaint.receivedAt)}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>回答期限</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{formatDate(complaint.responseDeadline)}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>登録者</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{complaint.createdBy.name}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>登録日時</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{formatDateTime(complaint.createdAt)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Description & Investigation */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">内容・調査</h3></div>
                    <div className="card-body">
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-2)' }}>苦情内容</div>
                            <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', whiteSpace: 'pre-wrap' }}>
                                {complaint.description}
                            </div>
                        </div>
                        {complaint.investigation && (
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-2)' }}>調査結果</div>
                                <div style={{ backgroundColor: 'var(--color-warning-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', whiteSpace: 'pre-wrap' }}>
                                    {complaint.investigation}
                                </div>
                            </div>
                        )}
                        {complaint.response && (
                            <div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-2)' }}>顧客回答</div>
                                <div style={{ backgroundColor: 'var(--color-success-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', whiteSpace: 'pre-wrap' }}>
                                    {complaint.response}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related CAPAs */}
                {complaint.capas.length > 0 && (
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">関連CAPA</h3></div>
                        <div className="card-body">
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {complaint.capas.map((capa) => (
                                    <li key={capa.id} style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-neutral-100)' }}>
                                        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{capa.capaNumber}</span>
                                        <span className="badge badge-neutral" style={{ marginLeft: 'var(--space-2)' }}>{capa.status}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Form */}
            {canEdit && (
                <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                    <div className="card-header"><h3 className="card-title">アクション</h3></div>
                    <div className="card-body">
                        <ComplaintActionForm
                            complaintId={complaint.id}
                            currentStatus={complaint.status}
                            currentInvestigation={complaint.investigation || ''}
                            currentResponse={complaint.response || ''}
                        />
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
