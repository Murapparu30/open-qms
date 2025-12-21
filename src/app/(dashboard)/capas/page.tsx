import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import { CAPAStatus, CAPAType } from '@prisma/client';

interface SearchParams {
    status?: string;
    type?: string;
    search?: string;
    page?: string;
}

async function getCapas(tenantId: string, searchParams: SearchParams) {
    const status = searchParams.status as CAPAStatus | undefined;
    const type = searchParams.type as CAPAType | undefined;
    const search = searchParams.search;
    const page = parseInt(searchParams.page || '1');
    const limit = 20;

    const whereClause = {
        tenantId,
        ...(status && { status }),
        ...(type && { type }),
        ...(search && {
            OR: [
                { capaNumber: { contains: search } },
                { description: { contains: search } },
            ],
        }),
    };

    const [capas, total] = await Promise.all([
        prisma.cAPA.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                assignee: { select: { name: true } },
                deviation: { select: { deviationNumber: true } },
            },
        }),
        prisma.cAPA.count({ where: whereClause }),
    ]);

    return { capas, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

const statusOptions = [
    { value: '', label: 'すべて' },
    { value: 'OPEN', label: 'オープン' },
    { value: 'IN_PROGRESS', label: '進行中' },
    { value: 'VERIFICATION', label: '有効性確認' },
    { value: 'CLOSED', label: 'クローズ' },
];

const typeOptions = [
    { value: '', label: 'すべて' },
    { value: 'CORRECTIVE', label: '是正' },
    { value: 'PREVENTIVE', label: '予防' },
];

const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
        OPEN: { label: 'オープン', className: 'badge badge-neutral' },
        IN_PROGRESS: { label: '進行中', className: 'badge badge-warning' },
        VERIFICATION: { label: '有効性確認', className: 'badge badge-primary' },
        CLOSED: { label: 'クローズ', className: 'badge badge-success' },
    };
    return map[status] || { label: status, className: 'badge badge-neutral' };
};

const getTypeBadge = (type: string) => {
    const map: Record<string, { label: string; className: string }> = {
        CORRECTIVE: { label: '是正', className: 'badge badge-error' },
        PREVENTIVE: { label: '予防', className: 'badge badge-warning' },
    };
    return map[type] || { label: type, className: 'badge badge-neutral' };
};

export default async function CapasPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const params = await searchParams;
    const { capas, pagination } = await getCapas(session.user.tenantId, params);
    const canCreate = ['ADMIN', 'QA'].includes(session.user.role);

    const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('ja-JP') : '-';

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">🛠️ CAPA（是正・予防措置）</h3>
                    {canCreate && (
                        <Link href="/capas/new" className="btn btn-primary">
                            ➕ CAPA作成
                        </Link>
                    )}
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
                        <select name="status" defaultValue={params.status || ''} className="form-select" style={{ maxWidth: 130 }}>
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
                    {capas.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🛠️</div>
                            <div className="empty-state-title">CAPAがありません</div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>CAPA番号</th>
                                    <th>種別</th>
                                    <th>起因元</th>
                                    <th>ステータス</th>
                                    <th>担当者</th>
                                    <th>期限</th>
                                </tr>
                            </thead>
                            <tbody>
                                {capas.map((capa) => {
                                    const status = getStatusBadge(capa.status);
                                    const type = getTypeBadge(capa.type);
                                    return (
                                        <tr key={capa.id}>
                                            <td>
                                                <Link
                                                    href={`/capas/${capa.id}`}
                                                    style={{ color: 'var(--color-primary-600)', fontWeight: 'var(--font-weight-medium)' }}
                                                >
                                                    {capa.capaNumber}
                                                </Link>
                                            </td>
                                            <td><span className={type.className}>{type.label}</span></td>
                                            <td>{capa.deviation?.deviationNumber || '-'}</td>
                                            <td><span className={status.className}>{status.label}</span></td>
                                            <td>{capa.assignee.name}</td>
                                            <td>{formatDate(capa.dueDate)}</td>
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
                                    href={`/capas?page=${pagination.page - 1}${params.status ? `&status=${params.status}` : ''}${params.type ? `&type=${params.type}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                                    className="btn btn-outline btn-sm"
                                >
                                    ← 前へ
                                </Link>
                            )}
                            {pagination.page < pagination.totalPages && (
                                <Link
                                    href={`/capas?page=${pagination.page + 1}${params.status ? `&status=${params.status}` : ''}${params.type ? `&type=${params.type}` : ''}${params.search ? `&search=${params.search}` : ''}`}
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
