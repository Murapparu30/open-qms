import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// GET /api/deviations/[id] - 逸脱詳細取得
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const deviation = await prisma.deviation.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            isActive: true,
        },
        include: {
            lot: {
                select: {
                    id: true,
                    lotNumber: true,
                    productName: true,
                    productCode: true,
                    status: true,
                },
            },
            createdBy: { select: { id: true, name: true, email: true } },
            capas: {
                include: {
                    assignee: { select: { name: true } },
                },
            },
            attachments: { orderBy: { uploadedAt: 'desc' } },
        },
    });

    if (!deviation) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(deviation);
}

// PATCH /api/deviations/[id] - 逸脱更新
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'VIEWER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const data = await req.json();

        const existingDeviation = await prisma.deviation.findFirst({
            where: {
                id,
                tenantId: session.user.tenantId,
                isActive: true,
            },
        });

        if (!existingDeviation) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Prevent editing closed deviations
        if (existingDeviation.status === 'CLOSED' && !['ADMIN', 'QA'].includes(session.user.role)) {
            return NextResponse.json({ error: 'クローズ済みの逸脱は編集できません' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};

        // Update allowed fields
        if (data.containment !== undefined) {
            updateData.containment = data.containment;
            if (data.containment && !existingDeviation.containmentAt) {
                updateData.containmentAt = new Date();
                if (existingDeviation.status === 'OPEN') {
                    updateData.status = 'CONTAINMENT';
                }
            }
        }

        if (data.rootCause !== undefined) {
            updateData.rootCause = data.rootCause;
            if (data.rootCause && !existingDeviation.rootCauseAt) {
                updateData.rootCauseAt = new Date();
                if (['OPEN', 'CONTAINMENT'].includes(existingDeviation.status)) {
                    updateData.status = 'RCA';
                }
            }
        }

        if (data.status && ['ADMIN', 'QA'].includes(session.user.role)) {
            updateData.status = data.status;
            if (data.status === 'CLOSED') {
                updateData.closedAt = new Date();
                updateData.closeReason = data.closeReason || null;
            }
        }

        const updatedDeviation = await prisma.deviation.update({
            where: { id },
            data: updateData,
            include: {
                lot: { select: { lotNumber: true, productName: true } },
                createdBy: { select: { name: true } },
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Deviation',
            recordId: id,
            action: 'UPDATE',
            before: existingDeviation as unknown as Record<string, unknown>,
            after: updatedDeviation as unknown as Record<string, unknown>,
            reason: data.reason,
            userId: session.user.id,
        });

        return NextResponse.json(updatedDeviation);
    } catch (error) {
        console.error('Error updating deviation:', error);
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }
}
