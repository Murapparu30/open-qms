import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { LotStatus } from '@prisma/client';

// GET /api/lots - ロット一覧取得
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as LotStatus | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const whereClause = {
        tenantId: session.user.tenantId,
        isActive: true as const,
        ...(status && { status }),
        ...(search && {
            OR: [
                { lotNumber: { contains: search } },
                { productName: { contains: search } },
                { productCode: { contains: search } },
            ],
        }),
    };

    const [lots, total] = await Promise.all([
        prisma.lot.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                createdBy: { select: { id: true, name: true } },
                releasedBy: { select: { id: true, name: true } },
                contractor: { select: { id: true, name: true } },
                _count: { select: { deviations: true } },
            },
        }),
        prisma.lot.count({ where: whereClause }),
    ]);

    return NextResponse.json({
        lots,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

// POST /api/lots - ロット新規作成
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const allowedRoles = ['ADMIN', 'QA', 'QC', 'MANUFACTURING'];
    if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const data = await req.json();

        // Validate required fields
        if (!data.lotNumber || !data.productName) {
            return NextResponse.json(
                { error: 'ロット番号と品目名は必須です' },
                { status: 400 }
            );
        }

        // Check for duplicate lot number
        const existing = await prisma.lot.findUnique({
            where: {
                tenantId_lotNumber: {
                    tenantId: session.user.tenantId,
                    lotNumber: data.lotNumber,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'このロット番号は既に登録されています' },
                { status: 400 }
            );
        }

        const lot = await prisma.lot.create({
            data: {
                tenantId: session.user.tenantId,
                lotNumber: data.lotNumber,
                productName: data.productName,
                productCode: data.productCode || null,
                manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate) : null,
                contractorId: data.contractorId || null,
                status: 'MANUFACTURING',
                createdById: session.user.id,
            },
            include: {
                createdBy: { select: { id: true, name: true } },
                contractor: { select: { id: true, name: true } },
            },
        });

        // Create audit log
        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Lot',
            recordId: lot.id,
            action: 'CREATE',
            before: null,
            after: lot as unknown as Record<string, unknown>,
            userId: session.user.id,
        });

        return NextResponse.json(lot, { status: 201 });
    } catch (error) {
        console.error('Error creating lot:', error);
        return NextResponse.json(
            { error: '作成に失敗しました' },
            { status: 500 }
        );
    }
}
