import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { DocumentCategory, DocumentStatus } from '@prisma/client';

// GET /api/documents - 文書一覧取得
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as DocumentStatus | null;
    const category = searchParams.get('category') as DocumentCategory | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const whereClause = {
        tenantId: session.user.tenantId,
        isActive: true,
        ...(status && { status }),
        ...(category && { category }),
        ...(search && {
            OR: [
                { documentNumber: { contains: search } },
                { title: { contains: search } },
            ],
        }),
    };

    const [documents, total] = await Promise.all([
        prisma.document.findMany({
            where: whereClause,
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                createdBy: { select: { name: true } },
                reviewer: { select: { name: true } },
                approvedBy: { select: { name: true } },
            },
        }),
        prisma.document.count({ where: whereClause }),
    ]);

    return NextResponse.json({
        documents,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

// POST /api/documents - 文書作成
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 文書作成は ADMIN, QA が可能
    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '文書作成の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { title, category, description, content, effectiveDate, expiresAt, reviewDueDate } = data;

        if (!title || !category || !content) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        // 文書番号生成
        const year = new Date().getFullYear();
        const count = await prisma.document.count({
            where: {
                tenantId: session.user.tenantId,
                documentNumber: { startsWith: `DOC-${year}-` },
            },
        });
        const documentNumber = `DOC-${year}-${String(count + 1).padStart(3, '0')}`;

        // トランザクションで文書と初版を作成
        const document = await prisma.$transaction(async (tx) => {
            const doc = await tx.document.create({
                data: {
                    tenantId: session.user.tenantId,
                    documentNumber,
                    title,
                    category: category as DocumentCategory,
                    description: description || null,
                    status: 'DRAFT',
                    currentVersion: 1,
                    effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                    reviewDueDate: reviewDueDate ? new Date(reviewDueDate) : null,
                    createdById: session.user.id,
                },
                include: {
                    createdBy: { select: { name: true } },
                },
            });

            // 初版を作成
            await tx.documentVersion.create({
                data: {
                    documentId: doc.id,
                    version: 1,
                    content,
                    changeReason: '初版作成',
                    createdById: session.user.id,
                },
            });

            return doc;
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Document',
            recordId: document.id,
            action: 'CREATE',
            before: null,
            after: document as unknown as Record<string, unknown>,
            reason: '文書作成',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, document }, { status: 201 });
    } catch (error) {
        console.error('Error creating document:', error);
        return NextResponse.json({ error: '文書作成に失敗しました' }, { status: 500 });
    }
}
