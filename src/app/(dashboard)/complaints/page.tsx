import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import { ComplaintStatus, ComplaintType } from '@prisma/client';

interface SearchParams {
    status?: string;
    type?: string;
    search?: string;
    page?: string;
}

async function getComplaints(tenantId: string, searchParams: SearchParams) {
    const status = searchParams.status as ComplaintStatus | undefined;
    const type = searchParams.type as ComplaintType | undefined;
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
                { complaintNumber: { contains: search } },
                { source: { contains: search } },
            ],
        }),
    };

    const [complaints, total] = await Promise.all([
        prisma.complaint.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                lot: { select: { lotNumber: true } },
                createdBy: { select: { name: true } },
            },
        }),
        prisma.complaint.count({ where: whereClause }),
    ]);

    return { complaints, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

const statusOptions = [
    { value: '', label: 'すべて' },
    { value: 'RECEIVED', label: '受付' },
    { value: 'INVESTIGATING', label: '調査中' },
    { value: 'RESOLVED', label: '対処完了' },
    { value: 'CLOSED', label: 'クローズ' },
];

const typeOptions = [
    { value: '', label: 'すべて' },
    { value: 'CUSTOMER', label: '顧客苦情' },
    { value: 'INTERNAL', label: '社内発見' },
    { value: 'EXTERNAL', label: '外部機関' },
];

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
        CUSTOMER: '👤 顧客',
        INTERNAL: '🏭 社内',
        EXTERNAL: '🏢 外部',
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

export default async function ComplaintsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const params = await searchParams;
    const { complaints, pagination } = await getComplaints(session.user.tenantId, params);

    const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('ja-JP') : '-';

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">📢 苦情/品質情報</h3>
                    <Link href="/complaints/new" className="btn btn-primary">
                        ➕ 苦情登録
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
                    {complaints.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📢</div>
                            <div className="empty-state-title">苦情がありません</div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>苦情番号</th>
                                    <th>種別</th>
                                    <th>報告元</th>
                                    <th>重大度</th>
                                    <th>ステータス</th>
                                    <th>ロット</th>
                                    <th>受付日</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.map((complaint) => {
                                    const status = getStatusBadge(complaint.status);
                                    const severity = getSeverityBadge(complaint.severity);
                                    return (
                                        <tr key={complaint.id}>
                                            <td>
                                                <Link
                                                    href={`/complaints/${complaint.id}`}
                                                    style={{ color: 'var(--color-primary-600)', fontWeight: 'var(--font-weight-medium)' }}
                                                >
                                                    {complaint.complaintNumber}
                                                </Link>
                                            </td>
                                            <td>{getTypeBadge(complaint.type)}</td>
                                            <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {complaint.source}
                                            </td>
                                            <td><span className={severity.className}>{severity.label}</span></td>
                                            <td><span className={status.className}>{status.label}</span></td>
                                            <td>{complaint.lot?.lotNumber || '-'}</td>
                                            <td>{formatDate(complaint.receivedAt)}</td>
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
                                    href={`/complaints?page=${pagination.page - 1}${params.status ? `&status=${params.status}` : ''}${params.type ? `&type=${params.type}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                                    className="btn btn-outline btn-sm"
                                >
                                    ← 前へ
                                </Link>
                            )}
                            {pagination.page < pagination.totalPages && (
                                <Link
                                    href={`/complaints?page=${pagination.page + 1}${params.status ? `&status=${params.status}` : ''}${params.type ? `&type=${params.type}` : ''}${params.search ? `&search=${params.search}` : ''}`}
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
