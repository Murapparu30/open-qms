import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { CAPAStatus } from '@prisma/client';

// GET /api/capas/[id] - CAPA詳細取得
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const capa = await prisma.cAPA.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
        },
        include: {
            assignee: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            deviation: { select: { id: true, deviationNumber: true, description: true } },
            complaint: { select: { id: true, complaintNumber: true, description: true } },
            attachments: true,
        },
    });

    if (!capa) {
        return NextResponse.json({ error: 'CAPAが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(capa);
}

// PATCH /api/capas/[id] - CAPA更新
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existingCapa = await prisma.cAPA.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
        },
    });

    if (!existingCapa) {
        return NextResponse.json({ error: 'CAPAが見つかりません' }, { status: 404 });
    }

    try {
        const data = await req.json();
        const { status, description, verificationMethod, verificationPeriod, verificationResult, assigneeId, dueDate } = data;

        const updatedCapa = await prisma.cAPA.update({
            where: { id },
            data: {
                ...(status && { status: status as CAPAStatus }),
                ...(description !== undefined && { description }),
                ...(verificationMethod !== undefined && { verificationMethod }),
                ...(verificationPeriod !== undefined && { verificationPeriod }),
                ...(verificationResult !== undefined && { verificationResult }),
                ...(assigneeId && { assigneeId }),
                ...(dueDate && { dueDate: new Date(dueDate) }),
                // 有効性確認完了
                ...(verificationResult && status !== 'CLOSED' && { verifiedAt: new Date() }),
                // クローズ
                ...(status === 'CLOSED' && { closedAt: new Date() }),
            },
            include: {
                assignee: { select: { name: true } },
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'CAPA',
            recordId: id,
            action: 'UPDATE',
            before: existingCapa as unknown as Record<string, unknown>,
            after: updatedCapa as unknown as Record<string, unknown>,
            reason: `CAPA更新: ${Object.keys(data).join(', ')}`,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, capa: updatedCapa });
    } catch (error) {
        console.error('Error updating CAPA:', error);
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }
}
