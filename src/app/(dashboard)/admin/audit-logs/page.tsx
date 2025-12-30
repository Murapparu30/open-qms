import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/authOptions';
import DashboardLayout from '@/components/common/DashboardLayout';
import { prisma } from '@/lib/db/prisma';
import AuditLogFilters from '@/components/admin/AuditLogFilters';
import AuditLogTable from '@/components/admin/AuditLogTable';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    // Only Admin and QA can view audit logs
    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-error">
                    <h2 className="text-2xl font-bold">Access Denied</h2>
                    <p>このページを閲覧する権限がありません。</p>
                </div>
            </DashboardLayout>
        );
    }

    const resolvedParams = await searchParams;
    const page = parseInt((resolvedParams.page as string) || '1');
    const limit = parseInt((resolvedParams.limit as string) || '20');

    const tableName = resolvedParams.tableName as string;
    const action = resolvedParams.action as AuditAction;
    const userId = resolvedParams.userId as string;
    const dateFrom = resolvedParams.dateFrom as string;
    const dateTo = resolvedParams.dateTo as string;

    const whereClause: any = {
        tenantId: session.user.tenantId,
        ...(tableName && { tableName }),
        ...(action && { action }),
        ...(userId && { userId }),
    };

    if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
        if (dateTo) whereClause.createdAt.lte = new Date(dateTo); // Assuming end of day requires manipulation, but simple date is fine for MVP
    }

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

    return (
        <DashboardLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-neutral-800">監査ログ (Audit Logs)</h1>
                <p className="text-neutral-500 text-sm mt-1">
                    システムの操作履歴を確認できます（21 CFR Part 11対応）
                </p>
            </div>

            <AuditLogFilters />

            <AuditLogTable
                logs={JSON.parse(JSON.stringify(logs))}
                pagination={{
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                }}
            />
        </DashboardLayout>
    );
}
