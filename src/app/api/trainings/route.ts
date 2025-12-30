import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// GET /api/trainings - 教育記録一覧
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    const whereClause = {
        tenantId: session.user.tenantId,
        ...(userId && { userId }),
        ...(type && { type: type as 'INTERNAL' | 'EXTERNAL' | 'OJT' | 'E_LEARNING' }),
    };

    const trainings = await prisma.training.findMany({
        where: whereClause,
        orderBy: { trainedAt: 'desc' },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    return NextResponse.json({ trainings });
}

// POST /api/trainings - 教育記録作成
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 教育管理は ADMIN, QA のみ
    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '教育管理の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { userId, title, type, description, trainedAt, expiresAt, instructor, result } = data;

        if (!userId || !title || !type || !trainedAt) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        const training = await prisma.training.create({
            data: {
                tenantId: session.user.tenantId,
                userId,
                title,
                type,
                description,
                trainedAt: new Date(trainedAt),
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                instructor,
                result: result || 'COMPLETED',
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Training',
            recordId: training.id,
            action: 'CREATE',
            before: null,
            after: training as unknown as Record<string, unknown>,
            reason: '教育記録作成',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, training }, { status: 201 });
    } catch (error) {
        console.error('Error creating training:', error);
        return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
    }
}
