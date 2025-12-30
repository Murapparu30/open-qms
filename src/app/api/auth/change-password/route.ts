import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 });
        }

        // Get user with password hash
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, passwordHash: true },
        });

        if (!user) {
            return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: '現在のパスワードが正しくありません' }, { status: 400 });
        }

        // Hash new password and update
        const newHash = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
        });

        return NextResponse.json({ success: true, message: 'パスワードを変更しました' });
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json({ error: 'パスワード変更に失敗しました' }, { status: 500 });
    }
}
