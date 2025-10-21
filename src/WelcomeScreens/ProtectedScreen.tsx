import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../FirebaseConfig';
import { signOut, sendEmailVerification, onAuthStateChanged } from 'firebase/auth';

const ProtectedScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [userExists, setUserExists] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            setUserEmail(user.email);
            setUserExists(true);
        }
        // Removed the auto-redirect to LoginScreen
    }, []);

    const resendVerificationEmail = async () => {
        const user = auth.currentUser;

        if (user && !user.emailVerified) {
            setLoading(true);
            try {
                await sendEmailVerification(user);
                Alert.alert('Verification Email Sent', 'Please check your inbox for the verification email.');
            } catch (error) {
                console.log('Error resending verification email:', error);
                Alert.alert('Error', 'There was an issue sending the verification email. Please try again later.');
            } finally {
                setLoading(false);
            }
        } else {
            Alert.alert('Email Already Verified', 'Your email has already been verified.');
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            await AsyncStorage.removeItem("userId");
            await AsyncStorage.removeItem("emailVerified");
            setUserExists(false);
            setUserEmail('');
            navigation.replace('LoginScreen');
            // Don't navigate away - let user choose to go to login
        } catch (error) {
            console.log('Error signing out:', error);
        }
    };


    const navigateToLogin = () => {
        navigation.navigate('LoginScreen');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Verify Your Email</Text>

            {userExists ? (
                <>
                    <Text style={styles.subtitle}>
                        A verification email has been sent to:
                    </Text>
                    <Text style={styles.email}>{userEmail}</Text>
                    <Text style={styles.instruction}>
                        Check your
                        <Text style={{ fontWeight: 'bold', fontStyle: 'italic' }}> inbox/spam </Text>
                        to verify your email.
                    </Text>

                    <TouchableOpacity
                        onPress={resendVerificationEmail}
                        style={styles.button}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Resend Verification Email</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSignOut}
                        style={[styles.button, styles.checkButton]}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>I've Verified My Email</Text>
                    </TouchableOpacity>

                    {/* <TouchableOpacity
                        onPress={handleSignOut}
                        style={styles.secondaryButton}
                    >
                        <Text style={styles.secondaryButtonText}>Sign Out</Text>
                    </TouchableOpacity> */}
                </>
            ) : (
                <>
                    <Text style={styles.subtitle}>
                        You need to verify your email to access the app.
                    </Text>
                    <Text style={styles.instruction}>
                        Please sign in after verifying your email address to continue.
                    </Text>

                    <TouchableOpacity
                        onPress={navigateToLogin}
                        style={styles.button}
                    >
                        <Text style={styles.buttonText}>Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('SignUp')}
                        style={styles.secondaryButton}
                    >
                        <Text style={styles.secondaryButtonText}>Create Account</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
        color: '#333',
    },
    email: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0DCAF0',
        marginBottom: 20,
        textAlign: 'center',
    },
    instruction: {
        fontSize: 14,
        textAlign: 'center',
        color: 'gray',
        marginBottom: 30,
        lineHeight: 20,
    },
    button: {
        backgroundColor: '#0DCAF0',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%',
        marginBottom: 15,
    },
    checkButton: {
        backgroundColor: '#28a745',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#0DCAF0',
    },
    secondaryButtonText: {
        color: '#0DCAF0',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ProtectedScreen;