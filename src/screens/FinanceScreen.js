import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, ScrollView, Platform, SafeAreaView, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Wallet, TrendingUp, TrendingDown, Edit3, Trash2, Plus, Calendar, X, AlignLeft, Download } from 'lucide-react-native';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AppDatePicker from '../components/AppDatePicker';

export default function FinanceScreen() {
    const [transactions, setTransactions] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [allMilkRevenue, setAllMilkRevenue] = useState(0);
    const [milkEntries, setMilkEntries] = useState([]);

    // Form State
    const [type, setType] = useState('income');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');

    const fetchMilkTurnover = async () => {
        try {
            const { data, error } = await supabase
                .from('milk_entries')
                .select('id, quantity, total_price, date, session, vendees(name)');
            
            if (error) throw error;
            
            const revenue = (data || []).reduce((sum, item) => sum + Number(item.total_price), 0);
            
            setAllMilkRevenue(revenue);
            setMilkEntries(data || []);
        } catch (err) {
            console.error('Error fetching milk turnover:', err);
        }
    };

    const fetchTransactions = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            const mapped = (data || []).map(t => ({
                _id: t.id,
                type: t.type,
                amount: t.amount,
                category: t.category,
                description: t.remarks || '',
                date: t.date
            }));
            setTransactions(mapped);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
            fetchMilkTurnover();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([fetchTransactions(), fetchMilkTurnover()]).finally(() => setRefreshing(false));
    }, []);

    const totals = useMemo(() => {
        let income = 0;
        let expense = 0;
        transactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });
        income += allMilkRevenue;
        return {
            income: income.toFixed(2),
            expense: expense.toFixed(2),
            balance: (income - expense).toFixed(2)
        };
    }, [transactions, allMilkRevenue]);

    const todayLiters = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return milkEntries
            .filter(e => e.date && e.date.split('T')[0] === todayStr)
            .reduce((sum, item) => sum + Number(item.quantity), 0);
    }, [milkEntries]);

    const todayRevenue = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return milkEntries
            .filter(e => e.date && e.date.split('T')[0] === todayStr)
            .reduce((sum, item) => sum + Number(item.total_price), 0);
    }, [milkEntries]);

    const allTransactions = useMemo(() => {
        const list = [...transactions];
        
        // Add all milk entries as virtual transaction records!
        milkEntries.forEach(entry => {
            const vendeeName = entry.vendees?.name || 'Milk Sales';
            list.push({
                _id: `milk-sales-virtual-${entry.id}`,
                type: 'income',
                amount: entry.total_price,
                category: `Milk Sales (${vendeeName})`,
                description: `${entry.quantity} Liters - ${entry.session || 'Morning'}`,
                date: entry.date,
                isVirtual: true
            });
        });

        // Sort chronologically descending
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        return list;
    }, [transactions, milkEntries]);

    const handleExport = async (exportType) => {
        try {
            let wb = XLSX.utils.book_new();
            let filename = `Finance_Report_${exportType}_${new Date().getTime()}.xlsx`;

            if (exportType === 'income' || exportType === 'all') {
                const incomeData = transactions.filter(t => t.type === 'income').map(t => ({
                    Date: t.date ? new Date(t.date).toLocaleDateString() : 'N/A',
                    Category: t.category,
                    Description: t.description || '-',
                    Amount: t.amount,
                }));
                const totalIncome = incomeData.reduce((sum, item) => sum + (Number(item.Amount) || 0), 0);
                incomeData.push({ Date: '---', Category: 'TOTAL', Description: 'INCOME', Amount: totalIncome });

                const ws = XLSX.utils.json_to_sheet(incomeData);
                XLSX.utils.book_append_sheet(wb, ws, "Income");
            }

            if (exportType === 'expense' || exportType === 'all') {
                const expenseData = transactions.filter(t => t.type === 'expense').map(t => ({
                    Date: t.date ? new Date(t.date).toLocaleDateString() : 'N/A',
                    Category: t.category,
                    Description: t.description || '-',
                    Amount: t.amount,
                }));
                const totalExpense = expenseData.reduce((sum, item) => sum + (Number(item.Amount) || 0), 0);
                expenseData.push({ Date: '---', Category: 'TOTAL', Description: 'EXPENDITURE', Amount: totalExpense });

                const ws = XLSX.utils.json_to_sheet(expenseData);
                XLSX.utils.book_append_sheet(wb, ws, "Expenditure");
            }

            if (wb.SheetNames.length === 0) {
                Alert.alert('No data', 'Nothing to export.');
                return;
            }

            if (Platform.OS === 'web') {
                XLSX.writeFile(wb, filename);
            } else {
                const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
                const uri = FileSystem.cacheDirectory + filename;
                await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
                await Sharing.shareAsync(uri);
            }
        } catch (err) {
            console.error('Export Error:', err);
            Alert.alert('Export Failed', 'An error occurred during export.');
        }
    };

    const handleSaveTransaction = async () => {
        if (!amount || !category) {
            Alert.alert('Error', 'Please fill Amount and Category');
            return;
        }

        const data = {
            type,
            amount: Number(amount),
            category: category.trim(),
            remarks: description.trim(),
            date: date ? new Date(date).toISOString() : new Date().toISOString()
        };

        try {
            if (isEditMode) {
                const { error } = await supabase.from('transactions').update(data).eq('id', editId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('transactions').insert([data]);
                if (error) throw error;
            }
            closeModal();
            fetchTransactions();
        } catch (err) {
            Alert.alert('Error', 'Failed to save transaction.');
        }
    };

    const handleDeleteTransaction = (id) => {
        const performDelete = async () => {
            try {
                const { error } = await supabase.from('transactions').delete().eq('id', id);
                if (error) throw error;
                setTransactions(prev => prev.filter(t => t._id !== id));
            } catch (err) {
                Alert.alert('Error', 'Failed to delete transaction');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Delete this record?')) performDelete();
        } else {
            Alert.alert('Delete Record', 'Confirm deletion?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: performDelete }
            ]);
        }
    };

    const openEditModal = (item) => {
        setType(item.type);
        setAmount(item.amount.toString());
        setCategory(item.category);
        setDescription(item.description || '');
        setDate(item.date ? new Date(item.date).toISOString().split('T')[0] : '');
        setIsEditMode(true);
        setEditId(item._id);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setIsEditMode(false);
        setEditId(null);
        setType('income');
        setAmount('');
        setCategory('');
        setDescription('');
        setDate('');
    };

    const renderTransaction = ({ item }) => (
        <View style={[styles.card, item.isVirtual && { borderStyle: 'dashed', borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.04)' }]}>
            <View style={styles.cardInfo}>
                <View style={[styles.iconBox, { backgroundColor: item.type === 'income' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                    {item.type === 'income' ? <TrendingUp size={20} color="#22c55e" /> : <TrendingDown size={20} color="#ef4444" />}
                </View>
                <View style={styles.textDetails}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.cardCategory}>{item.category}</Text>
                        {item.isVirtual && (
                            <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(34, 197, 94, 0.15)', borderRadius: 4 }}>
                                <Text style={{ color: '#22c55e', fontSize: 9, fontWeight: '800' }}>AUTO</Text>
                            </View>
                        )}
                    </View>
                    {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
                    <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
            </View>
            <View style={styles.cardActions}>
                <Text style={[styles.cardAmount, { color: item.type === 'income' ? '#22c55e' : '#ef4444' }]}>
                    {item.type === 'expense' ? '-' : '+'}₹{item.amount}
                </Text>
                {!item.isVirtual && (
                    <View style={styles.btnRow}>
                        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.miniBtn}>
                            <Edit3 size={16} color="#8a7c6f" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteTransaction(item._id)} style={styles.miniBtn}>
                            <Trash2 size={16} color="#4d3f34" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.summarySection}>
                <View style={styles.totalDiv}>
                    <Wallet size={24} color="#bba284" style={{ marginBottom: 10 }} />
                    <Text style={styles.totalLabel}>NET BALANCE</Text>
                    <Text style={[styles.totalVal, { color: Number(totals.balance) >= 0 ? '#fff' : '#ef4444' }]}>
                        ₹{totals.balance}
                    </Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLab}>INCOME</Text>
                        <Text style={[styles.statVal, { color: '#22c55e' }]}>₹{totals.income}</Text>
                    </View>
                    <View style={styles.statDiv} />
                    <View style={styles.statBox}>
                        <Text style={styles.statLab}>EXPENSES</Text>
                        <Text style={[styles.statVal, { color: '#ef4444' }]}>₹{totals.expense}</Text>
                    </View>
                </View>

                <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                    <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, textAlign: 'center' }}>TODAY'S TURNOVER (MILK SALES)</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ color: '#8a7c6f', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>TOTAL LITERS</Text>
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{todayLiters.toFixed(1)} L</Text>
                        </View>
                        <View style={{ width: 1, height: 30, backgroundColor: 'rgba(34, 197, 94, 0.2)' }} />
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ color: '#8a7c6f', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>EXPECTED REVENUE</Text>
                            <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '800' }}>₹{todayRevenue.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Export Options */}
                <View style={styles.exportSection}>
                    <Text style={styles.exportTitle}>GENERATE EXCEL REPORTS</Text>
                    <View style={styles.exportRow}>
                        <TouchableOpacity style={styles.expBtn} onPress={() => handleExport('income')}>
                            <TrendingUp size={16} color="#22c55e" />
                            <Text style={styles.expBtnText}>Income</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.expBtn} onPress={() => handleExport('expense')}>
                            <TrendingDown size={16} color="#ef4444" />
                            <Text style={styles.expBtnText}>Expenditure</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.expBtn} onPress={() => handleExport('all')}>
                            <Download size={16} color="#bba284" />
                            <Text style={styles.expBtnText}>Combined</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <FlatList
                data={allTransactions}
                keyExtractor={item => item._id}
                renderItem={renderTransaction}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bba284" />}
                ListEmptyComponent={<Text style={styles.emptyText}>No financial records found.</Text>}
            />

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Plus size={30} color="#26170d" />
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditMode ? 'Edit Transaction' : 'New Transaction'}</Text>
                            <TouchableOpacity onPress={closeModal}>
                                <X size={24} color="#8a7c6f" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.typeToggle}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, type === 'income' && styles.toggleActiveIn]}
                                    onPress={() => setType('income')}
                                >
                                    <TrendingUp size={18} color={type === 'income' ? '#fff' : '#8a7c6f'} />
                                    <Text style={[styles.toggleText, type === 'income' && styles.toggleTextActive]}>Income</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, type === 'expense' && styles.toggleActiveOut]}
                                    onPress={() => setType('expense')}
                                >
                                    <TrendingDown size={18} color={type === 'expense' ? '#fff' : '#8a7c6f'} />
                                    <Text style={[styles.toggleText, type === 'expense' && styles.toggleTextActive]}>Expense</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Amount (₹)</Text>
                            <TextInput
                                style={styles.input}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0.00"
                                keyboardType="numeric"
                                placeholderTextColor="#8a7c6f"
                            />

                            <Text style={styles.label}>Category</Text>
                            <TextInput
                                style={styles.input}
                                value={category}
                                onChangeText={setCategory}
                                placeholder="e.g., Milk Sales, Feed, Medicine"
                                placeholderTextColor="#8a7c6f"
                            />

                            <Text style={styles.label}>Description (Optional)</Text>
                            <TextInput
                                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Add a short note..."
                                multiline
                                placeholderTextColor="#8a7c6f"
                            />

                            <AppDatePicker
                                label="Date"
                                dateString={date}
                                onDateChange={setDate}
                                placeholder="Transaction Date"
                            />

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTransaction}>
                                <Text style={styles.saveBtnText}>{isEditMode ? 'Update Record' : 'Save Transaction'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#26170d' },
    summarySection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#382a20' },
    totalDiv: {
        backgroundColor: '#382a20',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#4d3f34',
        marginBottom: 15,
    },
    totalLabel: { fontSize: 13, fontWeight: '700', color: '#8a7c6f', letterSpacing: 1.5, marginBottom: 5 },
    totalVal: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },

    statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 20 },
    statBox: { flex: 1, alignItems: 'center' },
    statDiv: { width: 1, height: 24, backgroundColor: '#382a20' },
    statLab: { fontSize: 11, fontWeight: '700', color: '#8a7c6f', marginBottom: 2 },
    statVal: { fontSize: 18, fontWeight: '700' },

    exportSection: { marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#382a20' },
    exportTitle: { fontSize: 10, fontWeight: '800', color: '#8a7c6f', letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
    exportRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    expBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#382a20', paddingVertical: 10, borderRadius: 10, gap: 6, borderWidth: 1, borderColor: '#4d3f34' },
    expBtnText: { fontSize: 11, fontWeight: '700', color: '#bba284' },

    list: { padding: 20, paddingBottom: 100 },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(56, 42, 32, 0.4)',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#382a20'
    },
    cardInfo: { flexDirection: 'row', flex: 1 },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    textDetails: { flex: 1 },
    cardCategory: { fontSize: 16, fontWeight: '700', color: '#fff' },
    cardDesc: { fontSize: 13, color: '#8a7c6f', marginTop: 2 },
    cardDate: { fontSize: 11, color: '#6b6056', marginTop: 5 },

    cardActions: { alignItems: 'flex-end', justifyContent: 'space-between' },
    cardAmount: { fontSize: 18, fontWeight: '800' },
    btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    miniBtn: { padding: 5 },

    emptyText: { textAlign: 'center', marginTop: 60, color: '#8a7c6f', fontSize: 15 },

    fab: {
        position: 'absolute', bottom: 30, right: 30,
        backgroundColor: '#bba284', width: 64, height: 64,
        borderRadius: 32, justifyContent: 'center', alignItems: 'center',
        elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10
    },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#26170d',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '85%',
        borderTopWidth: 1,
        borderTopColor: '#382a20'
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },

    typeToggle: { flexDirection: 'row', backgroundColor: '#382a20', borderRadius: 14, padding: 6, marginBottom: 25 },
    toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
    toggleActiveIn: { backgroundColor: '#22c55e' },
    toggleActiveOut: { backgroundColor: '#ef4444' },
    toggleText: { fontSize: 14, fontWeight: '700', color: '#8a7c6f' },
    toggleTextActive: { color: '#fff' },

    label: { fontSize: 14, fontWeight: '700', color: '#8a7c6f', marginBottom: 10 },
    input: {
        backgroundColor: '#382a20',
        borderRadius: 14,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#4d3f34'
    },
    saveBtn: { backgroundColor: '#bba284', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#26170d', fontSize: 17, fontWeight: '800' }
});
