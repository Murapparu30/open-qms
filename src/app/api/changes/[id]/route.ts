import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { ChangeStatus, ChangeType, Priority } from '@prisma/client';

// GET /api/changes/[id] - 変更詳細取得
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const change = await prisma.changeRequest.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            isActive: true,
        },
        include: {
            requestedBy: { select: { id: true, name: true, email: true } },
            approvedBy: { select: { id: true, name: true, email: true } },
        },
    });

    if (!change) {
        return NextResponse.json({ error: '変更が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(change);
}

// PATCH /api/changes/[id] - 変更更新
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existingChange = await prisma.changeRequest.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            isActive: true,
        },
    });

    if (!existingChange) {
        return NextResponse.json({ error: '変更が見つかりません' }, { status: 404 });
    }

    // 承認済み以降は編集不可（管理者除く）
    if (!['DRAFT', 'PENDING', 'REJECTED'].includes(existingChange.status) && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'この変更は編集できません' }, { status: 400 });
    }

    try {
        const data = await req.json();
        const { type, title, description, priority, affectedArea, targetDate, status } = data;

        const updatedChange = await prisma.changeRequest.update({
            where: { id },
            data: {
                ...(type && { type: type as ChangeType }),
                ...(title && { title }),
                ...(description && { description }),
                ...(priority && { priority: priority as Priority }),
                ...(affectedArea !== undefined && { affectedArea }),
                ...(targetDate && { targetDate: new Date(targetDate) }),
                ...(status && { status: status as ChangeStatus }),
                // 承認待ちに変更した場合
                ...(status === 'PENDING' && existingChange.status === 'DRAFT' && {}),
                // 実施完了
                ...(status === 'IMPLEMENTED' && { implementedAt: new Date() }),
            },
            include: {
                requestedBy: { select: { name: true } },
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'ChangeRequest',
            recordId: id,
            action: 'UPDATE',
            before: existingChange as unknown as Record<string, unknown>,
            after: updatedChange as unknown as Record<string, unknown>,
            reason: `変更更新: ${Object.keys(data).join(', ')}`,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, change: updatedChange });
    } catch (error) {
        console.error('Error updating change request:', error);
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }
}

// DELETE /api/changes/[id] - 変更取消（論理削除）
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '取消の権限がありません' }, { status: 403 });
    }

    const { id } = await params;

    const existingChange = await prisma.changeRequest.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            isActive: true,
        },
    });

    if (!existingChange) {
        return NextResponse.json({ error: '変更が見つかりません' }, { status: 404 });
    }

    const cancelledChange = await prisma.changeRequest.update({
        where: { id },
        data: {
            isActive: false,
            status: 'CLOSED',
        },
    });

    await createAuditLog({
        tenantId: session.user.tenantId,
        tableName: 'ChangeRequest',
        recordId: id,
        action: 'CANCEL',
        before: existingChange as unknown as Record<string, unknown>,
        after: cancelledChange as unknown as Record<string, unknown>,
        reason: '変更取消',
        userId: session.user.id,
    });

    return NextResponse.json({ success: true });
}
