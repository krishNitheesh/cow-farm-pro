import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Milk, Wallet, Activity, BookOpen, ChevronRight, Wheat, Target, Settings as SettingsIcon, Users } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
    const { logout } = useContext(AuthContext);
    const [stats, setStats] = useState({
        totalCows: 0,
        milkProducedToday: 0,
        totalExpenses: 0,
        walletBalance: 0,
        topCowName: '',
        topCowMilk: 0
    });
    const [refreshing, setRefreshing] = useState(false);
    
    // Customization State
    const [farmName, setFarmName] = useState('cow-farm-pro');
    const [milkTarget, setMilkTarget] = useState(100);
    const [currency, setCurrency] = useState('₹');
    const [userInitial, setUserInitial] = useState('U');

    const [zoomVal, setZoomVal] = useState('Medium');
    const [avatarType, setAvatarType] = useState('initial');
    const [avatarValue, setAvatarValue] = useState('');
    const [avatarBgColor, setAvatarBgColor] = useState('#4d3f34');

    const fetchDashboard = async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [cowsCountRes, milkTodayRes, transactionsRes, milkAllRes, milkEntriesWithCows] = await Promise.all([
                supabase.from('cows').select('*', { count: 'exact', head: true }),
                supabase.from('milk_entries').select('quantity').gte('date', today.toISOString()),
                supabase.from('transactions').select('type, amount'),
                supabase.from('milk_entries').select('total_price'),
                supabase.from('milk_entries').select('quantity, cows(name)').gte('date', today.toISOString())
            ]);

            if (cowsCountRes.error) throw cowsCountRes.error;
            if (milkTodayRes.error) throw milkTodayRes.error;
            if (transactionsRes.error) throw transactionsRes.error;
            if (milkAllRes.error) throw milkAllRes.error;
            if (milkEntriesWithCows.error) throw milkEntriesWithCows.error;

            const totalCows = cowsCountRes.count || 0;
            const milkProducedToday = (milkTodayRes.data || []).reduce((acc, entry) => acc + (Number(entry.quantity) || 0), 0);
            const totalMilkRevenue = (milkAllRes.data || []).reduce((acc, entry) => acc + (Number(entry.total_price) || 0), 0);

            let walletBalance = totalMilkRevenue;
            let totalExpenses = 0;

            (transactionsRes.data || []).forEach(t => {
                const amt = Number(t.amount) || 0;
                if (t.type === 'income') {
                    walletBalance += amt;
                } else {
                    walletBalance -= amt;
                    totalExpenses += amt;
                }
            });

            const cowMilkMap = {};
            (milkEntriesWithCows.data || []).forEach(entry => {
                if (entry.cows && entry.cows.name) {
                    const name = entry.cows.name;
                    cowMilkMap[name] = (cowMilkMap[name] || 0) + Number(entry.quantity);
                }
            });
            let topCowName = '';
            let topCowMilk = 0;
            Object.keys(cowMilkMap).forEach(name => {
                if (cowMilkMap[name] > topCowMilk) {
                    topCowMilk = cowMilkMap[name];
                    topCowName = name;
                }
            });

            setStats({
                totalCows,
                milkProducedToday,
                totalExpenses,
                walletBalance,
                topCowName,
                topCowMilk
            });
        } catch (error) {
            console.log('Error fetching dashboard stats:', error);
        }
    };

    const fetchCustomSettings = async () => {
        try {
            const storedName = await AsyncStorage.getItem('farmName');
            const storedTarget = await AsyncStorage.getItem('milkTarget');
            const storedCurrency = await AsyncStorage.getItem('currency');
            
            const storedZoom = await AsyncStorage.getItem('zoomPreference');
            const storedBgColor = await AsyncStorage.getItem('avatarBgColor');
            const storedType = await AsyncStorage.getItem('avatarType');
            const storedVal = await AsyncStorage.getItem('avatarValue');

            if (storedName) setFarmName(storedName);
            if (storedTarget) setMilkTarget(Number(storedTarget));
            if (storedCurrency) setCurrency(storedCurrency);

            if (storedZoom) setZoomVal(storedZoom);
            if (storedBgColor) setAvatarBgColor(storedBgColor);
            if (storedType) setAvatarType(storedType);
            if (storedVal) setAvatarValue(storedVal);

            // Fetch Supabase user profile name/initial
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const name = user.user_metadata?.username || user.user_metadata?.full_name || user.email || 'U';
                setUserInitial(name.charAt(0).toUpperCase());
            }
        } catch (err) {
            console.log('Settings error', err);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDashboard();
            fetchCustomSettings();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboard().finally(() => setRefreshing(false));
    }, []);

    const getZoomScale = (zoom) => {
        switch (zoom) {
            case 'Small': return 0.85;
            case 'Large': return 1.15;
            case 'Extra Large': return 1.30;
            default: return 1.0;
        }
    };

    const scale = getZoomScale(zoomVal);
    const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    const todayStr = new Date().toLocaleDateString('en-US', dateOptions).toUpperCase();

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bba284" />}
        >
            <View style={styles.header}>
                <View>
                    <Text style={[styles.dateText, { fontSize: 13 * scale }]}>{todayStr}</Text>
                    <Text style={[styles.headerTitle, { fontSize: 34 * scale }]}>{farmName}</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('Settings')} 
                    style={[
                        styles.profileBtn,
                        {
                            width: 44 * scale,
                            height: 44 * scale,
                            borderRadius: (44 * scale) / 2,
                            backgroundColor: avatarBgColor,
                            borderWidth: 1.5,
                            borderColor: 'rgba(255, 255, 255, 0.15)',
                            shadowColor: avatarBgColor,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.35,
                            shadowRadius: 8,
                            elevation: 4
                        }
                    ]}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.profileInitial, { fontSize: (avatarType === 'emoji' ? 20 : 16) * scale }]}>
                        {avatarType === 'initial' 
                            ? userInitial 
                            : (avatarType === 'emoji' ? avatarValue || '🐄' : avatarValue || 'U')}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.flatCard}>
                <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardHeaderText, { fontSize: 15 * scale }]}>ACTIVITY</Text>
                    <ChevronRight size={16 * scale} color="#8a7c6f" />
                </View>

                <View style={styles.activityRow}>
                    <View style={styles.activityCol}>
                        <Text style={[styles.activityValue, { fontSize: 38 * scale }]}>{stats.milkProducedToday}</Text>
                        <Text style={[styles.activityUnit, { fontSize: 16 * scale }]}>Liters</Text>
                        <Text style={[styles.activityLabel, { color: '#e1dacb', fontSize: 15 * scale }]}>Milk Today</Text>
                    </View>
                    <View style={styles.activityDivider} />
                    <View style={styles.activityCol}>
                        <Text style={[styles.activityValue, { fontSize: 38 * scale }]}>{stats.totalCows}</Text>
                        <Text style={[styles.activityUnit, { fontSize: 16 * scale }]}>Head</Text>
                        <Text style={[styles.activityLabel, { color: '#bba284', fontSize: 15 * scale }]}>Total Cows</Text>
                    </View>
                </View>
                {stats.topCowName ? (
                    <View style={{ marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#4d3f34', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#8a7c6f', fontSize: 13 * scale, fontWeight: '700' }}>👑 TOP PERFORMER TODAY</Text>
                        <Text style={{ color: '#bba284', fontSize: 13 * scale, fontWeight: '800' }}>{stats.topCowName} ({stats.topCowMilk} L)</Text>
                    </View>
                ) : null}
            </View>

            <Text style={[styles.sectionTitle, { fontSize: 22 * scale }]}>Finances</Text>

            <View style={styles.flatCardRow}>
                <View style={[styles.flatCard, styles.halfCard]}>
                    <View style={styles.cardHeaderRowSmall}>
                        <Wallet size={16 * scale} color="#10b981" />
                        <Text style={[styles.cardHeaderTextSmall, { fontSize: 13 * scale }]}>WALLET</Text>
                    </View>
                    <Text style={[styles.financeValue, { fontSize: 26 * scale }]}>{currency}{stats.walletBalance}</Text>
                    <Text style={[styles.financeLabel, { fontSize: 14 * scale }]}>Net Balance</Text>
                </View>

                <View style={[styles.flatCard, styles.halfCard]}>
                    <View style={styles.cardHeaderRowSmall}>
                        <Activity size={16 * scale} color="#ef4444" />
                        <Text style={[styles.cardHeaderTextSmall, { fontSize: 13 * scale }]}>EXPENSES</Text>
                    </View>
                    <Text style={[styles.financeValue, { fontSize: 26 * scale }]}>{currency}{stats.totalExpenses}</Text>
                    <Text style={[styles.financeLabel, { fontSize: 14 * scale }]}>Total Out</Text>
                </View>
            </View>

            <Text style={[styles.sectionTitle, { fontSize: 22 * scale }]}>Daily Milk Target</Text>

            <View style={[styles.flatCard, { paddingVertical: 25 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Target size={18 * scale} color="#bba284" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#e1dacb', fontSize: 15 * scale, fontWeight: '700' }}>Goal: {milkTarget} Liters</Text>
                    </View>
                    <Text style={{ color: '#8a7c6f', fontSize: 13 * scale, fontWeight: '600' }}>
                        {stats.milkProducedToday} / {milkTarget} L
                    </Text>
                </View>

                {/* Animated / Static Progress Bar */}
                <View style={{ height: 12, backgroundColor: '#1a0e08', borderRadius: 6, overflow: 'hidden' }}>
                    <View style={{ 
                        width: `${Math.min(100, (stats.milkProducedToday / milkTarget) * 100)}%`, 
                        height: '100%', 
                        backgroundColor: stats.milkProducedToday >= milkTarget ? '#10b981' : '#bba284', 
                        borderRadius: 6 
                    }} />
                </View>
                <Text style={{ color: '#8a7c6f', fontSize: 12 * scale, marginTop: 10, textAlign: 'right' }}>
                    {stats.milkProducedToday >= milkTarget ? '🎉 Goal Achieved!' : `${milkTarget - stats.milkProducedToday} Liters to go!`}
                </Text>
            </View>

            <Text style={[styles.sectionTitle, { fontSize: 22 * scale }]}>Manage Farm</Text>

            <View style={styles.listContainer}>
                <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Cows')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#382a20', width: 32 * scale, height: 32 * scale, borderRadius: 8 * scale }]}>
                        <BookOpen size={20 * scale} color="#bba284" />
                    </View>
                    <Text style={[styles.listText, { fontSize: 17 * scale }]}>Cow Book</Text>
                    <ChevronRight size={20 * scale} color="#6b6056" />
                </TouchableOpacity>

                <View style={styles.listSeparator} />

                <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Milk')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#382a20', width: 32 * scale, height: 32 * scale, borderRadius: 8 * scale }]}>
                        <Milk size={20 * scale} color="#e1dacb" />
                    </View>
                    <Text style={[styles.listText, { fontSize: 17 * scale }]}>Milk Entries</Text>
                    <ChevronRight size={20 * scale} color="#6b6056" />
                </TouchableOpacity>

                <View style={styles.listSeparator} />

                <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Finance')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#382a20', width: 32 * scale, height: 32 * scale, borderRadius: 8 * scale }]}>
                        <Wallet size={20 * scale} color="#10b981" />
                    </View>
                    <Text style={[styles.listText, { fontSize: 17 * scale }]}>Financial Records</Text>
                    <ChevronRight size={20 * scale} color="#6b6056" />
                </TouchableOpacity>

                <View style={styles.listSeparator} />

                <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Health')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#382a20', width: 32 * scale, height: 32 * scale, borderRadius: 8 * scale }]}>
                        <Activity size={20 * scale} color="#ef4444" />
                    </View>
                    <Text style={[styles.listText, { fontSize: 17 * scale }]}>Health & Medical</Text>
                    <ChevronRight size={20 * scale} color="#6b6056" />
                </TouchableOpacity>

                <View style={styles.listSeparator} />

                <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Feed')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#382a20', width: 32 * scale, height: 32 * scale, borderRadius: 8 * scale }]}>
                        <Wheat size={20 * scale} color="#10b981" />
                    </View>
                    <Text style={[styles.listText, { fontSize: 17 * scale }]}>Diet & Feed Book</Text>
                    <ChevronRight size={20 * scale} color="#6b6056" />
                </TouchableOpacity>

                <View style={styles.listSeparator} />

                <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Vendees')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#382a20', width: 32 * scale, height: 32 * scale, borderRadius: 8 * scale }]}>
                        <Users size={20 * scale} color="#bba284" />
                    </View>
                    <Text style={[styles.listText, { fontSize: 17 * scale }]}>Customers & Buyers</Text>
                    <ChevronRight size={20 * scale} color="#6b6056" />
                </TouchableOpacity>

                <View style={styles.listSeparator} />

                <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate('Settings')}>
                    <View style={[styles.listIconBox, { backgroundColor: '#382a20', width: 32 * scale, height: 32 * scale, borderRadius: 8 * scale }]}>
                        <SettingsIcon size={20 * scale} color="#ef4444" />
                    </View>
                    <Text style={[styles.listText, { fontSize: 17 * scale }]}>App Customization</Text>
                    <ChevronRight size={20 * scale} color="#6b6056" />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#26170d' },
    contentContainer: { paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 60, marginBottom: 20 },
    dateText: { fontSize: 13, fontWeight: '600', color: '#8a7c6f', letterSpacing: 0.5, marginBottom: 2 },
    headerTitle: { fontSize: 34, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
    profileBtn: { width: 36, height: 36, backgroundColor: '#4d3f34', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    profileInitial: { color: '#e1dacb', fontWeight: 'bold', fontSize: 16 },
    sectionTitle: { fontSize: 22, fontWeight: '700', marginTop: 25, marginBottom: 10, color: '#ffffff', paddingHorizontal: 20 },
    flatCard: { backgroundColor: '#382a20', borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 15 },
    flatCardRow: { flexDirection: 'row', paddingHorizontal: 20, justifyContent: 'space-between' },
    halfCard: { width: '48%', marginHorizontal: 0, padding: 18 },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    cardHeaderRowSmall: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    cardHeaderText: { fontSize: 15, fontWeight: '600', color: '#8a7c6f', letterSpacing: 0.5 },
    cardHeaderTextSmall: { fontSize: 13, fontWeight: '700', color: '#8a7c6f', marginLeft: 6, letterSpacing: 0.5 },
    activityRow: { flexDirection: 'row', alignItems: 'flex-start' },
    activityCol: { flex: 1 },
    activityDivider: { width: 1, backgroundColor: '#4d3f34', height: '100%', marginHorizontal: 15 },
    activityValue: { fontSize: 38, fontWeight: '800', color: '#ffffff', letterSpacing: -1 },
    activityUnit: { fontSize: 16, fontWeight: '600', color: '#b0a091', marginBottom: 5 },
    activityLabel: { fontSize: 15, fontWeight: '600' },
    financeValue: { fontSize: 26, fontWeight: '700', color: '#ffffff', letterSpacing: -0.5, marginBottom: 4 },
    financeLabel: { fontSize: 14, fontWeight: '500', color: '#b0a091' },
    listContainer: { backgroundColor: '#382a20', borderRadius: 20, marginHorizontal: 20, paddingVertical: 5 },
    listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
    listIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    listText: { flex: 1, fontSize: 17, fontWeight: '500', color: '#ffffff' },
    listSeparator: { height: 1, backgroundColor: '#4d3f34', marginLeft: 60 }
});
