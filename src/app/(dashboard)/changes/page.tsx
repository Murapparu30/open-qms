import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import { ChangeStatus, ChangeType } from '@prisma/client';

interface SearchParams {
    status?: string;
    type?: string;
    search?: string;
    page?: string;
}

async function getChanges(tenantId: string, searchParams: SearchParams) {
    const status = searchParams.status as ChangeStatus | undefined;
    const type = searchParams.type as ChangeType | undefined;
    const search = searchParams.search;
    const page = parseInt(searchParams.page || '1');
    const limit = 20;

    const whereClause = {
        tenantId,
        isActive: true as const,
        ...(status && { status }),
        ...(type && { type }),
        ...(search && {
            OR: [
                { changeNumber: { contains: search } },
                { title: { contains: search } },
            ],
        }),
    };

    const [changes, total] = await Promise.all([
        prisma.changeRequest.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                requestedBy: { select: { name: true } },
            },
        }),
        prisma.changeRequest.count({ where: whereClause }),
    ]);

    return { changes, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

const statusOptions = [
    { value: '', label: 'すべて' },
    { value: 'DRAFT', label: '下書き' },
    { value: 'PENDING', label: '承認待ち' },
    { value: 'APPROVED', label: '承認済み' },
    { value: 'IMPLEMENTED', label: '実施済み' },
    { value: 'REJECTED', label: '却下' },
];

const typeOptions = [
    { value: '', label: 'すべて' },
    { value: 'EQUIPMENT', label: '設備' },
    { value: 'PROCESS', label: '工程' },
    { value: 'DOCUMENT', label: '文書' },
    { value: 'MATERIAL', label: '材料' },
    { value: 'OTHER', label: 'その他' },
];

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
        EQUIPMENT: '🔧 設備',
        PROCESS: '⚙️ 工程',
        DOCUMENT: '📄 文書',
        MATERIAL: '📦 材料',
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

export default async function ChangesPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const params = await searchParams;
    const { changes, pagination } = await getChanges(session.user.tenantId, params);

    const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('ja-JP') : '-';

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">🔄 変更管理</h3>
                    <Link href="/changes/new" className="btn btn-primary">
                        ➕ 変更起票
                    </Link>
                </div>

                {/* Filters */}
                <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-neutral-100)' }}>
                    <form method="GET" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            name="search"
                            placeholder="検索..."
                            defaultValue={params.search || ''}
                            className="form-input"
                            style={{ maxWidth: 200 }}
                        />
                        <select name="status" defaultValue={params.status || ''} className="form-select" style={{ maxWidth: 120 }}>
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <select name="type" defaultValue={params.type || ''} className="form-select" style={{ maxWidth: 100 }}>
                            {typeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <button type="submit" className="btn btn-secondary">🔍 検索</button>
                    </form>
                </div>

                {/* Table */}
                <div className="table-container">
                    {changes.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🔄</div>
                            <div className="empty-state-title">変更がありません</div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>変更番号</th>
                                    <th>種別</th>
                                    <th>タイトル</th>
                                    <th>優先度</th>
                                    <th>ステータス</th>
                                    <th>起票者</th>
                                    <th>目標日</th>
                                </tr>
                            </thead>
                            <tbody>
                                {changes.map((change) => {
                                    const status = getStatusBadge(change.status);
                                    const priority = getPriorityBadge(change.priority);
                                    return (
                                        <tr key={change.id}>
                                            <td>
                                                <Link
                                                    href={`/changes/${change.id}`}
                                                    style={{ color: 'var(--color-primary-600)', fontWeight: 'var(--font-weight-medium)' }}
                                                >
                                                    {change.changeNumber}
                                                </Link>
                                            </td>
                                            <td>{getTypeBadge(change.type)}</td>
                                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {change.title}
                                            </td>
                                            <td><span className={priority.className}>{priority.label}</span></td>
                                            <td><span className={status.className}>{status.label}</span></td>
                                            <td>{change.requestedBy.name}</td>
                                            <td>{formatDate(change.targetDate)}</td>
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
                                    href={`/changes?page=${pagination.page - 1}${params.status ? `&status=${params.status}` : ''}${params.type ? `&type=${params.type}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                                    className="btn btn-outline btn-sm"
                                >
                                    ← 前へ
                                </Link>
                            )}
                            {pagination.page < pagination.totalPages && (
                                <Link
                                    href={`/changes?page=${pagination.page + 1}${params.status ? `&status=${params.status}` : ''}${params.type ? `&type=${params.type}` : ''}${params.search ? `&search=${params.search}` : ''}`}
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
