"use client"

import { useContext, useState, useEffect, useRef } from "react"
import { StyleSheet, View, Dimensions, TouchableOpacity, Text, Modal, Image } from "react-native"
import MapComponent from "../components/MapComponent"
import { colors } from "../global/styles"
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef
} from "react-native-google-places-autocomplete"
import { GOOGLE_MAPS_APIKEY } from "@env"
import { DestinationContext, OriginContext } from "../contexts/contexts"
import * as Location from "expo-location"
import { Icon } from "react-native-elements"
import { SafeAreaView } from "react-native-safe-area-context"
import { useSelector, useDispatch } from "react-redux"
import CustomDrawer from "../components/CustomDrawer"
import axios from "axios"
import { api } from "../../api"
import { LinearGradient } from "expo-linear-gradient"
import { setUser } from "../redux/actions/authActions" // Import the action to update user in Redux
import LoadingState from "../components/LoadingState"

const SCREEN_HEIGHT = Dimensions.get("window").height
const FETCH_INTERVAL = 30000 // Fetch customer code every 30 seconds
const MAX_DISTANCE_KM = 200 // Maximum allowed distance in kilometers

export default function RequestScreen({ navigation }) {
  const user = useSelector((state) => state.auth.user)
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

  const getCurrentLocation = async () => {
    // if (locationFetched) return
    // setLocationFetched(true)

    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      console.log("Permission Status:", status)
      if (status !== "granted") {
        return
      }

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      })

      if (coords) {
        const { latitude, longitude } = coords

        const addressArray = await Location.reverseGeocodeAsync({ latitude, longitude })

        if (addressArray.length > 0) {
          const address = `${addressArray[0].name}, ${addressArray[0].street}, ${addressArray[0].city}, ${addressArray[0].region}, ${addressArray[0].country}`

          setCurrentAddress(address);

          if (originRef.current) {
            originRef.current.setAddressText(address)
          }

          dispatchOrigin({
            type: "ADD_ORIGIN",
            payload: { latitude, longitude, address },
          })
        }
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
  }, []);

  useEffect(() => {
    if (destination?.latitude && destination?.longitude) {
      // Check if user has a customer code before allowing navigation
      if (!customerCode) {
        setShowProfileAlert(true)
        return
      }

      // Check if distance is within allowed limit
      if (!checkDistanceLimit(origin, destination)) {
        setShowDistanceAlert(true)
        dispatchDestination({ type: "RESET_DESTINATION" })
        setDestination(false)
        return
      }

      navigation.navigate("CarListingBottomSheet")
    }
  }, [destination?.latitude, destination?.longitude])

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

if(isLoading) {
  return (
    <View style={styles.contentContainer}>
      <LoadingState  />
    </View>
  )
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

              {/* Right: Profile picture */}
              <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileButton}>
                <Image
                  source={{ uri: user?.profile_picture || 'https://via.placeholder.com/50' }}
                  style={styles.profileImage}
                />
              </TouchableOpacity>
            </View>


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
                onPress={(data, details = null) => {
                  console.log('Destination selected:', data, details)
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
                  }
                }}
                onFail={error => console.log('Destination autocomplete error:', error)}
                onNotFound={() => console.log('Destination place not found')}
                query={{
                  key: GOOGLE_MAPS_APIKEY,
                  language: "en",
                }}
                styles={autoCompleteStyles}
                nearbyPlacesAPI="GooglePlacesSearch"
              />
              <TouchableOpacity style={[styles.clearButton1]} onPress={clearDestinationAddress}>
                <Icon name="close" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <MapComponent key={mapKey} userOrigin={origin} userDestination={destination} />

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
  contentContainer: {
    flex: 1,
    alignItems: "center",
  },
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
    elevation: 3,
    zIndex: 1000,
  },
  inputStackContainer: {
    marginTop: 90,
  },
}