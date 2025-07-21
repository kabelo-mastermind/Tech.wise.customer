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


// // Drawer Navigator
// function DrawerNavigator() {
//   return (
//     <Drawer.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
//       <Drawer.Screen
//         name="Main"
//         component={BottomTabNavigator}
//         options={{
//           drawerIcon: ({ focused, size }) => (
//             <Icon name="car" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
//           ),
//         }}
//       />
//       <Drawer.Screen
//         name="Services"
//         component={NthomeServicesScreen}
//         options={{
//           drawerIcon: ({ focused, size }) => (
//             <Icon name="home" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
//           ),
//         }}
//       />
//       <Drawer.Screen
//         name="My Rides"
//         component={TripHistory} // Replace with appropriate component
//         options={{
//           drawerIcon: ({ focused, size }) => (
//             <Icon
//               name="car" // Correct icon for rides
//               type="material-community"
//               size={size}
//               color={focused ? '#7cc' : 'gray'}
//             />
//           ),
//         }}
//       />
//       <Drawer.Screen
//         name="Profile"
//         component={CustomerProfile}
//         options={{
//           drawerIcon: ({ focused, size }) => (
//             <Icon name="account-circle" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
//           ),
//         }}
//       />
//       <Drawer.Screen
//         name="About"
//         component={AboutScreen}
//         options={{
//           drawerIcon: ({ focused, size }) => (
//             <Icon name="account-circle" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
//           ),
//         }}
//       />
//       <Drawer.Screen
//         name="Support"
//         component={SupportScreen}
//         options={{
//           drawerIcon: ({ focused, size }) => (
//             <Icon name="account-circle" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
//           ),
//         }}
//       />
//       <Drawer.Screen
//         name="Logout"
//         component={LogoutPage}
//         options={{
//           drawerIcon: ({ focused, size }) => (
//             <Icon name="logout" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
//           ),
//         }}
//       />
//     </Drawer.Navigator>
//   );
// }