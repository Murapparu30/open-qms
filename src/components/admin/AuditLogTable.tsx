'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface AuditLog {
    id: string;
    createdAt: Date;
    user: {
        name: string;
        email: string;
    } | null;
    action: string;
    tableName: string;
    recordId: string;
    details: any;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface AuditLogTableProps {
    logs: AuditLog[];
    pagination: Pagination;
}

export default function AuditLogTable({ logs, pagination }: AuditLogTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const getRecordLink = (tableName: string, recordId: string) => {
        const lowerTable = tableName.toLowerCase();
        switch (lowerTable) {
            case 'deviation':
                return `/deviations/${recordId}`;
            case 'lot':
                return `/lots/${recordId}`;
            case 'capa':
                return `/capas/${recordId}`;
            case 'complaint':
                return `/complaints/${recordId}`;
            case 'document':
                return `/documents/${recordId}`;
            case 'changerequest':
            case 'change':
                return `/changes/${recordId}`;
            case 'contractor':
                return `/contractors/${recordId}`;
            default:
                return null;
        }
    };

    const formatDetails = (details: any) => {
        if (!details) return '-';
        if (typeof details === 'string') return details;
        try {
            return JSON.stringify(details, null, 2);
        } catch (e) {
            return String(details);
        }
    };

    return (
        <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-0">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>日時</th>
                                <th>ユーザー</th>
                                <th>機能</th>
                                <th>アクション</th>
                                <th>対象ID</th>
                                <th>詳細</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-neutral-500">
                                        ログが見つかりませんでした
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id}>
                                        <td className="whitespace-nowrap text-sm">
                                            {new Date(log.createdAt).toLocaleString('ja-JP')}
                                        </td>
                                        <td>
                                            <div className="font-medium text-sm">{log.user?.name || 'Unknown'}</div>
                                            <div className="text-xs text-neutral-500">{log.user?.email}</div>
                                        </td>
                                        <td>{log.tableName}</td>
                                        <td>
                                            <span className={`badge badge-sm ${log.action === 'DELETE' ? 'badge-error' :
                                                log.action === 'UPDATE' ? 'badge-warning' :
                                                    log.action === 'APPROVE' ? 'badge-success' :
                                                        'badge-neutral'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="font-mono text-xs">
                                            {getRecordLink(log.tableName, log.recordId) ? (
                                                <Link
                                                    href={getRecordLink(log.tableName, log.recordId)!}
                                                    className="link link-primary"
                                                >
                                                    {log.recordId}
                                                </Link>
                                            ) : (
                                                log.recordId
                                            )}
                                        </td>
                                        <td>
                                            <div className="max-h-20 overflow-y-auto text-xs font-mono whitespace-pre-wrap bg-base-200 p-2 rounded">
                                                {formatDetails(log.details)}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 flex justify-between items-center border-t border-base-200">
                    <div className="text-sm text-neutral-500">
                        Total: {pagination.total} records (Page {pagination.page} of {pagination.totalPages})
                    </div>
                    <div className="join">
                        <button
                            className="join-item btn btn-sm"
                            disabled={pagination.page <= 1}
                            onClick={() => handlePageChange(pagination.page - 1)}
                        >
                            «
                        </button>
                        <button className="join-item btn btn-sm">Page {pagination.page}</button>
                        <button
                            className="join-item btn btn-sm"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => handlePageChange(pagination.page + 1)}
                        >
                            »
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
