import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// POST /api/deviations/[id]/close - 逸脱クローズ
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only QA and ADMIN can close deviations
    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '逸脱クローズの権限がありません' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const data = await req.json();
        const { closeReason, verificationResult } = data;

        if (!closeReason) {
            return NextResponse.json({ error: 'クローズ理由は必須です' }, { status: 400 });
        }

        const existingDeviation = await prisma.deviation.findFirst({
            where: {
                id,
                tenantId: session.user.tenantId,
                isActive: true,
            },
            include: {
                capas: true,
            },
        });

        if (!existingDeviation) {
            return NextResponse.json({ error: '逸脱が見つかりません' }, { status: 404 });
        }

        if (existingDeviation.status === 'CLOSED') {
            return NextResponse.json({ error: 'この逸脱は既にクローズされています' }, { status: 400 });
        }

        // Check close conditions
        const closeConditions = {
            hasContainment: !!existingDeviation.containment,
            hasRootCause: !!existingDeviation.rootCause,
            allCapasClosed: existingDeviation.capas.every(capa => capa.status === 'CLOSED'),
            hasVerification: !!verificationResult,
        };

        const allConditionsMet = Object.values(closeConditions).every(Boolean);

        if (!allConditionsMet && !data.forceClose) {
            return NextResponse.json({
                error: 'クローズ条件が満たされていません',
                conditions: closeConditions,
            }, { status: 400 });
        }

        const updatedDeviation = await prisma.deviation.update({
            where: { id },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                closeReason,
            },
            include: {
                lot: { select: { lotNumber: true, productName: true } },
                createdBy: { select: { name: true } },
            },
        });

        // If lot was on hold due to this deviation, check if it can be released
        if (existingDeviation.shipmentImpact === 'YES') {
            const lot = await prisma.lot.findUnique({
                where: { id: existingDeviation.lotId },
                include: {
                    deviations: {
                        where: { isActive: true, status: { not: 'CLOSED' } },
                    },
                },
            });

            if (lot && lot.status === 'ON_HOLD' && lot.deviations.length === 0) {
                await prisma.lot.update({
                    where: { id: lot.id },
                    data: { status: 'PENDING_RELEASE' },
                });
            }
        }

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Deviation',
            recordId: id,
            action: 'UPDATE',
            before: existingDeviation as unknown as Record<string, unknown>,
            after: updatedDeviation as unknown as Record<string, unknown>,
            reason: `逸脱クローズ: ${closeReason}`,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, deviation: updatedDeviation });
    } catch (error) {
        console.error('Error closing deviation:', error);
        return NextResponse.json({ error: 'クローズに失敗しました' }, { status: 500 });
    }
}
