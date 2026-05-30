import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, ScrollView, Platform, SafeAreaView, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Milk, UserPlus, Trash2, Download, TrendingUp, DollarSign, Calendar, ChevronRight, X, User, Edit3 } from 'lucide-react-native';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AppDatePicker from '../components/AppDatePicker';

export default function MilkScreen() {
    const [entries, setEntries] = useState([]);
    const [vendees, setVendees] = useState([]);
    const [cows, setCows] = useState([]);
    const [isEntryModalVisible, setEntryModalVisible] = useState(false);
    const [isVendeeModalVisible, setVendeeModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // UI Mode State
    const [isEntryEditMode, setIsEntryEditMode] = useState(false);
    const [editEntryId, setEditEntryId] = useState(null);
    const [isVendeeEditMode, setIsVendeeEditMode] = useState(false);
    const [editVendeeId, setEditVendeeId] = useState(null);

    // Entry Form State
    const [selectedCowId, setSelectedCowId] = useState('');
    const [selectedVendeeId, setSelectedVendeeId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [session, setSession] = useState('Morning'); // New: Morning or Evening

    // Vendee Form State
    const [vendeeName, setVendeeName] = useState('');
    const [vendeeRate, setVendeeRate] = useState('');

    const fetchData = async () => {
        try {
            const [milkRes, vendeeRes, cowRes] = await Promise.all([
                supabase.from('milk_entries').select('*, cows(id, name), vendees(id, name, rate)').order('date', { ascending: false }),
                supabase.from('vendees').select('*').order('name', { ascending: true }),
                supabase.from('cows').select('*').order('name', { ascending: true })
            ]);
            if (milkRes.error) throw milkRes.error;
            if (vendeeRes.error) throw vendeeRes.error;
            if (cowRes.error) throw cowRes.error;

            const mappedMilk = (milkRes.data || []).map(e => ({
                _id: e.id,
                quantity: e.quantity,
                rate: e.rate,
                totalPrice: e.total_price,
                date: e.date,
                session: e.session,
                cow: e.cows ? { _id: e.cows.id, name: e.cows.name } : null,
                vendee: e.vendees ? { _id: e.vendees.id, name: e.vendees.name, rate: e.vendees.rate } : null
            }));

            const mappedVendees = (vendeeRes.data || []).map(v => ({
                _id: v.id,
                name: v.name,
                rate: v.rate,
                date: v.created_at
            }));

            const mappedCows = (cowRes.data || []).map(c => ({
                _id: c.id,
                name: c.name,
                age: c.age,
                calvedCount: c.calved_count,
                isPregnant: c.is_pregnant,
                matingDate: c.mating_date,
                buyingDate: c.buying_date,
                cost: c.cost,
                imageUrl: c.image_url,
                date: c.created_at
            }));

            setEntries(mappedMilk);
            setVendees(mappedVendees);
            setCows(mappedCows);

            if (mappedVendees.length > 0 && !selectedVendeeId) {
                setSelectedVendeeId(mappedVendees[0]._id);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData().finally(() => setRefreshing(false));
    }, []);

    const handleAddVendee = async () => {
        if (!vendeeName.trim() || !vendeeRate) {
            Alert.alert('Error', 'Please enter vendee name and rate.');
            return;
        }
        try {
            if (isVendeeEditMode) {
                const { error } = await supabase.from('vendees').update({
                    name: vendeeName.trim(),
                    rate: Number(vendeeRate)
                }).eq('id', editVendeeId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('vendees').insert([{
                    name: vendeeName.trim(),
                    rate: Number(vendeeRate)
                }]);
                if (error) throw error;
            }
            setVendeeName('');
            setVendeeRate('');
            setIsVendeeEditMode(false);
            setEditVendeeId(null);
            setVendeeModalVisible(false);
            fetchData();
        } catch (err) {
            Alert.alert('Error', 'Failed to save vendee');
        }
    };

    const openEditVendee = (vendee) => {
        setVendeeName(vendee.name);
        setVendeeRate(vendee.rate.toString());
        setIsVendeeEditMode(true);
        setEditVendeeId(vendee._id);
    };

    const handleDeleteVendee = async (id) => {
        const performDelete = async () => {
            try {
                const { error } = await supabase.from('vendees').delete().eq('id', id);
                if (error) throw error;
                fetchData();
            } catch (err) {
                Alert.alert('Error', 'Failed to delete vendee');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Delete this vendee and all associated records?')) performDelete();
        } else {
            Alert.alert('Delete Vendee', 'Confirm deletion?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: performDelete }
            ]);
        }
    };

    const handleAddEntry = async () => {
        if (!selectedVendeeId || !quantity) {
            Alert.alert('Error', 'Please select a vendee and enter quantity.');
            return;
        }

        const vendee = vendees.find(v => v._id === selectedVendeeId);
        if (!vendee) return;

        try {
            const data = {
                cow_id: selectedCowId || null,
                vendee_id: selectedVendeeId,
                quantity: Number(quantity),
                rate: vendee.rate,
                total_price: Number(quantity) * vendee.rate,
                date: new Date(date).toISOString(),
                session: session
            };

            if (isEntryEditMode) {
                const { error } = await supabase.from('milk_entries').update(data).eq('id', editEntryId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('milk_entries').insert([data]);
                if (error) throw error;
            }

            setEntryModalVisible(false);
            setIsEntryEditMode(false);
            setEditEntryId(null);
            setQuantity('');
            fetchData();
        } catch (err) {
            console.error('Add entry error:', err.message);
            Alert.alert('Error', 'Failed to save milk entry');
        }
    };

    const openEditEntry = (entry) => {
        setSelectedCowId(entry.cow?._id || '');
        setSelectedVendeeId(entry.vendee?._id || '');
        setQuantity(entry.quantity.toString());
        setDate(entry.date.split('T')[0]);
        setSession(entry.session || 'Morning');
        setIsEntryEditMode(true);
        setEditEntryId(entry._id);
        setEntryModalVisible(true);
    };

    const handleDeleteEntry = (id) => {
        const performDelete = async () => {
            try {
                const { error } = await supabase.from('milk_entries').delete().eq('id', id);
                if (error) throw error;
                setEntries(prev => prev.filter(e => e._id !== id));
            } catch (err) {
                Alert.alert('Error', 'Failed to delete record');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Remove this entry?')) performDelete();
        } else {
            Alert.alert('Delete Record', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: performDelete }
            ]);
        }
    };

    // Calculation for daily totals
    const totals = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEntries = entries.filter(e => e.date.split('T')[0] === todayStr);

        const milkTotal = todayEntries.reduce((acc, curr) => acc + curr.quantity, 0);
        const moneyTotal = todayEntries.reduce((acc, curr) => acc + curr.totalPrice, 0);

        return { milk: milkTotal.toFixed(1), money: moneyTotal.toFixed(2) };
    }, [entries]);

    const exportToExcel = async () => {
        try {
            if (entries.length === 0) {
                Alert.alert('No data', 'Nothing to export.');
                return;
            }

            const data = entries.map(e => ({
                Date: e.date ? new Date(e.date).toLocaleDateString() : 'N/A',
                Vendee: e.vendee?.name || 'Unknown',
                Session: e.session || 'Unknown/Older',
                'Quantity (L)': e.quantity || 0,
                'Rate (₹)': e.rate || 0,
                'Total (₹)': e.totalPrice || 0,
                Cow: e.cow?.name || 'Unknown'
            }));

            const totalQty = data.reduce((sum, item) => sum + (Number(item['Quantity (L)']) || 0), 0);
            const totalEarnings = data.reduce((sum, item) => sum + (Number(item['Total (₹)']) || 0), 0);
            
            // Sub-totals calculation
            const morningEntries = data.filter(item => item.Session === 'Morning');
            const morningQty = morningEntries.reduce((sum, item) => sum + (Number(item['Quantity (L)']) || 0), 0);
            const morningEarnings = morningEntries.reduce((sum, item) => sum + (Number(item['Total (₹)']) || 0), 0);

            const eveningEntries = data.filter(item => item.Session === 'Evening');
            const eveningQty = eveningEntries.reduce((sum, item) => sum + (Number(item['Quantity (L)']) || 0), 0);
            const eveningEarnings = eveningEntries.reduce((sum, item) => sum + (Number(item['Total (₹)']) || 0), 0);

            data.push({ Date: '', Vendee: '', Session: '', 'Quantity (L)': '', 'Rate (₹)': '', 'Total (₹)': '', Cow: '' }); // Spacing row
            
            data.push({
                Date: '---',
                Vendee: 'MORNING TOTAL',
                Session: 'Morning',
                'Quantity (L)': morningQty,
                'Rate (₹)': '-',
                'Total (₹)': morningEarnings,
                Cow: '---'
            });

            data.push({
                Date: '---',
                Vendee: 'EVENING TOTAL',
                Session: 'Evening',
                'Quantity (L)': eveningQty,
                'Rate (₹)': '-',
                'Total (₹)': eveningEarnings,
                Cow: '---'
            });
            
            data.push({ Date: '', Vendee: '', Session: '', 'Quantity (L)': '', 'Rate (₹)': '', 'Total (₹)': '', Cow: '' }); // Spacing row

            data.push({
                Date: '---',
                Vendee: 'GRAND TOTAL',
                Session: '---',
                'Quantity (L)': totalQty,
                'Rate (₹)': '-',
                'Total (₹)': totalEarnings,
                Cow: '---'
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Milk_Records");

            const fileName = `Milk_Records_${new Date().getTime()}.xlsx`;

            if (Platform.OS === 'web') {
                XLSX.writeFile(wb, fileName);
            } else {
                const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
                const uri = FileSystem.cacheDirectory + fileName;
                await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
                await Sharing.shareAsync(uri);
            }
        } catch (err) {
            console.error('Excel Export Error:', err);
            Alert.alert('Export Failed', 'An error occurred while generating the Excel file.');
        }
    };

    const renderEntry = ({ item }) => (
        <View style={styles.entryCard}>
            <View style={styles.entryHeader}>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.vendeeBadge}>{item.vendee?.name || 'Unknown Buyer'}</Text>
                        <View style={[styles.sessionBadge, { backgroundColor: item.session === 'Evening' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(59, 130, 246, 0.15)' }]}>
                            <Text style={[styles.sessionBadgeText, { color: item.session === 'Evening' ? '#eab308' : '#3b82f6' }]}>{item.session || 'Morning'}</Text>
                        </View>
                    </View>
                    <Text style={styles.entryDate}>{new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => openEditEntry(item)}>
                        <Edit3 size={17} color="#bba284" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteEntry(item._id)}>
                        <Trash2 size={17} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.entryMain}>
                <View style={styles.entryStat}>
                    <Text style={styles.entryVal}>{item.quantity} L</Text>
                    <Text style={styles.entrySub}>Quantity</Text>
                </View>
                <View style={styles.entryDivider} />
                <View style={styles.entryStat}>
                    <Text style={styles.entryVal}>₹{item.rate}</Text>
                    <Text style={styles.entrySub}>Rate/L</Text>
                </View>
                <View style={styles.entryDivider} />
                <View style={styles.entryStat}>
                    <Text style={[styles.entryVal, { color: '#22c55e' }]}>₹{item.totalPrice}</Text>
                    <Text style={styles.entrySub}>Total Earn</Text>
                </View>
            </View>
            {item.cow && <Text style={styles.entryCow}>Produced by: {item.cow.name}</Text>}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topActions}>
                <TouchableOpacity
                    style={styles.actionPill}
                    onPress={() => setVendeeModalVisible(true)}
                >
                    <UserPlus size={18} color="#bba284" />
                    <Text style={styles.actionPillText}>Vendees</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionPill, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}
                    onPress={exportToExcel}
                >
                    <Download size={18} color="#22c55e" />
                    <Text style={[styles.actionPillText, { color: '#22c55e' }]}>Excel Export</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={entries}
                keyExtractor={item => item._id}
                renderItem={renderEntry}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bba284" />}
                ListHeaderComponent={() => (
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>TODAY'S TURNOVER</Text>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryCol}>
                                <Text style={styles.summaryVal}>{totals.milk}</Text>
                                <Text style={styles.summaryLabel}>Total Liters</Text>
                            </View>
                            <View style={styles.summaryDiv} />
                            <View style={styles.summaryCol}>
                                <Text style={[styles.summaryVal, { color: '#22c55e' }]}>₹{totals.money}</Text>
                                <Text style={styles.summaryLabel}>Expected Revenue</Text>
                            </View>
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No sales recorded yet.</Text>}
            />

            <TouchableOpacity style={styles.fab} onPress={() => { setIsEntryEditMode(false); setEntryModalVisible(true); }}>
                <Milk size={28} color="#26170d" />
            </TouchableOpacity>

            {/* Milk Entry Modal */}
            <Modal visible={isEntryModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEntryEditMode ? 'Update Record' : 'Record Milk Sale'}</Text>
                            <TouchableOpacity onPress={() => { setEntryModalVisible(false); setIsEntryEditMode(false); }} style={styles.closeBtn}>
                                <X size={24} color="#8a7c6f" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.label}>Choose Vendee / Buyer</Text>
                            <FlatList
                                horizontal
                                data={vendees}
                                keyExtractor={v => v._id}
                                style={{ marginBottom: 20 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.miniBtn, selectedVendeeId === item._id && styles.miniBtnActive]}
                                        onPress={() => setSelectedVendeeId(item._id)}
                                    >
                                        <Text style={[styles.miniBtnText, selectedVendeeId === item._id && styles.miniBtnTextActive]}>{item.name}</Text>
                                        <Text style={[styles.miniBtnSub, selectedVendeeId === item._id && styles.miniBtnSubActive]}>₹{item.rate}/L</Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={() => (
                                    <TouchableOpacity onPress={() => { setEntryModalVisible(false); setVendeeModalVisible(true); }}>
                                        <Text style={{ color: '#ef4444', fontStyle: 'italic' }}>+ Please add a vendee first</Text>
                                    </TouchableOpacity>
                                )}
                            />

                            <Text style={styles.label}>Producer Cow (Optional)</Text>
                            <FlatList
                                horizontal
                                data={cows}
                                keyExtractor={c => c._id}
                                style={{ marginBottom: 20 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.miniBtn, selectedCowId === item._id && styles.miniBtnActive]}
                                        onPress={() => setSelectedCowId(selectedCowId === item._id ? '' : item._id)}
                                    >
                                        <Text style={[styles.miniBtnText, selectedCowId === item._id && styles.miniBtnTextActive]}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            />

                            <Text style={styles.label}>Quantity Sold (Liters)</Text>
                            <TextInput
                                style={styles.input}
                                value={quantity}
                                onChangeText={setQuantity}
                                placeholder="0.0"
                                keyboardType="numeric"
                                placeholderTextColor="#8a7c6f"
                            />

                            <Text style={styles.label}>Session (Morning/Evening)</Text>
                            <View style={styles.sessionRow}>
                                <TouchableOpacity 
                                    style={[styles.sessionBtn, session === 'Morning' && styles.sessionBtnActive]} 
                                    onPress={() => setSession('Morning')}
                                >
                                    <Text style={[styles.sessionBtnText, session === 'Morning' && styles.sessionBtnTextActive]}>MORNING</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.sessionBtn, session === 'Evening' && styles.sessionBtnActive]} 
                                    onPress={() => setSession('Evening')}
                                >
                                    <Text style={[styles.sessionBtnText, session === 'Evening' && styles.sessionBtnTextActive]}>EVENING</Text>
                                </TouchableOpacity>
                            </View>

                            <AppDatePicker
                                label="Date"
                                dateString={date}
                                onDateChange={setDate}
                                placeholder="Sale Date"
                            />

                            <TouchableOpacity style={styles.submitBtn} onPress={handleAddEntry}>
                                <Text style={styles.submitBtnText}>{isEntryEditMode ? 'Save Changes' : 'Add Sale Record'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Vendee Management Modal */}
            <Modal visible={isVendeeModalVisible} animationType="fade" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.vendeeModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isVendeeEditMode ? 'Edit Vendee' : 'Manage Vendees'}</Text>
                            <TouchableOpacity onPress={() => { setVendeeModalVisible(false); setIsVendeeEditMode(false); }} style={styles.closeBtn}>
                                <X size={24} color="#8a7c6f" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.addVendeeBox}>
                            <TextInput
                                style={styles.smallInput}
                                placeholder="Vendee Name"
                                value={vendeeName}
                                onChangeText={setVendeeName}
                                placeholderTextColor="#8a7c6f"
                            />
                            <TextInput
                                style={styles.smallInput}
                                placeholder="Rate (₹/L)"
                                value={vendeeRate}
                                onChangeText={setVendeeRate}
                                keyboardType="numeric"
                                placeholderTextColor="#8a7c6f"
                            />
                            <TouchableOpacity style={[styles.addBtn, isVendeeEditMode && { backgroundColor: '#bba284' }]} onPress={handleAddVendee}>
                                <Text style={[styles.addBtnText, isVendeeEditMode && { color: '#26170d' }]}>{isVendeeEditMode ? 'Update' : 'Save'}</Text>
                            </TouchableOpacity>
                            {isVendeeEditMode && (
                                <TouchableOpacity style={{ marginTop: 5, alignItems: 'center' }} onPress={() => { setIsVendeeEditMode(false); setVendeeName(''); setVendeeRate(''); }}>
                                    <Text style={{ color: '#ef4444', fontSize: 12 }}>Cancel Edit</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <FlatList
                            data={vendees}
                            keyExtractor={v => v._id}
                            style={{ maxHeight: 300 }}
                            renderItem={({ item }) => (
                                <View style={styles.vendeeItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.vendeeItemName}>{item.name}</Text>
                                        <Text style={styles.vendeeItemRate}>₹{item.rate} per Liter</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 15 }}>
                                        <TouchableOpacity onPress={() => openEditVendee(item)}>
                                            <Edit3 size={18} color="#bba284" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteVendee(item._id)}>
                                            <Trash2 size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#26170d' },
    topActions: { flexDirection: 'row', padding: 20, gap: 12, borderBottomWidth: 1, borderBottomColor: '#382a20' },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(187, 162, 132, 0.1)',
        borderRadius: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(187, 162, 132, 0.2)'
    },
    actionPillText: { color: '#bba284', fontWeight: '700', fontSize: 13 },
    listContent: { padding: 20, paddingBottom: 100 },
    summaryCard: {
        backgroundColor: '#382a20',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#4d3f34',
    },
    summaryTitle: { fontSize: 13, fontWeight: '700', color: '#8a7c6f', letterSpacing: 1, marginBottom: 15 },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryCol: { flex: 1 },
    summaryDiv: { width: 1, height: 40, backgroundColor: '#4d3f34', marginHorizontal: 20 },
    summaryVal: { fontSize: 26, fontWeight: '800', color: '#fff' },
    summaryLabel: { fontSize: 12, color: '#8a7c6f', marginTop: 4 },

    entryCard: {
        backgroundColor: 'rgba(56, 42, 32, 0.6)',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#382a20',
    },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    vendeeBadge: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
    entryDate: { fontSize: 12, color: '#8a7c6f' },
    entryMain: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#26170d', borderRadius: 12, padding: 12 },
    entryStat: { flex: 1, alignItems: 'center' },
    entryDivider: { width: 1, height: 20, backgroundColor: '#382a20' },
    entryVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
    entrySub: { fontSize: 10, color: '#8a7c6f', marginTop: 2 },
    entryCow: { fontSize: 11, color: '#bba284', marginTop: 10, fontStyle: 'italic' },

    emptyText: { textAlign: 'center', marginTop: 50, color: '#8a7c6f', fontSize: 15 },

    fab: {
        position: 'absolute', bottom: 30, right: 30,
        backgroundColor: '#bba284', width: 64, height: 64,
        borderRadius: 32, justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8
    },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#26170d',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '90%',
        borderTopWidth: 1,
        borderTopColor: '#382a20',
    },
    vendeeModal: {
        backgroundColor: '#26170d',
        borderRadius: 24,
        margin: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#382a20',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
    label: { fontSize: 14, fontWeight: '700', color: '#8a7c6f', marginBottom: 12 },
    input: {
        backgroundColor: '#382a20',
        borderRadius: 14,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#4d3f34',
    },
    miniBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#382a20',
        marginRight: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#4d3f34',
    },
    miniBtnActive: { backgroundColor: '#bba284', borderColor: '#bba284' },
    miniBtnText: { color: '#8a7c6f', fontWeight: '700', fontSize: 13 },
    miniBtnTextActive: { color: '#26170d' },
    miniBtnSub: { fontSize: 10, color: '#6b6056', marginTop: 2 },
    miniBtnSubActive: { color: 'rgba(38, 23, 13, 0.6)' },

    submitBtn: {
        backgroundColor: '#bba284',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnText: { color: '#26170d', fontSize: 17, fontWeight: '800' },

    addVendeeBox: { gap: 10, marginBottom: 20, backgroundColor: '#382a20', padding: 15, borderRadius: 14 },
    smallInput: {
        backgroundColor: '#26170d',
        borderRadius: 10,
        padding: 12,
        color: '#fff',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#4d3f34',
    },
    addBtn: { backgroundColor: '#22c55e', padding: 12, borderRadius: 10, alignItems: 'center' },
    addBtnText: { color: '#fff', fontWeight: 'bold' },

    vendeeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#382a20'
    },
    vendeeItemName: { fontSize: 16, fontWeight: '700', color: '#fff' },
    vendeeItemRate: { fontSize: 13, color: '#8a7c6f' },
    sessionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    sessionBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#382a20', alignItems: 'center', borderWidth: 1, borderColor: '#4d3f34' },
    sessionBtnActive: { backgroundColor: '#bba284', borderColor: '#bba284' },
    sessionBtnText: { color: '#8a7c6f', fontWeight: '800', fontSize: 12 },
    sessionBtnTextActive: { color: '#26170d' },
    sessionBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    sessionBadgeText: { fontSize: 9, fontWeight: '800' },
});
