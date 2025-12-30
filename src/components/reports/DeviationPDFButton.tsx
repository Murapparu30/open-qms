'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import DeviationReport from './DeviationReport';

const PDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => <button className="btn btn-outline" disabled>準備中...</button>,
    }
);

interface DeviationPDFButtonProps {
    deviation: any; // Ideally types should be shared, using any for now to avoid duplication
}

export default function DeviationPDFButton({ deviation }: DeviationPDFButtonProps) {
    return (
        <PDFDownloadLink
            document={<DeviationReport deviation={deviation} />}
            fileName={`Deviation_${deviation.deviationNumber}.pdf`}
        >
            {({ blob, url, loading, error }) => (
                <button
                    className="btn btn-outline"
                    disabled={loading}
                    style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}
                >
                    {loading ? '生成中...' : '📄 PDF出力'}
                </button>
            )}
        </PDFDownloadLink>
    );
}
