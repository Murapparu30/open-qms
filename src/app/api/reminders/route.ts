import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { ReminderTarget } from '@prisma/client';

// GET /api/reminders - リマインダー一覧取得
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const targetType = searchParams.get('targetType') as ReminderTarget | null;

    const whereClause = {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        ...(unreadOnly && { isRead: false }),
        ...(targetType && { targetType }),
    };

    const reminders = await prisma.reminder.findMany({
        where: whereClause,
        orderBy: { reminderAt: 'asc' },
        take: 50,
    });

    // 期限切れカウント
    const overdueCount = await prisma.reminder.count({
        where: {
            ...whereClause,
            isRead: false,
            reminderAt: { lt: new Date() },
        },
    });

    return NextResponse.json({ reminders, overdueCount });
}

// POST /api/reminders - リマインダー作成
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await req.json();
        const { targetType, targetId, reminderAt, message, userId } = data;

        if (!targetType || !targetId || !reminderAt || !message) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        const reminder = await prisma.reminder.create({
            data: {
                tenantId: session.user.tenantId,
                targetType: targetType as ReminderTarget,
                targetId,
                reminderAt: new Date(reminderAt),
                message,
                userId: userId || session.user.id,
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Reminder',
            recordId: reminder.id,
            action: 'CREATE',
            before: null,
            after: reminder as unknown as Record<string, unknown>,
            reason: 'リマインダー作成',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, reminder }, { status: 201 });
    } catch (error) {
        console.error('Error creating reminder:', error);
        return NextResponse.json({ error: 'リマインダー作成に失敗しました' }, { status: 500 });
    }
}
