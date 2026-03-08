import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { auth } from "../../FirebaseConfig"; // Adjust the import path for your Firebase config
import { signOut } from "firebase/auth";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/actions/authActions"; // Import the setUser action
import AsyncStorage from "@react-native-async-storage/async-storage";
import { removeStoredUser, getStoredUser, clearAllUserCaches } from "../utils/storage";

const LogoutPage = ({ navigation }) => {
  const dispatch = useDispatch(); // Redux dispatch function

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Sign out from Firebase
        await signOut(auth);

        // Clear user data in Redux
        dispatch(setUser(null)); // Reset user state to null or an empty object

        // Clear any persisted data in AsyncStorage (including cached app data)
        const stored = await getStoredUser();
        const uid = stored?.user_id || stored?.userId || null;
        await clearAllUserCaches(uid);
        await removeStoredUser(); // Clear cached user data

        // Redirect to Login Screen
        navigation.reset({
          index: 0,
          routes: [{ name: "LoginScreen" }], // Ensure this matches your Login screen name
        });
      } catch (error) {
        console.error("Error during logout:", error);
        alert("Failed to log out. Please try again.");
      }
    };

    handleLogout();
  }, [dispatch, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="blue" />
      <Text style={styles.text}>Logging out...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: "gray",
  },
});

export default LogoutPage;
