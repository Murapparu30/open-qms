import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// GET /api/response-templates - テンプレート一覧取得
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const whereClause = {
        tenantId: session.user.tenantId,
        isActive: true as const,
        ...(category && { category }),
        ...(search && {
            OR: [
                { name: { contains: search } },
                { content: { contains: search } },
            ],
        }),
    };

    const templates = await prisma.responseTemplate.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
    });

    return NextResponse.json({ templates });
}

// POST /api/response-templates - テンプレート作成
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // テンプレート管理は ADMIN, QA のみ
    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: 'テンプレート管理の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { name, category, content } = data;

        if (!name || !category || !content) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        const template = await prisma.responseTemplate.create({
            data: {
                tenantId: session.user.tenantId,
                name,
                category,
                content,
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'ResponseTemplate',
            recordId: template.id,
            action: 'CREATE',
            before: null,
            after: template as unknown as Record<string, unknown>,
            reason: 'テンプレート作成',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, template }, { status: 201 });
    } catch (error) {
        console.error('Error creating template:', error);
        return NextResponse.json({ error: 'テンプレート作成に失敗しました' }, { status: 500 });
    }
}
