// import React, { useEffect, useState } from "react";
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { createDrawerNavigator } from '@react-navigation/drawer';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { Icon } from 'react-native-elements';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// // Import your screen components
// import LoginScreen from '../WelcomeScreens/LoginScreen';
// import HomeScreen from '../customerscreens/HomeScreen';
// import RequestScreen from '../customerscreens/RequestScreen';
// import DestinationScreen from '../customerscreens/DestinationScreen';
// import RecentPlacesBottomSheet from '../components/RecentPlacesBottomSheet';
// import CarListingBottomSheet from '../components/CarListingBottomSheet';
// import DriverDetailsBottomSheet from '../components/DriverDetailsBottomSheet';
// import SignUpScreen from '../WelcomeScreens/SignUpScreen';
// import TripLoadingResponse from '../components/TripLoadingResponse';
// import DriverCommunicationBottomSheet from '../components/DriverCommunicationBottomSheet';
// import CustomerProfile from '../customerscreens/CustomerProfile';
// import DriverInfoBottomSheet from '../components/DriverInfoBottomSheet';
// import OnboardingScreen from '../WelcomeScreens/OnboardingScreen';
// import NthomeServicesScreen from "../customerscreens/NthomeServicesScreen";
// import TripHistory from "../customerscreens/TripHistory";
// import TripDetails from "../customerscreens/TripDetails";
// import AboutScreen from "../customerscreens/AboutScreen";
// import SupportScreen from "../customerscreens/SupportScreen";
// import PrivacySettings from "../customerscreens/PrivacySettings";
// import PaymentScreen from "../customerscreens/PaymentScreen";
// import PaymentMethodsScreen from "../customerscreens/PaymentMethodsScreen";
// import LanguageSettings from "../customerscreens/LanguageSettings";
// import CommunicationPreferences from "../customerscreens/CommunicationPreferences";
// import AddPaymentMethodScreen from "../customerscreens/AddPaymentMethodScreen";
// import LogoutPage from "../WelcomeScreens/LogoutPage";
// import { auth } from "../../FirebaseConfig";
// import { onAuthStateChanged } from "firebase/auth";
// import ProtectedScreen from "../WelcomeScreens/ProtectedScreen";
// import ForgotPasswordScreen from "../WelcomeScreens/ForgotPasswordScreen";
// import DriverWallet from "../components/WalletDriver";
// import TripCancellationModal from "../components/TripCancelationModal";
// import CustomerChat from "../customerscreens/CustomerChat";
// const Stack = createNativeStackNavigator();
// const Drawer = createDrawerNavigator();
// const Tab = createBottomTabNavigator();

// // Bottom Tab Navigator
// function BottomTabNavigator() {
//   return (
//     <Tab.Navigator
//       initialRouteName="Home"
//       screenOptions={{ headerShown: false }}
//     >

//       <Tab.Screen
//         name="Services"
//         component={NthomeServicesScreen}
//         options={{
//           tabBarIcon: ({ focused, size }) => (
//             <Icon name="tools" type="material-community" size={size} color={focused ? '#7cc' : 'gray'} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="Home"
//         component={HomeScreen}
//         options={{
//           tabBarIcon: ({ focused, size }) => (
//             <Icon name="home" type="material-community" size={size} color={focused ? '#7cc' : 'gray'} />
//           ),
//         }}
//       />
//       {/* <Tab.Screen
//         name="Wallet"
//         component={DriverWallet}
//         options={{
//           tabBarIcon: ({ focused, size }) => (
//             <Icon name="money" type="material-community" size={size} color={focused ? '#7cc' : 'gray'} />
//           ),
//         }}
//       /> */}
//       <Tab.Screen
//         name="Account"
//         component={CustomerProfile}
//         options={{
//           tabBarIcon: ({ color, size }) => (
//             <Icon name="account" type="material-community" color={color} size={size} />
//           ),
//         }}
//       />
//     </Tab.Navigator>
//   );
// }