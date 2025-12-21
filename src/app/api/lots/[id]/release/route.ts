import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// POST /api/lots/[id]/release - 出荷判定実行
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only QA and ADMIN can release
    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '出荷判定の権限がありません' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const data = await req.json();
        const { decision, comment, evidence } = data;

        if (!decision || !['APPROVED', 'REJECTED', 'CONDITIONAL'].includes(decision)) {
            return NextResponse.json({ error: '判定結果が不正です' }, { status: 400 });
        }

        if (decision !== 'APPROVED' && !comment) {
            return NextResponse.json({ error: '条件付き承認または却下の場合はコメントが必須です' }, { status: 400 });
        }

        const existingLot = await prisma.lot.findFirst({
            where: {
                id,
                tenantId: session.user.tenantId,
                isActive: true,
            },
        });

        if (!existingLot) {
            return NextResponse.json({ error: 'ロットが見つかりません' }, { status: 404 });
        }

        if (existingLot.status !== 'PENDING_RELEASE') {
            return NextResponse.json({ error: 'このロットは判定待ち状態ではありません' }, { status: 400 });
        }

        // Map decision to status
        const newStatus = decision === 'APPROVED' ? 'RELEASED' : decision === 'REJECTED' ? 'REJECTED' : 'RELEASED';

        const updatedLot = await prisma.lot.update({
            where: { id },
            data: {
                status: newStatus,
                releaseDecision: decision,
                releaseComment: comment || null,
                releaseEvidence: evidence ? JSON.stringify(evidence) : null,
                releasedById: session.user.id,
                releasedAt: new Date(),
            },
        });

        // Create approval record
        await prisma.approval.create({
            data: {
                tenantId: session.user.tenantId,
                targetType: 'LOT_RELEASE',
                targetId: id,
                decision: decision,
                comment: comment || null,
                evidence: evidence ? JSON.stringify(evidence) : null,
                approverId: session.user.id,
            },
        });

        // Create audit log
        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Lot',
            recordId: id,
            action: 'UPDATE',
            before: existingLot as unknown as Record<string, unknown>,
            after: updatedLot as unknown as Record<string, unknown>,
            reason: `出荷判定: ${decision === 'APPROVED' ? '承認' : decision === 'REJECTED' ? '却下' : '条件付き承認'}`,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, lot: updatedLot });
    } catch (error) {
        console.error('Error releasing lot:', error);
        return NextResponse.json({ error: '出荷判定に失敗しました' }, { status: 500 });
    }
}
