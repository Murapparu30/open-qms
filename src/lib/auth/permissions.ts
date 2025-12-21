import { Role } from '@prisma/client';

/**
 * ロール別権限定義
 */
export const ROLE_PERMISSIONS = {
    ADMIN: {
        // 全権限
        canManageUsers: true,
        canCreateLot: true,
        canViewLot: true,
        canEditLot: true,
        canReleaseLot: true,
        canCreateDeviation: true,
        canViewDeviation: true,
        canEditDeviation: true,
        canCloseDeviation: true,
        canCreateCAPA: true,
        canViewCAPA: true,
        canEditCAPA: true,
        canCloseCAPA: true,
        canManageContractors: true,
        canViewAuditLog: true,
    },
    QA: {
        // 品質保証 - 出荷判定、クローズ権限
        canManageUsers: false,
        canCreateLot: true,
        canViewLot: true,
        canEditLot: true,
        canReleaseLot: true,  // 出荷判定可能
        canCreateDeviation: true,
        canViewDeviation: true,
        canEditDeviation: true,
        canCloseDeviation: true,  // クローズ可能
        canCreateCAPA: true,
        canViewCAPA: true,
        canEditCAPA: true,
        canCloseCAPA: true,  // クローズ可能
        canManageContractors: false,
        canViewAuditLog: true,
    },
    QC: {
        // 品質管理 - 検査入力、レビュー
        canManageUsers: false,
        canCreateLot: true,
        canViewLot: true,
        canEditLot: true,
        canReleaseLot: false,
        canCreateDeviation: true,
        canViewDeviation: true,
        canEditDeviation: true,
        canCloseDeviation: false,
        canCreateCAPA: true,
        canViewCAPA: true,
        canEditCAPA: true,
        canCloseCAPA: false,
        canManageContractors: false,
        canViewAuditLog: true,
    },
    MANUFACTURING: {
        // 製造 - ロット作業、逸脱起票
        canManageUsers: false,
        canCreateLot: true,
        canViewLot: true,
        canEditLot: true,
        canReleaseLot: false,
        canCreateDeviation: true,
        canViewDeviation: true,
        canEditDeviation: true,
        canCloseDeviation: false,
        canCreateCAPA: false,
        canViewCAPA: true,
        canEditCAPA: false,
        canCloseCAPA: false,
        canManageContractors: false,
        canViewAuditLog: false,
    },
    PROCUREMENT: {
        // 購買/外注管理
        canManageUsers: false,
        canCreateLot: false,
        canViewLot: true,
        canEditLot: false,
        canReleaseLot: false,
        canCreateDeviation: true,
        canViewDeviation: true,
        canEditDeviation: false,
        canCloseDeviation: false,
        canCreateCAPA: false,
        canViewCAPA: true,
        canEditCAPA: false,
        canCloseCAPA: false,
        canManageContractors: true,  // 委託先管理可能
        canViewAuditLog: false,
    },
    VIEWER: {
        // 閲覧のみ
        canManageUsers: false,
        canCreateLot: false,
        canViewLot: true,
        canEditLot: false,
        canReleaseLot: false,
        canCreateDeviation: false,
        canViewDeviation: true,
        canEditDeviation: false,
        canCloseDeviation: false,
        canCreateCAPA: false,
        canViewCAPA: true,
        canEditCAPA: false,
        canCloseCAPA: false,
        canManageContractors: false,
        canViewAuditLog: true,
    },
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS.ADMIN;

/**
 * 指定されたロールが特定の権限を持っているか確認
 */
export function hasPermission(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

/**
 * 指定されたロールが複数の権限のいずれかを持っているか確認
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * 指定されたロールが複数の権限全てを持っているか確認
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * ロールの表示名を取得
 */
export function getRoleDisplayName(role: Role): string {
    const displayNames: Record<Role, string> = {
        ADMIN: '管理者',
        QA: '品質保証',
        QC: '品質管理',
        MANUFACTURING: '製造',
        PROCUREMENT: '購買/外注管理',
        VIEWER: '閲覧のみ',
    };
    return displayNames[role] ?? role;
}
