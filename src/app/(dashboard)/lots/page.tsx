import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import { LotStatus } from '@prisma/client';

interface SearchParams {
    status?: string;
    search?: string;
    page?: string;
}

async function getLots(tenantId: string, searchParams: SearchParams) {
    const status = searchParams.status as LotStatus | undefined;
    const search = searchParams.search;
    const page = parseInt(searchParams.page || '1');
    const limit = 20;

    const whereClause = {
        tenantId,
        isActive: true as const,
        ...(status && { status }),
        ...(search && {
            OR: [
                { lotNumber: { contains: search } },
                { productName: { contains: search } },
                { productCode: { contains: search } },
            ],
        }),
    };

    const [lots, total] = await Promise.all([
        prisma.lot.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                createdBy: { select: { name: true } },
                contractor: { select: { name: true } },
                _count: { select: { deviations: true } },
            },
        }),
        prisma.lot.count({ where: whereClause }),
    ]);

    return {
        lots,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

const statusOptions = [
    { value: '', label: 'すべて' },
    { value: 'MANUFACTURING', label: '製造中' },
    { value: 'INSPECTION', label: '検査中' },
    { value: 'PENDING_RELEASE', label: '判定待ち' },
    { value: 'RELEASED', label: '出荷OK' },
    { value: 'REJECTED', label: '出荷NG' },
    { value: 'ON_HOLD', label: '出荷停止' },
];

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

export default async function LotsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const params = await searchParams;
    const { lots, pagination } = await getLots(session.user.tenantId, params);

    const formatDate = (date: Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('ja-JP');
    };

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">ロット一覧</h3>
                    <Link href="/lots/new" className="btn btn-primary">
                        ➕ 新規登録
                    </Link>
                </div>

                {/* Filters */}
                <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-neutral-100)' }}>
                    <form method="GET" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            name="search"
                            placeholder="ロット番号・品目名で検索..."
                            defaultValue={params.search || ''}
                            className="form-input"
                            style={{ maxWidth: 300 }}
                        />
                        <select
                            name="status"
                            defaultValue={params.status || ''}
                            className="form-select"
                            style={{ maxWidth: 150 }}
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <button type="submit" className="btn btn-secondary">
                            🔍 検索
                        </button>
                    </form>
                </div>

                {/* Table */}
                <div className="table-container">
                    {lots.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📦</div>
                            <div className="empty-state-title">ロットがありません</div>
                            <div className="empty-state-description">
                                新しいロットを登録してください
                            </div>
                            <Link href="/lots/new" className="btn btn-primary">
                                ロットを登録
                            </Link>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ロット番号</th>
                                    <th>品目名</th>
                                    <th>型式</th>
                                    <th>製造日</th>
                                    <th>ステータス</th>
                                    <th>逸脱</th>
                                    <th>作成者</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lots.map((lot) => {
                                    const status = getStatusBadge(lot.status);
                                    return (
                                        <tr key={lot.id} className="clickable">
                                            <td>
                                                <Link
                                                    href={`/lots/${lot.id}`}
                                                    style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-primary-600)' }}
                                                >
                                                    {lot.lotNumber}
                                                </Link>
                                            </td>
                                            <td>{lot.productName}</td>
                                            <td>{lot.productCode || '-'}</td>
                                            <td>{formatDate(lot.manufacturingDate)}</td>
                                            <td>
                                                <span className={status.className}>{status.label}</span>
                                            </td>
                                            <td>
                                                {lot._count.deviations > 0 ? (
                                                    <span className="badge badge-error">{lot._count.deviations}</span>
                                                ) : (
                                                    <span className="badge badge-neutral">0</span>
                                                )}
                                            </td>
                                            <td>{lot.createdBy.name}</td>
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
                                    href={`/lots?page=${pagination.page - 1}${params.status ? `&status=${params.status}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                                    className="btn btn-outline btn-sm"
                                >
                                    ← 前へ
                                </Link>
                            )}
                            {pagination.page < pagination.totalPages && (
                                <Link
                                    href={`/lots?page=${pagination.page + 1}${params.status ? `&status=${params.status}` : ''}${params.search ? `&search=${params.search}` : ''}`}
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
