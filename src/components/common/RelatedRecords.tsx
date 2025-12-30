import React from 'react';
import Link from 'next/link';

interface RelatedRecord {
    id: string;
    number: string;
    title: string;
    status: string;
    link: string;
}

interface RelatedRecordsProps {
    title: string;
    records: RelatedRecord[];
    emptyMessage?: string;
}

export default function RelatedRecords({ title, records, emptyMessage = '関連レコードはありません' }: RelatedRecordsProps) {
    return (
        <div className="card bg-base-100 shadow-sm mt-6">
            <div className="card-body">
                <h2 className="card-title text-lg mb-4">{title}</h2>

                {records.length === 0 ? (
                    <p className="text-neutral-500 text-sm">{emptyMessage}</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {records.map((record) => (
                            <Link
                                key={record.id}
                                href={record.link}
                                className="block p-4 border rounded-lg hover:bg-base-50 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-mono text-sm font-bold text-primary">{record.number}</span>
                                    <span className="badge badge-sm badge-outline">{record.status}</span>
                                </div>
                                <div className="text-sm font-medium line-clamp-1">{record.title}</div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
