import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// POST /api/changes/[id]/approve - 変更承認/却下
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 承認は QA と ADMIN のみ
    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '承認の権限がありません' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const data = await req.json();
        const { decision, comment } = data; // decision: 'APPROVED' | 'REJECTED'

        if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
            return NextResponse.json({ error: '判定結果を指定してください' }, { status: 400 });
        }

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

        if (existingChange.status !== 'PENDING') {
            return NextResponse.json({ error: '承認待ち状態ではありません' }, { status: 400 });
        }

        const updatedChange = await prisma.changeRequest.update({
            where: { id },
            data: {
                status: decision,
                approvedById: session.user.id,
                approvedAt: new Date(),
            },
            include: {
                requestedBy: { select: { name: true } },
                approvedBy: { select: { name: true } },
            },
        });

        // 承認記録を作成
        await prisma.approval.create({
            data: {
                tenantId: session.user.tenantId,
                targetType: 'CHANGE_REQUEST',
                targetId: id,
                decision: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
                comment: comment || null,
                approverId: session.user.id,
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'ChangeRequest',
            recordId: id,
            action: 'UPDATE',
            before: existingChange as unknown as Record<string, unknown>,
            after: updatedChange as unknown as Record<string, unknown>,
            reason: `変更${decision === 'APPROVED' ? '承認' : '却下'}${comment ? `: ${comment}` : ''}`,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, change: updatedChange });
    } catch (error) {
        console.error('Error approving change request:', error);
        return NextResponse.json({ error: '承認処理に失敗しました' }, { status: 500 });
    }
}
