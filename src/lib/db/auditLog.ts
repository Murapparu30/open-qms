import { prisma } from './prisma';
import { AuditAction } from '@prisma/client';

export interface AuditLogParams {
    tenantId: string;
    tableName: string;
    recordId: string;
    action: AuditAction;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string;
    userId: string;
}

/**
 * 監査ログを作成
 * 全てのデータ変更時に呼び出すこと
 */
export async function createAuditLog(params: AuditLogParams) {
    const { tenantId, tableName, recordId, action, before, after, reason, userId } = params;

    return prisma.auditLog.create({
        data: {
            tenantId,
            tableName,
            recordId,
            action,
            before: before ? JSON.stringify(before) : null,
            after: after ? JSON.stringify(after) : null,
            reason,
            userId,
        },
    });
}

/**
 * レコードの監査ログを取得
 */
export async function getAuditLogs(tableName: string, recordId: string, tenantId: string) {
    return prisma.auditLog.findMany({
        where: {
            tableName,
            recordId,
            tenantId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
}

/**
 * 特定のユーザーの監査ログを取得
 */
export async function getUserAuditLogs(userId: string, limit: number = 50) {
    return prisma.auditLog.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: limit,
    });
}
