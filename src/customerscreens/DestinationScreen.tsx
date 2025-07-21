"use client"

import { useContext, useEffect, useState } from "react"
import { Text, View, Dimensions, TouchableOpacity, Image, TouchableWithoutFeedback, StyleSheet, Linking, Alert } from "react-native"
import { Icon } from "react-native-elements"
import { colors } from "../global/styles"
import { DestinationContext, OriginContext } from "../contexts/contexts"
import { DriverOriginContext } from "../contexts/driverContexts"
import MapComponent from "../components/MapComponent"
import axios from "axios"
import { GOOGLE_MAPS_APIKEY } from "@env"
import { SafeAreaView } from "react-native-safe-area-context"
import CustomDrawer from "../components/CustomDrawer"
import { useDispatch, useSelector } from "react-redux"
import { db, doc } from "../../FirebaseConfig"
import { onSnapshot } from "firebase/firestore"
import {
  connectSocket,
  emitTripCanceltToDrivers,
  listenToChatMessages,
  listenToDriverArrival,
  listenToTripAccepted,
  listenToTripDeclined,
  listenToTripEnded,
  listenToTripStarted,
  stopListeningToTripAccepted,
  stopListeningToTripDeclined,
} from "../configSocket/socketConfig" // Import the new functions
import TripCancelationModal from "../components/TripCancelationModal"
import { api } from "../../api"
import { setMessageData } from "../redux/actions/messageAction"
import WebView from "react-native-webview"
import CancelAlertModal from "../components/CancelAlertModal"

const SCREEN_HEIGHT = Dimensions.get("window").height
const SCREEN_WIDTH = Dimensions.get("window").width

const DestinationScreen = ({ navigation, route }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const tripData = useSelector((state) => state.trip?.tripData)
  const tripAmount = tripData.carData?.price ? Math.round(Number.parseFloat(tripData.carData.price) * 100) : 0
  //trip data from socket notification
  const [tripDataSocket, setTripData] = useState(null)
  // console.log("===================and trip data", tripData)
  // driver id from trip data
  const driver_id = tripData?.driver_id
  // console.log("trip data6666666666666666", driver_id);
  const user_id = useSelector((state) => state.auth?.user.user_id)
  const userEmail = useSelector((state) => state.auth?.user.email)
  const dispatch = useDispatch()
  const trip_id = useSelector((state) => state.trip.tripData?.tripId || "")
  // console.log("trip_id222222222222", trip_id)

  // Payment status from navigation params
  const [paymentStatus, setPaymentStatus] = useState(null)

  // Check for payment status from navigation params
  useEffect(() => {
    if (route.params?.paymentStatus) {
      setPaymentStatus(route.params.paymentStatus)

      // Show appropriate message based on payment status
      if (route.params.paymentStatus === "success") {
        alert("Payment successful! Enjoy your trip.")
      } else if (route.params.paymentStatus === "cancelled") {
        alert("Payment cancelled. You can still complete your trip.")
      } else if (route.params.paymentStatus === "error") {
        alert(`Payment error: ${route.params.paymentError || "Unknown error"}`)
      }

      // Clear the params to prevent showing the alert again on screen focus
      navigation.setParams({ paymentStatus: null })
    }
  }, [route.params])

  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  const { originDriver = {} } = useContext(DriverOriginContext)
  const { origin = {} } = useContext(OriginContext)
  const { destination = {} } = useContext(DestinationContext)
  console.log("DestinationScreen destination*************************:", destination);


  const [userOrigin] = useState({
    latitude: origin?.latitude || null,
    longitude: origin?.longitude || null,
  })

  const [driverLocation, setDriverLocation] = useState({
    latitude: null,
    longitude: null,
  })
  const [userDestination, setUserDestination] = useState({
    latitude: null,
    longitude: null,
  })
  const [eta, setEta] = useState(null)
  const [distance, setDistance] = useState(null)
  const [etaTrip, setEtaTrip] = useState(null)
  const [distanceTrip, setDistanceTrip] = useState(null)

  // Trip Cancellation Modal
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [notificationCountChat, setNotificationCountChat] = useState("")
  const [authorizationUrl, setAuthorizationUrl] = useState(null);
  const [tripMeta, setTripMeta] = useState({});
  const [showCancelAlert, setShowCancelAlert] = useState(false)

  const handleCancelTrip = () => {
    setCancelModalVisible(true) // Show cancellation modal
  }

  const handleCancel = async (reason) => {
    setCancelReason(reason)
    // console.log("Trip Cancelled for reason:", reason);

    // Assuming you have the tripId, cancel_by (user ID or admin), and distance_traveled (if applicable)
    const tripId = tripData?.tripId // Replace with the actual trip ID you want to cancel
    const distanceTraveled = distanceTrip || null // Replace with the actual distance if relevant

    try {
      const response = await fetch(`${api}trips/${tripId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "canceled",
          cancellation_reason: reason,
          cancel_by: "customer",
          distance_traveled: distanceTraveled,
        }),
      })

      if (response.status === 200) {
        // console.log('Trip status updated:', await response.json());
        emitTripCanceltToDrivers(tripData, driver_id) // Emit trip cancellation to drivers
        stopListeningToTripAccepted()
        stopListeningToTripDeclined()

        navigation.navigate("RequestScreen")
      } else if (response.status === 404) {
        console.error("Trip not found:", await response.json())
        // Handle trip not found error here, e.g., display a message to the user
        alert("The trip does not exist or has been removed.")
      } else {
        console.log("Trip status not updated:", await response.json())
      }
    } catch (error) {
      console.error("Error canceling the trip:", error)
    }
  }

  const handleCloseModal = () => {
    setCancelModalVisible(false) // Close modal
  }

  const [customerCode, setCustomerCode] = useState(null)

  // Fetch customer code when trip is started for payments
  const fetchCustomerCode = async () => {
    try {
      const response = await axios.get(`${api}user/${user_id}/customer-code`)
      if (response.data && response.data.customer_code) {
        setCustomerCode(response.data.customer_code)
        return response.data.customer_code
      } else {
        console.error("No customer code found in response:", response.data)
        alert("Please complete your profile before making payments.")
        return null
      }
    } catch (error) {
      console.error("Error fetching customer code:", error)
      alert("There was an error processing your payment. Please try again.")
      return null
    }
  }

  // Socket.IO state if accepted/cancelled/started/ended
  const [tripStatus, setTripStatus] = useState("")

  // Socket.IO state if accepted/cancelled/started/ended functions
  useEffect(() => {
    // Connect the customer socket
    connectSocket(user_id, "customer")

    // Listen for when the trip is accepted
    listenToTripAccepted((data) => {
      // console.log("✅ Trip accepted:", data);
      // alert(`Your trip has been accepted! Trip ID: ${data.tripId}`);
      setTripStatus("accepted")
      setTripData(data)
    })

    // Listen for when the driver has arrived
    listenToDriverArrival((data) => {
      console.log("✅ Trip arrived:", data)
      // alert(`Your driver has arrived! Trip ID: ${data.tripId}`);
      setTripStatus("arrived")
    })


    // listener runs when trip starts
    listenToTripStarted((data) => {
      setTripStatus("started");
      alert(`Your trip has been started! Trip ID: ${data.tripId}`);
      console.log("Trip started data^^^^^^^^^^^^^^^^^^^^^^^^:", data);

      if (destination?.latitude && destination?.longitude) {
        setUserDestination({
          latitude: destination.latitude,
          longitude: destination.longitude,
        });
      } else {
        console.warn("Destination from context is not ready or incomplete");
      }
    });

    // Listen for when the trip is ended
    // Listen for when the trip is ended
    listenToTripEnded((data) => {
      console.log("Trip ended data:", data); // logs the whole object
      // console.log("Trip ID:", data?.tripId);
      // console.log("Driver ID'''''''':", data?.driver_id);

      // alert(`Your trip has ended! Trip ID: ${data.tripId}`);
      setTripStatus("ended");

      // Navigate to RideRatingScreen
      navigation.navigate("RideRatingScreen", {
        tripId: data.tripId,
        driverId: data.driver_id, // if needed for the rating
        userId: user_id
      });
    });



    // Listen for when the trip is declined
    listenToTripDeclined((data) => {
      console.log("❌ Trip declined:", data)
      // alert(`Your trip has been declined! Trip ID: ${data.tripId}`);
      setTripStatus("declined")
    })

    listenToChatMessages((messageData) => {
      setNotificationCountChat((prevCount) => prevCount + 1)
      dispatch(
        setMessageData({
          message: messageData.message,
        }),
      )
    })

    // Cleanup on component unmount
    return () => {
      stopListeningToTripAccepted()
      stopListeningToTripDeclined()
    }
  }, [user_id])

  // Fetch trip statuses
  const [tripStatusAccepted, setTripStatusAccepted] = useState(null)
  useEffect(() => {
    const fetchTripStatuses = async () => {
      if (!user_id) return

      try {
        const response = await axios.get(`${api}trips/statuses/${user_id}`)
        if (response.status === 200) {
          const latestTripStatus = response.data.latestTrip?.statuses
          setTripStatusAccepted(latestTripStatus)

          // If the trip status is "canceled", set driverLocation to null
          if (latestTripStatus === "canceled") {
            setDriverLocation({
              latitude: null,
              longitude: null,
            })
          }
        }
      } catch (error) {
        console.error("⚠️ Error fetching trip statuses:", error)
      }
    }

    fetchTripStatuses()
    const intervalId = setInterval(fetchTripStatuses, 5000) // Fetch every 5 seconds

    return () => clearInterval(intervalId) // Cleanup interval on unmount
  }, [user_id, api])

  // hndle payment initiation and trip status changes
  useEffect(() => {
    if (tripStatusAccepted === "canceled") {
      // Alert.alert("Trip cancelled", "Choose a different driver.");

      navigation.navigate("RequestScreen", { driverId: driver_id });

      setTimeout(() => {
        navigation.navigate("CarListingBottomSheet", { driverId: driver_id });
        setShowCancelAlert(true);
      }, 100);

      stopListeningToTripAccepted();
      stopListeningToTripDeclined();
    }

    if (
      tripStatusAccepted === "on-going" &&
      driver_id &&
      !paymentStatus &&
      tripData?.paymentType === "Credit Card"
    ) {
      console.log("Trip is ongoing, checking payment status...");

      const checkAndInitiatePayment = async () => {
        const code = await fetchCustomerCode();
        if (code && tripAmount > 0) {
          console.log(`Initiating payment: ${tripAmount} ZAR`);

          try {
            const response = await fetch(api + "initialize-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: userEmail,
                amount: tripAmount,
                user_id: user_id,
                driverId: driver_id,
              }),
            });

            const data = await response.json();
            console.log("Backend init response:", data);

            if (data.charged) {
              // ✅ Payment was automatically charged!
              Alert.alert("Payment Success", "Your saved card was charged successfully.");
              setPaymentStatus("success"); // Update your payment status
              setTripMeta({
                tripId: tripData?.tripId,
                driverName: tripData?.driverName || "Your Driver",
                tripDistance: distanceTrip,
                tripDuration: etaTrip,
              });
              // Optionally navigate or update UI here
            } else if (data.data?.authorization_url) {
              // ✅ New payment → need to open WebView
              console.log("Redirecting user to Paystack WebView...");
              setTripMeta({
                tripId: tripData?.tripId,
                driverName: tripData?.driverName || "Your Driver",
                tripDistance: distanceTrip,
                tripDuration: etaTrip,
              });
              setAuthorizationUrl(data.data.authorization_url);
            } else {
              Alert.alert("Error", "Failed to initialize or charge payment.");
            }
          } catch (err) {
            console.error("Payment init error:", err.message);
            Alert.alert("Error", "Something went wrong while processing payment.");
          }
        }
      };

      checkAndInitiatePayment();
    }
  }, [tripStatusAccepted]);




  // Fetch driver location from firestore according to trip status
  useEffect(() => {
    if (tripStatusAccepted === "accepted" && driver_id) {
      const driverDocRef = doc(db, "driver_locations", String(driver_id))
      const unsubscribe = onSnapshot(
        driverDocRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() || {} // Ensure data is always an object
            // console.log("🚗 Driver location updated:", data);

            if (!data.latitude || !data.longitude) {
              console.warn("⚠️ Missing latitude or longitude in Firestore data", data)
              return
            }

            setDriverLocation((prev) => ({
              latitude: data.latitude ?? prev.latitude,
              longitude: data.longitude ?? prev.longitude,
              // timestamp: data.timestamp ?? prev.timestamp,
            }))
          } else {
            console.warn("❌ No driver location found in Firestore.")
          }
        },
        (error) => {
          console.error("🔥 Error fetching driver location:", error)
        },
      )

      return () => {
        // console.log(`Unsubscribing from driver ${driver_id} location updates.`);
        unsubscribe()
      }
    }
  }, [tripStatusAccepted, driver_id])

  // **Fetch Route Details(distance and time) for User and driverLocation**
  useEffect(() => {
    const fetchRouteDetails = async () => {
      if (!userOrigin.latitude || !driverLocation.latitude) return

      try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/directions/json`, {
          params: {
            origin: `${userOrigin.latitude},${userOrigin.longitude}`,
            destination: `${driverLocation.latitude},${driverLocation.longitude}`,
            key: GOOGLE_MAPS_APIKEY,
          },
        })

        const firstRoute = response.data?.routes?.[0]
        const firstLeg = firstRoute?.legs?.[0]

        if (firstLeg) {
          setEta(firstLeg.duration?.text || "N/A")
          setDistance(firstLeg.distance?.text || "N/A")
        }
      } catch (error) {
        console.error("Error fetching route details:", error)
      }
    }

    fetchRouteDetails()
  }, [userOrigin, driverLocation])

  // **Fetch Route Details(distance and destination araival time) for User and Destination**
  useEffect(() => {
    const fetchRouteDetails = async () => {
      try {
        if (!userOrigin.latitude || !destination.latitude) return

        const responseDestination = await axios.get(`https://maps.googleapis.com/maps/api/directions/json`, {
          params: {
            origin: `${userOrigin.latitude},${userOrigin.longitude}`,
            destination: `${destination.latitude},${destination.longitude}`,
            key: GOOGLE_MAPS_APIKEY,
          },
        })

        const firstRouteDestination = responseDestination.data?.routes?.[0]
        const firstLegDestination = firstRouteDestination?.legs?.[0]

        if (firstLegDestination) {
          setEtaTrip(firstLegDestination.duration?.text || "N/A")
          setDistanceTrip(firstLegDestination.distance?.text || "N/A")
        }
      } catch (error) {
        console.error("Error fetching route details:", error)
      }
    }

    fetchRouteDetails()
  }, [userOrigin, destination])

  // view driver details
  const handleNavigation = () => {
    if (destination?.latitude && destination?.longitude && tripData) {
      navigation.navigate("DriverInfoBottomSheet", {
        durationReacheds: true,
        driver_id: String(driver_id || ""),
        tripStatusAccepted: tripStatusAccepted,
      })
    }
  }


  if (authorizationUrl) {
    return (
      <WebView
        source={{ uri: authorizationUrl }}
        onNavigationStateChange={(navState) => {
          if (navState.url.includes("PaymentSuccess")) {
            const urlParams = new URLSearchParams(navState.url.split("?")[1]);
            const reference = urlParams.get("reference");

            if (reference) {
              setAuthorizationUrl(null);
              navigation.navigate("PaymentSuccess", {
                ...tripMeta,
                reference,
                userId: user_id,
              });
            }
          } else if (navState.url.includes("payment-error")) {
            setAuthorizationUrl(null);
            Alert.alert("Payment Failed", "Something went wrong during payment.");
          }
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => drawerOpen && setDrawerOpen(false)}>
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={toggleDrawer} style={styles.roundButton}>
              <Icon type="material-community" name="menu" color={colors.black} size={30} />
            </TouchableOpacity>
          </View>

          {tripStatus === "accepted" || tripStatus === "arrived" && (
            <TouchableOpacity
              style={styles.profilePictureContainer}
              onPress={() => navigation.navigate("DriverCommunicationBottomSheet")}
            >
              <Image source={require("../../assets/call.png")} style={styles.profilePicture} />
            </TouchableOpacity>
          )}
          {/* Cancel Trip Icon positioned below the call button */}
          {tripStatus !== "started" && (
            < TouchableOpacity
              style={[styles.profilePictureContainer, styles.cancelButtonContainer]}
              onPress={handleCancelTrip}
            >
              <Icon name="cancel" color="#0DCAF0" size={30} /> {/* Cancel Icon */}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.rectangleButton} onPress={handleNavigation}>
            <Text style={styles.buttonText}>View Driver</Text>
          </TouchableOpacity>

          {/* Trip Cancellation Modal */}
          <TripCancelationModal isVisible={cancelModalVisible} onClose={handleCloseModal} onCancel={handleCancel} />
          {tripData?.driver_id && (
            <MapComponent
              driverLocation={driverLocation}
              // driverId={String(tripData.driver_id)}
              userOrigin={userOrigin}
              userDestination={userDestination}
            />
          )}
        </View>
      </TouchableWithoutFeedback>
      {drawerOpen && <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />}
      <CancelAlertModal
        visible={showCancelAlert}
        message="Trip was cancelled."
        onClose={() => setShowCancelAlert(false)}
      />
    </SafeAreaView >
  )
}

// Add the missing styles object
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    position: "absolute",
    top: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 10,
  },
  roundButton: {
    width: 40,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  profilePictureContainer: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  cancelButtonContainer: {
    top: 100, // Position below the call button
  },
  profilePicture: {
    width: 30,
    height: 30,
    resizeMode: "contain",
  },
  rectangleButton: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#0DCAF0",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default DestinationScreen
