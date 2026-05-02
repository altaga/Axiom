import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSmartSize } from '../../providers/smartProvider';

// Design Tokens
const BG = '#0e0e10';
const SURFACE = '#1E1F20';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_STANDARD = '#E3E3E3';
const TEXT_MUTED = '#9AA0A6';
const BORDER = 'rgba(255, 255, 255, 0.1)';
const ACCENT_RED = '#8B0000';
const ACCENT_GREEN = '#34D399';
const ACCENT_GOLD = '#F59E0B';

export default function DashboardPage() {
    const { isDesktop } = useSmartSize();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/dashboard');
            const data = await res.json();
            if (data.success) {
                setStats(data);
            }
        } catch (err) {
            console.error('DASHBOARD_FETCH_FAILED', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    const formatTokens = (val) => {
        const num = parseFloat(val);
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={TEXT_PRIMARY} size="large" />
                <Text style={[styles.standardText, { marginTop: 12, color: TEXT_MUTED }]}>LOADING_AXIOM_0G...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <ScrollView 
                style={styles.container} 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* 🎩 HEADER AREA - Hidden on Desktop */}
                {!isDesktop && (
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.logoText}>AXIOM</Text>
                            <Text style={styles.logoSubtext}>0G GATEWAY</Text>
                        </View>
                        <TouchableOpacity style={styles.disconnectBtn}>
                            <Text style={styles.disconnectBtnText}>Disconnect</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* 📰 PAGE TITLE & WALLET */}
                <View style={styles.pageHeader}>
                    <Text style={styles.title}>AXIOM 0G DASHBOARD</Text>
                    <Text style={styles.walletText}>WALLET: {stats?.address || "0XC86A7D5678F0ADE1A6CBBD3A8688225C..."}</Text>
                </View>

                {/* 🏦 TOP METRIC CARDS */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>NATIVE A0GI</Text>
                        <Text style={styles.metricValue}>{Number(parseFloat(stats?.nativeBalance).toFixed(6)).toString()}</Text>
                        <Text style={styles.metricSubtext}>≈ ${stats?.nativeUSDC} USD</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>LEDGER AVAILABLE</Text>
                        <Text style={[styles.metricValue, { color: ACCENT_GOLD }]}>{Number(parseFloat(stats?.ledger?.available).toFixed(6)).toString()}</Text>
                        <Text style={styles.metricSubtext}>≈ ${stats?.ledger?.availableUSDC} USD</Text>
                    </View>
                </View>

                {/* 📊 CREDITS OVERVIEW CARD */}
                <View style={styles.overviewCard}>
                    <View style={styles.overviewItem}>
                        <Text style={styles.overviewLabel}>TOTAL_CREDITS</Text>
                        <Text style={styles.overviewValue}>{stats?.ledger?.total}</Text>
                    </View>
                    <View style={styles.overviewDivider} />
                    <View style={styles.overviewItem}>
                        <Text style={styles.overviewLabel}>LOCKED_SUBS</Text>
                        <Text style={styles.overviewValue}>{stats?.ledger?.locked}</Text>
                    </View>
                </View>

                {/* 🤖 MODEL SUB-ACCOUNTS */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>MODEL SUB-ACCOUNTS</Text>
                    <View style={styles.sectionLine} />
                </View>

                <View style={styles.modelList}>
                    {stats?.subAccounts?.map((item, idx) => (
                        <View key={idx} style={styles.modelCard}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modelTier}>
                                        {item.tier} — {item.tier === "BASIC" ? "FAST" : item.tier === "ADVANCED" ? "SMART" : "POWERFUL"}
                                    </Text>
                                    <Text style={styles.modelName}>{item.model}</Text>
                                </View>
                                <View style={styles.activeBadge}>
                                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                                </View>
                            </View>

                            <View style={styles.cardDivider} />

                            <View style={styles.cardBody}>
                                <View style={styles.bodyRow}>
                                    <Text style={styles.bodyLabel}>BAL: </Text>
                                    <Text style={styles.bodyValue}>{Number(parseFloat(item.balance).toFixed(6)).toString()} Credits</Text>
                                </View>
                                <View style={styles.bodyRow}>
                                    <Text style={styles.bodyLabel}>TOKEN CAP: </Text>
                                    <Text style={styles.bodyValue}>
                                        {formatTokens(item.tokenRange.input)} (IN) — {formatTokens(item.tokenRange.output)} (OUT)
                                    </Text>
                                </View>
                                {item.pricing.input !== "0" && (
                                    <View style={styles.bodyRow}>
                                        <Text style={styles.bodyLabel}>PRICING: </Text>
                                        <Text style={styles.bodyValue}>{item.pricing.input} / {item.pricing.output}</Text>
                                    </View>
                                )}
                                <View style={[styles.bodyRow, { marginTop: 4 }]}>
                                    <Text style={styles.bodyLabel}>PROVIDER: </Text>
                                    <Text style={styles.bodyValue} numberOfLines={1}>{item.provider}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* 🔄 SYNC FOOTER */}
                <View style={styles.footer}>
                    <Text style={styles.footerLabel}>LAST_SCAN: {new Date(stats?.timestamp).toLocaleTimeString()}</Text>
                    <TouchableOpacity style={styles.syncBtn} onPress={fetchStats}>
                        <Ionicons name="scan" size={14} color={TEXT_MUTED} />
                        <Text style={styles.syncBtnText}>RE_SCAN_SYSTEM</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    headerLeft: {
        gap: 2,
    },
    logoText: {
        color: TEXT_PRIMARY,
        fontFamily: 'Inter_700Bold',
        fontSize: 18,
    },
    logoSubtext: {
        color: TEXT_MUTED,
        fontSize: 8,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        letterSpacing: 1,
    },
    disconnectBtn: {
        borderWidth: 1,
        borderColor: ACCENT_RED,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 99,
    },
    disconnectBtnText: {
        color: ACCENT_RED,
        fontFamily: 'Inter_700Bold',
        fontSize: 10,
    },
    pageHeader: {
        marginBottom: 24,
    },
    title: {
        color: TEXT_PRIMARY,
        fontFamily: 'Inter_700Bold',
        fontSize: 28,
        marginBottom: 4,
    },
    walletText: {
        color: TEXT_MUTED,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 10,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    metricCard: {
        flex: 1,
        backgroundColor: SURFACE,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: BORDER,
    },
    metricLabel: {
        color: TEXT_STANDARD,
        fontSize: 9,
        fontFamily: 'Inter_700Bold',
        marginBottom: 8,
    },
    metricValue: {
        color: TEXT_PRIMARY,
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
    },
    metricSubtext: {
        color: TEXT_MUTED,
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginTop: 4,
    },
    overviewCard: {
        backgroundColor: SURFACE,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: BORDER,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    overviewItem: {
        flex: 1,
        gap: 4,
    },
    overviewLabel: {
        color: TEXT_MUTED,
        fontSize: 8,
        fontFamily: 'Inter_700Bold',
    },
    overviewValue: {
        color: TEXT_STANDARD,
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    overviewDivider: {
        width: 1,
        height: 24,
        backgroundColor: BORDER,
        marginHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    sectionTitle: {
        color: TEXT_MUTED,
        fontSize: 11,
        fontFamily: 'Inter_700Bold',
        letterSpacing: 1,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: BORDER,
    },
    modelList: {
        gap: 12,
    },
    modelCard: {
        backgroundColor: SURFACE,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: BORDER,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    modelTier: {
        color: TEXT_PRIMARY,
        fontFamily: 'Inter_700Bold',
        fontSize: 14,
    },
    modelName: {
        color: TEXT_MUTED,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 9,
        marginTop: 2,
    },
    activeBadge: {
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    activeBadgeText: {
        color: ACCENT_GREEN,
        fontFamily: 'Inter_700Bold',
        fontSize: 8,
    },
    cardDivider: {
        height: 1,
        backgroundColor: BORDER,
        marginVertical: 12,
    },
    cardBody: {
        gap: 6,
    },
    bodyRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    bodyLabel: {
        color: TEXT_MUTED,
        fontSize: 10,
        fontFamily: 'Inter_700Bold',
    },
    bodyValue: {
        color: TEXT_STANDARD,
        fontSize: 11,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    footer: {
        marginTop: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerLabel: {
        color: TEXT_MUTED,
        fontSize: 9,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    syncBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    syncBtnText: {
        color: TEXT_MUTED,
        fontFamily: 'Inter_700Bold',
        fontSize: 9,
        textDecorationLine: 'underline',
    },
    standardText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
    }
});
