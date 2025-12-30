import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import PDFLayout from './PDFLayout';

// スタイル定義
const styles = StyleSheet.create({
    section: {
        marginBottom: 10,
        padding: 10,
        border: '1px solid #e5e7eb',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        backgroundColor: '#f3f4f6',
        padding: 4,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    label: {
        width: 100,
        fontSize: 10,
        color: '#6b7280',
    },
    value: {
        flex: 1,
        fontSize: 10,
    },
    longText: {
        fontSize: 10,
        marginTop: 4,
        lineHeight: 1.4,
    },
});

interface DeviationReportProps {
    deviation: {
        deviationNumber: string;
        title: string;
        status: string;
        occurredAt: string | Date;
        createdBy: { name: string };
        description: string;
        causeDetails?: string | null;
        correctionDetails?: string | null;
        approvedBy?: { name: string } | null;
        approvedAt?: string | Date | null;
    };
}

export default function DeviationReport({ deviation }: DeviationReportProps) {
    return (
        <PDFLayout title={`Deviation Report: ${deviation.deviationNumber}`}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>General Information</Text>

                <View style={styles.row}>
                    <Text style={styles.label}>Title:</Text>
                    <Text style={styles.value}>{deviation.title}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Status:</Text>
                    <Text style={styles.value}>{deviation.status}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Occurred At:</Text>
                    <Text style={styles.value}>
                        {new Date(deviation.occurredAt).toLocaleDateString()}
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Reported By:</Text>
                    <Text style={styles.value}>{deviation.createdBy.name}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.longText}>{deviation.description}</Text>
            </View>

            {deviation.causeDetails && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Root Cause Analysis</Text>
                    <Text style={styles.longText}>{deviation.causeDetails}</Text>
                </View>
            )}

            {deviation.correctionDetails && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Corrective Actions</Text>
                    <Text style={styles.longText}>{deviation.correctionDetails}</Text>
                </View>
            )}

            {deviation.approvedBy && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Approval</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Approved By:</Text>
                        <Text style={styles.value}>{deviation.approvedBy.name}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Date:</Text>
                        <Text style={styles.value}>
                            {deviation.approvedAt ? new Date(deviation.approvedAt).toLocaleDateString() : ''}
                        </Text>
                    </View>
                </View>
            )}
        </PDFLayout>
    );
}
