import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import ComplaintActionForm from './ComplaintActionForm';
import AttachmentWrapper from './AttachmentWrapper';
import RelatedRecords from '@/components/common/RelatedRecords';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/utils/dateUtils';

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

    const canEdit = ['ADMIN', 'QA', 'QC'].includes(session.user.role) && complaint.status !== 'CLOSED';

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
                    <StatusBadge value={complaint.severity} type="severity" />
                    <StatusBadge value={complaint.status} type="status" />
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
                                    <td style={{ padding: 'var(--space-2) 0' }}>
                                        <StatusBadge value={complaint.type} type="type" />
                                    </td>
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

                {/* Related Records: Deviation */}
                {complaint.deviation && (
                    <RelatedRecords
                        title="関連する逸脱"
                        records={[{
                            id: complaint.deviation.id,
                            number: complaint.deviation.deviationNumber,
                            status: 'LINKED',
                            title: complaint.deviation.description.substring(0, 50) + '...',
                            link: `/deviations/${complaint.deviation.id}`
                        }]}
                    />
                )}

                {/* Related CAPAs */}
                {complaint.capas.length > 0 && (
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">関連CAPA</h3></div>
                        <div className="card-body">
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {complaint.capas.map((capa) => (
                                    <li key={capa.id} style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-neutral-100)' }}>
                                        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{capa.capaNumber}</span>
                                        <div style={{ display: 'inline-block', marginLeft: 'var(--space-2)' }}><StatusBadge value={capa.status} type="status" /></div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Attachment Section */}
            <AttachmentWrapper entityType="COMPLAINT" entityId={complaint.id} />

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
