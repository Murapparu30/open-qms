import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
    try {
        const { email, name, password, organizationName } = await req.json();

        if (!email || !name || !password || !organizationName) {
            return NextResponse.json({ error: 'すべての項目を入力してください' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 400 });
        }

        // Create Tenant and Admin User in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: organizationName,
                },
            });

            const passwordHash = await bcrypt.hash(password, 12);

            const user = await tx.user.create({
                data: {
                    email,
                    name,
                    passwordHash,
                    role: 'ADMIN',
                    tenantId: tenant.id,
                },
            });

            return { tenant, user };
        });

        return NextResponse.json({
            success: true,
            message: '登録が完了しました。ログインしてください。'
        }, { status: 201 });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
    }
}
