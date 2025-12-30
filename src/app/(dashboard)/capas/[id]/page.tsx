import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import CapaActionForm from './CapaActionForm';
import AttachmentWrapper from './AttachmentWrapper';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/utils/dateUtils';

async function getCapa(id: string, tenantId: string) {
    return prisma.cAPA.findFirst({
        where: { id, tenantId },
        include: {
            assignee: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            deviation: { select: { id: true, deviationNumber: true, description: true } },
            complaint: { select: { id: true, complaintNumber: true, description: true } },
        },
    });
}


export default async function CapaDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const { id } = await params;
    const capa = await getCapa(id, session.user.tenantId);

    if (!capa) notFound();

    const canEdit = ['ADMIN', 'QA'].includes(session.user.role) && capa.status !== 'CLOSED';

    return (
        <DashboardLayout>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
                <div>
                    <Link href="/capas" style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                        ← CAPA一覧
                    </Link>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', margin: 'var(--space-2) 0 0 0' }}>
                        {capa.capaNumber}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <StatusBadge value={capa.type} type="status" />
                    <StatusBadge value={capa.status} type="status" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
                {/* CAPA Info */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">CAPA情報</h3></div>
                    <div className="card-body">
                        <table style={{ width: '100%' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)', width: '35%' }}>CAPA番号</td>
                                    <td style={{ padding: 'var(--space-2) 0', fontWeight: 'var(--font-weight-medium)' }}>{capa.capaNumber}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>起因タイプ</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{capa.sourceType}</td>
                                </tr>
                                {capa.deviation && (
                                    <tr>
                                        <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>起因元（逸脱）</td>
                                        <td style={{ padding: 'var(--space-2) 0' }}>
                                            <Link href={`/deviations/${capa.deviation.id}`} style={{ color: 'var(--color-primary-600)' }}>
                                                {capa.deviation.deviationNumber}
                                            </Link>
                                        </td>
                                    </tr>
                                )}
                                {capa.complaint && (
                                    <tr>
                                        <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>起因元（苦情）</td>
                                        <td style={{ padding: 'var(--space-2) 0' }}>
                                            <Link href={`/complaints/${capa.complaint.id}`} style={{ color: 'var(--color-primary-600)' }}>
                                                {capa.complaint.complaintNumber}
                                            </Link>
                                        </td>
                                    </tr>
                                )}
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>担当者</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{capa.assignee.name}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>期限</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{formatDate(capa.dueDate)}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>作成者</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{capa.createdBy.name}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>作成日時</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{formatDateTime(capa.createdAt)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Description & Verification */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">内容・有効性確認</h3></div>
                    <div className="card-body">
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-2)' }}>措置内容</div>
                            <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', whiteSpace: 'pre-wrap' }}>
                                {capa.description}
                            </div>
                        </div>
                        {capa.verificationMethod && (
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-2)' }}>有効性確認方法</div>
                                <div style={{ backgroundColor: 'var(--color-primary-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                                    {capa.verificationMethod}
                                    {capa.verificationPeriod && <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-neutral-500)' }}>（{capa.verificationPeriod}）</span>}
                                </div>
                            </div>
                        )}
                        {capa.verificationResult && (
                            <div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginBottom: 'var(--space-2)' }}>有効性確認結果</div>
                                <div style={{ backgroundColor: 'var(--color-success-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', whiteSpace: 'pre-wrap' }}>
                                    {capa.verificationResult}
                                    {capa.verifiedAt && <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>確認日: {formatDateTime(capa.verifiedAt)}</div>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Attachment Section */}
            <AttachmentWrapper entityType="CAPA" entityId={capa.id} />

            {/* Action Form */}
            {canEdit && (
                <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                    <div className="card-header"><h3 className="card-title">アクション</h3></div>
                    <div className="card-body">
                        <CapaActionForm capaId={capa.id} currentStatus={capa.status} />
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
