import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../FirebaseConfig';
import { sendEmailVerification } from 'firebase/auth';

const ProtectedScreen = ({navigation}) => {
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);

    const resendVerificationEmail = async () => {
        const user = auth.currentUser;
        
        if (user && !user.emailVerified) {
            try {
                await sendEmailVerification(user);
                Alert.alert('Verification Email Sent', 'Please check your inbox for the verification email.');
            } catch (error) {
                console.log('Error resending verification email:', error);
                Alert.alert('Error', 'There was an issue sending the verification email. Please try again later.');
            }
        } else {
            Alert.alert('Email Already Verified', 'Your email has already been verified.');
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Welcome to NthomeRides</Text>
            {isAuthenticated && isEmailVerified ? (
                <Text>Your email is verified, you have access.</Text>
            ) : (
                <Text>You need to verify your email to continue</Text>
            )}

            <TouchableOpacity
                onPress={resendVerificationEmail}
                style={{
                    marginTop: 20,
                    padding: 10,
                    backgroundColor: '#e0e0e0',
                    borderRadius: 5,
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Text style={{ fontSize: 16, color: '#000', textAlign: 'center' }}>
                    Didn’t get a verification email?{' '}
                    <Text style={{ fontWeight: 'bold', color: '#007bff' }}>Resend</Text>
                </Text>
            </TouchableOpacity>

            {/* Navigation Button to LoginScreen */}
            <TouchableOpacity
                onPress={() => navigation.navigate('LoginScreen')}
                style={{
                    marginTop: 20,
                    padding: 10,
                    backgroundColor: '#007bff',
                    borderRadius: 5,
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Text style={{ fontSize: 16, color: '#fff', fontWeight: 'bold' }}>
                Continue to Login
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default ProtectedScreen;
