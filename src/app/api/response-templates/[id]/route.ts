import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// GET /api/response-templates/[id] - テンプレート詳細取得
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.responseTemplate.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            isActive: true,
        },
    });

    if (!template) {
        return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(template);
}

// PATCH /api/response-templates/[id] - テンプレート更新
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: 'テンプレート管理の権限がありません' }, { status: 403 });
    }

    const { id } = await params;

    const existingTemplate = await prisma.responseTemplate.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            isActive: true,
        },
    });

    if (!existingTemplate) {
        return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 });
    }

    try {
        const data = await req.json();
        const { name, category, content } = data;

        const updatedTemplate = await prisma.responseTemplate.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(category && { category }),
                ...(content && { content }),
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'ResponseTemplate',
            recordId: id,
            action: 'UPDATE',
            before: existingTemplate as unknown as Record<string, unknown>,
            after: updatedTemplate as unknown as Record<string, unknown>,
            reason: 'テンプレート更新',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, template: updatedTemplate });
    } catch (error) {
        console.error('Error updating template:', error);
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }
}

// DELETE /api/response-templates/[id] - テンプレート削除（論理削除）
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: 'テンプレート管理の権限がありません' }, { status: 403 });
    }

    const { id } = await params;

    const existingTemplate = await prisma.responseTemplate.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
            isActive: true,
        },
    });

    if (!existingTemplate) {
        return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 });
    }

    const deletedTemplate = await prisma.responseTemplate.update({
        where: { id },
        data: { isActive: false },
    });

    await createAuditLog({
        tenantId: session.user.tenantId,
        tableName: 'ResponseTemplate',
        recordId: id,
        action: 'DELETE',
        before: existingTemplate as unknown as Record<string, unknown>,
        after: deletedTemplate as unknown as Record<string, unknown>,
        reason: 'テンプレート削除',
        userId: session.user.id,
    });

    return NextResponse.json({ success: true });
}
