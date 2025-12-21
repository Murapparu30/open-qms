import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import { AuditAction } from '@prisma/client';

interface SearchParams {
    tableName?: string;
    action?: string;
    page?: string;
}

async function getAuditLogs(tenantId: string, searchParams: SearchParams) {
    const tableName = searchParams.tableName;
    const action = searchParams.action as AuditAction | undefined;
    const page = parseInt(searchParams.page || '1');
    const limit = 50;

    const whereClause = {
        tenantId,
        ...(tableName && { tableName }),
        ...(action && { action }),
    };

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                user: { select: { name: true, email: true } },
            },
        }),
        prisma.auditLog.count({ where: whereClause }),
    ]);

    return { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

const tableOptions = [
    { value: '', label: 'すべて' },
    { value: 'Lot', label: 'ロット' },
    { value: 'Deviation', label: '逸脱' },
    { value: 'CAPA', label: 'CAPA' },
    { value: 'User', label: 'ユーザー' },
];

const actionOptions = [
    { value: '', label: 'すべて' },
    { value: 'CREATE', label: '作成' },
    { value: 'UPDATE', label: '更新' },
    { value: 'CANCEL', label: '無効化' },
];

const getActionBadge = (action: string) => {
    const map: Record<string, { label: string; className: string }> = {
        CREATE: { label: '作成', className: 'badge badge-success' },
        UPDATE: { label: '更新', className: 'badge badge-primary' },
        CANCEL: { label: '無効化', className: 'badge badge-error' },
    };
    return map[action] || { label: action, className: 'badge badge-neutral' };
};

export default async function AuditLogsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    // Check permission
    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        redirect('/');
    }

    const params = await searchParams;
    const { logs, pagination } = await getAuditLogs(session.user.tenantId, params);

    const formatDateTime = (date: Date) => {
        return new Date(date).toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">📋 監査ログ</h3>
                </div>

                {/* Filters */}
                <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-neutral-100)' }}>
                    <form method="GET" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <select name="tableName" defaultValue={params.tableName || ''} className="form-select" style={{ maxWidth: 140 }}>
                            {tableOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <select name="action" defaultValue={params.action || ''} className="form-select" style={{ maxWidth: 120 }}>
                            {actionOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <button type="submit" className="btn btn-secondary">🔍 検索</button>
                    </form>
                </div>

                {/* Table */}
                <div className="table-container">
                    {logs.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-title">ログがありません</div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>日時</th>
                                    <th>テーブル</th>
                                    <th>レコードID</th>
                                    <th>操作</th>
                                    <th>理由</th>
                                    <th>ユーザー</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => {
                                    const action = getActionBadge(log.action);
                                    return (
                                        <tr key={log.id}>
                                            <td style={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
                                                {formatDateTime(log.createdAt)}
                                            </td>
                                            <td>
                                                <span className="badge badge-neutral">{log.tableName}</span>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {log.recordId.slice(0, 8)}...
                                            </td>
                                            <td>
                                                <span className={action.className}>{action.label}</span>
                                            </td>
                                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.reason || '-'}
                                            </td>
                                            <td>{log.user.name}</td>
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
                                    href={`/admin/audit-logs?page=${pagination.page - 1}${params.tableName ? `&tableName=${params.tableName}` : ''}${params.action ? `&action=${params.action}` : ''}`}
                                    className="btn btn-outline btn-sm"
                                >
                                    ← 前へ
                                </Link>
                            )}
                            {pagination.page < pagination.totalPages && (
                                <Link
                                    href={`/admin/audit-logs?page=${pagination.page + 1}${params.tableName ? `&tableName=${params.tableName}` : ''}${params.action ? `&action=${params.action}` : ''}`}
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
