import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
];

// GET /api/attachments - 添付ファイル一覧取得
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
        return NextResponse.json({ error: 'entityType と entityId は必須です' }, { status: 400 });
    }

    const attachments = await prisma.attachment.findMany({
        where: {
            tenantId: session.user.tenantId,
            entityType,
            entityId,
        },
        include: {
            uploadedBy: {
                select: { id: true, name: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ attachments });
}

// POST /api/attachments - ファイルアップロード
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const entityType = formData.get('entityType') as string;
        const entityId = formData.get('entityId') as string;

        if (!file || !entityType || !entityId) {
            return NextResponse.json({ error: 'file, entityType, entityId は必須です' }, { status: 400 });
        }

        // ファイルサイズチェック
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'ファイルサイズは10MB以下にしてください' }, { status: 400 });
        }

        // MIMEタイプチェック
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: '許可されていないファイル形式です' }, { status: 400 });
        }

        // ディレクトリ作成
        await mkdir(UPLOAD_DIR, { recursive: true });

        // ファイル保存
        const ext = path.extname(file.name);
        const fileName = `${randomUUID()}${ext}`;
        const filePath = path.join(UPLOAD_DIR, fileName);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        // DB保存
        const attachment = await prisma.attachment.create({
            data: {
                tenantId: session.user.tenantId,
                fileName,
                originalName: file.name,
                filePath: `/uploads/${fileName}`,
                mimeType: file.type,
                size: file.size,
                entityType,
                entityId,
                uploadedById: session.user.id,
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Attachment',
            recordId: attachment.id,
            action: 'CREATE',
            before: null,
            after: { fileName: file.name, entityType, entityId },
            reason: 'ファイルアップロード',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, attachment }, { status: 201 });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'ファイルアップロードに失敗しました' }, { status: 500 });
    }
}
