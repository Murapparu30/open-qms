import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';

async function getDashboardStats(tenantId: string) {
  const [
    totalLots,
    pendingReleaseLots,
    openDeviations,
    criticalDeviations,
    // MVP2 stats
    pendingChanges,
    openComplaints,
    openCapas,
  ] = await Promise.all([
    prisma.lot.count({ where: { tenantId, isActive: true } }),
    prisma.lot.count({ where: { tenantId, isActive: true, status: 'PENDING_RELEASE' } }),
    prisma.deviation.count({ where: { tenantId, isActive: true, status: { not: 'CLOSED' } } }),
    prisma.deviation.count({ where: { tenantId, isActive: true, severity: 'CRITICAL', status: { not: 'CLOSED' } } }),
    // MVP2
    prisma.changeRequest.count({ where: { tenantId, isActive: true, status: 'PENDING' } }),
    prisma.complaint.count({ where: { tenantId, isActive: true, status: { not: 'CLOSED' } } }),
    prisma.cAPA.count({ where: { tenantId, status: { not: 'CLOSED' } } }),
  ]);

  return {
    totalLots,
    pendingReleaseLots,
    openDeviations,
    criticalDeviations,
    pendingChanges,
    openComplaints,
    openCapas,
  };
}

async function getRecentLots(tenantId: string) {
  return prisma.lot.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      createdBy: { select: { name: true } },
    },
  });
}

async function getOpenDeviations(tenantId: string) {
  return prisma.deviation.findMany({
    where: { tenantId, isActive: true, status: { not: 'CLOSED' } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      lot: { select: { lotNumber: true, productName: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const [stats, recentLots, openDeviations] = await Promise.all([
    getDashboardStats(session.user.tenantId),
    getRecentLots(session.user.tenantId),
    getOpenDeviations(session.user.tenantId),
  ]);

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

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { label: string; className: string }> = {
      LOW: { label: '軽微', className: 'badge badge-neutral' },
      MEDIUM: { label: '中程度', className: 'badge badge-warning' },
      HIGH: { label: '重大', className: 'badge badge-error' },
      CRITICAL: { label: '致命的', className: 'badge badge-error' },
    };
    return severityMap[severity] || { label: severity, className: 'badge badge-neutral' };
  };

  return (
    <DashboardLayout>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="stat-card">
          <div className="stat-label">総ロット数</div>
          <div className="stat-value">{stats.totalLots}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">判定待ち</div>
          <div className="stat-value" style={{ color: stats.pendingReleaseLots > 0 ? 'var(--color-warning-600)' : 'inherit' }}>
            {stats.pendingReleaseLots}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">未クローズ逸脱</div>
          <div className="stat-value" style={{ color: stats.openDeviations > 0 ? 'var(--color-error-600)' : 'inherit' }}>
            {stats.openDeviations}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">承認待ち変更</div>
          <div className="stat-value" style={{ color: stats.pendingChanges > 0 ? 'var(--color-warning-600)' : 'inherit' }}>
            {stats.pendingChanges}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">未対応苦情</div>
          <div className="stat-value" style={{ color: stats.openComplaints > 0 ? 'var(--color-error-600)' : 'inherit' }}>
            {stats.openComplaints}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">オープンCAPA</div>
          <div className="stat-value" style={{ color: stats.openCapas > 0 ? 'var(--color-warning-600)' : 'inherit' }}>
            {stats.openCapas}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
        {/* Recent Lots */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">最近のロット</h3>
            <a href="/lots" className="btn btn-outline btn-sm">すべて表示</a>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentLots.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state-icon">📦</div>
                <div className="empty-state-title">ロットがありません</div>
                <a href="/lots/new" className="btn btn-primary">ロットを登録</a>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>ロット番号</th>
                    <th>品目名</th>
                    <th>ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLots.map((lot) => {
                    const status = getStatusBadge(lot.status);
                    return (
                      <tr key={lot.id} className="clickable">
                        <td>
                          <a href={`/lots/${lot.id}`} style={{ fontWeight: 'var(--font-weight-medium)' }}>
                            {lot.lotNumber}
                          </a>
                        </td>
                        <td>{lot.productName}</td>
                        <td>
                          <span className={status.className}>{status.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Open Deviations */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">未クローズ逸脱</h3>
            <a href="/deviations" className="btn btn-outline btn-sm">すべて表示</a>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {openDeviations.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">未クローズの逸脱はありません</div>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>逸脱番号</th>
                    <th>ロット</th>
                    <th>重大度</th>
                  </tr>
                </thead>
                <tbody>
                  {openDeviations.map((deviation) => {
                    const severity = getSeverityBadge(deviation.severity);
                    return (
                      <tr key={deviation.id} className="clickable">
                        <td>
                          <a href={`/deviations/${deviation.id}`} style={{ fontWeight: 'var(--font-weight-medium)' }}>
                            {deviation.deviationNumber}
                          </a>
                        </td>
                        <td>{deviation.lot.lotNumber}</td>
                        <td>
                          <span className={severity.className}>{severity.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
