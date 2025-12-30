import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// GET /api/competencies - 力量一覧
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const includeMatrix = searchParams.get('matrix') === 'true';

    const whereClause = {
        tenantId: session.user.tenantId,
        isActive: true as const,
        ...(category && { category }),
    };

    const competencies = await prisma.competency.findMany({
        where: whereClause,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        include: includeMatrix ? {
            userCompetencies: {
                include: {
                    user: { select: { id: true, name: true, email: true } },
                },
            },
        } : undefined,
    });

    // マトリクス表示用にユーザー一覧も取得
    let users: { id: string; name: string; email: string }[] = [];
    if (includeMatrix) {
        users = await prisma.user.findMany({
            where: { tenantId: session.user.tenantId, isActive: true },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
        });
    }

    return NextResponse.json({ competencies, users });
}

// POST /api/competencies - 力量定義作成
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { name, category, description } = data;

        if (!name || !category) {
            return NextResponse.json({ error: '力量名とカテゴリは必須です' }, { status: 400 });
        }

        const competency = await prisma.competency.create({
            data: {
                tenantId: session.user.tenantId,
                name,
                category,
                description,
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Competency',
            recordId: competency.id,
            action: 'CREATE',
            before: null,
            after: competency as unknown as Record<string, unknown>,
            reason: '力量定義作成',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, competency }, { status: 201 });
    } catch (error) {
        console.error('Error creating competency:', error);
        return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
    }
}
