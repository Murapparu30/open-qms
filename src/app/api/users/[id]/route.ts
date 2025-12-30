import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// GET /api/users/[id] - ユーザー詳細
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findFirst({
        where: { id, tenantId: session.user.tenantId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ user });
}

// PATCH /api/users/[id] - ユーザー更新
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.user.findFirst({
        where: { id, tenantId: session.user.tenantId },
    });

    if (!existing) {
        return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    try {
        const data = await req.json();
        const updateData: { name?: string; role?: 'ADMIN' | 'QA' | 'QC' | 'MANUFACTURING' | 'PROCUREMENT' | 'VIEWER'; passwordHash?: string } = {};

        if (data.name) updateData.name = data.name;
        if (data.role) updateData.role = data.role;

        // パスワードリセット
        if (data.newPassword) {
            if (data.newPassword.length < 8) {
                return NextResponse.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 });
            }
            updateData.passwordHash = await bcrypt.hash(data.newPassword, 12);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                updatedAt: true,
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'User',
            recordId: id,
            action: 'UPDATE',
            before: { name: existing.name, role: existing.role },
            after: { name: updatedUser.name, role: updatedUser.role, passwordReset: !!data.newPassword },
            reason: data.reason || 'ユーザー更新',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }
}

// DELETE /api/users/[id] - ユーザー無効化
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const { id } = await params;

    // 自分自身は無効化不可
    if (id === session.user.id) {
        return NextResponse.json({ error: '自分自身を無効化することはできません' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
        where: { id, tenantId: session.user.tenantId },
    });

    if (!existing) {
        return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    await prisma.user.update({
        where: { id },
        data: { isActive: false },
    });

    await createAuditLog({
        tenantId: session.user.tenantId,
        tableName: 'User',
        recordId: id,
        action: 'CANCEL',
        before: { email: existing.email, name: existing.name, isActive: true },
        after: { isActive: false },
        reason: 'ユーザー無効化',
        userId: session.user.id,
    });

    return NextResponse.json({ success: true });
}
