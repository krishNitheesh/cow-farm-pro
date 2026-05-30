import React, { createContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

// Complete the auth session in case redirect brings user back to the web browser view
if (Platform.OS !== 'web') {
    WebBrowser.maybeCompleteAuthSession();
}

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [userToken, setUserToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Keep existing mock login as a fallback
    const login = async (email, password) => {
        if (email === 'admin' && password === 'admin') {
            const token = 'mock-jwt-token';
            setUserToken(token);
            await AsyncStorage.setItem('userToken', token);
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;

            if (data.session) {
                const sessionToken = data.session.access_token;
                setUserToken(sessionToken);
                await AsyncStorage.setItem('userToken', sessionToken);
            }
            return data;
        }
    };

    // Email & Password Registration
    const signUp = async (username, email, password) => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username,
                    },
                },
            });
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('Sign-Up error:', e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    // Verify 6-digit Email OTP
    const verifyEmailOtp = async (email, token) => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'signup',
            });
            if (error) throw error;

            if (data.session) {
                const sessionToken = data.session.access_token;
                setUserToken(sessionToken);
                await AsyncStorage.setItem('userToken', sessionToken);
            }
            return data;
        } catch (e) {
            console.error('OTP Verification error:', e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    // Google Sign-In via Supabase OAuth
    const loginWithGoogle = async () => {
        try {
            setIsLoading(true);

            if (Platform.OS === 'web') {
                // Web: Use the current site origin so it works both locally and on Netlify
                const redirectTo = window.location.origin;
                console.log('Web OAuth redirectTo:', redirectTo);

                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo,
                    },
                });
                if (error) throw error;
                if (data?.url) {
                    window.location.href = data.url;
                }
            } else {
                const redirectUrl = Linking.createURL('login'); // Creates cowfarm://login or exp://... on mobile
                console.log('Mobile OAuth redirectUrl:', redirectUrl);
                // Mobile (Expo Go / Native): Secure WebBrowser popup flow
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: redirectUrl,
                        skipBrowserRedirect: true,
                    },
                });

                if (error) throw error;
                if (!data?.url) throw new Error('No OAuth URL returned');

                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

                if (result.type === 'success') {
                    const { url } = result;
                    await handleAuthRedirect(url);
                } else {
                    setIsLoading(false);
                }
            }
        } catch (e) {
            console.error('Google Sign-In error:', e);
            setIsLoading(false);
            throw e;
        }
    };

    // Parse the redirect URL hash fragment containing tokens (Only needed for Mobile WebBrowser flow)
    const handleAuthRedirect = async (url) => {
        try {
            console.log('Parsing redirect URL:', url);
            const parts = url.split('#');
            if (parts.length < 2) return;

            const hash = parts[1];
            const params = hash.split('&').reduce((acc, current) => {
                const [key, value] = current.split('=');
                if (key && value) acc[key] = value;
                return acc;
            }, {});

            const accessToken = params['access_token'];
            const refreshToken = params['refresh_token'];

            if (accessToken && refreshToken) {
                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });
                if (error) throw error;

                const sessionToken = data?.session?.access_token || accessToken;
                setUserToken(sessionToken);
                await AsyncStorage.setItem('userToken', sessionToken);
            }
        } catch (err) {
            console.error('Failed to set session from redirect:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Listen for Auth changes & load initial session
    useEffect(() => {
        const loadInitialSession = async () => {
            try {
                // If on web and URL contains the hash fragment, parse it immediately!
                if (Platform.OS === 'web' && window.location.hash) {
                    await handleAuthRedirect(window.location.href);
                    // Clean up hash from URL so it doesn't parse it again or stay ugly
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                const token = await AsyncStorage.getItem('userToken');
                if (token) {
                    setUserToken(token);
                }
                
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setUserToken(session.access_token);
                    await AsyncStorage.setItem('userToken', session.access_token);
                }
            } catch (e) {
                console.log('Error loading initial session:', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialSession();

        // 2. Listen to active auth state changes from Supabase (essential for Web redirects!)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Supabase Auth State Event:', event);
            if (session) {
                setUserToken(session.access_token);
                await AsyncStorage.setItem('userToken', session.access_token);
            } else {
                // Do not clear token if mock admin is active
                const currentToken = await AsyncStorage.getItem('userToken');
                if (currentToken !== 'mock-jwt-token') {
                    setUserToken(null);
                    await AsyncStorage.removeItem('userToken');
                }
            }
            setIsLoading(false);
        });

        // 3. Handle mobile deep linking redirection (Only needed for Mobile popup flow)
        let linkingSubscription;
        if (Platform.OS !== 'web') {
            const handleDeepLink = (event) => {
                if (event.url) {
                    handleAuthRedirect(event.url).catch(err => {
                        console.log('Deep link auth error:', err);
                    });
                }
            };
            linkingSubscription = Linking.addEventListener('url', handleDeepLink);

            Linking.getInitialURL().then((url) => {
                if (url) {
                    handleAuthRedirect(url).catch(err => {
                        console.log('Initial URL auth error:', err);
                    });
                }
            });
        }

        return () => {
            subscription.unsubscribe();
            if (linkingSubscription) {
                linkingSubscription.remove();
            }
        };
    }, []);

    // Logout from both local session and Supabase authentication
    const logout = async () => {
        setUserToken(null);
        await AsyncStorage.removeItem('userToken');
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ login, loginWithGoogle, signUp, verifyEmailOtp, logout, userToken, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
