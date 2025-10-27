import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
  useWindowDimensions
} from 'react-native';
import { Icon } from 'react-native-elements';
import { auth, db } from '../../FirebaseConfig';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/actions/authActions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import axios from 'axios';
import { api } from '../../api';
import { showToast } from '../constants/showToast';

const LoginScreen = ({ navigation }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const dispatch = useDispatch();
  const [user_Id, setUser_Id] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userAuth, setUserAuth] = useState(null);

  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isLargeScreen = width > 414;

  // Check if user is already signed in - UPDATED VERSION
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Reload user to get latest email verification status
        await user.reload();
        const currentUser = auth.currentUser;

        if (currentUser.emailVerified) {
          dispatch(setUser({
            name: user.displayName,
            email: user.email,
            id: user.uid,
          }));
          navigation.replace('DrawerNavigator');
        } else {
          // User is logged in but email not verified - send to verification screen
          setLoading(false);
          navigation.replace('ProtectedScreen');
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigation, dispatch]);

  const signIn = async () => {
    if (!email || !password) {
      showToast("info", "Missing Info", "Please enter both email and password.");
      return;
    }

    setAuthenticating(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = userCredential.user;

      await user.reload();
      const currentUser = auth.currentUser;

      if (!currentUser.emailVerified) {
        showToast("info", "Verify your email", "Please check your inbox before logging in.");
        navigation.navigate("ProtectedScreen");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        showToast("error", "Account not found", "Please contact support.");
        return;
      }

      const userData = userDoc.data();
      console.log("User data from Firestore:", userData);
      console.log("Firebase user:", user);

      if (userData.role !== "user") {
        showToast("error", "Access denied", "Only customers are allowed to log in.");
        await auth.signOut();
        navigation.replace("LogoutPage");
        return;
      }

      // Store basic user info first
      await AsyncStorage.setItem("userId", user.uid);
      await AsyncStorage.setItem("emailVerified", "true");
      await AsyncStorage.setItem("userEmail", user.email);

      setUserId(user.uid);
      setUserAuth(user);

      // Set basic user data in Redux first
      dispatch(setUser({
        name: userData.name || user.displayName,
        email: user.email,
        id: user.uid,
        role: userData.role,
      }));

      // Then fetch additional customer data from your API
      await fetchCustomerUserID(user, userData);

    } catch (error) {
      console.log("Login error:", error);

      let errorMessage = "Please check your email and password.";
      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection.";
      }

      showToast("error", "Login failed", errorMessage);
    } finally {
      setAuthenticating(false);
    }
  };

  const fetchCustomerUserID = async (user, userData) => {
    try {
      console.log("Attempting to fetch customer data for email:", email);

      const response = await axios.post(api + 'login', {
        email: email.trim().toLowerCase(),
      });

      console.log("API Response:", response.data);

      if (response.data && response.data.id) {
        const user_id = response.data.id;
        const customer_code = response.data.customer_code;

        setUser_Id(user_id);
        console.log("Successfully fetched - user_id:", user_id, "customer_code:", customer_code);

        // ✅ Wait for Redux update and AsyncStorage to finish
        dispatch(setUser({
          name: userData.name || user.displayName || response.data.name,
          email: user.email,
          id: user.uid,
          role: userData.role,
          user_id,
          customer_code,
          profile_picture: response.data?.profile_picture,
        }));

        await AsyncStorage.setItem("user_id", user_id.toString());
        if (customer_code) await AsyncStorage.setItem("customer_code", customer_code);
        
        if (user_id && customer_code && userData.role) {
          // ✅ Delay navigation slightly to ensure Redux + Storage are ready
          setTimeout(() => {
            navigation.replace('DrawerNavigator');
          }, 1500); // 1.5s delay
        }
      } else {
        console.warn("No user ID found in API response:", response.data);
        showToast("warning", "Profile Incomplete", "Please complete your profile setup.");


        // Optional: delay navigation even here
        setTimeout(() => {
          navigation.replace('DrawerNavigator');
        }, 1500);
      }

    } catch (error) {
      console.error("Error fetching customer data:", error);

      if (error.response) {
        console.error("Server error:", error.response.status, error.response.data);
        if (error.response.status === 404) {
          showToast("warning", "Profile Not Found", "Please complete your profile setup.");
        } else {
          showToast("error", "Server Error", "Unable to fetch user profile.");
        }
      } else if (error.request) {
        console.error("Network error:", error.request);
        showToast("error", "Network Error", "Please check your internet connection.");
      } else {
        console.error("Error:", error.message);
        showToast("error", "Unexpected Error", "Please try again.");
      }

      // Fallback: still store minimal data before navigation
      dispatch(setUser({
        name: userData.name || user.displayName,
        email: user.email,
        id: user.uid,
        role: userData.role,
      }));

      // ✅ Add delay here too
      setTimeout(() => {
        navigation.replace('DrawerNavigator');
      }, 1500);
    }
  };


  // Responsive style calculations
  const responsiveStyles = createResponsiveStyles(isSmallScreen, isLargeScreen, width, height);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={responsiveStyles.container}>
          <StatusBar barStyle="dark-content" />

          <ScrollView
            contentContainerStyle={responsiveStyles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={require('../../assets/topCar.png')}
              style={responsiveStyles.carImage}
              resizeMode="cover"
            />

            <View style={responsiveStyles.formContainer}>
              <View style={responsiveStyles.header}>
                <Text style={responsiveStyles.title}>Sign In</Text>
                <Text style={responsiveStyles.subtitle}>Hi! Welcome back, you've been missed</Text>
              </View>

              <View style={responsiveStyles.inputContainer}>
                <TextInput
                  style={responsiveStyles.input}
                  placeholder="example@gmail.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                <View style={responsiveStyles.passwordContainer}>
                  <TextInput
                    style={responsiveStyles.input}
                    placeholder="••••••••••••••"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={responsiveStyles.eyeIcon}
                  >
                    <Icon
                      name={showPassword ? 'eye-off' : 'eye'}
                      type="feather"
                      size={isSmallScreen ? 20 : 24}
                      color="gray"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={responsiveStyles.forgotPasswordContainer}
                  onPress={() => navigation.navigate('ForgotPasswordScreen')}
                >
                  <Text style={responsiveStyles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  responsiveStyles.button,
                  authenticating && { backgroundColor: '#aaa' }
                ]}
                onPress={signIn}
                disabled={authenticating}
              >
                {authenticating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={responsiveStyles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <View style={responsiveStyles.orContainer}>
                <View style={responsiveStyles.separator} />
                <Text style={responsiveStyles.orText}>Or sign up with</Text>
              </View>

              <View style={responsiveStyles.socialButtons}>
                <View style={[responsiveStyles.socialButton, { opacity: 0.5 }]}>
                  <Image
                    source={require('../../assets/icons/google.png')}
                    style={responsiveStyles.socialIcon}
                  />
                </View>
                <View style={[responsiveStyles.socialButton, { opacity: 0.5 }]}>
                  <Image
                    source={require('../../assets/icons/facebook.png')}
                    style={responsiveStyles.socialIcon}
                  />
                </View>
              </View>

              <Text style={responsiveStyles.footerText}>
                Don't have an account?{' '}
                <Text
                  style={responsiveStyles.link}
                  onPress={() => navigation.navigate('SignUp')}
                >
                  Sign Up
                </Text>
              </Text>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const createResponsiveStyles = (isSmallScreen, isLargeScreen, width, height) => {
  // Base sizes that will scale
  const basePadding = isSmallScreen ? 12 : isLargeScreen ? 20 : 16;
  const baseMargin = isSmallScreen ? 16 : isLargeScreen ? 24 : 20;
  const baseFontSize = isSmallScreen ? 14 : isLargeScreen ? 18 : 16;
  const titleFontSize = isSmallScreen ? 20 : isLargeScreen ? 28 : 24;
  const inputHeight = isSmallScreen ? 44 : isLargeScreen ? 52 : 48;
  const buttonHeight = isSmallScreen ? 44 : isLargeScreen ? 52 : 48;
  const carImageHeight = isSmallScreen ? height * 0.25 : isLargeScreen ? height * 0.35 : height * 0.3;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'white',
    },
    scrollContainer: {
      flexGrow: 1,
      minHeight: height,
    },
    carImage: {
      width: '100%',
      height: carImageHeight,
    },
    formContainer: {
      flex: 1,
      paddingHorizontal: basePadding,
      paddingTop: baseMargin,
      paddingBottom: baseMargin * 2,
    },
    header: {
      alignItems: 'center',
      marginBottom: baseMargin * 1.5,
    },
    title: {
      fontSize: titleFontSize,
      fontWeight: '600',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: baseFontSize - 2,
      color: 'gray',
      textAlign: 'center',
      lineHeight: 20,
    },
    inputContainer: {
      marginBottom: baseMargin * 1.5,
    },
    input: {
      height: inputHeight,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: baseMargin,
      paddingLeft: 12,
      fontSize: baseFontSize,
      backgroundColor: '#f9f9f9',
    },
    passwordContainer: {
      position: 'relative',
    },
    eyeIcon: {
      position: 'absolute',
      right: 12,
      top: inputHeight / 2 - 12,
      height: 24,
      width: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    forgotPasswordContainer: {
      alignSelf: 'flex-end',
      marginTop: -8,
    },
    forgotPasswordText: {
      fontSize: baseFontSize - 2,
      color: '#0DCAF0',
      fontWeight: '500',
    },
    button: {
      backgroundColor: '#0DCAF0',
      borderRadius: 8,
      height: buttonHeight,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    buttonText: {
      color: 'white',
      fontSize: baseFontSize,
      fontWeight: '600',
    },
    orContainer: {
      alignItems: 'center',
      marginVertical: baseMargin,
    },
    separator: {
      width: '100%',
      height: 1,
      backgroundColor: '#e0e0e0',
      marginBottom: 10,
    },
    orText: {
      backgroundColor: 'white',
      paddingHorizontal: 15,
      color: 'gray',
      fontSize: baseFontSize - 2,
      position: 'absolute',
      top: -10,
    },
    socialButtons: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
      marginBottom: baseMargin * 1.5,
    },
    socialButton: {
      width: isSmallScreen ? 44 : 48,
      height: isSmallScreen ? 44 : 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e0e0e0',
    },
    socialIcon: {
      width: isSmallScreen ? 20 : 24,
      height: isSmallScreen ? 20 : 24,
    },
    footerText: {
      textAlign: 'center',
      fontSize: baseFontSize - 1,
      color: '#666',
    },
    link: {
      color: '#1E90FF',
      fontWeight: '500',
    },
  });
};

export default LoginScreen;