import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { ChangeStatus, ChangeType, Priority } from '@prisma/client';

// GET /api/changes - 変更一覧取得
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ChangeStatus | null;
    const type = searchParams.get('type') as ChangeType | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const whereClause = {
        tenantId: session.user.tenantId,
        isActive: true as const,
        ...(status && { status }),
        ...(type && { type }),
        ...(search && {
            OR: [
                { changeNumber: { contains: search } },
                { title: { contains: search } },
            ],
        }),
    };

    const [changes, total] = await Promise.all([
        prisma.changeRequest.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                requestedBy: { select: { name: true } },
                approvedBy: { select: { name: true } },
            },
        }),
        prisma.changeRequest.count({ where: whereClause }),
    ]);

    return NextResponse.json({
        changes,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

// POST /api/changes - 変更起票
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 変更起票は ADMIN, QA, MANUFACTURING が可能
    if (!['ADMIN', 'QA', 'MANUFACTURING'].includes(session.user.role)) {
        return NextResponse.json({ error: '変更起票の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { type, title, description, priority, affectedArea, targetDate } = data;

        if (!type || !title || !description) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        // 変更番号生成
        const year = new Date().getFullYear();
        const count = await prisma.changeRequest.count({
            where: {
                tenantId: session.user.tenantId,
                changeNumber: { startsWith: `CHG-${year}-` },
            },
        });
        const changeNumber = `CHG-${year}-${String(count + 1).padStart(3, '0')}`;

        const change = await prisma.changeRequest.create({
            data: {
                tenantId: session.user.tenantId,
                changeNumber,
                type: type as ChangeType,
                title,
                description,
                priority: (priority as Priority) || 'MEDIUM',
                affectedArea: affectedArea || null,
                targetDate: targetDate ? new Date(targetDate) : null,
                status: 'DRAFT',
                requestedById: session.user.id,
            },
            include: {
                requestedBy: { select: { name: true } },
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'ChangeRequest',
            recordId: change.id,
            action: 'CREATE',
            before: null,
            after: change as unknown as Record<string, unknown>,
            reason: '変更起票',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, change }, { status: 201 });
    } catch (error) {
        console.error('Error creating change request:', error);
        return NextResponse.json({ error: '変更起票に失敗しました' }, { status: 500 });
    }
}
