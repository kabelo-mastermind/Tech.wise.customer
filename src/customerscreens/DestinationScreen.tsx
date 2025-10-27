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
import { onSnapshot, Timestamp } from "firebase/firestore"
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
import { addMessage, clearMessages } from "../redux/actions/messageAction"
import WebView from "react-native-webview"
import CancelAlertModal from "../components/CancelAlertModal"
import { showToast } from "../constants/showToast"

const SCREEN_HEIGHT = Dimensions.get("window").height
const SCREEN_WIDTH = Dimensions.get("window").width

const DestinationScreen = ({ navigation, route }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const tripData = useSelector((state) => state.trip?.tripData)
  const tripAmount = tripData.carData?.price ? Math.round(Number.parseFloat(tripData.carData.price) * 100) : 0

  const [tripDataSocket, setTripData] = useState(null)
  const driver_id = tripData?.driver_id
  const user_id = useSelector((state) => state.auth?.user.user_id)
  const user_name = useSelector((state) => state.auth?.user.name)
  const userEmail = useSelector((state) => state.auth?.user.email)
  const dispatch = useDispatch()
  const trip_id = useSelector((state) => state.trip.tripData?.tripId || "")

  // Payment status from navigation params
  const [paymentStatus, setPaymentStatus] = useState(null)

  // Check for payment status from navigation params
  useEffect(() => {
    if (route.params?.paymentStatus) {
      setPaymentStatus(route.params.paymentStatus)

      // Show appropriate message based on payment status
      if (route.params.paymentStatus === "success") {
        showToast("success", "Payment Successful", "Enjoy your trip.");
      } else if (route.params.paymentStatus === "cancelled") {
        showToast("info", "Payment Cancelled", "You cannot complete your trip.");
      } else if (route.params.paymentStatus === "error") {
        showToast("error", "Payment Error", route.params.paymentError || "Unknown error.");
      }


      // Clear the params to prevent showing the alert again on screen focus
      navigation.setParams({ paymentStatus: null })
    }
  }, [route.params])

  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  const { originDriver = {} } = useContext(DriverOriginContext)
  const { origin = {} } = useContext(OriginContext)
  const { destination = {} } = useContext(DestinationContext)
  console.log("DestinationScreen destination*************************:", tripData);

  const [userOrigin] = useState({
    latitude: origin?.latitude || tripData?.pickUpCoordinates?.latitude || null,
    longitude: origin?.longitude || tripData?.pickUpCoordinates?.longitude || null,
  })

  // FIXED: Initialize userDestination properly
  const [userDestination, setUserDestination] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)
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
  const [startedTrip, setStartedTrip] = useState(false)

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c * 1000; // ✅ distance in meters
    return distance;
  };



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
        showToast("error", "Trip Not Found", "The trip does not exist or has been removed.");
      } else {
        console.log("Trip status not updated:", await response.json())
      }
    } catch (error) {
      console.error("Error canceling the trip:", error)
      showToast("error", "Trip Not Found", "The trip does not exist or has been removed.");
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
        showToast("info", "Profile Incomplete", "Please complete your profile before making payments.");
        return null
      }
    } catch (error) {
      console.error("Error fetching customer code:", error)
      showToast("error", "Payment Error", "There was an error processing your payment. Please try again.");
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
      showToast("success", "Trip Accepted", "Your trip has been accepted!");
      setTripStatus("accepted")
      setTripData(data)
      dispatch({
        type: 'SET_TRIP_DATA',
        payload: { status: 'accepted' }
      });
    })

    // Listen for when the driver has arrived
    listenToDriverArrival((data) => {
      console.log("✅ Trip arrived:", data)
      // alert(`Your driver has arrived! Trip ID: ${data.tripId}`);
      setTripStatus("arrived")
    })


    // listener runs when trip starts
    listenToTripStarted((data) => {
      setTripStatus("started")
      setStartedTrip(true)
      showToast("info", "Trip Started", "Your trip has been started!")
      console.log("Trip started data:", data)

      const newDestination = destination?.latitude && destination?.longitude
        ? {
          latitude: destination.latitude,
          longitude: destination.longitude,
        }
        : data?.dropOffCoordinates?.latitude && data?.dropOffCoordinates?.longitude
          ? {
            latitude: data.dropOffCoordinates.latitude,
            longitude: data.dropOffCoordinates.longitude,
          }
          : userDestination

      if (newDestination) {
        console.log("Setting destination on trip start:", newDestination)
        setUserDestination(newDestination)
      }

      dispatch({
        type: 'SET_TRIP_DATA',
        payload: { status: 'on-going' }
      })
    })


    // Listen for when the trip is ended
    // Listen for when the trip is ended
    listenToTripEnded((data) => {
      console.log("Trip ended data:", data); // logs the whole object
      setStartedTrip(false)

      showToast("success", "Trip Ended", "Your trip has ended!");
      setTripStatus("ended");
      dispatch({
        type: 'SET_TRIP_DATA',
        payload: { status: 'completed' }
      });
      dispatch(clearMessages())

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
      showToast("error", "Trip Declined", "Your trip has been declined!");
      setTripStatus("declined")
      dispatch({
        type: 'SET_TRIP_DATA',
        payload: { status: 'canceled' }
      });
    })

    listenToChatMessages((messageData) => {
      setNotificationCountChat((prevCount) => prevCount + 1)
      dispatch(
        addMessage({
          id: Date.now().toString(),
          message: messageData?.message,
          senderId: driver_id,
          receiverId: user_id,
          timestamp: messageData?.timestamp || Timestamp.now(),
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
  // Initialize state from tripData using useEffect
  // FIXED: Better trip status handling
  useEffect(() => {
    if (tripData?.status) {
      setTripStatusAccepted(tripData.status)

      // Set destination when trip becomes ongoing
      if (tripData.status === "on-going") {
        const newDestination = tripData?.dropOffCoordinates?.latitude && tripData?.dropOffCoordinates?.longitude
          ? {
              latitude: tripData.dropOffCoordinates.latitude,
              longitude: tripData.dropOffCoordinates.longitude,
            }
          : userDestination

        if (newDestination && !userDestination) {
          console.log("Setting destination from trip data status:", newDestination)
          setUserDestination(newDestination)
        }
      }
    }
  }, [tripData?.status, tripData?.dropOffCoordinates])

  // Fetch trip statuses every 5 seconds
  // Fetch trip statuses periodically
  useEffect(() => {
    const fetchTripStatuses = async () => {
      if (!user_id) return;

      try {
        const response = await axios.get(`${api}trips/statuses/${user_id}`);
        if (response.status === 200) {
          const latestTripStatus = response.data.latestTrip?.statuses;
          // Only update if status changed
          if (latestTripStatus !== tripStatusAccepted) {
            setTripStatusAccepted(latestTripStatus);
          }

          if (latestTripStatus === "canceled") {
            setDriverLocation({ latitude: null, longitude: null });
          }
        }
      } catch (error) {
        showToast(
          "error",
          "Error",
          "Failed to fetch trip statuses. Please try again later."
        );

      }
    };

    fetchTripStatuses();
    const intervalId = setInterval(fetchTripStatuses, 5000);
    return () => clearInterval(intervalId);
  }, [user_id, api, tripStatusAccepted]); // Added tripStatusAccepted to deps

  // hndle payment initiation and trip status changes
  useEffect(() => {
    if (tripStatusAccepted === "canceled") {
      // Alert.alert("Trip cancelled", "Choose a different driver.");

      navigation.navigate("RequestScreen", { driverId: driver_id });

      setTimeout(() => {
        navigation.navigate("CarListingBottomSheet", { driverId: driver_id });
        setShowCancelAlert(true);
      }, 100);
      dispatch(clearMessages())
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
            console.log("Backend init response from payment gateway:", data);

            if (data.charged) {
              // ✅ Payment was automatically charged!
              showToast(
                "success",
                "Payment Success",
                "Your saved card was charged successfully."
              );
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

              showToast(
                "error",
                "Error",
                "Failed to initialize or charge payment."
              );
            }
          } catch (err) {
            console.error("Payment init error:", err.message);
            showToast(
              "error",
              "Error",
              "Something went wrong while processing payment."
            );
          }
        }
      };

      checkAndInitiatePayment();
    }
  }, [tripStatusAccepted, paymentStatus, tripData]); // Proper dependencies




  // Fetch driver location from firestore according to trip status
  useEffect(() => {
    if ((tripStatusAccepted === "accepted" || tripStatusAccepted === "on-going") && driver_id) {
      const driverDocRef = doc(db, "driver_locations", String(driver_id))
      const unsubscribe = onSnapshot(
        driverDocRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() || {} // Ensure data is always an object
            // console.log("🚗 Driver location updated:", data);

            if (!data.latitude || !data.longitude) {
              showToast(
                "error",
                "Location Error",
                "Driver location data is incomplete."
              )
              return
            }

            setDriverLocation((prev) => ({
              latitude: data.latitude ?? prev.latitude,
              longitude: data.longitude ?? prev.longitude,
              // timestamp: data.timestamp ?? prev.timestamp,
            }))
          } else {
            showToast(
              "info",
              "Driver Location",
              "No driver location found yet."
            )
          }
        },
        (error) => {
          showToast(
            "error",
            "Error",
            "Failed to fetch driver location. Please try again."
          )
        },
      )

      return () => {
        // console.log(`Unsubscribing from driver ${driver_id} location updates.`);
        unsubscribe()
      }
    }
  }, [tripStatusAccepted, driver_id])

  const [hasAlerted, setHasAlerted] = useState({ nearby: false, close: false, arrived: false });

  useEffect(() => {
    if (!driverLocation?.latitude || !userOrigin?.latitude) return;

    // compute distance between driver and user origin
    const distanceMeters = calculateDistance(
      userOrigin.latitude,
      userOrigin.longitude,
      driverLocation.latitude,
      driverLocation.longitude
    );

    // store thresholds so we alert only once per stage
    setDistance(distanceMeters);

    if (distanceMeters <= 50 && !hasAlerted.arrived) {
      showToast("success", "Driver Arrived", "Your driver has arrived!");
      setHasAlerted((prev) => ({ ...prev, arrived: true }));
    } else if (distanceMeters <= 250 && !hasAlerted.close) {
      showToast("info", "Driver Close", "Your driver is almost there (250 m).");
      setHasAlerted((prev) => ({ ...prev, close: true }));
    } else if (distanceMeters <= 500 && !hasAlerted.nearby) {
      showToast("info", "Driver Nearby", "Your driver is nearby (500 m).");
      setHasAlerted((prev) => ({ ...prev, nearby: true }));
    }
  }, [driverLocation]);

  useEffect(() => {
    if (distance > 600) {
      setHasAlerted({ nearby: false, close: false, arrived: false });
    }
  }, [distance]);

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
        showToast(
          "error",
          "Error",
          "Failed to fetch route details. Please try again."
        )

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
        showToast(
          "error",
          "Error",
          "Failed to fetch route details. Please try again."
        )

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

  // FIXED: Determine when to show directions
  const shouldShowDirections = tripStatusAccepted === "on-going" && 
                              userOrigin?.latitude && 
                              userDestination?.latitude
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
            showToast(
              "error",
              "Payment Failed",
              "Something went wrong during payment."
            )
          }
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => drawerOpen && setDrawerOpen(false)}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              {/* Left button */}
              <View style={styles.iconWrapper}>
                <TouchableOpacity onPress={toggleDrawer} style={styles.roundButton}>
                  <Icon type="material-community" name="menu" color={colors.black} size={30} />
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={styles.headerTitle}>Enjoy your ride</Text>

              {/* Right button OR placeholder */}
              <View style={styles.iconWrapper}>
                {!(tripStatus === "started" || route.params?.paymentStatus === "success") && (
                  <TouchableOpacity
                    style={styles.cancelButtonContainer}
                    onPress={handleCancelTrip}
                  >
                    <Icon name="cancel" color="#0DCAF0" size={30} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          {/* Cancel Trip Icon positioned below the call button */}
          <TouchableOpacity style={styles.rectangleButton} onPress={handleNavigation}>
            <Text style={styles.buttonText}>View Driver</Text>
          </TouchableOpacity>

          {/* Trip Cancellation Modal */}
          <TripCancelationModal isVisible={cancelModalVisible} onClose={handleCloseModal} onCancel={handleCancel} />
       {tripData?.driver_id && (
            <MapComponent
              driverLocation={driverLocation}
              tripStarted={startedTrip}
              userOrigin={userOrigin}
              userDestination={userDestination}
              showDirections={shouldShowDirections} // FIXED: Added this prop
              key={`map-${userDestination?.latitude}-${userDestination?.longitude}`} // FIXED: Force re-render when destination changes
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
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingTop: 20, // to account for status bar
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 20,
  },
  iconWrapper: {
    width: 42, // same width as button for balance
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },

  roundButton: {
    width: 42,
    height: 42,
    backgroundColor: "#F7F7F7",
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    color: "#111",
    letterSpacing: 0.3,
  },

  cancelButtonContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF1F1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
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
  // cancelButtonContainer: {
  //   top: 100, // Position below the call button
  // },
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
