"use client"
import { useContext, useEffect, useState } from "react"
import {
  Pressable,
  StyleSheet,
  Image,
  Alert,
  View,
  Text,
  Animated,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { DestinationContext, OriginContext } from "../contexts/contexts"
import { DriverOriginContext } from "../contexts/driverContexts"
import axios from "axios"
import { useSelector } from "react-redux"
import { useDispatch } from "react-redux"
import { setTripData } from "../redux/actions/tripActions"
import { api } from "../../api"
import { BASE_URL } from "../../api"
import { connectSocket, emitTripRequestToDrivers } from "../configSocket/socketConfig"
import { LinearGradient } from "expo-linear-gradient"
import { Icon } from "react-native-elements"

const { width, height } = Dimensions.get("window")

const DriverDetailsBottomSheet = ({ navigation, route }) => {
  const { dispatchDestination } = useContext(DestinationContext)
  const { dispatchOrigin } = useContext(DriverOriginContext)
  const user_id = useSelector((state) => state.auth.user?.user_id || "")
  const distanceTrip = useSelector((state) => state.location?.distance || "")
  const insets = useSafeAreaInsets()

  const carData = route.params || {}
  console.log("Car Data in DriverDetailsBottomSheet:", carData.carData);
  

  const { id, driverName, price, ETA, driverPhoto, classType, driverState, driverStatus } = carData
  const role = carData.carData.driverGender
  const isFemale = role === 'female';

  const { origin } = useContext(OriginContext)
  const { destination } = useContext(DestinationContext)
  const dispatch = useDispatch()
  const [isBlurVisible, setIsBlurVisible] = useState(true)
  const [slideAnim] = useState(new Animated.Value(height))
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Cash")
  const [lastFourDigits, setLastFourDigits] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Calculate responsive height based on screen size and safe area
  const getBottomSheetHeight = () => {
    const minHeight = 400
    const maxHeight = height * 0.85
    const safeHeight = height - insets.top - insets.bottom
    return Math.min(Math.max(safeHeight * 0.75, minHeight), maxHeight)
  }

  const bottomSheetHeight = getBottomSheetHeight()

const classMap = {
  "1": "Nthome Black",
  "2": "Nthome X",
};

const displayClass = classMap[classType] || classType;


  useEffect(() => {
    const focusListener = navigation.addListener("focus", () => {
      setIsBlurVisible(true)
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start()
    })

    const blurListener = navigation.addListener("blur", () => {
      setIsBlurVisible(false)
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start()
    })

    return () => {
      focusListener()
      blurListener()
    }
  }, [navigation, slideAnim])

  const formatETA = (etaMinutes) => {
    if (etaMinutes >= 90) {
      const hours = Math.floor(etaMinutes / 60)
      const minutes = Math.round(etaMinutes % 60)
      return `${hours}h ${minutes}min`
    } else {
      return `${Math.round(etaMinutes)} min`
    }
  }

  const formattedETA = formatETA(ETA)

  const extractedData = {
    customerId: user_id,
    driverId: carData.id,
    requestDate: new Date().toISOString(),
    currentDate: new Date().toISOString(),
    pickUpLocation: origin?.address ?? "none",
    dropOffLocation: destination?.address ?? "none",
    driverState: driverState || [],
    driverStatus: driverStatus || [],
    customer_rating: carData.driverRating || 0,
    customer_feedback: null,
    duration_minutes: carData.ETA ?? 0,
    vehicle_type: carData.classType || "Unknown",
    distance_traveled: distanceTrip || null,
    cancellation_reason: null,
    cancel_by: null,
    pickupTime: null,
    dropOffTime: null,
    pickUpCoordinates: {
      latitude: origin?.latitude ?? null,
      longitude: origin?.longitude ?? null,
      address: origin?.address ?? "Unknown",
    },
    dropOffCoordinates: {
      latitude: destination?.latitude ?? null,
      longitude: destination?.longitude ?? null,
      address: destination?.address ?? "Unknown",
    },
    payment_status: "pending",
    statuses: "pending",
  }

  const userType = "customer"
  useEffect(() => {
    connectSocket(user_id, userType)
  }, [user_id, userType])

  const handleButtonClick = async () => {
    if (selectedPaymentMethod) {
      setIsLoading(true)
      try {
        let tripData = {
          driver_id: extractedData.driverId,
          paymentType: selectedPaymentMethod,
          amount: carData.price,
          requestDate: extractedData.requestDate,
          tripData: extractedData,
          carData: carData,
          user_id: user_id,
          driverStatus: driverStatus,
        }

        const tripResponse = await axios.post(`${api}trips`, tripData, {
          timeout: 60000,
        })

        tripData = {
          ...tripData,
          tripId: tripResponse.data.tripId,
        }

        const paymentData = {
          paymentType: selectedPaymentMethod,
          amount: carData.price,
          paymentDate: extractedData.requestDate,
          tripId: tripResponse.data.tripId,
          user_id: user_id,
        }

        // if (selectedPaymentMethod === "Cash") {
          await axios.post(api + "payment", paymentData)
        // }

        emitTripRequestToDrivers(tripData, extractedData.driverId)
        dispatch(setTripData(tripData))
        navigation.navigate("TripLoadingResponse", {tripId: tripResponse.data.tripId})
      } catch (error) {
        console.error("Error saving trip data:", error)
        Alert.alert("Error", "Failed to save trip data.")
      } finally {
        setIsLoading(false)
      }
    } else {
      Alert.alert("Error", "Please select a payment method.")
    }
  }

  const paymentImages = {
    Cash: require("../../assets/money.png"),
    "Credit Card": require("../../assets/mastercard.png"),
  }

  const imageUri = carData.driverPhoto
    ? carData.driverPhoto
    : require("../../assets/placeholder.jpg")


  const [driverRating, setDriverRating] = useState(null)
  const driver_id = extractedData.driverId || ""

  // Fetch driver rating from the server
useEffect(() => {
  const fetchDriverRating = async () => {
    try {
      const res = await axios.get(`${api}/allTrips`, {
        params: { driverId: driver_id },
      });

      const trips = res.data?.data; // <-- access the array inside 'data'

      if (!Array.isArray(trips)) {
        console.error("Expected trips to be an array, got:", trips);
        setDriverRating(null);
        return;
      }

      // Filter out null ratings
      const ratedTrips = trips.filter(trip => trip.driver_ratings !== null);


      if (ratedTrips.length > 0) {
        const total = ratedTrips.reduce((sum, trip) => sum + parseFloat(trip.driver_ratings), 0);
        const avg = total / ratedTrips.length;
        setDriverRating(avg);
      } else {
        setDriverRating(null);
      }

    } catch (err) {
      console.error("Error fetching driver rating:", err);
      setDriverRating(null);
    }
  };

  fetchDriverRating();
}, [driver_id]);


  // Function to render stars based on rating
  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const halfStar = rating - fullStars >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Icon key={i} name="star" type="material-community" size={16} color="#FFD700" />)
      } else if (i === fullStars && halfStar) {
        stars.push(<Icon key={i} name="star-half" type="material-community" size={16} color="#FFD700" />)
      } else {
        stars.push(<Icon key={i} name="star-outline" type="material-community" size={16} color="#FFD700" />)
      }
    }

    return (
      <View style={styles.starsContainer}>
        {stars}
        <Text style={styles.ratingText}>{isNaN(carData.carData?.driverRating) ? "N/A" : Number(carData.carData?.driverRating).toFixed(1)}</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => navigation.navigate("CarListingBottomSheet")} style={styles.overlay} />

      {isBlurVisible && (
        <Animated.View style={[styles.bottomSheet, {
          transform: [{ translateY: slideAnim }],
          height: bottomSheetHeight,
          maxHeight: height * 0.9
        }]}>
          <LinearGradient
            colors={isFemale ? ["#FFFFFF", "#FFE5EB"] : ["#FFFFFF", "#F8FBFD"]}
            style={styles.gradientBackground}
          >
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            <View style={styles.headerContainer}>
              <Text style={styles.headerText}>Driver Details</Text>
              <Pressable onPress={() => navigation.navigate("RequestScreen")} style={styles.cancelButton}>
                <Icon name="close" type="material-community" size={24} color="#FF3B30" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
            // showsVerticalScrollIndicator={false}
            // bounces={false}
            >
              <View style={[
                styles.driverInfoContainer,
                isFemale && styles.femaleDriverInfoContainer
              ]}>
                <View style={styles.driverImageContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={[
                      styles.driverImage,
                      isFemale && styles.femaleDriverImage
                    ]}
                  />
                  <View style={[
                    styles.statusIndicator
                  ]} />
                </View>

                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{driverName}</Text>

                  {renderStars(carData.carData?.driverRating)}

                  <View style={styles.vehicleInfo}>
                    <Icon name="car" type="material-community" size={16} color="#0DCAF0" />
                    <Text style={styles.vehicleText}>{displayClass || "Standard"}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tripInfoContainer}>
                <View style={styles.tripInfoItem}>
                  <Icon name="cash" type="material-community" size={20} color="#0DCAF0" />
                  <Text style={styles.tripInfoLabel}>Price</Text>
                  <Text style={styles.tripInfoValue}>R{price}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.tripInfoItem}>
                  <Icon name="clock-outline" type="material-community" size={20} color="#0DCAF0" />
                  <Text style={styles.tripInfoLabel}>ETA</Text>
                  <Text style={styles.tripInfoValue}>{formattedETA}</Text>
                </View>
              </View>

              <View style={[
                styles.paymentSection,
                isFemale && styles.femalePaymentSection
              ]}>
                <Text style={styles.sectionTitle}>Payment Method</Text>

                <View style={styles.paymentOptions}>
                  <Pressable
                    style={[styles.paymentOption, selectedPaymentMethod === "Cash" && styles.selectedPaymentOption]}
                    onPress={() => setSelectedPaymentMethod("Cash")}
                  >
                    <Image source={paymentImages["Cash"]} style={styles.paymentImage} />
                    <Text style={styles.paymentText}>Cash</Text>
                    {selectedPaymentMethod === "Cash" && (
                      <Icon name="check-circle" type="material-community" size={20} color="#0DCAF0" />
                    )}
                  </Pressable>

                  <Pressable
                    style={[
                      styles.paymentOption,
                      selectedPaymentMethod === "Credit Card" && styles.selectedPaymentOption,
                    ]}
                    onPress={() => setSelectedPaymentMethod("Credit Card")}
                  >
                    <Image source={paymentImages["Credit Card"]} style={styles.paymentImage} />
                    <View style={styles.cardDetails}>
                      <Text style={styles.paymentText}>Credit Card</Text>
                      {selectedPaymentMethod === "Credit Card" && lastFourDigits && (
                        <Text style={styles.cardInfo}>**** {lastFourDigits}</Text>
                      )}
                    </View>
                    {selectedPaymentMethod === "Credit Card" && (
                      <Icon name="check-circle" type="material-community" size={20} color="#0DCAF0" />
                    )}
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  isFemale && styles.femaleConfirmButton
                ]}
                onPress={handleButtonClick}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="check-circle" type="material-community" size={20} color="#FFFFFF" />
                    <Text style={styles.confirmText}>Confirm Pickup</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      )}
    </SafeAreaView>
  )
}

export default DriverDetailsBottomSheet

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlay: {
    flex: 1,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  gradientBackground: {
    flex: 1,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  driverInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  driverImageContainer: {
    position: "relative",
    marginRight: 16,
  },
  driverImage: {
    width: width < 375 ? 60 : 70,
    height: width < 375 ? 60 : 70,
    borderRadius: width < 375 ? 30 : 35,
    borderWidth: 2,
    borderColor: "#0DCAF0",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: width < 375 ? 16 : 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#64748B",
  },
  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#64748B",
  },
  tripInfoContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  tripInfoItem: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 10,
  },
  tripInfoLabel: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  tripInfoValue: {
    fontSize: width < 375 ? 16 : 18,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 2,
  },
  paymentSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },
  paymentOptions: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    minHeight: 60,
  },
  selectedPaymentOption: {
    backgroundColor: "rgba(13, 202, 240, 0.05)",
  },
  paymentImage: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  paymentText: {
    flex: 1,
    fontSize: 16,
    color: "#0F172A",
  },
  cardDetails: {
    flex: 1,
  },
  cardInfo: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
  },

  femaleDriverInfoContainer: {
    backgroundColor: '#FFF0F5',
    shadowColor: '#FF69B4',
  },
  femaleDriverImage: {
    borderColor: '#FF69B4',
  },
  femalePaymentSection: {
    backgroundColor: '#FFF0F5',
  },
  femaleConfirmButton: {
    backgroundColor: '#FF69B4',
    shadowColor: '#FF69B4',
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0DCAF0",
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 56,
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
})