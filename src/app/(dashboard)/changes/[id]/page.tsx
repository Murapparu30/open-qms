import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import ChangeApprovalForm from './ChangeApprovalForm';

async function getChange(id: string, tenantId: string) {
    return prisma.changeRequest.findFirst({
        where: { id, tenantId, isActive: true },
        include: {
            requestedBy: { select: { id: true, name: true, email: true } },
            approvedBy: { select: { id: true, name: true, email: true } },
        },
    });
}

const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
        DRAFT: { label: '下書き', className: 'badge badge-neutral' },
        PENDING: { label: '承認待ち', className: 'badge badge-warning' },
        APPROVED: { label: '承認済み', className: 'badge badge-success' },
        IMPLEMENTED: { label: '実施済み', className: 'badge badge-primary' },
        REJECTED: { label: '却下', className: 'badge badge-error' },
        CLOSED: { label: 'クローズ', className: 'badge badge-neutral' },
    };
    return map[status] || { label: status, className: 'badge badge-neutral' };
};

const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
        EQUIPMENT: '🔧 設備変更',
        PROCESS: '⚙️ 工程変更',
        DOCUMENT: '📄 文書変更',
        MATERIAL: '📦 材料変更',
        OTHER: '📋 その他',
    };
    return map[type] || type;
};

const getPriorityBadge = (priority: string) => {
    const map: Record<string, { label: string; className: string }> = {
        LOW: { label: '低', className: 'badge badge-neutral' },
        MEDIUM: { label: '中', className: 'badge badge-warning' },
        HIGH: { label: '高', className: 'badge badge-error' },
        CRITICAL: { label: '緊急', className: 'badge badge-error' },
    };
    return map[priority] || { label: priority, className: 'badge badge-neutral' };
};

export default async function ChangeDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const { id } = await params;
    const change = await getChange(id, session.user.tenantId);

    if (!change) notFound();

    const status = getStatusBadge(change.status);
    const priority = getPriorityBadge(change.priority);
    const canApprove = ['ADMIN', 'QA'].includes(session.user.role) && change.status === 'PENDING';
    const canSubmit = change.status === 'DRAFT' && change.requestedById === session.user.id;
    const canImplement = ['ADMIN', 'QA', 'MANUFACTURING'].includes(session.user.role) && change.status === 'APPROVED';

    const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('ja-JP') : '-';
    const formatDateTime = (date: Date | null) => date ? new Date(date).toLocaleString('ja-JP') : '-';

    return (
        <DashboardLayout>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
                <div>
                    <Link href="/changes" style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)' }}>
                        ← 変更一覧
                    </Link>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', margin: 'var(--space-2) 0 0 0' }}>
                        {change.changeNumber}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <span className={priority.className} style={{ padding: '4px 12px' }}>{priority.label}</span>
                    <span className={status.className} style={{ padding: '4px 12px' }}>{status.label}</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
                {/* Change Info */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">変更情報</h3></div>
                    <div className="card-body">
                        <table style={{ width: '100%' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)', width: '35%' }}>変更番号</td>
                                    <td style={{ padding: 'var(--space-2) 0', fontWeight: 'var(--font-weight-medium)' }}>{change.changeNumber}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>変更種別</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{getTypeBadge(change.type)}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>タイトル</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{change.title}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>影響範囲</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{change.affectedArea || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>目標日</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{formatDate(change.targetDate)}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>起票者</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{change.requestedBy.name}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>起票日時</td>
                                    <td style={{ padding: 'var(--space-2) 0' }}>{formatDateTime(change.createdAt)}</td>
                                </tr>
                                {change.approvedBy && (
                                    <>
                                        <tr>
                                            <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>承認者</td>
                                            <td style={{ padding: 'var(--space-2) 0' }}>{change.approvedBy.name}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>承認日時</td>
                                            <td style={{ padding: 'var(--space-2) 0' }}>{formatDateTime(change.approvedAt)}</td>
                                        </tr>
                                    </>
                                )}
                                {change.implementedAt && (
                                    <tr>
                                        <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-neutral-500)' }}>実施日時</td>
                                        <td style={{ padding: 'var(--space-2) 0' }}>{formatDateTime(change.implementedAt)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Description */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">変更内容</h3></div>
                    <div className="card-body">
                        <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', whiteSpace: 'pre-wrap' }}>
                            {change.description}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            {(canSubmit || canApprove || canImplement) && (
                <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                    <div className="card-header"><h3 className="card-title">アクション</h3></div>
                    <div className="card-body">
                        {canSubmit && (
                            <ChangeApprovalForm changeId={change.id} action="submit" />
                        )}
                        {canApprove && (
                            <ChangeApprovalForm changeId={change.id} action="approve" />
                        )}
                        {canImplement && (
                            <ChangeApprovalForm changeId={change.id} action="implement" />
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
