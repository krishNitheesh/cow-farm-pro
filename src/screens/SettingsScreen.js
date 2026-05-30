import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Settings, Target, IndianRupee, MapPin, User, KeyRound, Calendar, FileText, Maximize2, LogOut, ArrowLeft, Palette, Sparkles, Coins } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import AppDatePicker from '../components/AppDatePicker';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function SettingsScreen({ navigation }) {
    const { logout } = useContext(AuthContext);
    const [farmName, setFarmName] = useState('');
    const [milkTarget, setMilkTarget] = useState('100');
    const [currency, setCurrency] = useState('₹');

    // New profile & optional configurations
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [startingDate, setStartingDate] = useState('');
    const [importantNotes, setImportantNotes] = useState('');
    const [zoom, setZoom] = useState('Medium'); // 'Small' | 'Medium' | 'Large' | 'Extra Large'

    // Avatar custom configuration states
    const [avatarType, setAvatarType] = useState('initial'); // 'initial' | 'custom_char' | 'emoji'
    const [avatarValue, setAvatarValue] = useState('');
    const [avatarBgColor, setAvatarBgColor] = useState('#4d3f34');
    const [focusedField, setFocusedField] = useState(null);

    const loadSettings = async () => {
        try {
            // Load local customizations
            const storedName = await AsyncStorage.getItem('farmName');
            const storedTarget = await AsyncStorage.getItem('milkTarget');
            const storedCurrency = await AsyncStorage.getItem('currency');
            
            const storedStartingDate = await AsyncStorage.getItem('startingDate');
            const storedNotes = await AsyncStorage.getItem('importantNotes');
            const storedZoom = await AsyncStorage.getItem('zoomPreference');

            const storedAvatarType = await AsyncStorage.getItem('avatarType');
            const storedAvatarValue = await AsyncStorage.getItem('avatarValue');
            const storedAvatarBgColor = await AsyncStorage.getItem('avatarBgColor');
            
            if (storedName) setFarmName(storedName);
            if (storedTarget) setMilkTarget(storedTarget);
            if (storedCurrency) setCurrency(storedCurrency);
            
            if (storedStartingDate) setStartingDate(storedStartingDate);
            if (storedNotes) setImportantNotes(storedNotes);
            if (storedZoom) setZoom(storedZoom);

            if (storedAvatarType) setAvatarType(storedAvatarType);
            if (storedAvatarValue) setAvatarValue(storedAvatarValue);
            if (storedAvatarBgColor) setAvatarBgColor(storedAvatarBgColor);

            // Fetch profile data from Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const metaUsername = user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || '';
                setUsername(metaUsername);
            }
        } catch (err) {
            console.error('Failed to load settings', err);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadSettings();
        }, [])
    );

    const saveSettings = async () => {
        try {
            // Save standard local configurations
            await AsyncStorage.setItem('farmName', farmName.trim() || 'cow-farm-pro');
            await AsyncStorage.setItem('milkTarget', milkTarget.trim() || '100');
            await AsyncStorage.setItem('currency', currency.trim() || '₹');
            
            // Save new local configurations
            await AsyncStorage.setItem('startingDate', startingDate);
            await AsyncStorage.setItem('importantNotes', importantNotes.trim());
            await AsyncStorage.setItem('zoomPreference', zoom);

            // Save new avatar configurations
            await AsyncStorage.setItem('avatarType', avatarType);
            await AsyncStorage.setItem('avatarValue', avatarValue);
            await AsyncStorage.setItem('avatarBgColor', avatarBgColor);

            // Save Supabase Profile updates (Username / Password)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Update username in metadata
                const { error: metaError } = await supabase.auth.updateUser({
                    data: { username: username.trim() }
                });
                if (metaError) throw metaError;

                // Update password in Supabase if entered
                if (password.trim().length > 0) {
                    if (password.trim().length < 6) {
                        Alert.alert('Warning', 'Password must be at least 6 characters.');
                        return;
                    }
                    const { error: passError } = await supabase.auth.updateUser({
                        password: password.trim()
                    });
                    if (passError) throw passError;
                    setPassword(''); // Clear password field
                }
            }
            
            Alert.alert('Success', 'All custom settings and profile updates have been saved successfully!');
        } catch (err) {
            console.error(err);
            Alert.alert('Error', err.message || 'Failed to save settings');
        }
    };

    const getZoomScale = (zoomVal) => {
        switch (zoomVal) {
            case 'Small': return 0.85;
            case 'Large': return 1.15;
            case 'Extra Large': return 1.30;
            default: return 1.0; // Default / Medium
        }
    };

    const scale = getZoomScale(zoom);
    const zoomOptions = ['Small', 'Medium', 'Large', 'Extra Large'];

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#26170d', '#170e08', '#0c0704']}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Glowing Ambient Backdrop Blur Circles */}
            <View style={[styles.glowCircle, { top: '8%', left: '-15%', backgroundColor: 'rgba(187, 162, 132, 0.07)' }]} />
            <View style={[styles.glowCircle, { top: '45%', right: '-20%', backgroundColor: 'rgba(220, 167, 106, 0.05)' }]} />
            <View style={[styles.glowCircle, { bottom: '12%', left: '5%', backgroundColor: 'rgba(187, 162, 132, 0.06)' }]} />

            {/* Premium Header */}
            <View style={styles.header}>
                <View style={styles.headerLeftRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                        <ArrowLeft size={22 * scale} color="#bba284" />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.headerSubtitle, { fontSize: 11 * scale }]}>CUSTOMIZATION & ACCOUNT</Text>
                        <Text style={[styles.headerTitle, { fontSize: 26 * scale }]}>System Settings</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    
                    {/* Live Dashboard Profile Preview Card */}
                    <View style={styles.previewContainer}>
                        <LinearGradient
                            colors={['rgba(77, 63, 52, 0.25)', 'rgba(38, 23, 13, 0.45)']}
                            style={StyleSheet.absoluteFillObject}
                        />
                        <Text style={[styles.previewTitle, { fontSize: 11 * scale }]}>Live Profile Preview</Text>
                        <View style={[
                            styles.previewCircle, 
                            { 
                                backgroundColor: avatarBgColor,
                                shadowColor: avatarBgColor,
                                width: 80 * scale,
                                height: 80 * scale,
                                borderRadius: (80 * scale) / 2
                            }
                        ]}>
                            <Text style={[styles.previewInitial, { fontSize: 32 * scale }]}>
                                {avatarType === 'initial' 
                                    ? (username ? username.charAt(0).toUpperCase() : 'U') 
                                    : (avatarType === 'emoji' ? avatarValue || '🐄' : avatarValue || 'U')}
                            </Text>
                        </View>
                        <Text style={[styles.previewLabel, { fontSize: 18 * scale }]}>{username || 'Your Username'}</Text>
                        <Text style={[styles.previewSubLabel, { fontSize: 12 * scale }]}>Dynamic initial and styling applies immediately</Text>
                    </View>

                    {/* User Profile Settings Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <User size={20 * scale} color="#bba284" />
                            <Text style={[styles.cardTitle, { fontSize: 17 * scale }]}>Account Profile</Text>
                        </View>
                        <Text style={[styles.cardDesc, { fontSize: 13 * scale }]}>Modify your user profile details stored on Supabase.</Text>
                        
                        <Text style={[styles.fieldLabel, { fontSize: 13 * scale }]}>Username</Text>
                        <View style={[
                            styles.inputRow,
                            focusedField === 'username' && styles.inputRowFocused
                        ]}>
                            <User size={18 * scale} color={focusedField === 'username' ? '#bba284' : '#8a7c6f'} />
                            <View style={styles.inputSeparator} />
                            <TextInput
                                style={[styles.rowInput, { fontSize: 16 * scale }]}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="e.g. Nitheesh"
                                placeholderTextColor="#6a5c52"
                                onFocus={() => setFocusedField('username')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        <Text style={[styles.fieldLabel, { marginTop: 18, fontSize: 13 * scale }]}>Change Password</Text>
                        <View style={[
                            styles.inputRow,
                            focusedField === 'password' && styles.inputRowFocused
                        ]}>
                            <KeyRound size={18 * scale} color={focusedField === 'password' ? '#bba284' : '#8a7c6f'} />
                            <View style={styles.inputSeparator} />
                            <TextInput
                                style={[styles.rowInput, { fontSize: 16 * scale }]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter new password to change"
                                placeholderTextColor="#6a5c52"
                                secureTextEntry={true}
                                autoCapitalize="none"
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    </View>

                    {/* Top Right Avatar Customization Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Palette size={20 * scale} color="#bba284" />
                            <Text style={[styles.cardTitle, { fontSize: 17 * scale }]}>Top Right Circular Avatar</Text>
                        </View>
                        <Text style={[styles.cardDesc, { fontSize: 13 * scale }]}>Customize the circular profile button displayed on the top right of your Home Dashboard.</Text>
                        
                        <Text style={[styles.fieldLabel, { fontSize: 13 * scale }]}>Avatar Content Type</Text>
                        <View style={styles.zoomRow}>
                            {[
                                { key: 'initial', label: 'Default Initial' },
                                { key: 'custom_char', label: 'Custom Letter' },
                                { key: 'emoji', label: 'Emoji Icon' }
                            ].map((typeItem) => (
                                <TouchableOpacity 
                                    key={typeItem.key}
                                    style={[styles.zoomBtn, avatarType === typeItem.key && styles.zoomBtnActive]}
                                    onPress={() => {
                                        setAvatarType(typeItem.key);
                                        // Provide dynamic fallback if empty
                                        if (typeItem.key === 'custom_char' && !avatarValue) {
                                            setAvatarValue(username ? username.charAt(0).toUpperCase() : 'U');
                                        } else if (typeItem.key === 'emoji' && (!avatarValue || avatarValue.length > 2)) {
                                            setAvatarValue('🐄');
                                        }
                                    }}
                                    activeOpacity={0.8}
                                >
                                    {avatarType === typeItem.key && (
                                        <LinearGradient
                                            colors={['#dca76a', '#bba284']}
                                            style={StyleSheet.absoluteFillObject}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        />
                                    )}
                                    <Text style={[styles.zoomText, avatarType === typeItem.key && styles.zoomTextActive, { fontSize: 13 * scale }]}>
                                        {typeItem.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {avatarType === 'custom_char' && (
                            <View style={{ marginTop: 18 }}>
                                <Text style={[styles.fieldLabel, { fontSize: 13 * scale }]}>Custom Letter / Symbol (Max 2 chars)</Text>
                                <View style={[
                                    styles.inputRow,
                                    focusedField === 'avatarValue' && styles.inputRowFocused
                                ]}>
                                    <Palette size={18 * scale} color={focusedField === 'avatarValue' ? '#bba284' : '#8a7c6f'} />
                                    <View style={styles.inputSeparator} />
                                    <TextInput
                                        style={[styles.rowInput, { fontSize: 16 * scale }]}
                                        value={avatarValue}
                                        onChangeText={(val) => setAvatarValue(val.slice(0, 2))}
                                        placeholder="e.g. CF"
                                        placeholderTextColor="#6a5c52"
                                        maxLength={2}
                                        onFocus={() => setFocusedField('avatarValue')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>
                            </View>
                        )}

                        {avatarType === 'emoji' && (
                            <View style={{ marginTop: 18 }}>
                                <Text style={[styles.fieldLabel, { fontSize: 13 * scale }]}>Select Emoji Icon</Text>
                                <View style={styles.emojiRow}>
                                    {['🐄', '🚜', '🥛', '🌾', '🤠', '👑', '🌟', '🍀', '🐮', '🏡'].map((em) => (
                                        <TouchableOpacity 
                                            key={em}
                                            style={[styles.emojiBtn, avatarValue === em && styles.emojiBtnActive]}
                                            onPress={() => setAvatarValue(em)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.emojiBtnText}>{em}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        <Text style={[styles.fieldLabel, { marginTop: 20, fontSize: 13 * scale }]}>Background Theme Color</Text>
                        <View style={styles.colorRow}>
                            {[
                                { color: '#4d3f34', label: 'Tan' },
                                { color: '#163a24', label: 'Sage' },
                                { color: '#4c1d1d', label: 'Red' },
                                { color: '#111827', label: 'Dark' },
                                { color: '#1d3557', label: 'Blue' },
                                { color: '#312e81', label: 'Indigo' },
                                { color: '#bba284', label: 'Gold' },
                                { color: '#6d28d9', label: 'Purple' }
                            ].map((c) => (
                                <TouchableOpacity 
                                    key={c.color}
                                    style={[
                                        styles.colorCircle, 
                                        { backgroundColor: c.color }, 
                                        avatarBgColor === c.color && styles.colorCircleActive
                                    ]}
                                    onPress={() => setAvatarBgColor(c.color)}
                                    activeOpacity={0.7}
                                >
                                    {avatarBgColor === c.color && (
                                        <View style={styles.colorCircleInnerDot} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Display Zoom Selection Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Maximize2 size={20 * scale} color="#bba284" />
                            <Text style={[styles.cardTitle, { fontSize: 17 * scale }]}>Global Display Zoom</Text>
                        </View>
                        <Text style={[styles.cardDesc, { fontSize: 13 * scale }]}>Select a display size preference for system dashboard texts and buttons.</Text>
                        
                        <View style={styles.gridRow}>
                            {/* Card 1: Small */}
                            <TouchableOpacity 
                                style={[styles.zoomGridCard, zoom === 'Small' && styles.zoomGridCardActive]}
                                onPress={() => setZoom('Small')}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.zoomGridTitle, zoom === 'Small' && styles.zoomGridTitleActive, { fontSize: 14 * scale }]}>SMALL</Text>
                                <Text style={[styles.zoomGridSub, { fontSize: 12 * scale }]}>Compact view for smaller screens</Text>
                                <View style={styles.dotsContainer}>
                                    <View style={[styles.dot, { width: 6, height: 6, borderRadius: 3, backgroundColor: zoom === 'Small' ? '#bba284' : '#4d3f34' }]} />
                                    <View style={[styles.dot, { width: 8, height: 8, borderRadius: 4, backgroundColor: '#382a20' }]} />
                                    <View style={[styles.dot, { width: 10, height: 10, borderRadius: 5, backgroundColor: '#382a20' }]} />
                                </View>
                            </TouchableOpacity>

                            {/* Card 2: Default */}
                            <TouchableOpacity 
                                style={[styles.zoomGridCard, zoom === 'Medium' && styles.zoomGridCardActive]}
                                onPress={() => setZoom('Medium')}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.zoomGridTitle, zoom === 'Medium' && styles.zoomGridTitleActive, { fontSize: 14 * scale }]}>DEFAULT</Text>
                                <Text style={[styles.zoomGridSub, { fontSize: 12 * scale }]}>Standard institutional text size</Text>
                                <View style={styles.dotsContainer}>
                                    <View style={[styles.dot, { width: 6, height: 6, borderRadius: 3, backgroundColor: '#382a20' }]} />
                                    <View style={[styles.dot, { width: 8, height: 8, borderRadius: 4, backgroundColor: zoom === 'Medium' ? '#bba284' : '#4d3f34' }]} />
                                    <View style={[styles.dot, { width: 10, height: 10, borderRadius: 5, backgroundColor: '#382a20' }]} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.gridRow, { marginTop: 12 }]}>
                            {/* Card 3: Large */}
                            <TouchableOpacity 
                                style={[styles.zoomGridCard, zoom === 'Large' && styles.zoomGridCardActive]}
                                onPress={() => setZoom('Large')}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.zoomGridTitle, zoom === 'Large' && styles.zoomGridTitleActive, { fontSize: 14 * scale }]}>LARGE</Text>
                                <Text style={[styles.zoomGridSub, { fontSize: 12 * scale }]}>Enhanced readability & focus</Text>
                                <View style={styles.dotsContainer}>
                                    <View style={[styles.dot, { width: 6, height: 6, borderRadius: 3, backgroundColor: '#382a20' }]} />
                                    <View style={[styles.dot, { width: 8, height: 8, borderRadius: 4, backgroundColor: '#382a20' }]} />
                                    <View style={[styles.dot, { width: 10, height: 10, borderRadius: 5, backgroundColor: zoom === 'Large' ? '#bba284' : '#4d3f34' }]} />
                                </View>
                            </TouchableOpacity>

                            {/* Card 4: Extra Large */}
                            <TouchableOpacity 
                                style={[styles.zoomGridCard, zoom === 'Extra Large' && styles.zoomGridCardActive]}
                                onPress={() => setZoom('Extra Large')}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.zoomGridTitle, zoom === 'Extra Large' && styles.zoomGridTitleActive, { fontSize: 14 * scale }]}>EXTRA LARGE</Text>
                                <Text style={[styles.zoomGridSub, { fontSize: 12 * scale }]}>Maximum legibility for presentations</Text>
                                <View style={styles.dotsContainer}>
                                    <View style={[styles.dot, { width: 6, height: 6, borderRadius: 3, backgroundColor: zoom === 'Extra Large' ? '#bba284' : '#4d3f34' }]} />
                                    <View style={[styles.dot, { width: 8, height: 8, borderRadius: 4, backgroundColor: zoom === 'Extra Large' ? '#bba284' : '#4d3f34' }]} />
                                    <View style={[styles.dot, { width: 10, height: 10, borderRadius: 5, backgroundColor: zoom === 'Extra Large' ? '#bba284' : '#4d3f34' }]} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Note at bottom of selector */}
                        <View style={styles.noteRow}>
                            <Settings size={13 * scale} color="#6a5c52" />
                            <Text style={[styles.noteText, { fontSize: 10 * scale }]}>NOTE: THIS SETTING IS SAVED PER-DEVICE FOR YOUR CURRENT BROWSER.</Text>
                        </View>
                    </View>

                    {/* Farm Display Settings Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MapPin size={20 * scale} color="#bba284" />
                            <Text style={[styles.cardTitle, { fontSize: 17 * scale }]}>Farm Display Settings</Text>
                        </View>
                        
                        <Text style={[styles.fieldLabel, { fontSize: 13 * scale }]}>Farm Display Name</Text>
                        <View style={[
                            styles.inputRow,
                            focusedField === 'farmName' && styles.inputRowFocused
                        ]}>
                            <Sparkles size={18 * scale} color={focusedField === 'farmName' ? '#bba284' : '#8a7c6f'} />
                            <View style={styles.inputSeparator} />
                            <TextInput
                                style={[styles.rowInput, { fontSize: 16 * scale }]}
                                value={farmName}
                                onChangeText={setFarmName}
                                placeholder="e.g. cow-farm-pro"
                                placeholderTextColor="#6a5c52"
                                onFocus={() => setFocusedField('farmName')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        <Text style={[styles.fieldLabel, { marginTop: 18, fontSize: 13 * scale }]}>Daily Liters Target</Text>
                        <View style={[
                            styles.inputRow,
                            focusedField === 'milkTarget' && styles.inputRowFocused
                        ]}>
                            <Target size={18 * scale} color={focusedField === 'milkTarget' ? '#bba284' : '#8a7c6f'} />
                            <View style={styles.inputSeparator} />
                            <TextInput
                                style={[styles.rowInput, { fontSize: 16 * scale }]}
                                value={milkTarget}
                                onChangeText={setMilkTarget}
                                keyboardType="numeric"
                                placeholder="100"
                                placeholderTextColor="#6a5c52"
                                onFocus={() => setFocusedField('milkTarget')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        <Text style={[styles.fieldLabel, { marginTop: 18, fontSize: 13 * scale }]}>Currency Symbol</Text>
                        <View style={[
                            styles.inputRow,
                            focusedField === 'currency' && styles.inputRowFocused
                        ]}>
                            <Coins size={18 * scale} color={focusedField === 'currency' ? '#bba284' : '#8a7c6f'} />
                            <View style={styles.inputSeparator} />
                            <TextInput
                                style={[styles.rowInput, { fontSize: 16 * scale }]}
                                value={currency}
                                onChangeText={setCurrency}
                                placeholder="₹"
                                placeholderTextColor="#6a5c52"
                                maxLength={3}
                                onFocus={() => setFocusedField('currency')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    </View>

                    {/* Optional Dates and Important Notes Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Calendar size={20 * scale} color="#bba284" />
                            <Text style={[styles.cardTitle, { fontSize: 17 * scale }]}>Optional & Timeline Logs</Text>
                        </View>

                        <AppDatePicker 
                            label="Business Starting Date" 
                            dateString={startingDate} 
                            onDateChange={setStartingDate} 
                            placeholder="e.g. 2026-05-01" 
                        />

                        <View style={{ marginTop: 15 }}>
                            <View style={[styles.cardHeader, { marginBottom: 6 }]}>
                                <FileText size={18 * scale} color="#bba284" />
                                <Text style={[styles.fieldLabel, { fontSize: 13 * scale }]}>Important Farm Notes</Text>
                            </View>
                            <View style={[
                                styles.inputRow,
                                styles.textAreaRow,
                                focusedField === 'importantNotes' && styles.inputRowFocused
                            ]}>
                                <FileText size={18 * scale} color={focusedField === 'importantNotes' ? '#bba284' : '#8a7c6f'} style={{ marginTop: 14 }} />
                                <View style={[styles.inputSeparator, { height: 70, marginTop: 12 }]} />
                                <TextInput
                                    style={[styles.rowInput, styles.textArea, { fontSize: 16 * scale }]}
                                    value={importantNotes}
                                    onChangeText={setImportantNotes}
                                    placeholder="Enter any general notes, reminders, or address details..."
                                    placeholderTextColor="#6a5c52"
                                    multiline={true}
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    onFocus={() => setFocusedField('importantNotes')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity style={styles.saveBtn} onPress={saveSettings} activeOpacity={0.8}>
                        <LinearGradient
                            colors={['#dca76a', '#bba284']}
                            style={StyleSheet.absoluteFillObject}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                        <Settings size={20 * scale} color="#26170d" style={{ marginRight: 8 }} />
                        <Text style={[styles.saveBtnText, { fontSize: 16 * scale }]}>Apply All Configurations</Text>
                    </TouchableOpacity>

                    {/* Log Out Button */}
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
                        <LogOut size={20 * scale} color="#ef4444" style={{ marginRight: 8 }} />
                        <Text style={[styles.logoutBtnText, { fontSize: 16 * scale }]}>Log Out Account</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#170e08' },
    glowCircle: { position: 'absolute', width: 320, height: 320, borderRadius: 160, zIndex: 0, filter: [{ blur: 50 }] },
    header: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, zIndex: 10 },
    headerLeftRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(56, 42, 32, 0.7)', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: 'rgba(187, 162, 132, 0.2)' },
    headerSubtitle: { color: '#8a7c6f', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
    headerTitle: { color: '#e1dacb', fontSize: 26, fontWeight: '800', letterSpacing: 0.5 },
    content: { padding: 20, paddingBottom: 40 },
    
    // Preview styles
    previewContainer: { alignItems: 'center', marginVertical: 10, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(187, 162, 132, 0.15)', overflow: 'hidden', marginBottom: 22 },
    previewTitle: { color: '#8a7c6f', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase' },
    previewCircle: { 
        width: 80, 
        height: 80, 
        borderRadius: 40, 
        justifyContent: 'center', 
        alignItems: 'center', 
        shadowOffset: { width: 0, height: 6 }, 
        shadowOpacity: 0.35, 
        shadowRadius: 10, 
        elevation: 6,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)'
    },
    previewInitial: { color: '#ffffff', fontSize: 32, fontWeight: '800' },
    previewLabel: { color: '#e1dacb', fontSize: 18, fontWeight: '800', marginTop: 14 },
    previewSubLabel: { color: '#8a7c6f', fontSize: 12, marginTop: 4, textAlign: 'center' },

    card: { backgroundColor: 'rgba(56, 42, 32, 0.45)', padding: 22, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(187, 162, 132, 0.12)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2, zIndex: 5 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    cardTitle: { color: '#e1dacb', fontSize: 17, fontWeight: '700', marginLeft: 10 },
    cardDesc: { color: '#8a7c6f', fontSize: 13, marginBottom: 18, lineHeight: 18 },
    fieldLabel: { color: '#bba284', fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
    
    // Tactile Input Rows
    inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 14, 8, 0.8)', borderRadius: 16, borderHorizontalPadding: 16, height: 55, borderWidth: 1.5, borderColor: 'rgba(187, 162, 132, 0.15)', paddingHorizontal: 16 },
    inputRowFocused: { borderColor: '#bba284', backgroundColor: 'rgba(26, 14, 8, 0.95)', shadowColor: '#bba284', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 4 },
    inputSeparator: { width: 1.5, height: 20, backgroundColor: 'rgba(187, 162, 132, 0.2)', marginHorizontal: 12 },
    rowInput: { flex: 1, color: '#ffffff', fontSize: 16, height: '100%' },
    
    textAreaRow: { height: 110, alignItems: 'flex-start', paddingVertical: 2 },
    textArea: { height: 95, paddingTop: 14, paddingBottom: 14 },
    zoomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
    zoomBtn: { flex: 1, minWidth: 80, height: 48, backgroundColor: 'rgba(26, 14, 8, 0.8)', borderRadius: 12, borderWidth: 1.5, borderColor: '#4d3f34', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    zoomBtnActive: { borderColor: '#bba284' },
    zoomText: { color: '#bba284', fontSize: 13, fontWeight: '600', zIndex: 5 },
    zoomTextActive: { color: '#170e08', fontWeight: '800' },

    // Zoom 2x2 Grid Cards Styles
    gridRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    zoomGridCard: { width: '48.5%', backgroundColor: 'rgba(26, 14, 8, 0.75)', borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: 'rgba(187, 162, 132, 0.15)', height: 138, justifyContent: 'space-between' },
    zoomGridCardActive: { backgroundColor: '#1f130a', borderColor: '#bba284', shadowColor: '#bba284', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    zoomGridTitle: { fontSize: 14, fontWeight: '800', color: '#8a7c6f', letterSpacing: 0.5 },
    zoomGridTitleActive: { color: '#bba284' },
    zoomGridSub: { fontSize: 12, color: '#6a5c52', lineHeight: 16 },
    dotsContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 12 },
    dot: { backgroundColor: '#382a20' },
    noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 15, paddingHorizontal: 4 },
    noteText: { fontSize: 10, fontWeight: '700', color: '#6a5c52', letterSpacing: 0.5 },
    
    // Emoji Selector
    emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
    emojiBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(26, 14, 8, 0.8)', borderWidth: 1.5, borderColor: '#4d3f34', justifyContent: 'center', alignItems: 'center' },
    emojiBtnActive: { backgroundColor: '#bba284', borderColor: '#bba284' },
    emojiBtnText: { fontSize: 20 },
 
    // Color circles
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
    colorCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#4d3f34', justifyContent: 'center', alignItems: 'center' },
    colorCircleActive: { borderColor: '#ffffff', scale: 1.1 },
    colorCircleInnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' },
 
    // Buttons
    saveBtn: { borderRadius: 18, height: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15, overflow: 'hidden', shadowColor: '#bba284', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    saveBtnText: { color: '#26170d', fontSize: 16, fontWeight: '800', letterSpacing: 0.5, zIndex: 5 },
    logoutBtn: { 
        borderColor: '#ef4444', 
        borderWidth: 1.5, 
        borderRadius: 18, 
        height: 60, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: 15,
        backgroundColor: 'rgba(26, 14, 8, 0.4)',
    },
    logoutBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
