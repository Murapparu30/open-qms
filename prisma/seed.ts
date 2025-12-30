import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

async function main() {
    console.log('🌱 Seeding database...');

    // Create default tenant
    const tenant = await prisma.tenant.upsert({
        where: { id: 'default-tenant' },
        update: {},
        create: {
            id: 'default-tenant',
            name: 'デモ企業',
        },
    });

    console.log('✓ Created tenant:', tenant.name);

    // Create default admin user
    const adminPassword = await hashPassword('admin123');
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            name: '管理者',
            passwordHash: adminPassword,
            role: Role.ADMIN,
            tenantId: tenant.id,
        },
    });

    console.log('✓ Created admin user:', admin.email);

    // Create QA user
    const qaPassword = await hashPassword('qa123');
    const qa = await prisma.user.upsert({
        where: { email: 'qa@example.com' },
        update: {},
        create: {
            email: 'qa@example.com',
            name: '品質保証担当',
            passwordHash: qaPassword,
            role: Role.QA,
            tenantId: tenant.id,
        },
    });

    console.log('✓ Created QA user:', qa.email);

    // Create QC user
    const qcPassword = await hashPassword('qc123');
    const qc = await prisma.user.upsert({
        where: { email: 'qc@example.com' },
        update: {},
        create: {
            email: 'qc@example.com',
            name: '品質管理担当',
            passwordHash: qcPassword,
            role: Role.QC,
            tenantId: tenant.id,
        },
    });

    console.log('✓ Created QC user:', qc.email);

    // Create Manufacturing user
    const mfgPassword = await hashPassword('mfg123');
    const mfg = await prisma.user.upsert({
        where: { email: 'mfg@example.com' },
        update: {},
        create: {
            email: 'mfg@example.com',
            name: '製造担当',
            passwordHash: mfgPassword,
            role: Role.MANUFACTURING,
            tenantId: tenant.id,
        },
    });

    console.log('✓ Created Manufacturing user:', mfg.email);

    // Create sample contractor
    const contractor = await prisma.contractor.upsert({
        where: { id: 'sample-contractor' },
        update: {},
        create: {
            id: 'sample-contractor',
            tenantId: tenant.id,
            name: 'サンプル製造委託先',
            type: 'MANUFACTURER',
            contactPerson: '山田太郎',
            contactEmail: 'yamada@contractor.example.com',
        },
    });

    console.log('✓ Created contractor:', contractor.name);

    // Create sample lot
    const lot = await prisma.lot.upsert({
        where: {
            tenantId_lotNumber: {
                tenantId: tenant.id,
                lotNumber: 'LOT-2024-001',
            },
        },
        update: {},
        create: {
            tenantId: tenant.id,
            lotNumber: 'LOT-2024-001',
            productName: 'サンプル製品A',
            productCode: 'PROD-A',
            manufacturingDate: new Date('2024-12-01'),
            status: 'PENDING_RELEASE',
            createdById: admin.id,
        },
    });

    console.log('✓ Created sample lot:', lot.lotNumber);

    // Create linked Deviation and Complaint for Traceability Verification
    const deviation = await prisma.deviation.upsert({
        where: { tenantId_deviationNumber: { tenantId: tenant.id, deviationNumber: 'DEV-2025-LINKED' } },
        update: {},
        create: {
            tenantId: tenant.id,
            deviationNumber: 'DEV-2025-LINKED',
            lotId: lot.id,
            occurredAt: new Date(),
            discoveryProcess: '製造工程',
            description: 'トレーサビリティ検証用逸脱（苦情とリンク）',
            severity: 'MEDIUM',
            shipmentImpact: 'NO',
            createdById: admin.id,
        },
    });

    const complaint = await prisma.complaint.upsert({
        where: { tenantId_complaintNumber: { tenantId: tenant.id, complaintNumber: 'CPT-2025-LINKED' } },
        update: {},
        create: {
            tenantId: tenant.id,
            complaintNumber: 'CPT-2025-LINKED',
            type: 'CUSTOMER',
            source: '検証用顧客',
            receivedAt: new Date(),
            description: 'この苦情は逸脱（DEV-2025-LINKED）に関連しています',
            severity: 'MEDIUM',
            createdById: admin.id,
            deviationId: deviation.id,
            lotId: lot.id,
        },
    });

    console.log('✓ Created linked records for traceability:', deviation.deviationNumber, '<->', complaint.complaintNumber);

    console.log('');
    console.log('🎉 Seeding completed!');
    console.log('');
    console.log('テストユーザー:');
    console.log('  admin@example.com / admin123 (管理者)');
    console.log('  qa@example.com / qa123 (品質保証)');
    console.log('  qc@example.com / qc123 (品質管理)');
    console.log('  mfg@example.com / mfg123 (製造)');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
