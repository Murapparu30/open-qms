import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { CAPAStatus, CAPAType, CAPASourceType } from '@prisma/client';

// GET /api/capas - CAPA一覧取得
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as CAPAStatus | null;
    const type = searchParams.get('type') as CAPAType | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const whereClause = {
        tenantId: session.user.tenantId,
        ...(status && { status }),
        ...(type && { type }),
        ...(search && {
            OR: [
                { capaNumber: { contains: search } },
                { description: { contains: search } },
            ],
        }),
    };

    const [capas, total] = await Promise.all([
        prisma.cAPA.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                assignee: { select: { name: true } },
                deviation: { select: { deviationNumber: true } },
                complaint: { select: { complaintNumber: true } },
            },
        }),
        prisma.cAPA.count({ where: whereClause }),
    ]);

    return NextResponse.json({
        capas,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

// POST /api/capas - CAPA作成
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CAPA作成は ADMIN, QA が可能
    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: 'CAPA作成の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { sourceType, sourceId, type, description, assigneeId, dueDate, verificationMethod, verificationPeriod } = data;

        if (!sourceType || !type || !description || !assigneeId || !dueDate) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        // CAPA番号生成
        const year = new Date().getFullYear();
        const count = await prisma.cAPA.count({
            where: {
                tenantId: session.user.tenantId,
                capaNumber: { startsWith: `CAPA-${year}-` },
            },
        });
        const capaNumber = `CAPA-${year}-${String(count + 1).padStart(3, '0')}`;

        // 担当者存在チェック
        const assignee = await prisma.user.findFirst({
            where: { id: assigneeId, tenantId: session.user.tenantId },
        });
        if (!assignee) {
            return NextResponse.json({ error: '担当者が見つかりません' }, { status: 400 });
        }

        const capa = await prisma.cAPA.create({
            data: {
                tenantId: session.user.tenantId,
                capaNumber,
                sourceType: sourceType as CAPASourceType,
                deviationId: sourceType === 'DEVIATION' ? sourceId : null,
                complaintId: sourceType === 'COMPLAINT' ? sourceId : null,
                type: type as CAPAType,
                description,
                assigneeId,
                dueDate: new Date(dueDate),
                verificationMethod: verificationMethod || null,
                verificationPeriod: verificationPeriod || null,
                status: 'OPEN',
                createdById: session.user.id,
            },
            include: {
                assignee: { select: { name: true } },
                deviation: { select: { deviationNumber: true } },
                complaint: { select: { complaintNumber: true } },
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'CAPA',
            recordId: capa.id,
            action: 'CREATE',
            before: null,
            after: capa as unknown as Record<string, unknown>,
            reason: 'CAPA作成',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, capa }, { status: 201 });
    } catch (error) {
        console.error('Error creating CAPA:', error);
        return NextResponse.json({ error: 'CAPA作成に失敗しました' }, { status: 500 });
    }
}
