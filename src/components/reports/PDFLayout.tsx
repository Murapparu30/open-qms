import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// フォント登録
Font.register({
    family: 'NotoSansJP',
    src: '/fonts/NotoSansJP-Regular.ttf',
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'NotoSansJP', // 日本語フォントを適用
        fontSize: 10,
    },
    header: {
        marginBottom: 20,
        borderBottom: '1px solid #000',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    companyName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        borderTop: '1px solid #000',
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 8,
    },
    pageNumber: {
        position: 'absolute',
        bottom: 30,
        right: 40,
        fontSize: 8,
    },
});

interface PDFLayoutProps {
    title: string;
    children: React.ReactNode;
}

export default function PDFLayout({ title, children }: PDFLayoutProps) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.companyName}>QMS Manufacturing Ltd.</Text>
                    <Text>Quality Management System</Text>
                </View>

                <Text style={styles.title}>{title}</Text>

                {children}

                <View style={styles.footer}>
                    <Text>Confidential - Internal Use Only</Text>
                    <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
                </View>
                <Text style={{ position: 'absolute', bottom: 15, left: 40, fontSize: 8 }}>
                    Printed: {new Date().toLocaleString()}
                </Text>
            </Page>
        </Document>
    );
}
