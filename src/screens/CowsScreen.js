import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, Alert, RefreshControl,
    KeyboardAvoidingView, Platform, ScrollView, Image, SafeAreaView,
    useWindowDimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { BookOpen, Plus, X, Calendar, Trash2, Edit, Camera, Image as ImageIcon, Search, Filter, Download } from 'lucide-react-native';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AppDatePicker from '../components/AppDatePicker';

export default function CowsScreen() {
    const { width } = useWindowDimensions();
    const numColumns = width > 768 ? 2 : 1;
    const flatListKey = `cols-${numColumns}`;

    const [cows, setCows] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAge, setFilterAge] = useState('');
    const [filterCalved, setFilterCalved] = useState('');
    const [filterPregnant, setFilterPregnant] = useState('all'); // all, yes, no

    // Form State
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [calvedCount, setCalvedCount] = useState('');
    const [isPregnant, setIsPregnant] = useState(false);
    const [matingDate, setMatingDate] = useState('');
    const [abortionDate, setAbortionDate] = useState('');
    const [unsuccessfulInseminationDate, setUnsuccessfulInseminationDate] = useState('');
    const [showAbortionInput, setShowAbortionInput] = useState(false);
    const [showUnsuccessfulInseminationInput, setShowUnsuccessfulInseminationInput] = useState(false);
    const [buyingDate, setBuyingDate] = useState('');
    const [cost, setCost] = useState('');
    const [imageUri, setImageUri] = useState('');

    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    const [editCowId, setEditCowId] = useState(null);

    const fetchCows = async () => {
        try {
            const { data, error } = await supabase
                .from('cows')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            const mapped = (data || []).map(c => ({
                _id: c.id,
                name: c.name,
                age: c.age,
                calvedCount: c.calved_count,
                isPregnant: c.is_pregnant,
                matingDate: c.mating_date,
                abortionDate: c.abortion_date,
                unsuccessfulInseminationDate: c.unsuccessful_insemination_date,
                buyingDate: c.buying_date,
                cost: c.cost,
                imageUrl: c.image_url,
                date: c.created_at,
            }));
            setCows(mapped);
        } catch (err) {
            console.log('Error fetching cow book:', err.message);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchCows();
        }, [])
    );

    const filteredCows = useMemo(() => {
        return cows.filter(cow => {
            const matchName = cow.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchAge = filterAge ? cow.age >= Number(filterAge) : true;
            const matchCalved = filterCalved ? cow.calvedCount >= Number(filterCalved) : true;
            const matchPregnant = filterPregnant === 'all'
                ? true
                : filterPregnant === 'yes' ? cow.isPregnant : !cow.isPregnant;

            return matchName && matchAge && matchCalved && matchPregnant;
        });
    }, [cows, searchQuery, filterAge, filterCalved, filterPregnant]);

    const exportToExcel = async () => {
        try {
            if (filteredCows.length === 0) {
                Alert.alert('No data', 'Nothing to export');
                return;
            }

            const exportData = filteredCows.map(c => ({
                Name: c.name,
                Age: String(c.age),
                Calved: String(c.calvedCount || 0),
                Pregnant: c.isPregnant ? 'Yes' : 'No',
                MatingDate: c.matingDate ? new Date(c.matingDate).toLocaleDateString() : 'N/A',
                BuyingDate: c.buyingDate ? new Date(c.buyingDate).toLocaleDateString() : 'N/A',
                Cost: Number(c.cost) || 0,
                AddedDate: c.date ? new Date(c.date).toLocaleDateString() : 'N/A'
            }));

            const totalCost = exportData.reduce((sum, item) => sum + (Number(item.Cost) || 0), 0);
            const totalCalves = exportData.reduce((sum, item) => sum + (Number(item.Calved) || 0), 0);
            
            exportData.push({
                Name: 'TOTAL SUMMARY',
                Age: 'Cows: ' + exportData.length,
                Calved: totalCalves,
                Pregnant: '-',
                MatingDate: '-',
                BuyingDate: '-',
                Cost: totalCost,
                AddedDate: '-'
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Cow_Records");

            const fileName = `Cow_Book_${new Date().getTime()}.xlsx`;

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
            Alert.alert('Error', 'Failed to generate Excel file');
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCows().finally(() => setRefreshing(false));
    }, []);

    const resetForm = () => {
        setName('');
        setAge('');
        setCalvedCount('');
        setIsPregnant(false);
        setMatingDate('');
        setAbortionDate('');
        setUnsuccessfulInseminationDate('');
        setShowAbortionInput(false);
        setShowUnsuccessfulInseminationInput(false);
        setBuyingDate('');
        setCost('');
        setImageUri('');
        setIsEditMode(false);
        setEditCowId(null);
        setModalVisible(false);
    };

    const pickImageFromGallery = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission needed', 'Please allow access to your photo library.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setImageUri(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
        }
    };

    const pickImageFromCamera = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission needed', 'Please allow camera access.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setImageUri(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
        }
    };

    const handleAddCow = async () => {
        if (!name.trim() || !age.trim() || !cost.trim()) {
            Alert.alert('Missing fields', 'Please fill in Name, Age, and Cost.');
            return;
        }
        try {
            const { error } = await supabase.from('cows').insert([{
                name: name.trim(),
                age: Number(age),
                calved_count: calvedCount ? Number(calvedCount) : 0,
                is_pregnant: isPregnant,
                mating_date: isPregnant && matingDate ? new Date(matingDate).toISOString() : null,
                abortion_date: abortionDate ? new Date(abortionDate).toISOString() : null,
                unsuccessful_insemination_date: unsuccessfulInseminationDate ? new Date(unsuccessfulInseminationDate).toISOString() : null,
                buying_date: buyingDate ? new Date(buyingDate).toISOString() : null,
                cost: Number(cost),
                image_url: imageUri || null,
            }]);
            if (error) throw error;
            resetForm();
            fetchCows();
        } catch (err) {
            Alert.alert('Error', 'Failed to add record.');
        }
    };

    const handleUpdateCow = async () => {
        if (!editCowId) return;
        if (!name.trim() || !age.trim() || !cost.trim()) {
            Alert.alert('Missing fields', 'Please fill in Name, Age, and Cost.');
            return;
        }
        try {
            const { error } = await supabase.from('cows').update({
                name: name.trim(),
                age: Number(age),
                calved_count: calvedCount ? Number(calvedCount) : 0,
                is_pregnant: isPregnant,
                mating_date: isPregnant && matingDate ? new Date(matingDate).toISOString() : null,
                abortion_date: abortionDate ? new Date(abortionDate).toISOString() : null,
                unsuccessful_insemination_date: unsuccessfulInseminationDate ? new Date(unsuccessfulInseminationDate).toISOString() : null,
                buying_date: buyingDate ? new Date(buyingDate).toISOString() : null,
                cost: Number(cost),
                image_url: imageUri || null,
            }).eq('id', editCowId);
            if (error) throw error;
            resetForm();
            fetchCows();
        } catch (err) {
            Alert.alert('Error', 'Failed to update cow record.');
        }
    };

    const handleDeleteCow = (id) => {
        const performDelete = async () => {
            try {
                const { error } = await supabase.from('cows').delete().eq('id', id);
                if (error) throw error;
                setCows(prev => prev.filter(c => c._id !== id));
            } catch (err) {
                Alert.alert('Error', 'Failed to delete record.');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Delete this cow?')) performDelete();
        } else {
            Alert.alert('Remove Record', 'Confirm removal?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: performDelete }
            ]);
        }
    };

    const openEditModal = (item) => {
        setIsEditMode(true);
        setEditCowId(item._id);
        setName(item.name || '');
        setAge(item.age ? String(item.age) : '');
        setCalvedCount(item.calvedCount ? String(item.calvedCount) : '');
        setIsPregnant(item.isPregnant || false);
        setMatingDate(item.matingDate ? new Date(item.matingDate).toISOString().split('T')[0] : '');
        setAbortionDate(item.abortionDate ? new Date(item.abortionDate).toISOString().split('T')[0] : '');
        setUnsuccessfulInseminationDate(item.unsuccessfulInseminationDate ? new Date(item.unsuccessfulInseminationDate).toISOString().split('T')[0] : '');
        setShowAbortionInput(!!item.abortionDate);
        setShowUnsuccessfulInseminationInput(!!item.unsuccessfulInseminationDate);
        setBuyingDate(item.buyingDate ? new Date(item.buyingDate).toISOString().split('T')[0] : '');
        setCost(item.cost ? String(item.cost) : '');
        setImageUri(item.imageUrl || '');
        setModalVisible(true);
    };

    const renderCow = ({ item }) => {
        const calves = item.calvedCount || 0;
        const failed = (item.abortionDate ? 1 : 0) + (item.unsuccessfulInseminationDate ? 1 : 0);
        const totalAttempts = calves + failed;
        const successRate = totalAttempts > 0 ? Math.round((calves / totalAttempts) * 100) : null;

        let pregnancyDetails = null;
        if (item.isPregnant && item.matingDate && !item.abortionDate) {
            const matingDate = new Date(item.matingDate);
            const deliveryDate = new Date(matingDate.getTime() + 283 * 24 * 60 * 60 * 1000); // 283 days average
            const minDeliveryDate = new Date(matingDate.getTime() + 279 * 24 * 60 * 60 * 1000); // 279 days min
            const maxDeliveryDate = new Date(matingDate.getTime() + 292 * 24 * 60 * 60 * 1000); // 292 days max
            const today = new Date();
            const daysPregnant = Math.max(0, Math.floor((today - matingDate) / (1000 * 60 * 60 * 24)));
            let daysLeft = 283 - daysPregnant;
            if (daysLeft < 0) daysLeft = 0;
            const percent = Math.min(100, (daysPregnant / 283) * 100);
            const isClose = daysLeft <= 30;

             const formatDate = (d) => {
                 const day = String(d.getDate()).padStart(2, '0');
                 const month = String(d.getMonth() + 1).padStart(2, '0');
                 const year = d.getFullYear();
                 return `${day}/${month}/${year}`;
             };

             pregnancyDetails = (
                 <View style={{ marginTop: 15, padding: 12, backgroundColor: 'rgba(187, 162, 132, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: isClose ? 'rgba(239, 68, 68, 0.3)' : 'rgba(187, 162, 132, 0.2)' }}>
                     <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                         <Text style={{ color: isClose ? '#ef4444' : '#bba284', fontSize: 13, fontWeight: '800' }}>
                             {isClose ? `🚨 DUE IN ${daysLeft} DAYS` : `Pregnant: ${daysPregnant} Days`}
                         </Text>
                         <View style={{ alignItems: 'flex-end' }}>
                             <Text style={{ color: '#e1dacb', fontSize: 11, fontWeight: '800' }}>
                                 Est. {formatDate(minDeliveryDate)} - {formatDate(maxDeliveryDate)}
                             </Text>
                         </View>
                     </View>
                    <View style={{ height: 6, backgroundColor: '#1a0e08', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ width: `${percent}%`, height: '100%', backgroundColor: isClose ? '#ef4444' : '#10b981', borderRadius: 3 }} />
                    </View>
                </View>
            );
        }

        const getLactationStage = () => {
             if (calves === 0) return { label: 'Heifer', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
             
             if (item.isPregnant && item.matingDate && !item.abortionDate) {
                 const matingDate = new Date(item.matingDate);
                 const today = new Date();
                 const daysPregnant = Math.floor((today - matingDate) / (1000 * 60 * 60 * 24));
                 if (daysPregnant >= 220) {
                     return { label: 'Dry Period', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
                 }
             }
             return { label: 'Active Milker', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
         };
         const stage = getLactationStage();

        const timelineEvents = [];
        if (item.buyingDate) {
            timelineEvents.push({
                title: 'Purchased Cow',
                date: new Date(item.buyingDate),
                color: '#bba284',
                label: 'Registry'
            });
        }
        if (item.matingDate) {
            timelineEvents.push({
                title: item.isPregnant ? 'Mating (Active)' : 'Mating',
                date: new Date(item.matingDate),
                color: '#10b981',
                label: 'Breeding'
            });
        }
        if (item.abortionDate) {
            timelineEvents.push({
                title: 'Abortion (Loss)',
                date: new Date(item.abortionDate),
                color: '#ef4444',
                label: 'Event'
            });
        }
        if (item.unsuccessfulInseminationDate) {
            timelineEvents.push({
                title: 'Unsuccessful Insem.',
                date: new Date(item.unsuccessfulInseminationDate),
                color: '#f59e0b',
                label: 'Attempt'
            });
        }

        timelineEvents.sort((a, b) => b.date - a.date);

        return (
            <View style={styles.recordCard}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={styles.iconThumb}>
                            <BookOpen size={16} color="#e1dacb" />
                        </View>
                        <Text style={styles.cowName} numberOfLines={1}>{item.name}</Text>
                        <View style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: stage.bg, borderRadius: 6, borderWidth: 1, borderColor: stage.color }}>
                            <Text style={{ color: stage.color, fontSize: 9, fontWeight: '800' }}>{stage.label.toUpperCase()}</Text>
                        </View>
                        {item.abortionDate && (
                            <View style={{ marginLeft: 6, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#ef4444', borderRadius: 6 }}>
                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>ABORTED</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.costBadge}>₹{item.cost}</Text>
                        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
                            <Edit size={17} color="#bba284" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteCow(item._id)} style={styles.actionBtn}>
                            <Trash2 size={17} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.cowCardImage} />
                ) : null}

                <View style={styles.statsRow}>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabel}>AGE</Text>
                        <Text style={styles.statValue}>{item.age} yrs</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCol}>
                        <Text style={styles.statLabel}>CALVES</Text>
                        <Text style={styles.statValue}>{item.calvedCount || 0}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCol}>
                        <Text style={styles.statLabel}>PREGNANT</Text>
                        <Text style={[styles.statValue, { color: item.abortionDate ? '#ef4444' : item.isPregnant ? '#10b981' : '#b0a091' }]}>
                            {item.abortionDate ? 'Aborted' : item.isPregnant ? 'Yes' : 'No'}
                        </Text>
                    </View>
                </View>

                {successRate !== null && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12 }}>
                        <Text style={{ color: '#8a7c6f', fontSize: 11, fontWeight: '800' }}>SUCCESS RATE</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: successRate >= 70 ? '#10b981' : successRate >= 40 ? '#f59e0b' : '#ef4444' }} />
                            <Text style={{ color: successRate >= 70 ? '#10b981' : successRate >= 40 ? '#f59e0b' : '#ef4444', fontSize: 13, fontWeight: '800' }}>{successRate}%</Text>
                        </View>
                    </View>
                )}

                {pregnancyDetails}

                {timelineEvents.length > 0 && (
                    <View style={{ marginTop: 15, padding: 15, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16 }}>
                        <Text style={{ color: '#8a7c6f', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 }}>REPRODUCTIVE TIMELINE</Text>
                        {timelineEvents.map((evt, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: idx === timelineEvents.length - 1 ? 0 : 12 }}>
                                <View style={{ alignItems: 'center', marginRight: 10, height: '100%', minHeight: 30 }}>
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: evt.color, marginTop: 4 }} />
                                    {idx !== timelineEvents.length - 1 && (
                                        <View style={{ width: 2, flex: 1, backgroundColor: '#4d3f34', marginTop: 4, minHeight: 15 }} />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{evt.title}</Text>
                                        <Text style={{ color: '#8a7c6f', fontSize: 11, fontWeight: '600' }}>{evt.date.toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={{ color: evt.color, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }}>{evt.label}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View>
                        <Text style={styles.headerSubtitle}>REGISTRY</Text>
                        <Text style={styles.headerTitle}>Cow Book</Text>
                    </View>
                    <TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
                        <Download size={20} color="#bba284" />
                    </TouchableOpacity>
                </View>

                {/* Filter / Search Bar */}
                <View style={styles.searchContainer}>
                    <Search size={18} color="#8a7c6f" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Filter by name..."
                        placeholderTextColor="#8a7c6f"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    <View style={styles.filterGroup}>
                        <Filter size={14} color="#8a7c6f" />
                        <TextInput
                            style={styles.filterInput}
                            placeholder="Age >"
                            placeholderTextColor="#6b6056"
                            value={filterAge}
                            onChangeText={setFilterAge}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={styles.filterInput}
                            placeholder="Calves >"
                            placeholderTextColor="#6b6056"
                            value={filterCalved}
                            onChangeText={setFilterCalved}
                            keyboardType="numeric"
                        />
                        <View style={styles.pregFilter}>
                            {['all', 'yes', 'no'].map(p => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.pregBtn, filterPregnant === p && styles.pregBtnActive]}
                                    onPress={() => setFilterPregnant(p)}
                                >
                                    <Text style={[styles.pregBtnText, filterPregnant === p && styles.pregBtnActiveText]}>{p.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </View>

            <TouchableOpacity
                style={styles.inlineAddBtn}
                onPress={() => { resetForm(); setModalVisible(true); }}
            >
                <Plus size={20} color="#26170d" />
                <Text style={styles.inlineAddText}>Add New Cow</Text>
            </TouchableOpacity>

            <FlatList
                key={flatListKey}
                numColumns={numColumns}
                data={filteredCows}
                keyExtractor={item => item._id}
                renderItem={renderCow}
                columnWrapperStyle={numColumns > 1 ? { gap: 16 } : null}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bba284" />}
                ListEmptyComponent={<Text style={styles.emptyText}>No cows match your search filters.</Text>}
            />

            <Modal visible={isModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>{isEditMode ? 'Edit Cow' : 'New Cow'}</Text>
                            <TouchableOpacity onPress={resetForm} style={styles.closeBtn}>
                                <X size={24} color="#8a7c6f" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Cow Photo</Text>
                            <View style={styles.photoContainer}>
                                {imageUri ? (
                                    <View>
                                        <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                                        <TouchableOpacity style={styles.removePhoto} onPress={() => setImageUri('')}>
                                            <X size={16} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.photoPrompt}>
                                        <TouchableOpacity style={styles.photoSquare} onPress={pickImageFromCamera}>
                                            <Camera size={24} color="#8a7c6f" />
                                            <Text style={styles.pText}>Camera</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.photoSquare} onPress={pickImageFromGallery}>
                                            <ImageIcon size={24} color="#8a7c6f" />
                                            <Text style={styles.pText}>Gallery</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.inputLabel}>Name / ID</Text>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Daisy..." placeholderTextColor="#8a7c6f" />

                            <View style={styles.rowInputs}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.inputLabel}>Age</Text>
                                    <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="Yrs" placeholderTextColor="#8a7c6f" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Calves</Text>
                                    <TextInput style={styles.input} value={calvedCount} onChangeText={setCalvedCount} keyboardType="numeric" placeholder="Total" placeholderTextColor="#8a7c6f" />
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>Pregnancy Status</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity style={[styles.toggleBtn, isPregnant && styles.toggleBtnActive]} onPress={() => setIsPregnant(true)}>
                                    <Text style={[styles.toggleBtnText, isPregnant && styles.toggleBtnTextActive]}>PREGNANT</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.toggleBtn, !isPregnant && styles.toggleBtnActive]} onPress={() => setIsPregnant(false)}>
                                    <Text style={[styles.toggleBtnText, !isPregnant && styles.toggleBtnTextActive]}>NOT PREGNANT</Text>
                                </TouchableOpacity>
                            </View>

                            {isPregnant && (
                                <View style={{ width: '100%', marginTop: 5 }}>
                                    <AppDatePicker 
                                        label="Mating Date" 
                                        dateString={matingDate} 
                                        onDateChange={setMatingDate} 
                                        placeholder="Select Mating Date" 
                                    />
                                </View>
                            )}

                            <Text style={styles.inputLabel}>Record Event (Optional)</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, showAbortionInput && styles.toggleBtnActive]} 
                                    onPress={() => {
                                        const next = !showAbortionInput;
                                        setShowAbortionInput(next);
                                        if (!next) setAbortionDate('');
                                    }}
                                >
                                    <Text style={[styles.toggleBtnText, showAbortionInput && styles.toggleBtnTextActive]}>ABORTION</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, showUnsuccessfulInseminationInput && styles.toggleBtnActive]} 
                                    onPress={() => {
                                        const next = !showUnsuccessfulInseminationInput;
                                        setShowUnsuccessfulInseminationInput(next);
                                        if (!next) setUnsuccessfulInseminationDate('');
                                    }}
                                >
                                    <Text style={[styles.toggleBtnText, showUnsuccessfulInseminationInput && styles.toggleBtnTextActive]}>UNSUCCESSFUL INSEM.</Text>
                                </TouchableOpacity>
                            </View>

                            {showAbortionInput && (
                                <View style={{ width: '100%', marginTop: 5 }}>
                                    <AppDatePicker 
                                        label="Abortion Date" 
                                        dateString={abortionDate} 
                                        onDateChange={setAbortionDate} 
                                        placeholder="Select Abortion Date" 
                                    />
                                </View>
                            )}

                            {showUnsuccessfulInseminationInput && (
                                <View style={{ width: '100%', marginTop: 5 }}>
                                    <AppDatePicker 
                                        label="Unsuccessful Insemination Date" 
                                        dateString={unsuccessfulInseminationDate} 
                                        onDateChange={setUnsuccessfulInseminationDate} 
                                        placeholder="Select Unsuccessful Insemination Date" 
                                    />
                                </View>
                            )}

                            <View style={{ width: '100%', marginTop: 5 }}>
                                <AppDatePicker 
                                    label="Buying Date (Optional)" 
                                    dateString={buyingDate} 
                                    onDateChange={setBuyingDate} 
                                    placeholder="Select Buying Date" 
                                />
                            </View>

                            <Text style={styles.inputLabel}>Cost of Cow (₹)</Text>
                            <TextInput style={styles.input} value={cost} onChangeText={setCost} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#8a7c6f" />

                            <TouchableOpacity style={styles.submitBtn} onPress={isEditMode ? handleUpdateCow : handleAddCow}>
                                <Text style={styles.submitBtnText}>{isEditMode ? 'Update Cow Info' : 'Add Cow to Registry'}</Text>
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
    header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15 },
    headerSubtitle: { fontSize: 13, fontWeight: '700', color: '#8a7c6f', letterSpacing: 1.5, marginBottom: 4 },
    headerTitle: { fontSize: 32, fontWeight: '800', color: '#fff' },
    exportBtn: { backgroundColor: '#382a20', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#4d3f34' },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#382a20', borderRadius: 14, paddingHorizontal: 15, marginTop: 20 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 48, color: '#fff', fontSize: 15 },

    filterScroll: { marginTop: 15 },
    filterGroup: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 5 },
    filterInput: { backgroundColor: '#382a20', width: 80, height: 36, borderRadius: 10, paddingHorizontal: 10, color: '#fff', fontSize: 13, borderWidth: 1, borderColor: '#4d3f34' },
    pregFilter: { flexDirection: 'row', backgroundColor: '#382a20', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#4d3f34' },
    pregBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    pregBtnActive: { backgroundColor: '#bba284' },
    pregBtnText: { fontSize: 10, fontWeight: '800', color: '#8a7c6f' },
    pregBtnActiveText: { color: '#26170d' },

    list: { paddingHorizontal: 20, paddingBottom: 100 },
    recordCard: { flex: 1, backgroundColor: '#382a20', padding: 18, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: '#4d3f34' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    iconThumb: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#4d3f34', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    cowName: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1 },
    costBadge: { color: '#10b981', fontWeight: '800', fontSize: 14, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginRight: 10 },
    actionBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, marginLeft: 5 },

    cowCardImage: { width: '100%', height: 350, borderRadius: 16, marginBottom: 15, backgroundColor: '#26170d' },
    statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#26170d', borderRadius: 16, padding: 15 },
    statCol: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: 24, backgroundColor: '#382a20' },
    statLabel: { fontSize: 10, color: '#8a7c6f', fontWeight: '800', marginBottom: 2 },
    statValue: { fontSize: 15, fontWeight: '800', color: '#fff' },

    matingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#4d3f34' },
    matingText: { fontSize: 13, color: '#8a7c6f', fontWeight: '600' },

    inlineAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#bba284', marginHorizontal: 20, marginBottom: 20, padding: 18, borderRadius: 18 },
    inlineAddText: { color: '#26170d', fontSize: 17, fontWeight: '800' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#8a7c6f', fontSize: 15 },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#26170d', padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%' },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    closeBtn: { padding: 8, backgroundColor: '#382a20', borderRadius: 12 },

    photoContainer: { alignItems: 'center', marginBottom: 20 },
    photoPreview: { width: 150, height: 150, borderRadius: 15 },
    removePhoto: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ef4444', borderRadius: 12, padding: 4 },
    photoPrompt: { flexDirection: 'row', gap: 15 },
    photoSquare: { width: 100, height: 100, borderRadius: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#8a7c6f', justifyContent: 'center', alignItems: 'center', gap: 5 },
    pText: { fontSize: 11, color: '#8a7c6f', fontWeight: '700' },

    inputLabel: { fontSize: 14, fontWeight: '700', color: '#8a7c6f', marginBottom: 8, marginTop: 15 },
    input: { backgroundColor: '#382a20', borderRadius: 14, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#4d3f34' },
    rowInputs: { flexDirection: 'row' },
    toggleRow: { flexDirection: 'row', gap: 10 },
    toggleBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: '#382a20', borderWidth: 1, borderColor: '#4d3f34' },
    toggleBtnActive: { backgroundColor: '#bba284', borderColor: '#bba284' },
    toggleBtnText: { color: '#8a7c6f', fontWeight: '800', fontSize: 13 },
    toggleBtnTextActive: { color: '#26170d' },
    matingDateContainer: { marginTop: 15 },
    submitBtn: { backgroundColor: '#bba284', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 30, marginBottom: 30 },
    submitBtnText: { color: '#26170d', fontSize: 18, fontWeight: '800' }
});
