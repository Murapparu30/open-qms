import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import { Severity, DeviationStatus } from '@prisma/client';

interface SearchParams {
    status?: string;
    severity?: string;
    search?: string;
    page?: string;
}

async function getDeviations(tenantId: string, searchParams: SearchParams) {
    const status = searchParams.status as DeviationStatus | undefined;
    const severity = searchParams.severity as Severity | undefined;
    const search = searchParams.search;
    const page = parseInt(searchParams.page || '1');
    const limit = 20;

    const whereClause = {
        tenantId,
        isActive: true as const,
        ...(status && { status }),
        ...(severity && { severity }),
        ...(search && {
            OR: [
                { deviationNumber: { contains: search } },
                { description: { contains: search } },
            ],
        }),
    };

    const [deviations, total] = await Promise.all([
        prisma.deviation.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                lot: { select: { lotNumber: true, productName: true } },
                createdBy: { select: { name: true } },
            },
        }),
        prisma.deviation.count({ where: whereClause }),
    ]);

    return { deviations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

const statusOptions = [
    { value: '', label: 'すべて' },
    { value: 'OPEN', label: '起票済み' },
    { value: 'CONTAINMENT', label: '封じ込め中' },
    { value: 'RCA', label: '原因調査中' },
    { value: 'CAPA', label: 'CAPA対応中' },
    { value: 'VERIFICATION', label: '有効性確認中' },
    { value: 'CLOSED', label: 'クローズ' },
];

const severityOptions = [
    { value: '', label: 'すべて' },
    { value: 'LOW', label: '軽微' },
    { value: 'MEDIUM', label: '中程度' },
    { value: 'HIGH', label: '重大' },
    { value: 'CRITICAL', label: '致命的' },
];

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

export default async function DeviationsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const params = await searchParams;
    const { deviations, pagination } = await getDeviations(session.user.tenantId, params);

    const formatDate = (date: Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('ja-JP');
    };

    const isOverdue = (dueDate: Date | null, status: string) => {
        if (!dueDate || status === 'CLOSED') return false;
        return new Date(dueDate) < new Date();
    };

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">逸脱一覧</h3>
                    <Link href="/deviations/new" className="btn btn-primary">
                        🔔 逸脱起票
                    </Link>
                </div>

                {/* Filters */}
                <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-neutral-100)' }}>
                    <form method="GET" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            name="search"
                            placeholder="逸脱番号・内容で検索..."
                            defaultValue={params.search || ''}
                            className="form-input"
                            style={{ maxWidth: 250 }}
                        />
                        <select name="status" defaultValue={params.status || ''} className="form-select" style={{ maxWidth: 140 }}>
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <select name="severity" defaultValue={params.severity || ''} className="form-select" style={{ maxWidth: 120 }}>
                            {severityOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <button type="submit" className="btn btn-secondary">🔍 検索</button>
                    </form>
                </div>

                {/* Table */}
                <div className="table-container">
                    {deviations.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">✅</div>
                            <div className="empty-state-title">逸脱がありません</div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>逸脱番号</th>
                                    <th>ロット</th>
                                    <th>内容</th>
                                    <th>重大度</th>
                                    <th>ステータス</th>
                                    <th>期限</th>
                                    <th>作成者</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deviations.map((d) => {
                                    const severity = getSeverityBadge(d.severity);
                                    const status = getStatusBadge(d.status);
                                    const overdue = isOverdue(d.dueDate, d.status);
                                    return (
                                        <tr key={d.id} className="clickable">
                                            <td>
                                                <Link
                                                    href={`/deviations/${d.id}`}
                                                    style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-primary-600)' }}
                                                >
                                                    {d.deviationNumber}
                                                </Link>
                                            </td>
                                            <td>
                                                <Link href={`/lots/${d.lot.lotNumber}`} style={{ color: 'var(--color-neutral-700)' }}>
                                                    {d.lot.lotNumber}
                                                </Link>
                                            </td>
                                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {d.description}
                                            </td>
                                            <td><span className={severity.className}>{severity.label}</span></td>
                                            <td><span className={status.className}>{status.label}</span></td>
                                            <td style={{ color: overdue ? 'var(--color-error-600)' : 'inherit', fontWeight: overdue ? 'var(--font-weight-semibold)' : 'inherit' }}>
                                                {formatDate(d.dueDate)}
                                                {overdue && ' ⚠️'}
                                            </td>
                                            <td>{d.createdBy.name}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)' }}>
                            {pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1}-
                            {Math.min(pagination.page * pagination.limit, pagination.total)}件を表示
                        </span>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            {pagination.page > 1 && (
                                <Link
                                    href={`/deviations?page=${pagination.page - 1}${params.status ? `&status=${params.status}` : ''}${params.severity ? `&severity=${params.severity}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                                    className="btn btn-outline btn-sm"
                                >
                                    ← 前へ
                                </Link>
                            )}
                            {pagination.page < pagination.totalPages && (
                                <Link
                                    href={`/deviations?page=${pagination.page + 1}${params.status ? `&status=${params.status}` : ''}${params.severity ? `&severity=${params.severity}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                                    className="btn btn-outline btn-sm"
                                >
                                    次へ →
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
