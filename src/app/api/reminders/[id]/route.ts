import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';

// PATCH /api/reminders/[id] - リマインダー既読化
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existingReminder = await prisma.reminder.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            userId: session.user.id,
        },
    });

    if (!existingReminder) {
        return NextResponse.json({ error: 'リマインダーが見つかりません' }, { status: 404 });
    }

    try {
        const data = await req.json();
        const { isRead } = data;

        const updatedReminder = await prisma.reminder.update({
            where: { id },
            data: {
                ...(isRead !== undefined && { isRead }),
            },
        });

        return NextResponse.json({ success: true, reminder: updatedReminder });
    } catch (error) {
        console.error('Error updating reminder:', error);
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }
}

// DELETE /api/reminders/[id] - リマインダー削除
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existingReminder = await prisma.reminder.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            userId: session.user.id,
        },
    });

    if (!existingReminder) {
        return NextResponse.json({ error: 'リマインダーが見つかりません' }, { status: 404 });
    }

    await prisma.reminder.delete({
        where: { id },
    });

    return NextResponse.json({ success: true });
}
