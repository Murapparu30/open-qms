'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function AuditLogFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [filters, setFilters] = React.useState({
        tableName: searchParams.get('tableName') || '',
        action: searchParams.get('action') || '',
        userId: searchParams.get('userId') || '', // Note: In a real app, this should be a User Select
        dateFrom: searchParams.get('dateFrom') || '',
        dateTo: searchParams.get('dateTo') || '',
    });

    const handleSearch = () => {
        const params = new URLSearchParams(searchParams);
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });
        params.set('page', '1'); // Reset to page 1
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleReset = () => {
        setFilters({
            tableName: '',
            action: '',
            userId: '',
            dateFrom: '',
            dateTo: '',
        });
        router.push(pathname);
    };

    return (
        <div className="card bg-base-100 shadow-sm mb-6">
            <div className="card-body p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="form-control">
                        <label className="label"><span className="label-text">機能/テーブル</span></label>
                        <select
                            className="select select-bordered select-sm w-full"
                            value={filters.tableName}
                            onChange={(e) => setFilters({ ...filters, tableName: e.target.value })}
                        >
                            <option value="">すべて</option>
                            <option value="Document">文書</option>
                            <option value="Deviation">逸脱</option>
                            <option value="CAPA">CAPA</option>
                            <option value="Complaint">苦情</option>
                            <option value="ChangeRequest">変更管理</option>
                            <option value="User">ユーザー</option>
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">アクション</span></label>
                        <select
                            className="select select-bordered select-sm w-full"
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        >
                            <option value="">すべて</option>
                            <option value="CREATE">作成</option>
                            <option value="UPDATE">更新</option>
                            <option value="DELETE">削除</option>
                            <option value="LOGIN">ログイン</option>
                            <option value="APPROVE">承認</option>
                            <option value="REJECT">却下</option>
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">期間 (From)</span></label>
                        <input
                            type="date"
                            className="input input-bordered input-sm w-full"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text">期間 (To)</span></label>
                        <input
                            type="date"
                            className="input input-bordered input-sm w-full"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button className="btn btn-primary btn-sm flex-1" onClick={handleSearch}>検索</button>
                        <button className="btn btn-ghost btn-sm" onClick={handleReset}>リセット</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
