import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = [];
const currentYear = new Date().getFullYear();
// Generate a wide list of years for cow records up to 2136
for (let y = 2010; y <= 2136; y++) {
    YEARS.push(y);
}

export default function AppDatePicker({ label, dateString, onDateChange, placeholder }) {
    const [show, setShow] = useState(false);
    const [mode, setMode] = useState('calendar'); // 'calendar' | 'monthPicker' | 'yearPicker'

    // Normalize starting date (default to today if empty)
    const initialDate = dateString || new Date().toISOString().split('T')[0];
    const [currentDate, setCurrentDate] = useState(initialDate);

    // Keep currentDate state in sync when prop changes or when modal is opened
    useEffect(() => {
        if (dateString) {
            setCurrentDate(dateString);
        }
    }, [dateString, show]);

    const parts = currentDate.split('-');
    const year = parseInt(parts[0], 10) || currentYear;
    const monthIndex = (parseInt(parts[1], 10) - 1) || 0;
    const day = parts[2] || '01';

    const changeDateSafe = (newYear, newMonthIndex) => {
        // Clamp the day to the maximum number of days in the new month/year
        const maxDays = new Date(newYear, newMonthIndex + 1, 0).getDate();
        const targetDay = Math.min(parseInt(day, 10), maxDays);
        const dayStr = String(targetDay).padStart(2, '0');
        const monthStr = String(newMonthIndex + 1).padStart(2, '0');
        setCurrentDate(`${newYear}-${monthStr}-${dayStr}`);
    };

    const handleSelectMonth = (index) => {
        changeDateSafe(year, index);
        setMode('calendar');
    };

    const handleSelectYear = (y) => {
        changeDateSafe(y, monthIndex);
        setMode('calendar');
    };

    const onDayPress = (dayObj) => {
        onDateChange(dayObj.dateString);
        setShow(false);
        setMode('calendar'); // Reset to default
    };

    const handleClose = () => {
        setShow(false);
        setMode('calendar');
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TouchableOpacity style={styles.inputBtn} onPress={() => setShow(true)}>
                <Text style={dateString ? styles.inputText : styles.placeholderText}>
                    {dateString || placeholder || 'Select Date'}
                </Text>
            </TouchableOpacity>

            <Modal
                transparent={true}
                visible={show}
                animationType="fade"
                onRequestClose={handleClose}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPressOut={handleClose}
                >
                    <View style={styles.calendarContainer}>
                        {/* Custom Year/Month selector Header */}
                        <View style={styles.headerRow}>
                            <TouchableOpacity 
                                style={[styles.headerBtn, mode === 'monthPicker' && styles.headerBtnActive]} 
                                onPress={() => setMode(mode === 'monthPicker' ? 'calendar' : 'monthPicker')}
                            >
                                <Text style={styles.headerBtnText}>{MONTHS[monthIndex]} ▾</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.headerBtn, mode === 'yearPicker' && styles.headerBtnActive]} 
                                onPress={() => setMode(mode === 'yearPicker' ? 'calendar' : 'yearPicker')}
                            >
                                <Text style={styles.headerBtnText}>{year} ▾</Text>
                            </TouchableOpacity>
                        </View>

                        {mode === 'calendar' && (
                            <Calendar
                                current={currentDate}
                                key={currentDate} // Force re-render of calendar on manual month/year jump
                                onDayPress={onDayPress}
                                onMonthChange={(monthObj) => {
                                    setCurrentDate(monthObj.dateString);
                                }}
                                theme={{
                                    backgroundColor: '#26170d',
                                    calendarBackground: '#26170d',
                                    textSectionTitleColor: '#bba284',
                                    textSectionTitleDisabledColor: '#4d3f34',
                                    selectedDayBackgroundColor: '#bba284',
                                    selectedDayTextColor: '#ffffff',
                                    todayTextColor: '#bba284',
                                    dayTextColor: '#ffffff',
                                    textDisabledColor: '#4d3f34',
                                    dotColor: '#bba284',
                                    selectedDotColor: '#ffffff',
                                    arrowColor: '#bba284',
                                    disabledArrowColor: '#4d3f34',
                                    monthTextColor: '#bba284',
                                    indicatorColor: '#bba284',
                                    textDayFontWeight: '300',
                                    textMonthFontWeight: 'bold',
                                    textDayHeaderFontWeight: '300',
                                    textDayFontSize: 16,
                                    textMonthFontSize: 16,
                                    textDayHeaderFontSize: 14
                                }}
                                markedDates={{
                                    [currentDate]: { selected: true, disableTouchEvent: true }
                                }}
                            />
                        )}

                        {mode === 'monthPicker' && (
                            <View style={styles.pickerContainer}>
                                <Text style={styles.pickerTitle}>Select Month</Text>
                                <View style={styles.grid}>
                                    {MONTHS.map((m, index) => (
                                        <TouchableOpacity 
                                            key={m} 
                                            style={[styles.gridItem, index === monthIndex && styles.gridItemActive]}
                                            onPress={() => handleSelectMonth(index)}
                                        >
                                            <Text style={[styles.gridItemText, index === monthIndex && styles.gridItemTextActive]}>
                                                {m.substring(0, 3)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {mode === 'yearPicker' && (
                            <View style={styles.pickerContainer}>
                                <Text style={styles.pickerTitle}>Select Year</Text>
                                <ScrollView contentContainerStyle={styles.scrollGrid} style={{ maxHeight: 260 }}>
                                    <View style={styles.grid}>
                                        {YEARS.map((y) => (
                                            <TouchableOpacity 
                                                key={y} 
                                                style={[styles.gridItem, y === year && styles.gridItemActive]}
                                                onPress={() => handleSelectYear(y)}
                                            >
                                                <Text style={[styles.gridItemText, y === year && styles.gridItemTextActive]}>
                                                    {y}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#bba284',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    inputBtn: {
        backgroundColor: '#26170d',
        borderWidth: 1,
        borderColor: '#4d3f34',
        padding: 14,
        borderRadius: 12,
        justifyContent: 'center',
    },
    inputText: {
        color: '#fff',
        fontSize: 16,
    },
    placeholderText: {
        color: '#8a7c6f',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        padding: 20
    },
    calendarContainer: {
        backgroundColor: '#26170d',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#4d3f34',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#4d3f34',
        backgroundColor: '#26170d',
    },
    headerBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4d3f34',
        backgroundColor: '#1b1009',
        minWidth: 110,
        alignItems: 'center',
    },
    headerBtnActive: {
        borderColor: '#bba284',
        backgroundColor: '#4d3f34',
    },
    headerBtnText: {
        color: '#bba284',
        fontWeight: 'bold',
        fontSize: 14,
    },
    pickerContainer: {
        padding: 16,
        backgroundColor: '#26170d',
        alignItems: 'center',
    },
    pickerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#bba284',
        marginBottom: 16,
    },
    scrollGrid: {
        paddingBottom: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    gridItem: {
        width: 70,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4d3f34',
        backgroundColor: '#1b1009',
    },
    gridItemActive: {
        backgroundColor: '#bba284',
        borderColor: '#bba284',
    },
    gridItemText: {
        color: '#ffffff',
        fontSize: 14,
    },
    gridItemTextActive: {
        color: '#26170d',
        fontWeight: 'bold',
    },
});
