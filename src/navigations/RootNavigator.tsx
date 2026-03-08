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
import CustomerChat from "../customerscreens/CustomerChat";
import PaymentSuccess from "../components/payment-success";
import RideRatingScreen from "../customerscreens/RideRatingScreen";
import ForgotPasswordScreen from "../WelcomeScreens/ForgotPasswordScreen";
import TermsScreen from "../customerscreens/TermsScreen";
import { ActivityIndicator, View } from "react-native";
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/actions/authActions';
import { getStoredUser } from '../utils/storage';
import NetInfo from '@react-native-community/netinfo';
import { syncPendingUpdates } from '../utils/syncPending';

import BookingForm from "../NthomeAir/BookingForm";
import BookingList from "../NthomeAir/BookingList";
import BookingEdit from "../NthomeAir/BookingEdit";
import BookingDetails from "../NthomeAir/BookingDetails";
import FlightWelcomeScreen from "../NthomeAir/FlightWelcomeScreen";


import FoodWelcomeScreen from "../NthomeFood/FoodWelcomeScreen";
import NthomeFoodLanding from "../NthomeFood/NthomeFoodLanding";
import SeeAllRestaurantsScreen from "../NthomeFood/SeeAllRestaurantsScreen";
import RestaurantDetailScreen from "../NthomeFood/RestaurantDetailScreen";
import CartScreen from "../NthomeFood/CartScreen";
import OrderTrackingScreen from "../NthomeFood/OrderTrackingScreen";
import OrderHistory from "../NthomeFood/OrderHistory";
import PendingRequestsScreen from '../customerscreens/PendingRequestsScreen';


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
    <Drawer.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          drawerIcon: ({ focused, size }) => (
            <Icon name="car" type="material-community" size={size} color={focused ? "#7cc" : "gray"} />
          ),
        }}
      />
      <Drawer.Screen
        name="RequestScreen"
        component={RequestScreen}
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
  const dispatch = useDispatch();


  useEffect(() => {
    const loadInitialRoute = async () => {
      try {
        // 1️⃣ Check if a last screen is saved
        const savedScreen = await AsyncStorage.getItem("lastScreen");
        if (savedScreen) {
          if (savedScreen === "DestinationScreen") {
            setInitialRoute("DestinationScreen");
          } else {
            setInitialRoute("RequestScreen");
          }
          await AsyncStorage.removeItem("lastScreen");
          setIsLoading(false);
          return;
        }

        // 2️⃣ Check onboarding/auth from AsyncStorage
        const hasOnboarded = await AsyncStorage.getItem("hasOnboarded");
        const storedUserId = await AsyncStorage.getItem("userId");
        const emailVerified = await AsyncStorage.getItem("emailVerified");

        // If we have stored user but need to verify email status
        if (storedUserId) {
          const user = auth.currentUser;
          if (user) {
            await user.reload(); // Get latest email verification status
            if (user.emailVerified) {
              await AsyncStorage.setItem("emailVerified", "true");
              setInitialRoute("DrawerNavigator");
            } else {
              await AsyncStorage.removeItem("emailVerified");
              await AsyncStorage.removeItem("userId");
              setInitialRoute("ProtectedScreen");
            }
          } else {
            // User not logged in but has stored data - clear it
            await AsyncStorage.removeItem("userId");
            await AsyncStorage.removeItem("emailVerified");
            setInitialRoute(hasOnboarded === "true" ? "LoginScreen" : "Onboarding");
          }
        } else {
          const user = auth.currentUser;
          if (user) {
            await user.reload();
            if (user.emailVerified) {
              await AsyncStorage.setItem("userId", user.uid);
              await AsyncStorage.setItem("emailVerified", "true");
              setInitialRoute("DrawerNavigator");
            } else {
              setInitialRoute("ProtectedScreen");
            }
          } else {
            setInitialRoute(hasOnboarded === "true" ? "LoginScreen" : "Onboarding");
          }
        }
      } catch (error) {
        console.error("Error checking authentication status:", error);
        setInitialRoute("LoginScreen");
      } finally {
        setIsLoading(false);
      }
    };

    (async () => {
      await loadInitialRoute();
      try {
        const cachedUser = await getStoredUser();
        if (cachedUser) dispatch(setUser(cachedUser));
      } catch (e) {
        console.warn('Failed to hydrate cached user in RootNavigator', e);
      }
    })();

    // Sync pending updates when connection returns and update redux with real trip ids
    let unsubscribeNet = () => {}
    if (NetInfo && typeof NetInfo.addEventListener === 'function') {
      unsubscribeNet = NetInfo.addEventListener(async state => {
        if (state.isConnected) {
          try {
            const results = await syncPendingUpdates();
            if (Array.isArray(results) && results.length > 0) {
              // For each successful sync, update redux store so UI can reflect real trip ids
              results.forEach(r => {
                if (r && r.tripData) {
                  try {
                    dispatch({ type: 'SET_TRIP_DATA', payload: r.tripData });
                  } catch (e) {
                    console.warn('Failed to dispatch trip update after sync', e);
                  }
                }
              })
            }
          } catch (e) {
            console.warn('syncPendingUpdates error', e);
          }
        }
      });
    }

    // 3️⃣ Subscribe to real-time auth changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log("User is not logged in");
        // Clear stored data when user signs out
        try {
          await AsyncStorage.removeItem("userId");
          await AsyncStorage.removeItem("emailVerified");
          await AsyncStorage.removeItem("user");
          await AsyncStorage.removeItem("user_id");
          await AsyncStorage.removeItem("customer_code");
        } catch (e) {
          console.warn('Error clearing cached user keys', e);
        }

        // Reset Redux auth state as well
        try {
          dispatch(setUser(null));
        } catch (e) {
          console.warn('Failed to dispatch setUser(null)', e);
        }

        setInitialRoute("LoginScreen");
        return;
      }

      try {
        // Reload user to get latest email verification status
        await user.reload();
        const currentUser = auth.currentUser;

        if (currentUser && currentUser.emailVerified) {
          await AsyncStorage.setItem("userId", currentUser.uid);
          await AsyncStorage.setItem("emailVerified", "true");
          setInitialRoute("DrawerNavigator");
        } else {
          await AsyncStorage.removeItem("emailVerified");
          setInitialRoute("ProtectedScreen");
        }
      } catch (err) {
        console.error("Error reading email verification status:", err);
        setInitialRoute("LoginScreen");
      }
    });

    return () => unsubscribe();
  }, []);


  if (isLoading || initialRoute === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0DCAF0" />
      </View>
    );
  }

  const linking = {
    prefixes: ['nthome://'],
    config: {
      screens: {
        PaymentSuccess_add_cards: 'AddPaymentMethodScreen',
        PaymentSuccessScreen_trip_pay: 'PaymentSuccess',
      },
    },
  };


  return (
    <NavigationContainer
      linking={linking}
      onStateChange={async (state) => {
        const currentRouteName = getActiveRouteName(state);

        if (!currentRouteName) return;

        if (currentRouteName === 'DestinationScreen') {
          await AsyncStorage.setItem('lastScreen', 'DestinationScreen');
        } else {
          await AsyncStorage.setItem('lastScreen', 'RequestScreen');
        }
      }}

    >
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="DrawerNavigator" component={DrawerNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LogoutPage" component={LogoutPage} options={{ headerShown: false }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} options={{ headerShown: false }} />
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
        {/* TripCancellationModal is used as an in-component modal; avoid registering as a navigation screen */}
        <Stack.Screen name="CustomerChat" component={CustomerChat} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RideRatingScreen" component={RideRatingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BookingForm" component={BookingForm} options={{ headerShown: false }} />
        <Stack.Screen name="BookingList" component={BookingList} options={{ headerShown: false }} />
        <Stack.Screen name="BookingDetails" component={BookingDetails} options={{ headerShown: false }} />
        <Stack.Screen name="BookingEdit" component={BookingEdit} options={{ headerShown: false }} />
        <Stack.Screen name="FlightWelcomeScreen" component={FlightWelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TermsScreen" component={TermsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FoodWelcomeScreen" component={FoodWelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="NthomeFoodLanding" component={NthomeFoodLanding} options={{ headerShown: false }} />
        <Stack.Screen name="SeeAllRestaurants" component={SeeAllRestaurantsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OrderHistory" component={OrderHistory} options={{ headerShown: false }} />
        <Stack.Screen name="PendingRequests" component={PendingRequestsScreen} options={{ headerShown: false }} />




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
