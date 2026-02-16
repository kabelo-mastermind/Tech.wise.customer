"use client"

import { useContext, useState, useEffect, useRef } from "react"
import { StyleSheet, View, Dimensions, TouchableOpacity, Text, Modal, Image, Animated, PanResponder } from "react-native"
import MapComponent from "../components/MapComponent"
import { colors } from "../global/styles"
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef
} from "react-native-google-places-autocomplete"
import { GOOGLE_MAPS_APIKEY } from "@env"
import { DestinationContext, OriginContext } from "../contexts/contexts"
import * as Location from "expo-location"
import NetInfo from '@react-native-community/netinfo'
import { addPendingUpdate, getPendingUpdates, getRecentDestinations, addRecentDestination } from '../utils/storage'
import { Icon } from "react-native-elements"
import { SafeAreaView } from "react-native-safe-area-context"
import { useSelector, useDispatch } from "react-redux"
import CustomDrawer from "../components/CustomDrawer"
import axios from "axios"
import { api } from "../../api"
import { LinearGradient } from "expo-linear-gradient"
import { setUser } from "../redux/actions/authActions" // Import the action to update user in Redux
import LoadingState from "../components/LoadingState"
import { Platform } from 'react-native'

const SCREEN_HEIGHT = Dimensions.get("window").height
const FETCH_INTERVAL = 30000 // Fetch customer code every 30 seconds
const MAX_DISTANCE_KM = 200 // Maximum allowed distance in kilometers

export default function RequestScreen({ navigation, route }) {
  const user = useSelector((state) => state.auth.user)
  // console.log("from logged in user))))))))))))))", user);

  const dispatch = useDispatch()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  const { origin, dispatchOrigin } = useContext(OriginContext)
  const { destination, dispatchDestination } = useContext(DestinationContext)
  const [destinationCondition, setDestination] = useState(false)
  const [mapKey, setMapKey] = useState(0)
  const originRef = useRef<GooglePlacesAutocompleteRef>(null);
  const destinationRef = useRef()
  const [locationFetched, setLocationFetched] = useState(false)
  const [isCheckingProfile, setIsCheckingProfile] = useState(false)
  const [showProfileAlert, setShowProfileAlert] = useState(false)
  const [customerCode, setCustomerCode] = useState(user?.customer_code || null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDistanceAlert, setShowDistanceAlert] = useState(false)
  const [distanceInKm, setDistanceInKm] = useState(0)
  const [currentAddress, setCurrentAddress] = useState('');
  const [isDragging, setIsDragging] = useState(false); // Track if marker is being dragged
  const [showDirections, setShowDirections] = useState(false);
  const [isConnected, setIsConnected] = useState(true)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinCoord, setPinCoord] = useState(null)
  const [pinMode, setPinMode] = useState(false)
  const [hasPendingTrips, setHasPendingTrips] = useState(false)
  const [recentDestinations, setRecentDestinations] = useState([])
  const [showRecents, setShowRecents] = useState(true)
  // Animated pan for draggable floating pin
  const pinPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const movedRef = useRef(false);
  const pinScale = useRef(new Animated.Value(1)).current;
  const holdTimer = useRef<number | null>(null);
  const isHeld = useRef(false);
  const HOLD_DELAY = 250; // ms required to start dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // require a short hold before activating drag to match typical draggable UX
        isHeld.current = false
        if (holdTimer.current) {
          clearTimeout(holdTimer.current as any)
        }
        holdTimer.current = setTimeout(() => {
          isHeld.current = true
          // visual pop and prepare for dragging
          Animated.spring(pinScale, { toValue: 1.12, useNativeDriver: true }).start()
          try {
            const x = (pinPan as any).x && (pinPan as any).x._value ? (pinPan as any).x._value : 0
            const y = (pinPan as any).y && (pinPan as any).y._value ? (pinPan as any).y._value : 0
            pinPan.setOffset({ x, y })
            pinPan.setValue({ x: 0, y: 0 })
          } catch (e) {
            // ignore
          }
        }, HOLD_DELAY)
        movedRef.current = false
      },
      onPanResponderMove: (evt, gestureState) => {
        // only move after hold threshold
        if (!isHeld.current) return
        if (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4) movedRef.current = true
        pinPan.setValue({ x: gestureState.dx, y: gestureState.dy })
      },
      onPanResponderRelease: () => {
        // clear any pending hold timer
        if (holdTimer.current) {
          clearTimeout(holdTimer.current as any)
          holdTimer.current = null
        }
        // only restore scale if we had activated hold/drag
        if (isHeld.current) {
          Animated.spring(pinScale, { toValue: 1, useNativeDriver: true }).start()
        }
        try {
          if (!isHeld.current) {
            // short tap: toggle pin mode
            setPinMode(p => !p)
          }
          // flatten offset so position persists when we did drag
          if (isHeld.current) pinPan.flattenOffset()
        } catch (e) {
          // ignore
        }
        isHeld.current = false
      },
    })
  ).current;
  // Function to calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Earth radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in kilometers
    return distance
  }

  // Function to check if the distance is within allowed limit
  const checkDistanceLimit = (originCoords, destCoords) => {
    if (!originCoords || !destCoords) return true

    const distance = calculateDistance(
      originCoords.latitude,
      originCoords.longitude,
      destCoords.latitude,
      destCoords.longitude,
    )

    setDistanceInKm(distance.toFixed(2))
    return distance <= MAX_DISTANCE_KM
  }
  // Function to reverse geocode coordinates to address
  const reverseGeocode = async (coordinate) => {
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        // enqueue a pending resolution for later when online
        try {
          await addPendingUpdate({ type: 'reverse_geocode', payload: { coordinate } });
        } catch (e) {
          // ignore enqueue errors
        }
        // Return a friendly fallback using coordinates
        return `Location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`;
      }

      const addressArray = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude
      })

      if (addressArray.length > 0) {
        const address = addressArray[0];
        // Format address based on available components
        const formattedAddress = [
          address.name,
          address.street,
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');

        return formattedAddress;
      }
      return `Location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return `Location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`;
    }
  }

  // Handle destination marker drag
  const handleDestinationDrag = async (coordinate) => {
    setIsDragging(true);

    // Update the destination coordinates immediately for smooth dragging
    const updatedDestination = {
      ...destination,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    };

    dispatchDestination({
      type: "ADD_DESTINATION",
      payload: updatedDestination,
    });

    // Update the destination input field with "Updating..." while dragging
    if (destinationRef.current) {
      destinationRef.current.setAddressText("Updating location...");
    }
  };

  // Handle destination marker drag end
  const handleDestinationDragEnd = async (coordinate) => {
    try {
      // Get the address for the final dropped position
      const address = await reverseGeocode(coordinate);

      const finalDestination = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        address: address,
        name: address.split(',')[0] || "Dropped location", // Use first part of address as name
      };

      // Update destination with final coordinates and address
      dispatchDestination({
        type: "ADD_DESTINATION",
        payload: finalDestination,
      });

      try { await addRecentDestination(finalDestination) } catch(e){}

      // Update the destination input field with the actual address
      if (destinationRef.current) {
        destinationRef.current.setAddressText(address);
      }

      // Check distance limit after dropping
      if (!checkDistanceLimit(origin, finalDestination)) {
        setShowDistanceAlert(true);
      }

    } catch (error) {
      console.error("Error during drag end:", error);

      // Fallback: at least update coordinates even if geocoding fails
      const fallbackDestination = {
        ...destination,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        address: `Location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`,
      };

      dispatchDestination({
        type: "ADD_DESTINATION",
        payload: fallbackDestination,
      });

      if (destinationRef.current) {
        destinationRef.current.setAddressText(fallbackDestination.address);
      }
    } finally {
      setIsDragging(false);
    }
  };

    // Handle single tap on map when pin mode is active
    const handleMapPress = async (coordinate) => {
      if (!pinMode) return
      setPinCoord(coordinate)
      // show quick action bar (not modal)
    }


  // Function to fetch customer code from the database
  const fetchCustomerCode = async () => {
    if (!user || !user.user_id) {
      setIsLoading(false)
      return
    }

    try {
      setIsCheckingProfile(true)
      const response = await axios.get(`${api}user/${user.user_id}/customer-code`)

      if (response.data && response.data.customer_code) {
        setCustomerCode(response.data.customer_code)
        setShowProfileAlert(false)

        // Update Redux store with customer_code
        dispatch(
          setUser({
            ...user,
            customer_code: response.data.customer_code,
          }),
        )
      } else {
        // Only show the alert if we've confirmed the code is missing
        setCustomerCode(null)
      }
    } catch (error) {
      console.log("Error fetching customer code:", error)
    } finally {
      setIsCheckingProfile(false)
      setIsLoading(false)
    }
  }

  // Fetch customer code on component mount and periodically
  useEffect(() => {
    // If we already have the customer code in Redux, use it
    if (user?.customer_code) {
      setCustomerCode(user.customer_code)
      setIsLoading(false)
    } else {
      // Otherwise fetch it from the API
      fetchCustomerCode()
    }
  }, [user?.user_id])

  // refresh pending trips indicator when screen focuses
  useEffect(() => {
    const loadPending = async () => {
      try {
        const list = await getPendingUpdates();
        const trips = list.filter(i => i.type === 'trip_request')
        setHasPendingTrips(trips.length > 0)
      } catch (e) {
        setHasPendingTrips(false)
      }
    }

    const loadRecent = async () => {
      try {
        const recents = await getRecentDestinations(8)
        setRecentDestinations(recents)
      } catch (e) {
        setRecentDestinations([])
      }
    }

    const unsubscribe = navigation.addListener('focus', () => {
      loadPending();
      loadRecent();
    })

    // initial
    loadPending();
    loadRecent();

    return unsubscribe
  }, [navigation])

  const getCurrentLocation = async () => {
    // if (locationFetched) return
    // setLocationFetched(true)

    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      // console.log("Permission Status:", status)
      if (status !== "granted") {
        return
      }

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      })

      if (coords) {
        const { latitude, longitude } = coords

        const address = await reverseGeocode({ latitude, longitude })

        setCurrentAddress(address);

        if (originRef.current) {
          originRef.current.setAddressText(address)
        }

        dispatchOrigin({
          type: "ADD_ORIGIN",
          payload: { latitude, longitude, address },
        })
      }
    } catch (error) {
      console.error("Error fetching location:", error)
    }
  }

  const handleNavigation = () => {
    // Check if user has a customer code before allowing navigation
    if (!customerCode) {
      setShowProfileAlert(true)
      return
    }

    // Check if distance is within allowed limit
    if (!checkDistanceLimit(origin, destination)) {
      setShowDistanceAlert(true)
      return
    }

    if (destination && destination.latitude !== null && destination.longitude !== null) {
      navigation.navigate("CarListingBottomSheet", { destinations: destination })
    } else {
      navigation.navigate("RecentPlacesBottomSheet")
    }
  }

  // Navigate to profile screen
  const navigateToProfile = () => {
    setShowProfileAlert(false)
    navigation.navigate("Profile")
  }

  useEffect(() => {
    if (!locationFetched) {
      getCurrentLocation();
      setLocationFetched(true); // only used here
    }
    // subscribe to network state
    let unsubscribeNet = () => {}
    if (NetInfo && typeof NetInfo.addEventListener === 'function') {
      unsubscribeNet = NetInfo.addEventListener(state => {
        setIsConnected(state.isConnected ?? false)
      })
    }

    if (NetInfo && typeof NetInfo.fetch === 'function') {
      NetInfo.fetch().then(state => setIsConnected(state.isConnected ?? false)).catch(() => {})
    }

    return () => { try { unsubscribeNet(); } catch (e) {} }
  }, []);

  // Ensure the destination input text matches `destination.address` when destination changes
  useEffect(() => {
    if (destinationRef && destinationRef.current && destination && destination.address) {
      try {
        // small delay to ensure input is mounted
        setTimeout(() => {
          if (destinationRef.current && destinationRef.current.setAddressText) {
            destinationRef.current.setAddressText(destination.address);
          }
        }, 50);
      } catch (e) {
        // ignore
      }
    }
  }, [destination?.address]);

  // ✅ UseEffect with delay 2-5 delays before navigating
  useEffect(() => {
    if (destination?.latitude && destination?.longitude) {
      if (!customerCode) {
        setShowProfileAlert(true);
        return;
      }

      if (!checkDistanceLimit(origin, destination)) {
        setShowDistanceAlert(true);
        dispatchDestination({ type: "RESET_DESTINATION" });
        setDestination(false);
        return;
      }

      // ⏳ Timer 1: Show directions after 2 seconds
      const directionTimer = setTimeout(() => {
        setShowDirections(true);
      }, 2000);

      // ⏳ Timer 2: Navigate after 5 seconds
      const navigationTimer = setTimeout(() => {
        navigation.navigate("CarListingBottomSheet");
      }, 5000);

      // 🧹 Cleanup timers when destination changes
      return () => {
        clearTimeout(directionTimer);
        clearTimeout(navigationTimer);
        setShowDirections(false);
      };
    }
  }, [destination?.latitude, destination?.longitude]);

  // Accept preset destination from navigation params (HomeScreen quick-tap)
  useEffect(() => {
    const preset = route?.params?.presetDestination
    if (preset) {
      const payload = { latitude: preset.latitude, longitude: preset.longitude, address: preset.address || preset.name }
      dispatchDestination({ type: 'ADD_DESTINATION', payload })
      if (destinationRef.current && destinationRef.current.setAddressText) destinationRef.current.setAddressText(payload.address)
      try { addRecentDestination(payload) } catch (e) {}
      // clear param so it doesn't re-fire
      try { navigation.setParams({ presetDestination: null }) } catch(e){}
    }
  }, [route?.params])

  const clearOrigionAddress = () => {
    if (originRef.current) {
      originRef.current.clear()
      originRef.current.setAddressText("")
    }
    dispatchOrigin({ type: "RESET_ORIGIN" })
  }

  const clearDestinationAddress = () => {
    if (destinationRef.current) {
      destinationRef.current.clear()
      destinationRef.current.setAddressText("")
    }
    dispatchDestination({ type: "RESET_DESTINATION" })
    setDestination(false)
    setShowDistanceAlert(false)
  }


  const [showLoginError, setShowLoginError] = useState(false);

  useEffect(() => {
    // Wait 2–3 seconds before showing login error
    const timer = setTimeout(() => {
      if (!user || !user.user_id) {
        setShowLoginError(true);
      }
    }, 2500); // 2.5 seconds

    return () => clearTimeout(timer);
  }, [user]);

  if (showLoginError) {
    return (
      <LoadingState
        message="Login verification is taking longer than expected. Please login again."
        showButton={true}
        buttonText="Login"
        onButtonPress={() => {
          navigation.replace("LogoutPage"); // Redirect to login screen
        }}
      />
    );
  }

  if (isLoading) {
      return <LoadingState message="Verifying your login details..." />;
  }



  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.topContainer}>
          <View style={styles.whiteBox}>
            <View style={styles.header}>
              {/* Left: Menu button */}
              <TouchableOpacity onPress={toggleDrawer} style={styles.roundButton}>
                <Icon type="material-community" name="menu" color={"#0DCAF0"} size={30} />
              </TouchableOpacity>

              {/* Center spacer (pin moved to floating button) */}
              <View style={{ flex: 1 }} />

              {/* Right: Profile picture */}
              <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileButton}>
                <Image
                  source={user?.profile_picture ? { uri: user.profile_picture } : require('../../assets/placeholder.jpg')}
                  style={styles.profileImage}
                />
              </TouchableOpacity>
            </View>
            {/* Note: global NetworkBanner handles offline notification; local banner removed */}


            <View style={[styles.inputContainer, autoCompleteStyles.inputStackContainer]}>
              <GooglePlacesAutocomplete
                ref={originRef}
                placeholder="From..."
                listViewDisplayed="auto"
                debounce={400}
                minLength={2}
                enablePoweredByContainer={false}
                fetchDetails={true}
                onPress={(data, details = null) => {
                  if (details) {
                    dispatchOrigin(
                      {
                        type: "ADD_ORIGIN",
                        payload: {
                          latitude: details.geometry.location.lat,
                          longitude: details.geometry.location.lng,
                          address: details.formatted_address,
                          name: details.name,
                        },
                      },
                      1000,
                    )
                  }
                }}
                query={{
                  key: GOOGLE_MAPS_APIKEY,
                  language: "en",
                }}
                styles={autoCompleteStyles}
                textInputProps={{
                  onFocus: () => setShowRecents(false),
                  onBlur: () => setShowRecents(true),
                }}
                onFocus={() => setShowRecents(false)}
                onBlur={() => setShowRecents(true)}
                nearbyPlacesAPI="GooglePlacesSearch"
              />
              <TouchableOpacity style={styles.clearButton} onPress={clearOrigionAddress}>
                <Icon name="close" size={20} color="#000" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
                <Icon name="my-location" size={20} color="#fff" />
              </TouchableOpacity>


              <GooglePlacesAutocomplete
                ref={destinationRef}
                placeholder="Where to"
                listViewDisplayed="auto"
                debounce={400}
                minLength={2}
                enablePoweredByContainer={false}
                fetchDetails={true}
                onPress={async (data, details = null) => {
                  // console.log('Destination selected:', data, details)
                  if (details) {
                    // Check if user has a customer code before setting destination
                    if (!customerCode) {
                      setShowProfileAlert(true)
                      return
                    }

                    const newDestination = {
                      latitude: details.geometry.location.lat,
                      longitude: details.geometry.location.lng,
                      address: details.formatted_address,
                      name: details.name,
                    }

                    // Check if distance is within allowed limit
                    if (!checkDistanceLimit(origin, newDestination)) {
                      setShowDistanceAlert(true)
                      // Still set the destination to show on map, but don't proceed to next screen
                      dispatchDestination({
                        type: "ADD_DESTINATION",
                        payload: newDestination,
                      })
                      return
                    }

                    dispatchDestination({
                      type: "ADD_DESTINATION",
                      payload: newDestination,
                    })
                    try { await addRecentDestination(newDestination) } catch(e){}
                  }
                }}
                onFail={error => console.log('Destination autocomplete error:', error)}
                onNotFound={() => console.log('Destination place not found')}
                query={{
                  key: GOOGLE_MAPS_APIKEY,
                  language: "en",
                }}
                styles={autoCompleteStyles}
                textInputProps={{
                  onFocus: () => setShowRecents(false),
                  onBlur: () => setShowRecents(true),
                }}
                onFocus={() => setShowRecents(false)}
                onBlur={() => setShowRecents(true)}
                nearbyPlacesAPI="GooglePlacesSearch"
              />
              <TouchableOpacity style={[styles.clearButton1]} onPress={clearDestinationAddress}>
                <Icon name="close" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Recent destinations quick list */}
        {recentDestinations && recentDestinations.length > 0 && showRecents && !drawerOpen && (
          <View style={styles.recentContainer}>
            <Text style={styles.recentHeader}>Recent Destinations</Text>
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
            >
              {recentDestinations.map((item, idx) => (
                <TouchableOpacity
                  key={item.savedAt || idx}
                  style={styles.recentChip}
                  onPress={async () => {
                    const payload = { latitude: item.latitude, longitude: item.longitude, address: item.address || item.name }
                    dispatchDestination({ type: 'ADD_DESTINATION', payload })
                    if (destinationRef.current && destinationRef.current.setAddressText) destinationRef.current.setAddressText(payload.address)
                    try { await addRecentDestination(payload) } catch(e){}
                    navigation.navigate('CarListingBottomSheet')
                  }}
                >
                  <Text style={styles.recentChipText}>{item.name || item.address}</Text>
                </TouchableOpacity>
              ))}
            </Animated.ScrollView>
          </View>
        )}

        <MapComponent
          key={mapKey}
          userOrigin={origin}
          userDestination={destination}
          onDestinationDrag={handleDestinationDrag}
          onDestinationDragEnd={handleDestinationDragEnd}
          showDirections={showDirections}
          onMapLongPress={null}
          onMapPress={handleMapPress}
          pinCoordinate={pinCoord}
          isConnected={isConnected}
        />
        {/* Show loading indicator while reverse geocoding during drag */}
        {isDragging && (
          <View style={styles.draggingIndicator}>
            <Text style={styles.draggingText}>Updating location...</Text>
          </View>
        )}
        {/* Profile Completion Banner - only show if customer code is missing and we're not loading */}
        {!isLoading && !customerCode && (
          <TouchableOpacity style={styles.profileBanner} onPress={navigateToProfile}>
            <LinearGradient
              colors={["#0DCAF0", "#0DCAF0"]}
              style={styles.bannerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 2.5, y: 0 }}
            >
              <Icon name="account-circle" type="material" size={24} color="#FFFFFF" />
              <Text style={styles.bannerText}>Complete your profile to request rides</Text>
              <Icon name="chevron-right" type="material" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Profile Alert Modal - only show if explicitly triggered and customer code is missing */}
        {!isLoading && !customerCode && showProfileAlert && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowProfileAlert(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Icon name="account-circle" type="material" size={60} color="#0DCAF0" />
                  <Text style={styles.modalTitle}>Complete Your Profile</Text>
                </View>

                <Text style={styles.modalText}>
                  Please complete your profile information to make ride requests. This helps us provide better service
                  and ensures a smooth payment process.
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.laterButton} onPress={() => setShowProfileAlert(false)}>
                    <Text style={styles.laterButtonText}>Later</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.profileButton2} onPress={navigateToProfile}>
                    <Text style={styles.profileButtonText}>Update Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

          {/* Quick action bar for pin (appears when pinCoord is set) */}
          {pinCoord && (
            <View style={styles.pinActionBar} pointerEvents="box-none">
              <View style={styles.pinActionInner}>
                <TouchableOpacity
                  style={styles.profileButton2}
                  onPress={async () => {
                    // Set as pickup
                    const addr = await reverseGeocode(pinCoord)
                    const originPayload = { latitude: pinCoord.latitude, longitude: pinCoord.longitude, address: addr }
                    dispatchOrigin({ type: 'ADD_ORIGIN', payload: originPayload })
                    if (originRef.current) originRef.current.setAddressText(addr)
                    // clear pin marker but stay in pin mode
                    setPinCoord(null)
                  }}
                >
                  <Text style={styles.profileButtonText}>Set Pickup</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.laterButton, { marginLeft: 8 }]}
                  onPress={async () => {
                    // Set as destination
                    const addr = await reverseGeocode(pinCoord)
                    const destPayload = { latitude: pinCoord.latitude, longitude: pinCoord.longitude, address: addr, name: addr.split(',')[0] }
                    dispatchDestination({ type: 'ADD_DESTINATION', payload: destPayload })
                    if (destinationRef.current) destinationRef.current.setAddressText(addr)
                        try { await addRecentDestination(destPayload) } catch(e){}
                        setPinCoord(null)
                  }}
                >
                  <Text style={styles.laterButtonText}>Set Destination</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.cancelPinButton, { marginLeft: 8 }]} onPress={() => setPinCoord(null)}>
                  <Text style={styles.cancelPinText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        {/* Distance Limit Alert Modal */}
        {showDistanceAlert && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDistanceAlert(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Icon name="map-marker-distance" type="material-community" size={60} color="#FF6B6B" />
                  <Text style={styles.modalTitle}>Distance Limit Exceeded</Text>
                </View>

                <Text style={styles.modalText}>
                  The distance between your pickup and destination is approximately {distanceInKm} km, which exceeds our
                  maximum limit of {MAX_DISTANCE_KM} km. Please choose a closer destination.
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.profileButton2, { backgroundColor: "#FF6B6B", flex: 1 }]}
                    onPress={() => setShowDistanceAlert(false)}
                  >
                    <Text style={styles.profileButtonText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
        {/* Floating pin — draggable */}
        <Animated.View
          style={[
            styles.pinFloating,
            { transform: [...pinPan.getTranslateTransform(), { scale: pinScale }] },
            pinMode && styles.pinToggleActive,
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity onPress={() => { if (!movedRef.current) setPinMode(p => !p); }} activeOpacity={0.9}>
            <Icon name="pin" type="material-community" color={pinMode ? '#fff' : '#0DCAF0'} />
          </TouchableOpacity>
        </Animated.View>

        {/* Pending button shows only when there are queued trip_request items */}
        {hasPendingTrips && (
          <TouchableOpacity
            style={styles.debugPendingBtn}
            onPress={() => navigation.navigate('PendingRequests')}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Pending</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topContainer: {
    zIndex: 2,
  },
  whiteBox: {
    backgroundColor: colors.white,
    padding: 100,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
  },
  // contentContainer: {
  //   flex: 1,
  //   alignItems: "center",
  // },
  backButton: {
    padding: 10,
  },
  backButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestText: {
    fontSize: 18,
    color: colors.grey1,
    marginLeft: 8,
    fontWeight: "bold",
  },
  inputContainer: {
    position: "absolute",
    left: 10,
    right: 10,
    zIndex: 10,
  },
  arrowButton: {
    backgroundColor: "#6200ee",
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 20,
    right: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
  },
  view1: {
    position: "absolute",
    top: 10,
    left: 12,
    backgroundColor: colors.white,
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    zIndex: 10,
  },
  view2: {
    height: SCREEN_HEIGHT * 0.21,
    alignItems: "center",
    zIndex: 5,
    backgroundColor: colors.white,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  clearButton: {
    position: "absolute",
    top: 10,
    right: 10,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  clearButton1: {
    position: "absolute",
    top: 65,
    right: 10,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  locationButton: {
    backgroundColor: "#0DCAF0",
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "start",
    right: 40,
    position: "absolute",
  },
  profilePictureContainer: {
    position: "absolute",
    top: 25,
    right: 12,
    backgroundColor: colors.white,
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    zIndex: 10,
  },
  pinToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0DCAF0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 8,
  },
  pinToggleActive: {
    backgroundColor: '#0DCAF0',
    borderColor: '#0DCAF0',
  },
  pinActionBar: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  pinActionInner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cancelPinButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelPinText: {
    color: '#374151',
    fontWeight: '600',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  offlineText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 13,
  },
  profilePicture: {
    height: 40,
    width: 40,
    borderRadius: 20,
  },
  header: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 100,
  },
  roundButton: {
    backgroundColor: "#fff",
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: '#0DCAF0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#0DCAF0',
  },
  profileImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#ccc", // fallback background
    borderWidth: 2,
    borderColor: "#fff",
  },

  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF6B6B",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  profileBanner: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginHorizontal: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 12,
  },
  modalText: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  laterButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  laterButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
  profileButton2: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: "#0DCAF0",
    alignItems: "center",
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  profileButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pinFloating: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#0DCAF0',
  },
  debugPendingBtn: {
    position: 'absolute',
    bottom: 60,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#111827',
    zIndex: 1100,
    elevation: 8,
  },
  recentContainer: {
    position: 'absolute',
    top: 205,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  recentHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0DCAF0',
    marginBottom: 8,
  },
  recentList: {
    paddingVertical: 6,
  },
  recentChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  recentChipText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
})

const autoCompleteStyles = {
  container: {
    flex: 0,
    marginBottom: 10,
  },
  textInputContainer: {
    borderRadius: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    height: 40,
    color: "#5d5d5d",
    textAlign: "left",
    fontSize: 16,
    backgroundColor: colors.white,
    borderRadius: 5,
    paddingRight: 87,
  },
  listView: {
    backgroundColor: "#ffffff",
    position: "absolute",
    top: 50,
    borderRadius: 8,
    marginTop: 5,
    elevation: 20,
    zIndex: 3000,
  },
  inputStackContainer: {
    marginTop: 90,
  },
  draggingIndicator: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  draggingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
}