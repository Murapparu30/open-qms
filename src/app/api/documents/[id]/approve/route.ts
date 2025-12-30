import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { verifyPassword } from '@/lib/auth/password';

interface Params {
    params: Promise<{ id: string }>;
}

// POST /api/documents/[id]/approve - 文書承認
export async function POST(req: NextRequest, { params }: Params) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '承認の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { publish, effectiveDate, password } = data; // passwordを追加

        // 1. パスワード検証 (Part 11)
        if (!password) {
            return NextResponse.json({ error: 'パスワードが必要です' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user || !user.passwordHash) {
            return NextResponse.json({ error: 'ユーザー情報が無効です' }, { status: 401 });
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 });
        }

        const existing = await prisma.document.findFirst({
            where: { id, tenantId: session.user.tenantId, isActive: true },
        });

        if (!existing) {
            return NextResponse.json({ error: '文書が見つかりません' }, { status: 404 });
        }

        if (existing.status !== 'IN_REVIEW') {
            return NextResponse.json({ error: 'レビュー中の文書のみ承認できます' }, { status: 400 });
        }

        const before = { ...existing };

        // 承認と同時に発行するかどうか
        const newStatus = publish ? 'PUBLISHED' : 'APPROVED';
        const now = new Date();

        const document = await prisma.document.update({
            where: { id },
            data: {
                status: newStatus,
                approvedById: session.user.id,
                approvedAt: now,
                ...(publish && { publishedAt: now }),
                ...(effectiveDate && { effectiveDate: new Date(effectiveDate) }),
            },
            include: {
                createdBy: { select: { name: true } },
                reviewer: { select: { name: true } },
                approvedBy: { select: { name: true } },
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Document',
            recordId: id,
            action: 'UPDATE',
            before: before as unknown as Record<string, unknown>,
            after: document as unknown as Record<string, unknown>,
            reason: publish ? '文書承認・発行 (電子署名済み)' : '文書承認 (電子署名済み)',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, document });
    } catch (error) {
        console.error('Error approving document:', error);
        return NextResponse.json({ error: '承認に失敗しました' }, { status: 500 });
    }
}
