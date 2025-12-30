import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

interface Params {
    params: Promise<{ id: string }>;
}

// POST /api/documents/[id]/reject - 文書却下
export async function POST(req: NextRequest, { params }: Params) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '却下の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { reason } = data;

        if (!reason) {
            return NextResponse.json({ error: '却下理由を入力してください' }, { status: 400 });
        }

        const existing = await prisma.document.findFirst({
            where: { id, tenantId: session.user.tenantId, isActive: true },
        });

        if (!existing) {
            return NextResponse.json({ error: '文書が見つかりません' }, { status: 404 });
        }

        if (existing.status !== 'IN_REVIEW') {
            return NextResponse.json({ error: 'レビュー中の文書のみ却下できます' }, { status: 400 });
        }

        const before = { ...existing };

        const document = await prisma.document.update({
            where: { id },
            data: {
                status: 'DRAFT',
                reviewerId: null,
            },
            include: {
                createdBy: { select: { name: true } },
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Document',
            recordId: id,
            action: 'UPDATE',
            before: before as unknown as Record<string, unknown>,
            after: document as unknown as Record<string, unknown>,
            reason: `文書却下: ${reason}`,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, document });
    } catch (error) {
        console.error('Error rejecting document:', error);
        return NextResponse.json({ error: '却下に失敗しました' }, { status: 500 });
    }
}
