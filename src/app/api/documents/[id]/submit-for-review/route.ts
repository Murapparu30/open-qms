import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

interface Params {
    params: Promise<{ id: string }>;
}

// POST /api/documents/[id]/submit-for-review - レビュー申請
export async function POST(req: NextRequest, { params }: Params) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: 'レビュー申請の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { reviewerId } = data;

        const existing = await prisma.document.findFirst({
            where: { id, tenantId: session.user.tenantId, isActive: true },
        });

        if (!existing) {
            return NextResponse.json({ error: '文書が見つかりません' }, { status: 404 });
        }

        if (existing.status !== 'DRAFT') {
            return NextResponse.json({ error: 'ドラフト状態の文書のみレビュー申請できます' }, { status: 400 });
        }

        // レビュアー存在確認
        if (reviewerId) {
            const reviewer = await prisma.user.findFirst({
                where: { id: reviewerId, tenantId: session.user.tenantId, isActive: true },
            });
            if (!reviewer) {
                return NextResponse.json({ error: 'レビュアーが見つかりません' }, { status: 400 });
            }
        }

        const before = { ...existing };

        const document = await prisma.document.update({
            where: { id },
            data: {
                status: 'IN_REVIEW',
                reviewerId: reviewerId || null,
            },
            include: {
                createdBy: { select: { name: true } },
                reviewer: { select: { name: true } },
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Document',
            recordId: id,
            action: 'UPDATE',
            before: before as unknown as Record<string, unknown>,
            after: document as unknown as Record<string, unknown>,
            reason: 'レビュー申請',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, document });
    } catch (error) {
        console.error('Error submitting document for review:', error);
        return NextResponse.json({ error: 'レビュー申請に失敗しました' }, { status: 500 });
    }
}
