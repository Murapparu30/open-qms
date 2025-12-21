import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { ComplaintStatus, ComplaintType, Severity } from '@prisma/client';

// GET /api/complaints - 苦情一覧取得
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ComplaintStatus | null;
    const type = searchParams.get('type') as ComplaintType | null;
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
                { complaintNumber: { contains: search } },
                { source: { contains: search } },
                { description: { contains: search } },
            ],
        }),
    };

    const [complaints, total] = await Promise.all([
        prisma.complaint.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                lot: { select: { lotNumber: true, productName: true } },
                createdBy: { select: { name: true } },
            },
        }),
        prisma.complaint.count({ where: whereClause }),
    ]);

    return NextResponse.json({
        complaints,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

// POST /api/complaints - 苦情登録
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 苦情登録は ADMIN, QA, QC が可能
    if (!['ADMIN', 'QA', 'QC'].includes(session.user.role)) {
        return NextResponse.json({ error: '苦情登録の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { type, source, description, severity, lotId, receivedAt, responseDeadline } = data;

        if (!type || !source || !description || !severity) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        // 苦情番号生成
        const year = new Date().getFullYear();
        const count = await prisma.complaint.count({
            where: {
                tenantId: session.user.tenantId,
                complaintNumber: { startsWith: `CMP-${year}-` },
            },
        });
        const complaintNumber = `CMP-${year}-${String(count + 1).padStart(3, '0')}`;

        // ロット存在チェック
        if (lotId) {
            const lot = await prisma.lot.findFirst({
                where: { id: lotId, tenantId: session.user.tenantId },
            });
            if (!lot) {
                return NextResponse.json({ error: '指定されたロットが見つかりません' }, { status: 400 });
            }
        }

        const complaint = await prisma.complaint.create({
            data: {
                tenantId: session.user.tenantId,
                complaintNumber,
                type: type as ComplaintType,
                source,
                description,
                severity: severity as Severity,
                lotId: lotId || null,
                receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
                responseDeadline: responseDeadline ? new Date(responseDeadline) : null,
                status: 'RECEIVED',
                createdById: session.user.id,
            },
            include: {
                lot: { select: { lotNumber: true, productName: true } },
                createdBy: { select: { name: true } },
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Complaint',
            recordId: complaint.id,
            action: 'CREATE',
            before: null,
            after: complaint as unknown as Record<string, unknown>,
            reason: '苦情登録',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, complaint }, { status: 201 });
    } catch (error) {
        console.error('Error creating complaint:', error);
        return NextResponse.json({ error: '苦情登録に失敗しました' }, { status: 500 });
    }
}
