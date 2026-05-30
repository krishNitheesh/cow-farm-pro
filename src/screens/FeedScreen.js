import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, ScrollView, Platform, SafeAreaView, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Wheat, Trash2, Plus, Calendar, X, Scale, IndianRupee } from 'lucide-react-native';
import AppDatePicker from '../components/AppDatePicker';

export default function FeedScreen() {
    const [feeds, setFeeds] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Form State
    const [feedType, setFeedType] = useState('Green Fodder');
    const [quantity, setQuantity] = useState('');
    const [cost, setCost] = useState('');
    const [date, setDate] = useState('');

    const feedCategories = ['Green Fodder', 'Dry Fodder', 'Concentrates', 'Supplements'];

    const fetchFeeds = async () => {
        try {
            const { data, error } = await supabase
                .from('feeds')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            const mapped = (data || []).map(f => ({
                _id: f.id,
                feedType: f.type,
                quantity: f.quantity,
                cost: f.cost,
                date: f.date
            }));
            setFeeds(mapped);
        } catch (err) {
            console.error('Error fetching feeds:', err);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchFeeds();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchFeeds().finally(() => setRefreshing(false));
    }, []);

    const totals = useMemo(() => {
        let totalCost = 0;
        let totalQty = 0;
        feeds.forEach(f => {
            totalCost += f.cost || 0;
            totalQty += f.quantity || 0;
        });
        return {
            cost: totalCost.toFixed(2),
            qty: totalQty.toFixed(1)
        };
    }, [feeds]);

    const handleSaveFeed = async () => {
        if (!quantity || !cost) {
            Alert.alert('Error', 'Please fill Quantity and Cost');
            return;
        }

        const data = {
            type: feedType,
            quantity: Number(quantity),
            cost: Number(cost),
            date: date ? new Date(date).toISOString() : new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('feeds').insert([data]);
            if (error) throw error;
            closeModal();
            fetchFeeds();
        } catch (err) {
            Alert.alert('Error', 'Failed to save feed record.');
        }
    };

    const handleDeleteFeed = (id) => {
        const performDelete = async () => {
            try {
                const { error } = await supabase.from('feeds').delete().eq('id', id);
                if (error) throw error;
                fetchFeeds();
            } catch (err) {
                console.error(err);
                Alert.alert('Error', 'Failed to delete feed record.');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this feed record?')) {
                performDelete();
            }
        } else {
            Alert.alert('Confirm Delete', 'Are you sure you want to delete this block of feed?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: performDelete },
            ]);
        }
    };

    const openAddModal = () => {
        setFeedType('Green Fodder');
        setQuantity('');
        setCost('');
        setDate('');
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
    };

    const renderFeedItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.iconThumb}>
                        <Wheat size={18} color="#10b981" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.cardTitle}>{item.feedType}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Calendar size={12} color="#8a7c6f" style={{ marginRight: 4 }} />
                            <Text style={styles.cardDate}>
                                {new Date(item.date).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardCost}>₹{item.cost}</Text>
                    <Text style={styles.cardQty}>{item.quantity} kg</Text>
                </View>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleDeleteFeed(item._id)} style={styles.actionBtn}>
                    <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View>
                        <Text style={styles.headerSubtitle}>DIET & INVENTORY</Text>
                        <Text style={styles.headerTitle}>Feed Book</Text>
                    </View>
                </View>

                {/* Totals Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Total Stock (kg)</Text>
                        <Text style={styles.summaryValue}>{totals.qty}</Text>
                    </View>
                    <View style={[styles.summaryBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                        <Text style={styles.summaryLabel}>Total Expense</Text>
                        <Text style={[styles.summaryValue, { color: '#ef4444' }]}>₹{totals.cost}</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={feeds}
                keyExtractor={(item) => item._id}
                renderItem={renderFeedItem}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bba284" />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Wheat size={60} color="#382a20" />
                        <Text style={styles.emptyText}>No feed records yet.</Text>
                        <Text style={styles.emptySubText}>Add bags of grass, hay, or vitamins to track costs.</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={openAddModal}>
                <Plus size={24} color="#26170d" />
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Feed Record</Text>
                            <TouchableOpacity onPress={closeModal}>
                                <X size={24} color="#8a7c6f" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Feed Category</Text>
                            <View style={styles.categoryContainer}>
                                {feedCategories.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.categoryBtn, feedType === cat && styles.categoryBtnActive]}
                                        onPress={() => setFeedType(cat)}
                                    >
                                        <Text style={[styles.categoryText, feedType === cat && styles.categoryTextActive]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.rowInputs}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.inputLabel}>Quantity (kg)</Text>
                                    <View style={styles.inputWrapper}>
                                        <Scale size={18} color="#8a7c6f" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={quantity}
                                            onChangeText={setQuantity}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor="#6a5c52"
                                        />
                                    </View>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Total Cost (₹)</Text>
                                    <View style={styles.inputWrapper}>
                                        <IndianRupee size={18} color="#8a7c6f" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={cost}
                                            onChangeText={setCost}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor="#6a5c52"
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={{ width: '100%', marginTop: 20 }}>
                                <AppDatePicker
                                    label="Purchase Date"
                                    dateString={date}
                                    onDateChange={setDate}
                                    placeholder="Select Date"
                                />
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveFeed}>
                                <Text style={styles.saveBtnText}>Save Feed</Text>
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
    header: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, backgroundColor: '#382a20', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    headerSubtitle: { color: '#8a7c6f', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
    headerTitle: { color: '#e1dacb', fontSize: 28, fontWeight: '800' },
    summaryContainer: { flexDirection: 'row', marginTop: 20, justifyContent: 'space-between' },
    summaryBox: { flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 15, borderRadius: 16, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
    summaryLabel: { color: '#8a7c6f', fontSize: 12, fontWeight: '600', marginBottom: 5 },
    summaryValue: { color: '#10b981', fontSize: 20, fontWeight: '800' },
    listContent: { padding: 20, paddingBottom: 100 },
    card: { backgroundColor: '#382a20', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#4d3f34' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    iconThumb: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center' },
    cardTitle: { color: '#e1dacb', fontSize: 16, fontWeight: '700' },
    cardDate: { color: '#8a7c6f', fontSize: 13 },
    cardCost: { color: '#ef4444', fontSize: 16, fontWeight: '800', textAlign: 'right' },
    cardQty: { color: '#bba284', fontSize: 12, fontWeight: '600', textAlign: 'right', marginTop: 4 },
    cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#4d3f34' },
    actionBtn: { padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, marginLeft: 10 },
    fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#bba284', justifyContent: 'center', alignItems: 'center', shadowColor: '#bba284', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#26170d', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#382a20' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#e1dacb' },
    inputLabel: { fontSize: 13, color: '#8a7c6f', fontWeight: '600', marginBottom: 8, marginTop: 16 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#382a20', borderRadius: 12, borderWidth: 1, borderColor: '#4d3f34', paddingHorizontal: 12 },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, color: '#e1dacb', height: 50, fontSize: 16 },
    categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    categoryBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#382a20', borderWidth: 1, borderColor: '#4d3f34' },
    categoryBtnActive: { backgroundColor: '#bba284', borderColor: '#bba284' },
    categoryText: { color: '#8a7c6f', fontSize: 14, fontWeight: '600' },
    categoryTextActive: { color: '#26170d', fontWeight: '700' },
    rowInputs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    saveBtn: { backgroundColor: '#bba284', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 30, marginBottom: 20 },
    saveBtnText: { color: '#26170d', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { color: '#8a7c6f', fontSize: 18, fontWeight: '700', marginTop: 16 },
    emptySubText: { color: '#6a5c52', fontSize: 14, textAlign: 'center', marginTop: 8 }
});
