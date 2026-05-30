import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, useWindowDimensions, ScrollView, SafeAreaView, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen() {
    const { loginWithGoogle, login } = React.useContext(AuthContext);
    const [error, setError] = useState('');
    const { width } = useWindowDimensions();

    const isDesktop = width >= 768;

    const handleGoogleLogin = async () => {
        try {
            setError('');
            await loginWithGoogle();
        } catch (e) {
            setError('Google Sign-In failed. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={isDesktop ? styles.desktopContainer : styles.mobileContainer}>

                {/* Login Panel */}
                <View style={isDesktop ? styles.loginPanelDesktop : styles.loginPanelMobile}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.header}>
                            <Text style={styles.logoText}>F<Text style={styles.logoIcon}>🚜</Text>rm</Text>
                        </View>

                        {!isDesktop && (
                            <Image
                                source={require('../../assets/cowlogin.jpg')}
                                style={styles.mobileImage}
                                resizeMode="cover"
                            />
                        )}

                        <Text style={styles.title}>Start Your Day Fresh</Text>

                        <Text style={styles.subtitle}>
                            Securely access and manage your cow farm, track daily milk deliveries, 
                            cattle health profiles, feed diet logs, and accounting lists via your Google Account.
                        </Text>

                        {error !== '' && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        {/* Centered Google Button */}
                        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} activeOpacity={0.8}>
                            <Image 
                                source={require('../../assets/google_logo.png')} 
                                style={styles.googleIcon} 
                            />
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Desktop Image Panel */}
                {isDesktop && (
                    <View style={styles.imagePanel}>
                        <Image
                            source={require('../../assets/cowlogin.jpg')}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#26170d',
    },
    mobileContainer: {
        flex: 1,
        backgroundColor: '#26170d',
    },
    desktopContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#26170d',
    },
    loginPanelMobile: {
        flex: 1,
        padding: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
    },
    loginPanelDesktop: {
        flex: 0.45,
        padding: 60,
        justifyContent: 'center',
        minWidth: 400,
    },
    imagePanel: {
        flex: 0.55,
    },
    image: {
        width: '100%',
        height: '100%',
        borderTopLeftRadius: 40,
        borderBottomLeftRadius: 40,
    },
    mobileImage: {
        width: '100%',
        height: 220,
        borderRadius: 24,
        marginBottom: 30,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 30,
    },
    logoText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#bba284',
        letterSpacing: -1,
    },
    logoIcon: {
        fontSize: 28,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 14,
        color: '#8a7c6f',
        lineHeight: 22,
        marginBottom: 40,
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 13,
        textAlign: 'center',
        fontWeight: '500',
    },
    googleButton: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 20,
    },
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    googleButtonText: {
        color: '#1f1f1f',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.2,
    }
});
