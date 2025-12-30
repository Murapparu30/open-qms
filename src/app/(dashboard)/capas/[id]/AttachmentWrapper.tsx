'use client';

import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues
const AttachmentSection = dynamic(
    () => import('@/components/common/AttachmentSection'),
    { ssr: false }
);

interface AttachmentWrapperProps {
    entityType: string;
    entityId: string;
}

export default function AttachmentWrapper({ entityType, entityId }: AttachmentWrapperProps) {
    return <AttachmentSection entityType={entityType} entityId={entityId} />;
}
