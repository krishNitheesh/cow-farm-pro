import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, ScrollView, Platform, SafeAreaView, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Users, Trash2, Plus, Phone, X, IndianRupee } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VendeeScreen() {
    const [vendees, setVendees] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currency, setCurrency] = useState('₹');

    // Form State
    const [name, setName] = useState('');
    const [rate, setRate] = useState('');
    const [contact, setContact] = useState('');

    const fetchVendees = async () => {
        try {
            const { data, error } = await supabase
                .from('vendees')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            const mapped = (data || []).map(v => ({
                _id: v.id,
                name: v.name,
                rate: v.rate,
                contact: v.phone_number || ''
            }));
            setVendees(mapped);
            
            const storedCurrency = await AsyncStorage.getItem('currency');
            if (storedCurrency) setCurrency(storedCurrency);
        } catch (err) {
            console.error('Error fetching vendees:', err);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchVendees();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchVendees().finally(() => setRefreshing(false));
    }, []);

    const handleSaveVendee = async () => {
        if (!name || !rate) {
            Alert.alert('Error', 'Please fill Name and Rate per liter');
            return;
        }

        const data = {
            name: name.trim(),
            rate: Number(rate),
            phone_number: contact.trim()
        };

        try {
            const { error } = await supabase.from('vendees').insert([data]);
            if (error) throw error;
            closeModal();
            fetchVendees();
        } catch (err) {
            Alert.alert('Error', 'Failed to save customer.');
        }
    };

    const handleDeleteVendee = (id) => {
        const performDelete = async () => {
            try {
                const { error } = await supabase.from('vendees').delete().eq('id', id);
                if (error) throw error;
                fetchVendees();
            } catch (err) {
                Alert.alert('Error', 'Failed to delete customer.');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this customer?')) {
                performDelete();
            }
        } else {
            Alert.alert('Confirm Delete', 'Are you sure you want to delete this customer record?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: performDelete },
            ]);
        }
    };

    const openAddModal = () => {
        setName('');
        setRate('');
        setContact('');
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
    };

    const renderVendee = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.iconThumb}>
                        <Users size={18} color="#bba284" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Phone size={12} color="#8a7c6f" style={{ marginRight: 4 }} />
                            <Text style={styles.cardDate}>
                                {item.contact || 'No contact info'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardCost}>{currency}{item.rate}</Text>
                    <Text style={styles.cardQty}>per liter</Text>
                </View>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleDeleteVendee(item._id)} style={styles.actionBtn}>
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
                        <Text style={styles.headerSubtitle}>CLIENTS & BUYERS</Text>
                        <Text style={styles.headerTitle}>Customers Book</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={vendees}
                keyExtractor={(item) => item._id}
                renderItem={renderVendee}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bba284" />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Users size={60} color="#382a20" />
                        <Text style={styles.emptyText}>No customers enrolled yet.</Text>
                        <Text style={styles.emptySubText}>Add your daily milk buyers to easily track their per-liter rates.</Text>
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
                            <Text style={styles.modalTitle}>Add Customer</Text>
                            <TouchableOpacity onPress={closeModal}>
                                <X size={24} color="#8a7c6f" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Customer / Business Name</Text>
                            <View style={styles.inputWrapper}>
                                <Users size={18} color="#8a7c6f" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter full name"
                                    placeholderTextColor="#6a5c52"
                                />
                            </View>

                            <View style={styles.rowInputs}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.inputLabel}>Rate (/Liter)</Text>
                                    <View style={styles.inputWrapper}>
                                        <IndianRupee size={18} color="#8a7c6f" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={rate}
                                            onChangeText={setRate}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor="#6a5c52"
                                        />
                                    </View>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Phone (Optional)</Text>
                                    <View style={styles.inputWrapper}>
                                        <Phone size={18} color="#8a7c6f" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={contact}
                                            onChangeText={setContact}
                                            keyboardType="phone-pad"
                                            placeholder="9876543210"
                                            placeholderTextColor="#6a5c52"
                                        />
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveVendee}>
                                <Text style={styles.saveBtnText}>Save Customer</Text>
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
    listContent: { padding: 20, paddingBottom: 100 },
    card: { backgroundColor: '#382a20', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#4d3f34' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    iconThumb: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(187, 162, 132, 0.1)', justifyContent: 'center', alignItems: 'center' },
    cardTitle: { color: '#e1dacb', fontSize: 16, fontWeight: '700' },
    cardDate: { color: '#8a7c6f', fontSize: 13 },
    cardCost: { color: '#10b981', fontSize: 16, fontWeight: '800', textAlign: 'right' },
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
    rowInputs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    saveBtn: { backgroundColor: '#bba284', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 30, marginBottom: 20 },
    saveBtnText: { color: '#26170d', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { color: '#8a7c6f', fontSize: 18, fontWeight: '700', marginTop: 16 },
    emptySubText: { color: '#6a5c52', fontSize: 14, textAlign: 'center', marginTop: 8 }
});
