import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';

const typeLabels: Record<string, string> = {
    MANUFACTURER: '製造委託先',
    TESTING: '試験委託先',
    STORAGE: '保管委託先',
    SUPPLIER: '原材料供給者',
};

const statusLabels: Record<string, { label: string; className: string }> = {
    PENDING: { label: '評価前', className: 'badge badge-neutral' },
    APPROVED: { label: '承認済み', className: 'badge badge-success' },
    SUSPENDED: { label: '一時停止', className: 'badge badge-warning' },
    REJECTED: { label: '不適格', className: 'badge badge-error' },
};

interface SearchParams {
    type?: string;
    status?: string;
}

async function getContractors(tenantId: string, searchParams: SearchParams) {
    return prisma.contractor.findMany({
        where: {
            tenantId,
            isActive: true,
            ...(searchParams.type && { type: searchParams.type as 'MANUFACTURER' | 'TESTING' | 'STORAGE' | 'SUPPLIER' }),
            ...(searchParams.status && { evaluationStatus: searchParams.status as 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED' }),
        },
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { lots: true } },
        },
    });
}

export default async function ContractorsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const params = await searchParams;
    const contractors = await getContractors(session.user.tenantId, params);

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">🏭 供給者/委託先</h3>
                    {['ADMIN', 'QA', 'PROCUREMENT'].includes(session.user.role) && (
                        <Link href="/contractors/new" className="btn btn-primary">
                            ➕ 新規登録
                        </Link>
                    )}
                </div>

                {/* Filters */}
                <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-neutral-100)' }}>
                    <form method="GET" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <select name="type" defaultValue={params.type || ''} className="form-select" style={{ maxWidth: 160 }}>
                            <option value="">種別: すべて</option>
                            {Object.entries(typeLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <select name="status" defaultValue={params.status || ''} className="form-select" style={{ maxWidth: 140 }}>
                            <option value="">評価: すべて</option>
                            {Object.entries(statusLabels).map(([value, { label }]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <button type="submit" className="btn btn-secondary">🔍 検索</button>
                    </form>
                </div>

                {/* Table */}
                <div className="table-container">
                    {contractors.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🏭</div>
                            <div className="empty-state-title">供給者/委託先がありません</div>
                            <Link href="/contractors/new" className="btn btn-primary">登録する</Link>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>名前</th>
                                    <th>種別</th>
                                    <th>評価ステータス</th>
                                    <th>担当者</th>
                                    <th>関連ロット</th>
                                    <th>次回監査</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contractors.map((contractor) => {
                                    const status = statusLabels[contractor.evaluationStatus];
                                    return (
                                        <tr key={contractor.id}>
                                            <td>
                                                <Link href={`/contractors/${contractor.id}`} style={{ fontWeight: 'var(--font-weight-medium)' }}>
                                                    {contractor.name}
                                                </Link>
                                            </td>
                                            <td>
                                                <span className="badge badge-neutral">{typeLabels[contractor.type]}</span>
                                            </td>
                                            <td>
                                                <span className={status.className}>{status.label}</span>
                                            </td>
                                            <td>{contractor.contactPerson || '-'}</td>
                                            <td>{contractor._count.lots}件</td>
                                            <td>
                                                {contractor.nextAuditDate
                                                    ? new Date(contractor.nextAuditDate).toLocaleDateString('ja-JP')
                                                    : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
