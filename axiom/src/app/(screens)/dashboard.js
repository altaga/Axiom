import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';

/**
 * 🦾 0G NEURAL DASHBOARD
 * 
 * Aesthetic: Brutal Editorial / High-Contrast Monochrome
 * Accessible, Opinionated, and Mechanical.
 */

const ACCENT = '#DFFF00'; // Neon Chartreuse
const BG = '#050505';     // Deep Obsidian
const BORDER = '#1A1A1A'; // Hard Edge

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/dashboard');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error('DASHBOARD_FETCH_FAILED', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator color={ACCENT} size="large" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* 📰 HEADER: Editorial Contrast */}
            <View style={styles.header}>
                <Text style={styles.preTitle}>NETWORK_OPERATIONS</Text>
                <Text style={styles.title}>NEURAL_DASHBOARD</Text>
                <View style={styles.statusPill}>
                    <View style={styles.dot} />
                    <Text style={styles.statusText}>{stats?.network} // ONLINE</Text>
                </View>
            </View>

            {/* 📊 METRICS GRID */}
            <View style={styles.grid}>
                {stats?.data.map((item, idx) => (
                    <View key={idx} style={[styles.card, !item.active && styles.cardInactive]}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.tierLabel}>{item.tier}</Text>
                            <Text style={styles.statusBadge}>{item.active ? 'WARM' : 'COLD'}</Text>
                        </View>

                        {item.active ? (
                            <View style={styles.cardBody}>
                                <View style={styles.dataRow}>
                                    <Text style={styles.dataKey}>PROVIDER</Text>
                                    <Text style={styles.dataValue} numberOfLines={1}>{item.provider}</Text>
                                </View>
                                <View style={styles.dataRow}>
                                    <Text style={styles.dataKey}>BALANCE</Text>
                                    <Text style={[styles.dataValue, styles.highlightText]}>{parseFloat(item.balance).toFixed(4)} $0G</Text>
                                </View>
                                <View style={styles.dataRow}>
                                    <Text style={styles.dataKey}>MODEL</Text>
                                    <Text style={styles.dataValue}>{item.model}</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.pricingRow}>
                                    <Text style={styles.dataKey}>PRICING (IN/OUT)</Text>
                                    <Text style={styles.pricingText}>
                                        {item.pricing.input} / {item.pricing.output}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.cardBodyCenter}>
                                <Text style={styles.inactiveText}>INSTANCE_OFFLINE</Text>
                                <Text style={styles.subtext}>Awaiting first request for initialization.</Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>

            {/* 🔗 SYSTEM INFO */}
            <View style={styles.footer}>
                <View style={styles.footerBlock}>
                    <Text style={styles.footerKey}>CHAIN_ID</Text>
                    <Text style={styles.footerValue}>{stats?.chainId}</Text>
                </View>
                <View style={styles.footerBlock}>
                    <Text style={styles.footerKey}>LAST_SYNC</Text>
                    <Text style={styles.footerValue}>{new Date(stats?.timestamp).toLocaleTimeString()}</Text>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={fetchStats}>
                    <Text style={styles.refreshBtnText}>REFRESH_HANDSHAKE</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
    },
    content: {
        padding: 24,
        paddingTop: 60,
    },
    header: {
        marginBottom: 48,
    },
    preTitle: {
        color: ACCENT,
        fontFamily: 'Inter_700Bold',
        fontSize: 12,
        letterSpacing: 4,
        marginBottom: 8,
    },
    title: {
        color: '#FFF',
        fontFamily: 'Bungee_400Regular',
        fontSize: 48,
        lineHeight: 48,
        marginBottom: 16,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 9999,
        alignSelf: 'flex-start',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: ACCENT,
        marginRight: 8,
    },
    statusText: {
        color: '#666',
        fontFamily: 'Inter_400Regular',
        fontSize: 10,
        letterSpacing: 1,
    },
    grid: {
        flexDirection: 'column',
        gap: 20,
    },
    card: {
        backgroundColor: '#0A0A0A',
        borderWidth: 1,
        borderColor: BORDER,
        padding: 20,
        borderRadius: 0, // Razor sharp edges
    },
    cardInactive: {
        opacity: 0.5,
        borderStyle: 'dashed',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    tierLabel: {
        color: '#FFF',
        fontFamily: 'Bungee_400Regular',
        fontSize: 20,
    },
    statusBadge: {
        backgroundColor: '#111',
        color: '#666',
        paddingHorizontal: 8,
        paddingVertical: 4,
        fontSize: 10,
        fontFamily: 'Inter_700Bold',
        borderWidth: 1,
        borderColor: '#222',
    },
    cardBody: {
        gap: 12,
    },
    cardBodyCenter: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dataKey: {
        color: '#444',
        fontFamily: 'Inter_700Bold',
        fontSize: 9,
        letterSpacing: 1,
    },
    dataValue: {
        color: '#AAA',
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        maxWidth: '60%',
    },
    highlightText: {
        color: ACCENT,
        fontFamily: 'Inter_700Bold',
    },
    divider: {
        height: 1,
        backgroundColor: BORDER,
        marginVertical: 8,
    },
    pricingRow: {
        flexDirection: 'column',
        gap: 4,
    },
    pricingText: {
        color: '#666',
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
    },
    inactiveText: {
        color: '#333',
        fontFamily: 'Bungee_400Regular',
        fontSize: 16,
        marginBottom: 4,
    },
    subtext: {
        color: '#222',
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
        textAlign: 'center',
    },
    footer: {
        marginTop: 60,
        paddingTop: 32,
        borderTopWidth: 2,
        borderTopColor: '#111',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 40,
        alignItems: 'center',
    },
    footerBlock: {
        gap: 4,
    },
    footerKey: {
        color: '#333',
        fontSize: 9,
        fontFamily: 'Inter_700Bold',
        letterSpacing: 2,
    },
    footerValue: {
        color: '#666',
        fontSize: 14,
        fontFamily: 'Bungee_400Regular',
    },
    refreshBtn: {
        backgroundColor: ACCENT,
        paddingHorizontal: 24,
        paddingVertical: 12,
        marginLeft: 'auto',
    },
    refreshBtnText: {
        color: '#000',
        fontFamily: 'Inter_700Bold',
        fontSize: 12,
    }
});
