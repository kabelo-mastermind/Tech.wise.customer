import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Linking, ActivityIndicator, Image, StatusBar } from 'react-native';
import { Icon } from 'react-native-elements';
import { auth, db } from '../../FirebaseConfig'; // Firebase configuration
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from 'firebase/auth'; // Firebase Auth functions
import { doc, setDoc } from 'firebase/firestore'; // Firestore functions
import axios from 'axios'; // Axios for sending backend request
import { api } from '../../api'; // Your backend API
import { showToast } from '../constants/showToast';

export default function CreateAccount({ navigation }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  // const [gender, setGender] = useState('');

const signUp = async () => {
  if (!email || !password || !name) {
    showToast(
      "error",
      "Missing Information",
      "Please fill in your name, email and password to continue."
    );
    return;
  }

  setLoading(true);
  try {
    // Step 1: Check if email exists
    const checkResponse = await axios.post(api + 'check-email', { email });

    if (checkResponse.data.exists) {
      showToast(
        "error",
        "Email Already Registered",
        "This email is already linked to an account. Please try signing in or use a different email."
      );
      setLoading(false);
      return;
    }

    // Step 2: Create user with email and password
    const response = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(response.user, { displayName: name });

    const userRef = doc(db, 'users', response.user.uid);
    await setDoc(userRef, {
      name,
      email,
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    await axios.post(api + 'register', {
      name,
      email,
      role: 'customer',
      user_uid: response.user.uid,
    });

    await sendEmailVerification(response.user);

    showToast(
      "success",
      "Account Created Successfully",
      "We’ve sent a verification link to your email. Please verify your account before logging in."
    );

    await signOut(auth);

    navigation.replace('ProtectedScreen');
  } catch (error: any) {
    // console.error('Sign up failed:', error.message);?

    // Map errors to friendly messages
    let friendlyMessage = "Something went wrong while creating your account. Please try again.";

    if (error.code === "auth/weak-password") {
      friendlyMessage = "Your password is too weak. Please use at least 6 characters.";
    } else if (error.code === "auth/invalid-email") {
      friendlyMessage = "The email you entered is not valid. Please check and try again.";
    } else if (error.code === "auth/email-already-in-use") {
      friendlyMessage = "This email is already linked to another account.";
    }

    showToast("error", "Sign Up Failed", friendlyMessage);
  } finally {
    setLoading(false);
  }
};



  return (
    <ScrollView >
      <Image
        source={require('../../assets/topCar.png')} // Update path as needed
        style={styles.carImage}
        resizeMode="fit"
      />
      <View style={styles.formContainer}>


        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.welcomeMessage}>Welcome to Nthome! Create an account to send fast and reliable rides your way.</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ex. John Doe"
            value={name}
            onChangeText={(text) => setName(text)}
          />
          <TextInput
            style={styles.input}
            placeholder="example@gmail.com"
            value={email}
            onChangeText={(text) => setEmail(text)}
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => setPassword(text)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Icon
                name={showPassword ? 'eye-off' : 'eye'}
                type="feather"
                size={24}
                color="gray"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                isChecked && { backgroundColor: '#0DCAF0', borderColor: '#0DCAF0' }
              ]}
              onPress={() => setIsChecked(!isChecked)}
            >
              {isChecked && (
                <Icon name="check" type="feather" size={16} color="white" />
              )}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>
              Agree with{' '}
              <Text
                style={styles.link}
                onPress={() => navigation.navigate('TermsScreen')}
              >
                Terms & Condition
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (loading || !isChecked) && { backgroundColor: 'gray' }
            ]}
            onPress={signUp}
            disabled={loading || !isChecked}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.orContainer}>
          <View style={styles.separator} />
          <Text style={styles.orText}>Or sign up with</Text>
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity style={styles.socialButton}>
            <Image
              source={require('../../assets/icons/google.png')} // Replace with your Google PNG image path
              style={styles.socialIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}>
            <Image
              source={require('../../assets/icons/facebook.png')} // Replace with your Facebook PNG image path
              style={styles.socialIcon}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Text style={styles.link}
            onPress={() => navigation.navigate('LoginScreen')}
          >
            Sign In
          </Text>
        </Text>
      </View>
      {/* Logo and Message
      <View style={styles.logoContainer}>
        <Text style={styles.sloganText}>Nthome ka petjana</Text>
      </View> */}


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center', // Center the content vertically
    alignItems: 'center', // Center the content horizontally
    padding: 16,
    backgroundColor: 'white',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24, // Space between logo and form
  },
  logo: {
    width: 100, // Adjust width of the logo
    height: 100, // Adjust height of the logo
    resizeMode: 'contain', // Ensure logo scales appropriately
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginTop: 260,
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
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -19 }],

  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  link: {
    color: '#1E90FF',
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
    // borderWidth: 2,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 14,
  },
  sloganText: {
    top: 180, // Space between slogan and logo
    fontSize: 24, // Adjust the font size
    fontWeight: 'bold', // Make the text bold
    color: '#000', // Set the color of the text
    textAlign: 'center', // Center the text
  },
  welcomeMessage: {
    // top: 180, // Space between slogan and welcome message
    fontSize: 16,
    color: 'gray', // A softer color for the welcome message
    textAlign: 'center',
    // marginTop: 8, // Adds some space between the slogan and the message
    paddingHorizontal: 20, // Padding for better readability
  },
  carImage: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 260, // Adjust height as needed
    resizeMode: 'cover', // Ensures the image covers the area
    // marginTop: StatusBar.currentHeight || 0, // Adjusts for status bar on Android
  },
});