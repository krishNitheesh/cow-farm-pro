import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, Image, ScrollView, Platform, SafeAreaView, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Stethoscope, Calendar, Plus, X, Trash2, Edit3, Camera, Image as ImageIcon, Activity, Heart, Info, Clock, PlusCircle, MinusCircle, Download } from 'lucide-react-native';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AppDatePicker from '../components/AppDatePicker';

export default function HealthScreen() {
    const [records, setRecords] = useState([]);
    const [cows, setCows] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);

    // Form State
    const [selectedCowId, setSelectedCowId] = useState('');
    const [diseaseName, setDiseaseName] = useState('');
    const [medicines, setMedicines] = useState([{ name: '', photo: null, description: '' }]);
    const [cost, setCost] = useState('');
    const [doctorVisitDate, setDoctorVisitDate] = useState(new Date().toISOString().split('T')[0]);
    const [matingNotes, setMatingNotes] = useState('');
    const [status, setStatus] = useState('Under Treatment');

    const fetchData = async () => {
        try {
            const [healthRes, cowRes] = await Promise.all([
                supabase.from('medical_records').select('*, cows(id, name)').order('doctor_visit_date', { ascending: false }),
                supabase.from('cows').select('*').order('name', { ascending: true })
            ]);
            if (healthRes.error) throw healthRes.error;
            if (cowRes.error) throw cowRes.error;

            const mappedHealth = (healthRes.data || []).map(r => ({
                _id: r.id,
                cow: r.cows ? { _id: r.cows.id, name: r.cows.name } : null,
                diseaseName: r.disease_name,
                medicines: r.medicines || [],
                cost: r.cost,
                doctorVisitDate: r.doctor_visit_date,
                matingNotes: r.mating_notes,
                status: r.status,
                date: r.created_at
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

            setRecords(mappedHealth);
            setCows(mappedCows);
            if (mappedCows.length > 0 && !selectedCowId) setSelectedCowId(mappedCows[0]._id);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const pickMedicineImage = async (index, useCamera = false) => {
        const permission = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert('Permission needed', 'Please allow access to add medicine photo.');
            return;
        }

        const options = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        };

        const result = useCamera
            ? await ImagePicker.launchCameraAsync(options)
            : await ImagePicker.launchImageLibraryAsync(options);

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            const updated = [...medicines];
            updated[index].photo = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            setMedicines(updated);
        }
    };

    const addMedicine = () => {
        setMedicines([...medicines, { name: '', photo: null, description: '' }]);
    };

    const removeMedicine = (index) => {
        if (medicines.length > 1) {
            const updated = [...medicines];
            updated.splice(index, 1);
            setMedicines(updated);
        }
    };

    const updateMedicineField = (index, field, value) => {
        const updated = [...medicines];
        updated[index][field] = value;
        setMedicines(updated);
    };

    const handleSaveRecord = async () => {
        if (!selectedCowId) {
            Alert.alert('No Cow Selected', 'Please add a cow in the Cow Book before recording health status.');
            return;
        }
        if (!diseaseName) {
            Alert.alert('Missing fields', 'Diagnosis / Disease name is required.');
            return;
        }

        // Filter out medicines with no names
        const filteredMedicines = medicines.filter(m => m.name && m.name.trim() !== '');

        const data = {
            cow_id: selectedCowId,
            disease_name: diseaseName.trim(),
            medicines: filteredMedicines.map(m => ({
                name: m.name.trim(),
                photo: m.photo || null,
                description: m.description ? m.description.trim() : ''
            })),
            cost: Number(cost) || 0,
            doctor_visit_date: new Date(doctorVisitDate).toISOString(),
            mating_notes: matingNotes.trim(),
            status,
        };

        try {
            if (isEditMode) {
                const { error } = await supabase.from('medical_records').update(data).eq('id', editId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('medical_records').insert([data]);
                if (error) throw error;
            }
            closeModal();
            fetchData();
        } catch (err) {
            Alert.alert('Error', 'Failed to save health record.');
        }
    };

    const handleDeleteRecord = (id) => {
        const performDelete = async () => {
            try {
                const { error } = await supabase.from('medical_records').delete().eq('id', id);
                if (error) throw error;
                setRecords(prev => prev.filter(r => r._id !== id));
            } catch (err) {
                Alert.alert('Error', 'Delete failed');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Delete this health record?')) performDelete();
        } else {
            Alert.alert('Delete Record', 'Confirm removal?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: performDelete }
            ]);
        }
    };

    const exportToExcel = async () => {
        try {
            if (records.length === 0) {
                Alert.alert('No data', 'Nothing to export.');
                return;
            }

            const exportData = records.map(r => ({
                "Cow Name": r.cow?.name || 'Unknown',
                "Diagnosis": r.diseaseName,
                "Date": r.doctorVisitDate ? new Date(r.doctorVisitDate).toLocaleDateString() : 'N/A',
                "Condition": r.status,
                "Medicines": r.medicines ? r.medicines.map(m => m.name).join(', ') : 'None',
                "Cost": Number(r.cost) || 0,
                "Mating Info": r.matingNotes || 'N/A'
            }));

            const totalCost = exportData.reduce((sum, item) => sum + (Number(item.Cost) || 0), 0);
            exportData.push({
                "Cow Name": 'TOTAL SUMMARY',
                "Diagnosis": '---',
                "Date": '---',
                "Condition": '---',
                "Medicines": '---',
                "Cost": totalCost,
                "Mating Info": '---'
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Health_Logs");

            const fileName = `Health_Logs_${new Date().getTime()}.xlsx`;

            if (Platform.OS === 'web') {
                XLSX.writeFile(wb, fileName);
            } else {
                const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
                const uri = FileSystem.cacheDirectory + fileName;
                await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
                await Sharing.shareAsync(uri);
            }
        } catch (err) {
            console.error('Export error:', err);
            Alert.alert('Error', 'Failed to generate health report');
        }
    };

    const openEditModal = (item) => {
        setSelectedCowId(item.cow?._id || '');
        setDiseaseName(item.diseaseName);
        // Safely handle old records without medicines array
        const initialMedicines = (item.medicines && item.medicines.length > 0)
            ? item.medicines.map(m => ({ ...m }))
            : [{ name: '', photo: null, description: '' }];
        setMedicines(initialMedicines);
        setCost(item.cost.toString());
        setDoctorVisitDate(item.doctorVisitDate ? item.doctorVisitDate.split('T')[0] : new Date().toISOString().split('T')[0]);
        setMatingNotes(item.matingNotes || '');
        setStatus(item.status || 'Under Treatment');
        setIsEditMode(true);
        setEditId(item._id);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setIsEditMode(false);
        setEditId(null);
        setDiseaseName('');
        setMedicines([{ name: '', photo: null, description: '' }]);
        setCost('');
        setMatingNotes('');
        setStatus('Under Treatment');
    };

    const renderHealthRecord = ({ item }) => (
        <View style={styles.recordCard}>
            <View style={styles.cardHeader}>
                <View style={styles.cowNameBox}>
                    <Activity size={18} color="#bba284" />
                    <Text style={styles.cowNameText}>{item.cow?.name || 'Unknown Cow'}</Text>
                </View>
                <View style={[styles.statusBadge, item.status === 'Recovered' ? styles.statusBlue : styles.statusAmber]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.mainInfo}>
                <Text style={styles.diseaseLabel}>Diagnosis</Text>
                <Text style={styles.diseaseValue}>{item.diseaseName}</Text>

                <View style={styles.detailCol}>
                    <Clock size={14} color="#8a7c6f" />
                    <Text style={styles.detailText}>Doc Visit: {new Date(item.doctorVisitDate).toLocaleDateString()}</Text>
                </View>

                <View style={styles.medicineList}>
                    {item.medicines.map((med, idx) => (
                        <View key={idx} style={styles.medItem}>
                            <View style={styles.medBullet} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.medNameText}>{med.name}</Text>
                                {med.description ? <Text style={styles.medDescText}>{med.description}</Text> : null}
                                {med.photo && <Image source={{ uri: med.photo }} style={styles.medImage} />}
                            </View>
                        </View>
                    ))}
                </View>

                {item.matingNotes ? (
                    <View style={styles.matingBox}>
                        <Heart size={14} color="#ef4444" />
                        <Text style={styles.matingText}>Mating Context: {item.matingNotes}</Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.costText}>Exp: ₹{item.cost}</Text>
                <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => openEditModal(item)}>
                        <Edit3 size={18} color="#bba284" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRecord(item._id)}>
                        <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View>
                        <Text style={styles.headerSubtitle}>MEDICAL</Text>
                        <Text style={styles.headerTitle}>Health Logs</Text>
                    </View>
                    <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
                        <Download size={20} color="#bba284" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={records}
                keyExtractor={item => item._id}
                renderItem={renderHealthRecord}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData().finally(() => setRefreshing(false)); }} tintColor="#bba284" />}
                ListEmptyComponent={<Text style={styles.emptyText}>No health records registered yet.</Text>}
            />

            <TouchableOpacity style={styles.fab} onPress={() => { setIsEditMode(false); setModalVisible(true); }}>
                <Stethoscope size={30} color="#26170d" />
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditMode ? 'Update Record' : 'New Health Status'}</Text>
                            <TouchableOpacity onPress={closeModal}>
                                <X size={26} color="#8a7c6f" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Select Cow</Text>
                            {cows.length === 0 ? (
                                <View style={styles.noCowsBox}>
                                    <Text style={styles.noCowsText}>+ Please add a record in the "Cow Book" first</Text>
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cowScroll}>
                                    {cows.map(cow => (
                                        <TouchableOpacity
                                            key={cow._id}
                                            style={[styles.cowPill, selectedCowId === cow._id && styles.cowPillActive]}
                                            onPress={() => setSelectedCowId(cow._id)}
                                        >
                                            <Text style={[styles.cowPillText, selectedCowId === cow._id && styles.cowPillTextActive]}>{cow.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Diagnosis / Disease</Text>
                                <TextInput style={styles.input} value={diseaseName} onChangeText={setDiseaseName} placeholder="Diagnosis" placeholderTextColor="#8a7c6f" />
                            </View>

                            <View style={styles.medicineSection}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.label}>Medicines Given</Text>
                                    <TouchableOpacity onPress={addMedicine} style={styles.addMedBtn}>
                                        <PlusCircle size={20} color="#bba284" />
                                        <Text style={styles.addMedBtnText}>Medicine</Text>
                                    </TouchableOpacity>
                                </View>

                                {medicines.map((med, index) => (
                                    <View key={index} style={styles.medicineFormGroup}>
                                        <View style={styles.medFormHeader}>
                                            <Text style={styles.medSubTitle}>Medicine {index + 1}</Text>
                                            {medicines.length > 1 && (
                                                <TouchableOpacity onPress={() => removeMedicine(index)}>
                                                    <X size={16} color="#ef4444" />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        <TextInput
                                            style={[styles.input, { marginBottom: 10 }]}
                                            value={med.name}
                                            onChangeText={(v) => updateMedicineField(index, 'name', v)}
                                            placeholder="Medicine Name"
                                            placeholderTextColor="#8a7c6f"
                                        />

                                        <TextInput
                                            style={[styles.input, { marginBottom: 10, height: 60 }]}
                                            value={med.description}
                                            onChangeText={(v) => updateMedicineField(index, 'description', v)}
                                            placeholder="Use instructions..."
                                            multiline
                                            placeholderTextColor="#8a7c6f"
                                        />

                                        <View style={styles.photoRow}>
                                            <TouchableOpacity style={styles.photoBtn} onPress={() => pickMedicineImage(index, true)}>
                                                <Camera size={18} color="#bba284" />
                                                <Text style={styles.photoBtnText}>Camera</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.photoBtn} onPress={() => pickMedicineImage(index, false)}>
                                                <ImageIcon size={18} color="#bba284" />
                                                <Text style={styles.photoBtnText}>Gallery</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {med.photo && (
                                            <View style={styles.previewContainer}>
                                                <Image source={{ uri: med.photo }} style={styles.photoPreview} />
                                                <TouchableOpacity style={styles.removePhoto} onPress={() => updateMedicineField(index, 'photo', null)}>
                                                    <X size={14} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <AppDatePicker 
                                        label="Visit Date" 
                                        dateString={doctorVisitDate} 
                                        onDateChange={setDoctorVisitDate} 
                                        placeholder="Visit Date" 
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Cost (₹)</Text>
                                    <TextInput style={styles.input} value={cost} onChangeText={setCost} keyboardType="numeric" placeholder="0" placeholderTextColor="#8a7c6f" />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Mating Detail</Text>
                                <TextInput style={styles.input} value={matingNotes} onChangeText={setMatingNotes} placeholder="Optional" placeholderTextColor="#8a7c6f" />
                            </View>

                            <Text style={styles.label}>Current Condition</Text>
                            <View style={styles.statusRow}>
                                {['Under Treatment', 'Recovered', 'Chronic'].map(s => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.statusPill, status === s && styles.statusPillActive]}
                                        onPress={() => setStatus(s)}
                                    >
                                        <Text style={[styles.statusPillText, status === s && styles.statusPillTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRecord}>
                                <Text style={styles.saveBtnText}>{isEditMode ? 'Update Health Record' : 'Save Health Status'}</Text>
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

    header: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 10 },
    headerSubtitle: { fontSize: 13, fontWeight: '700', color: '#8a7c6f', letterSpacing: 1.5, marginBottom: 4 },
    headerTitle: { fontSize: 32, fontWeight: '800', color: '#fff' },
    exportBtn: { backgroundColor: '#382a20', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#4d3f34' },

    list: { padding: 20, paddingBottom: 100 },
    recordCard: {
        backgroundColor: 'rgba(56, 42, 32, 0.4)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#382a20',
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    cowNameBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cowNameText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusAmber: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
    statusBlue: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
    statusText: { fontSize: 10, fontWeight: '700', color: '#bba284' },

    mainInfo: { backgroundColor: '#26170d', borderRadius: 16, padding: 16 },
    diseaseLabel: { fontSize: 10, fontWeight: '700', color: '#8a7c6f', letterSpacing: 1, marginBottom: 4 },
    diseaseValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 10 },

    detailCol: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 },
    detailText: { fontSize: 13, color: '#8a7c6f' },

    medicineList: { gap: 15, marginBottom: 15 },
    medItem: { flexDirection: 'row', gap: 10 },
    medBullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#bba284', marginTop: 8 },
    medNameText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    medDescText: { color: '#8a7c6f', fontSize: 12, marginTop: 2 },
    medImage: { width: 80, height: 80, borderRadius: 8, marginTop: 8, backgroundColor: '#382a20' },

    matingBox: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: '#382a20', paddingTop: 10 },
    matingText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: '#382a20', paddingTop: 12 },
    costText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    actionRow: { flexDirection: 'row', gap: 15 },

    emptyText: { textAlign: 'center', marginTop: 60, color: '#8a7c6f', fontSize: 15 },

    fab: {
        position: 'absolute', bottom: 30, right: 30,
        backgroundColor: '#bba284', width: 64, height: 64,
        borderRadius: 32, justifyContent: 'center', alignItems: 'center',
        elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10
    },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#26170d',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '92%',
        borderTopWidth: 1,
        borderTopColor: '#382a20'
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },

    label: { fontSize: 14, fontWeight: '700', color: '#8a7c6f', marginBottom: 10 },
    cowScroll: { marginBottom: 20 },
    cowPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#382a20', marginRight: 10, borderWidth: 1, borderColor: '#4d3f34' },
    cowPillActive: { backgroundColor: '#bba284', borderColor: '#bba284' },
    cowPillText: { color: '#8a7c6f', fontWeight: '700' },
    cowPillTextActive: { color: '#26170d' },

    inputGroup: { marginBottom: 20 },
    input: {
        backgroundColor: '#382a20',
        borderRadius: 14,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#4d3f34'
    },

    medicineSection: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    addMedBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    addMedBtnText: { color: '#bba284', fontWeight: '700', fontSize: 14 },
    medicineFormGroup: { backgroundColor: 'rgba(56, 42, 32, 0.4)', borderRadius: 16, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#382a20' },
    medFormHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    medSubTitle: { fontSize: 12, fontWeight: '700', color: '#8a7c6f', letterSpacing: 1 },

    row: { flexDirection: 'row', marginBottom: 20 },

    photoRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    photoBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 12, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#4d3f34', gap: 6
    },
    photoBtnText: { color: '#bba284', fontWeight: '700', fontSize: 12 },
    previewContainer: { marginBottom: 5, position: 'relative' },
    photoPreview: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#382a20' },
    removePhoto: { position: 'absolute', top: 5, left: 80, backgroundColor: '#ef4444', padding: 3, borderRadius: 8 },

    statusRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    statusPill: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#382a20', borderWidth: 1, borderColor: '#4d3f34' },
    statusPillActive: { backgroundColor: '#bba284', borderColor: '#bba284' },
    statusPillText: { fontSize: 11, color: '#8a7c6f', fontWeight: '700' },
    statusPillTextActive: { color: '#26170d' },

    saveBtn: { backgroundColor: '#bba284', padding: 20, borderRadius: 18, alignItems: 'center' },
    saveBtnText: { color: '#26170d', fontSize: 17, fontWeight: '800' },
    noCowsBox: { padding: 15, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
    noCowsText: { color: '#ef4444', fontWeight: '700', fontSize: 13, textAlign: 'center' }
});
