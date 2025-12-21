import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { ComplaintStatus } from '@prisma/client';

// GET /api/complaints/[id] - 苦情詳細取得
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const complaint = await prisma.complaint.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            isActive: true,
        },
        include: {
            lot: { select: { id: true, lotNumber: true, productName: true } },
            deviation: { select: { id: true, deviationNumber: true, description: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            capas: {
                select: { id: true, capaNumber: true, status: true, description: true },
            },
        },
    });

    if (!complaint) {
        return NextResponse.json({ error: '苦情が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(complaint);
}

// PATCH /api/complaints/[id] - 苦情更新
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existingComplaint = await prisma.complaint.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            isActive: true,
        },
    });

    if (!existingComplaint) {
        return NextResponse.json({ error: '苦情が見つかりません' }, { status: 404 });
    }

    // クローズ済みは編集不可（管理者除く）
    if (existingComplaint.status === 'CLOSED' && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'クローズ済みの苦情は編集できません' }, { status: 400 });
    }

    try {
        const data = await req.json();
        const { status, investigation, response, deviationId } = data;

        const updatedComplaint = await prisma.complaint.update({
            where: { id },
            data: {
                ...(status && { status: status as ComplaintStatus }),
                ...(investigation !== undefined && { investigation }),
                ...(response !== undefined && { response }),
                ...(deviationId !== undefined && { deviationId }),
                // クローズ時
                ...(status === 'CLOSED' && { closedAt: new Date() }),
            },
            include: {
                lot: { select: { lotNumber: true, productName: true } },
                createdBy: { select: { name: true } },
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Complaint',
            recordId: id,
            action: 'UPDATE',
            before: existingComplaint as unknown as Record<string, unknown>,
            after: updatedComplaint as unknown as Record<string, unknown>,
            reason: `苦情更新: ${Object.keys(data).join(', ')}`,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, complaint: updatedComplaint });
    } catch (error) {
        console.error('Error updating complaint:', error);
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }
}

// DELETE /api/complaints/[id] - 苦情取消（論理削除）
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

    const existingComplaint = await prisma.complaint.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            isActive: true,
        },
    });

    if (!existingComplaint) {
        return NextResponse.json({ error: '苦情が見つかりません' }, { status: 404 });
    }

    const cancelledComplaint = await prisma.complaint.update({
        where: { id },
        data: {
            isActive: false,
            status: 'CLOSED',
        },
    });

    await createAuditLog({
        tenantId: session.user.tenantId,
        tableName: 'Complaint',
        recordId: id,
        action: 'CANCEL',
        before: existingComplaint as unknown as Record<string, unknown>,
        after: cancelledComplaint as unknown as Record<string, unknown>,
        reason: '苦情取消',
        userId: session.user.id,
    });

    return NextResponse.json({ success: true });
}
