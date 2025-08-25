import React, { useState, useEffect } from 'react';
import { ScrollView, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Image, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Icon } from 'react-native-elements';
import { auth, db } from '../../FirebaseConfig';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/actions/authActions'; // Import the setUser action
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import axios from 'axios';
import { api } from '../../api';
import { showToast } from '../constants/showToast';

const LoginScreen = ({ navigation }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true); // Initial loading state
  const [authenticating, setAuthenticating] = useState(false); // For login button loading
  const dispatch = useDispatch(); // Redux dispatch function
  const [user_Id, setUser_Id] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userAuth, setUserAuth] = useState(null);

  // Check if user is already signed in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(setUser({
          name: user.displayName,
          email: user.email,
          id: user.uid,
        })); // Store user details in Redux
        navigation.replace('DrawerNavigator');
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigation, dispatch]);
const signIn = async () => {
  setAuthenticating(true);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Ensure email verification status is up-to-date
    await user.reload();

    if (!user.emailVerified) {
      showToast("info", "Verify your email ", "Please check your inbox before logging in.");
      navigation.navigate("ProtectedScreen");
      return;
    }

    // Retrieve user data from Firestore
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      showToast("error", "Account not found", "Please contact support.");
      return;
    }

    const userData = userDoc.data();
    console.log("User data from Firestore:", userData);

    // Check if the user is a registered customer
    if (userData.role !== "user") {
      showToast("error", "Access denied ", "Only customers are allowed to log in.");
      navigation.replace("LogoutPage");
      return;
    }

    // Store user details in AsyncStorage
    await AsyncStorage.setItem("userId", user.uid);
    await AsyncStorage.setItem("emailVerified", "true");

    setUserId(user.uid);
    setUserAuth(user);

    // Dispatch user details to Redux
    dispatch(
      setUser({
        name: user.displayName,
        email: user.email,
        id: user.uid,
        role: userData.role,
      })
    );

    // Call fetchCustomerUserID and pass user and userData
    fetchCustomerUserID(user, userData);

    // 🎉 Success toast
    showToast("success", "Welcome back ", "You’ve successfully logged in!");
  } catch (error) {
    console.log(error);
    showToast("error", "Login failed", "Please check your email and password.");
  } finally {
    setAuthenticating(false);
  }
};


  const fetchCustomerUserID = async (user, userData) => {
    try {
      const response = await axios.post(api + 'login', {
        email,
      });
      console.log("user_id Response:", response.data);

      const user_id = response.data.id;
      setUser_Id(user_id);
      console.log("user_id:", user_id, "customer_code:", response.data.customer_code);

      // Dispatch updated user data to Redux with user_id and userData (role)
      dispatch(setUser({
        name: user.displayName,  // Use user data passed from signIn
        email: user.email,
        id: user.uid,
        role: userData.role,  // Use role from userData
        user_id: user_id,     // Add user_id from API response
        customer_code: response.data?.customer_code, // Add customer_code from userData
        profile_picture: response.data?.profile_picture, // Add customer_code from userData
      }));
    } catch (error) {
      console.error("Error fetching driver id:", error);
    }
  };

  return (

    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>

          <StatusBar barStyle="dark-content" />

          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <Image
              source={require('../../assets/topCar.png')} // Update path as needed
              style={styles.carImage}
              resizeMode="cover"
            />
            <View style={styles.formContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>Sign In</Text>
                <Text style={styles.subtitle}>Hi! Welcome back, you've been missed</Text>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="example@gmail.com"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••••••••"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Icon
                      name={showPassword ? 'eye-off' : 'eye'}
                      type="feather"
                      size={24}
                      color="gray"
                    />
                  </TouchableOpacity>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotPasswordContainer}
                  onPress={() => navigation.navigate('ForgotPasswordScreen')}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, authenticating && { backgroundColor: '#aaa' }]}
                onPress={signIn}
                disabled={authenticating}
              >
                {authenticating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <View style={styles.orContainer}>
                <View style={styles.separator} />
                <Text style={styles.orText}>Or sign up with</Text>
              </View>

              <View style={styles.socialButtons}>
                <View style={[styles.socialButton, { opacity: 0.5 }]}>
                  <Image
                    source={require('../../assets/icons/google.png')}
                    style={styles.socialIcon}
                  />
                </View>
                <View style={[styles.socialButton, { opacity: 0.5 }]}>
                  <Image
                    source={require('../../assets/icons/facebook.png')}
                    style={styles.socialIcon}
                  />
                </View>
              </View>

              <Text style={styles.footerText}>
                Don't have an account?{' '}
                <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>
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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  formContainer: {
    top: '250',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 16,

  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: 'gray',
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    height: 48,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingLeft: 12,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#0DCAF0',
    fontWeight: '500',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -19 }],
  },
  forgotPassword: {
    fontSize: 14,
    color: '#1E90FF',
    textAlign: 'right',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#0DCAF0',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  orContainer: {
    top: '10',
    alignItems: 'center',
    marginBottom: 16,
  },
  separator: {
    top: '10',
    width: '100%',
    height: 1,
    backgroundColor: 'lightgray',
  },
  orText: {
    position: 'absolute',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    color: 'gray',
    fontSize: 14,
  },
  socialButtons: {
    top: '10',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 14,
  },
  link: {
    color: '#1E90FF',
  },
  carImage: {
    position: 'absolute',
    // top: -10,
    width: '100%',
    height: 260, // Adjust height as needed
    resizeMode: 'cover', // Ensures the image covers the area
    // marginTop: StatusBar.currentHeight || 0, // Adjusts for status bar on Android
  },

});

export default LoginScreen;
