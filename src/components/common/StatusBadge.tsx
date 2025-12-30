import React from 'react';

type BadgeType = 'status' | 'severity' | 'type';

interface StatusBadgeProps {
    value: string;
    type?: BadgeType;
}

const statusMap: Record<string, { label: string; className: string }> = {
    // Deviation Status
    OPEN: { label: '起票済み', className: 'badge-primary' },
    CONTAINMENT: { label: '封じ込め中', className: 'badge-warning' },
    RCA: { label: '原因調査中', className: 'badge-warning' },
    CAPA: { label: 'CAPA対応中', className: 'badge-warning' },
    VERIFICATION: { label: '有効性確認中', className: 'badge-primary' },
    CLOSED: { label: 'クローズ', className: 'badge-success' },
    CANCELLED: { label: '取消', className: 'badge-neutral' },
    // CAPA Status
    IN_PROGRESS: { label: '対応中', className: 'badge-warning' },
    // Complaint Status
    RECEIVED: { label: '受付', className: 'badge-neutral' },
    INVESTIGATING: { label: '調査中', className: 'badge-warning' },
    RESOLVED: { label: '対処完了', className: 'badge-success' },
    // Complaint Type
    CUSTOMER: { label: '👤 顧客苦情', className: 'badge-outline' },
    INTERNAL: { label: '🏭 社内発見', className: 'badge-outline' },
    EXTERNAL: { label: '🏢 外部機関', className: 'badge-outline' },
    // Severity
    LOW: { label: '軽微', className: 'badge-neutral' },
    MEDIUM: { label: '中程度', className: 'badge-warning' },
    HIGH: { label: '重大', className: 'badge-error' },
    CRITICAL: { label: '致命的', className: 'badge-error' },
};

export default function StatusBadge({ value, type = 'status' }: StatusBadgeProps) {
    const config = statusMap[value] || { label: value, className: 'badge-outline' };

    // Add 'badge' prefix if not present in className (though map has it without 'badge ')
    // But DaisyUI expects 'badge badge-primary'.

    return (
        <span className={`badge ${config.className} px-3 py-1`}>
            {config.label}
        </span>
    );
}
