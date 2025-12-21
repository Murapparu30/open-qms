import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { Severity, DeviationStatus } from '@prisma/client';

// 重大度に応じた期限計算（日数）
const SEVERITY_DUE_DAYS: Record<Severity, number> = {
    CRITICAL: 7,
    HIGH: 14,
    MEDIUM: 30,
    LOW: 60,
};

// 逸脱番号生成
async function generateDeviationNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DEV-${year}-`;

    const lastDeviation = await prisma.deviation.findFirst({
        where: {
            tenantId,
            deviationNumber: { startsWith: prefix },
        },
        orderBy: { deviationNumber: 'desc' },
    });

    if (!lastDeviation) {
        return `${prefix}001`;
    }

    const lastNumber = parseInt(lastDeviation.deviationNumber.slice(-3));
    return `${prefix}${String(lastNumber + 1).padStart(3, '0')}`;
}

// GET /api/deviations - 逸脱一覧取得
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as DeviationStatus | null;
    const severity = searchParams.get('severity') as Severity | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const whereClause = {
        tenantId: session.user.tenantId,
        isActive: true as const,
        ...(status && { status }),
        ...(severity && { severity }),
        ...(search && {
            OR: [
                { deviationNumber: { contains: search } },
                { description: { contains: search } },
            ],
        }),
    };

    const [deviations, total] = await Promise.all([
        prisma.deviation.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                lot: { select: { lotNumber: true, productName: true } },
                createdBy: { select: { name: true } },
            },
        }),
        prisma.deviation.count({ where: whereClause }),
    ]);

    return NextResponse.json({
        deviations,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

// POST /api/deviations - 逸脱新規作成
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 閲覧のみ以外は起票可能
    if (session.user.role === 'VIEWER') {
        return NextResponse.json({ error: '逸脱起票の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();

        // Validate required fields
        if (!data.lotId || !data.description || !data.severity || !data.shipmentImpact || !data.discoveryProcess) {
            return NextResponse.json(
                { error: '必須項目を入力してください' },
                { status: 400 }
            );
        }

        // Verify lot exists
        const lot = await prisma.lot.findFirst({
            where: {
                id: data.lotId,
                tenantId: session.user.tenantId,
                isActive: true,
            },
        });

        if (!lot) {
            return NextResponse.json({ error: 'ロットが見つかりません' }, { status: 404 });
        }

        const deviationNumber = await generateDeviationNumber(session.user.tenantId);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + SEVERITY_DUE_DAYS[data.severity as Severity]);

        const deviation = await prisma.deviation.create({
            data: {
                tenantId: session.user.tenantId,
                deviationNumber,
                lotId: data.lotId,
                occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
                discoveryProcess: data.discoveryProcess,
                description: data.description,
                severity: data.severity,
                shipmentImpact: data.shipmentImpact,
                containment: data.containment || null,
                status: 'OPEN',
                dueDate,
                createdById: session.user.id,
            },
            include: {
                lot: { select: { lotNumber: true, productName: true } },
                createdBy: { select: { name: true } },
            },
        });

        // If lot is in manufacturing or inspection, put it on hold
        if (['MANUFACTURING', 'INSPECTION'].includes(lot.status) && data.shipmentImpact === 'YES') {
            await prisma.lot.update({
                where: { id: lot.id },
                data: { status: 'ON_HOLD' },
            });
        }

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Deviation',
            recordId: deviation.id,
            action: 'CREATE',
            before: null,
            after: deviation as unknown as Record<string, unknown>,
            userId: session.user.id,
        });

        return NextResponse.json(deviation, { status: 201 });
    } catch (error) {
        console.error('Error creating deviation:', error);
        return NextResponse.json({ error: '逸脱起票に失敗しました' }, { status: 500 });
    }
}
