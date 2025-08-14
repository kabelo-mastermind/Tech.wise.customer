import React, { useEffect, useState } from "react";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your screen components
import LoginScreen from '../WelcomeScreens/LoginScreen';
import HomeScreen from '../customerscreens/HomeScreen';
import RequestScreen from '../customerscreens/RequestScreen';
import DestinationScreen from '../customerscreens/DestinationScreen';
import RecentPlacesBottomSheet from '../components/RecentPlacesBottomSheet';
import CarListingBottomSheet from '../components/CarListingBottomSheet';
import DriverDetailsBottomSheet from '../components/DriverDetailsBottomSheet';
import SignUpScreen from '../WelcomeScreens/SignUpScreen';
import TripLoadingResponse from '../components/TripLoadingResponse';
import DriverCommunicationBottomSheet from '../components/DriverCommunicationBottomSheet';
import CustomerProfile from '../customerscreens/CustomerProfile';
import DriverInfoBottomSheet from '../components/DriverInfoBottomSheet';
import OnboardingScreen from '../WelcomeScreens/OnboardingScreen';
import NthomeServicesScreen from "../customerscreens/NthomeServicesScreen";
import TripHistory from "../customerscreens/TripHistory";
import TripDetails from "../customerscreens/TripDetails";
import AboutScreen from "../customerscreens/AboutScreen";
import SupportScreen from "../customerscreens/SupportScreen";
import PrivacySettings from "../customerscreens/PrivacySettings";
import PaymentScreen from "../customerscreens/PaymentScreen";
import PaymentMethodsScreen from "../customerscreens/PaymentMethodsScreen";
import LanguageSettings from "../customerscreens/LanguageSettings";
import CommunicationPreferences from "../customerscreens/CommunicationPreferences";
import AddPaymentMethodScreen from "../customerscreens/AddPaymentMethodScreen";
import LogoutPage from "../WelcomeScreens/LogoutPage";
import { auth } from "../../FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import ProtectedScreen from "../WelcomeScreens/ProtectedScreen";
// import ForgotPasswordScreen from "../WelcomeScreens/ForgotPasswordScreen";
// import DriverWallet from "../components/WalletDriver";
import TripCancellationModal from "../components/TripCancelationModal";
import CustomerChat from "../customerscreens/CustomerChat";
import PaymentSuccess from "../components/payment-success";
import RideRatingScreen from "../customerscreens/RideRatingScreen";
import BookingForm from "../NthomeAir/BookingForm";
import BookingList from "../NthomeAir/BookingList";
import BookingEdit from "../NthomeAir/BookingEdit";
import BookingDetails from "../NthomeAir/BookingDetails";
import FlightWelcomeScreen from "../NthomeAir/FlightWelcomeScreen";
import TermsScreen from "../customerscreens/TermsScreen";
import ForgotPasswordScreen from "../WelcomeScreens/ForgotPasswordScreen";
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
    >

      <Tab.Screen
        name="Services"
        component={NthomeServicesScreen}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Icon name="tools" type="material-community" size={size} color={focused ? '#7cc' : 'gray'} />
          ),
        }}
      />
      <Tab.Screen
        name="Home"
        component={RequestScreen}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Icon name="home" type="material-community" size={size} color={focused ? '#7cc' : 'gray'} />
          ),
        }}
      />
      {/* <Tab.Screen
        name="Wallet"
        component={DriverWallet}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Icon name="money" type="material-community" size={size} color={focused ? '#7cc' : 'gray'} />
          ),
        }}
      /> */}
      <Tab.Screen
        name="Account"
        component={CustomerProfile}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" type="material-community" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Drawer Navigator
function DrawerNavigator() {
  return (
    <Drawer.Navigator initialRouteName="RequestScreen" screenOptions={{ headerShown: false }}>
      <Drawer.Screen
        name="RequestScreen"
        component={RequestScreen}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon name="car" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
          ),
        }}
      />
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon name="home" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
          ),
        }}
      />
      <Drawer.Screen
        name="Services"
        component={NthomeServicesScreen}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon name="tools" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
          ),
        }}
      />
      <Drawer.Screen
        name="My Rides"
        component={TripHistory} // Replace with appropriate component
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon
              name="car" // Correct icon for rides
              type="material-community"
              size={size}
              color={focused ? '#7cc' : 'gray'}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Profile"
        component={CustomerProfile}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon name="account-circle" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
          ),
        }}
      />
      <Drawer.Screen
        name="RideRating"
        component={RideRatingScreen}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon name="account-circle" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
          ),
        }}
      />
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon name="account-circle" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
          ),
        }}
      />
      <Drawer.Screen
        name="Support"
        component={SupportScreen}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon name="account-circle" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
          ),
        }}
      />

      <Drawer.Screen
        name="Logout"
        component={LogoutPage}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon name="logout" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
          ),
        }}
      />

      {/* All other screens inside stack but hidden from drawer */}
      <Drawer.Screen
        name="AppScreens"
        component={RootNavigator}
        options={{ drawerItemStyle: { display: 'none' } }}
      />


    </Drawer.Navigator>
  );
}

// Helper to get active route name (even in nested navigators)
const getActiveRouteName = (state) => {
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state);
  }
  return route.name;
};

// Root Navigator
export default function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null); // Initially null to avoid flickering

  useEffect(() => {
    const loadInitialRoute = async () => {
      try {
        // Check if a last screen is saved
        const savedScreen = await AsyncStorage.getItem('lastScreen');
        console.log('Initial route:', initialRoute)
        if (savedScreen) {
          setInitialRoute(savedScreen);
          setIsLoading(false);
          return;
        }

        // Your existing auth/onboarding checks
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        const storedUserId = await AsyncStorage.getItem('userId');
        const emailVerified = await AsyncStorage.getItem('emailVerified');

        if (storedUserId && emailVerified === 'true') {
          setInitialRoute('DrawerNavigator');
        } else {
          const user = auth.currentUser;
          if (user) {
            await user.reload();
            if (user.emailVerified) {
              await AsyncStorage.setItem('userId', user.uid);
              await AsyncStorage.setItem('emailVerified', 'true');
              setInitialRoute('DrawerNavigator');
            } else {
              setInitialRoute('ProtectedScreen');
            }
          } else {
            setInitialRoute(hasOnboarded === 'true' ? 'LoginScreen' : 'Onboarding');
          }
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        setInitialRoute('LoginScreen');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialRoute();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          await AsyncStorage.setItem('userId', user.uid);
          await AsyncStorage.setItem('emailVerified', 'true');
          setInitialRoute('DrawerNavigator');
        } else {
          setInitialRoute('ProtectedScreen');
        }
      } else {
        console.log('User is not logged in');
        setInitialRoute('LoginScreen');
      }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading || !initialRoute) {
    return null; // Avoid rendering the navigator until the initial route is set
  }

  return (
    <NavigationContainer
      onStateChange={(state) => {
        const currentRouteName = getActiveRouteName(state);
        if (currentRouteName) {
          AsyncStorage.setItem('lastScreen', currentRouteName);
        }
      }}
    >
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="DrawerNavigator" component={DrawerNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LogoutPage" component={LogoutPage} options={{ headerShown: false }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="ProtectedScreen" component={ProtectedScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={CustomerProfile} options={{ headerShown: false }} />
        <Stack.Screen name="TripDetails" component={TripDetails} options={{ headerShown: false }} />
        <Stack.Screen name="services" component={NthomeServicesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TripHistory" component={TripHistory} options={{ headerShown: false }} />
        <Stack.Screen name="RequestScreen" component={RequestScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DestinationScreen" component={DestinationScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PrivacySettings" component={PrivacySettings} options={{ headerShown: false }} />
        <Stack.Screen name="PaymentScreen" component={PaymentScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} options={{ headerShown: false }} />
        <Stack.Screen name="PaymentMethodsScreen" component={PaymentMethodsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LanguageSettings" component={LanguageSettings} options={{ headerShown: false }} />
        <Stack.Screen name="CommunicationPreferences" component={CommunicationPreferences} options={{ headerShown: false }} />
        <Stack.Screen name="AddPaymentMethodScreen" component={AddPaymentMethodScreen} options={{ headerShown: false }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Support" component={SupportScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TripCancellationModal" component={TripCancellationModal} options={{ headerShown: false }} />
        <Stack.Screen name="CustomerChat" component={CustomerChat} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RideRatingScreen" component={RideRatingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BookingForm" component={BookingForm} options={{ headerShown: false }} />
        <Stack.Screen name="BookingList" component={BookingList} options={{ headerShown: false }} />
        <Stack.Screen name="BookingDetails" component={BookingDetails} options={{ headerShown: false }} />
        <Stack.Screen name="BookingEdit" component={BookingEdit} options={{ headerShown: false }} />
        <Stack.Screen name="FlightWelcomeScreen" component={FlightWelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TermsScreen" component={TermsScreen} options={{ headerShown: false }} />




        {/* Recent Places Bottom Sheet */}
        <Stack.Screen
          name="RecentPlacesBottomSheet"
          component={RecentPlacesBottomSheet}
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "slide_from_bottom",
          }}
        />

        {/* Car Listing Bottom Sheet */}
        <Stack.Screen
          name="CarListingBottomSheet"
          component={CarListingBottomSheet}
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "slide_from_bottom",
          }}
        />

        {/* Driver Details Bottom Sheet */}
        <Stack.Screen
          name="DriverDetailsBottomSheet"
          component={DriverDetailsBottomSheet}
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "slide_from_bottom",
          }}
        />

        {/* Trip Loading Response */}
        <Stack.Screen
          name="TripLoadingResponse"
          component={TripLoadingResponse}
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "slide_from_bottom",
          }}
        />

        {/* Driver Info Bottom Sheet */}
        <Stack.Screen
          name="DriverInfoBottomSheet"
          component={DriverInfoBottomSheet}
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "slide_from_bottom",
          }}
        />

        {/* Driver Communication Bottom Sheet */}
        <Stack.Screen
          name="DriverCommunicationBottomSheet"
          component={DriverCommunicationBottomSheet}
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
