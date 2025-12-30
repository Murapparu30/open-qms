export const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ja-JP');
};

export const formatDateTime = (date: Date | string | null | undefined): string => {
    if (!date) return '-';
    return new Date(date).toLocaleString('ja-JP');
};
