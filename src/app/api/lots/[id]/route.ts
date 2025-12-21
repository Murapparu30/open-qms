import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// GET /api/lots/[id] - ロット詳細取得
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const lot = await prisma.lot.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            isActive: true,
        },
        include: {
            createdBy: { select: { id: true, name: true, email: true } },
            releasedBy: { select: { id: true, name: true, email: true } },
            contractor: { select: { id: true, name: true } },
            attachments: true,
            deviations: {
                where: { isActive: true },
                orderBy: { createdAt: 'desc' },
                include: {
                    createdBy: { select: { id: true, name: true } },
                },
            },
        },
    });

    if (!lot) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(lot);
}

// PATCH /api/lots/[id] - ロット更新
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['ADMIN', 'QA', 'QC', 'MANUFACTURING'];
    if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const data = await req.json();

        const existingLot = await prisma.lot.findFirst({
            where: {
                id,
                tenantId: session.user.tenantId,
                isActive: true,
            },
        });

        if (!existingLot) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const updatedLot = await prisma.lot.update({
            where: { id },
            data: {
                ...(data.productName && { productName: data.productName }),
                ...(data.productCode !== undefined && { productCode: data.productCode }),
                ...(data.manufacturingDate && { manufacturingDate: new Date(data.manufacturingDate) }),
                ...(data.contractorId !== undefined && { contractorId: data.contractorId }),
                ...(data.status && { status: data.status }),
            },
            include: {
                createdBy: { select: { id: true, name: true } },
                contractor: { select: { id: true, name: true } },
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Lot',
            recordId: id,
            action: 'UPDATE',
            before: existingLot as unknown as Record<string, unknown>,
            after: updatedLot as unknown as Record<string, unknown>,
            reason: data.reason,
            userId: session.user.id,
        });

        return NextResponse.json(updatedLot);
    } catch (error) {
        console.error('Error updating lot:', error);
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }
}

// DELETE /api/lots/[id] - ロット無効化（論理削除）
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const existingLot = await prisma.lot.findFirst({
            where: {
                id,
                tenantId: session.user.tenantId,
                isActive: true,
            },
        });

        if (!existingLot) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        await prisma.lot.update({
            where: { id },
            data: { isActive: false },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Lot',
            recordId: id,
            action: 'CANCEL',
            before: existingLot as unknown as Record<string, unknown>,
            after: { ...existingLot, isActive: false } as unknown as Record<string, unknown>,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting lot:', error);
        return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }
}
