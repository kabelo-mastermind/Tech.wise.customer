"use client"

import { useContext, useEffect, useRef, useState } from "react"
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
  emitSOS,
  emitSOSLocationUpdate,
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
import { clearTripCaches } from "../utils/storage"
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
  const driver_id = tripData?.driver_id || tripData?.driverId || tripDataSocket?.driver_id || tripDataSocket?.driverId || null
  const user_id = useSelector((state) => state.auth?.user.user_id)
  const user_name = useSelector((state) => state.auth?.user.name)
  const userEmail = useSelector((state) => state.auth?.user.email)
  const dispatch = useDispatch()
  const trip_id = useSelector((state) => state.trip.tripData?.tripId || "")
  // Add this state near your other state declarations
  const [hasNavigated, setHasNavigated] = useState(false);
  // Payment status from navigation params
  const [paymentStatus, setPaymentStatus] = useState(null)
  // Add this near your other state declarations
  const [paymentStatusMessage, setPaymentStatusMessage] = useState(null)
  // Check for payment status from navigation params
  useEffect(() => {
    if (route.params?.paymentStatus) {
      setPaymentStatus(route.params.paymentStatus)

      // Store message instead of showing toast
      if (route.params.paymentStatus === "success") {
        setPaymentStatusMessage("Payment Successful - Enjoy your trip")
      } else if (route.params.paymentStatus === "cancelled") {
        setPaymentStatusMessage("Payment Cancelled - You cannot complete your trip")
      } else if (route.params.paymentStatus === "error") {
        setPaymentStatusMessage(`Payment Error - ${route.params.paymentError || "Unknown error"}`)
      }

      navigation.setParams({ paymentStatus: null })
    }
  }, [route.params])

  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  const { originDriver = {} } = useContext(DriverOriginContext)
  const { origin = {} } = useContext(OriginContext)
  const { destination = {} } = useContext(DestinationContext)
  // console.log("DestinationScreen destination*************************:", tripData);

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
  // Countdown timer state
  const [countdown, setCountdown] = useState(null)
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [lastDriverLocation, setLastDriverLocation] = useState(null)
  const [arrivalTime, setArrivalTime] = useState(null)
  // Arrival message to show in-UI instead of toasts for Nearby/Close/Arrived
  const [arrivalMessage, setArrivalMessage] = useState<string | null>(null)
  const [arrivalStage, setArrivalStage] = useState<'nearby' | 'close' | 'arrived' | null>(null)
  // Payment error message state
  const [paymentErrorMessage, setPaymentErrorMessage] = useState(null);
  // Destination arrival states for when trip has started
  const [destinationCountdown, setDestinationCountdown] = useState(null)
  const [destinationCountdownSeconds, setDestinationCountdownSeconds] = useState(0)
  const [destinationArrivalTime, setDestinationArrivalTime] = useState(null)
  const [destinationArrivalStage, setDestinationArrivalStage] = useState<'nearby' | 'close' | 'arrived' | null>(null)
  const [destinationArrivalMessage, setDestinationArrivalMessage] = useState<string | null>(null)
  const [hasAlertedDestination, setHasAlertedDestination] = useState({ nearby: false, close: false, arrived: false })
  // Add this near your other state declarations
  const [showCancelButton, setShowCancelButton] = useState(true)
  const [sosSending, setSosSending] = useState(false);
  const sosTrackingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sosEmergencyIdRef = useRef<number | null>(null);
  const latestSOSContextRef = useRef({
    driverLocation: null,
    userOrigin: null,
    tripId: null,
    userId: null,
  });

  useEffect(() => {
    latestSOSContextRef.current = {
      driverLocation,
      userOrigin,
      tripId: tripData?.tripId || null,
      userId: user_id || null,
    };
  }, [driverLocation, userOrigin, tripData?.tripId, user_id]);

  const stopSOSLiveTracking = () => {
    if (sosTrackingIntervalRef.current) {
      clearInterval(sosTrackingIntervalRef.current);
      sosTrackingIntervalRef.current = null;
    }
    sosEmergencyIdRef.current = null;
  };

  const emitSOSLocationNow = () => {
    if (!sosEmergencyIdRef.current) return;

    const context = latestSOSContextRef.current;
    const driverLoc = context?.driverLocation;
    const fallbackLoc = context?.userOrigin;
    const latitude = Number(driverLoc?.latitude ?? fallbackLoc?.latitude);
    const longitude = Number(driverLoc?.longitude ?? fallbackLoc?.longitude);
    const accuracy = driverLoc?.accuracy ?? fallbackLoc?.accuracy ?? null;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    emitSOSLocationUpdate({
      emergency_id: sosEmergencyIdRef.current,
      user_id: context?.userId || null,
      user_type: "rider",
      trip_id: context?.tripId || null,
      latitude,
      longitude,
      accuracy,
    });
  };

  const startSOSLiveTracking = (emergencyId: number) => {
    stopSOSLiveTracking();
    sosEmergencyIdRef.current = emergencyId;
    emitSOSLocationNow();
    sosTrackingIntervalRef.current = setInterval(() => {
      emitSOSLocationNow();
    }, 7000);
  };

  useEffect(() => {
    return () => {
      stopSOSLiveTracking();
    };
  }, []);

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

  // Function to convert ETA string to seconds
  const etaToSeconds = (etaString) => {
    if (!etaString || etaString === "N/A") return 0;

    try {
      // Handle formats like "5 mins", "1 hour 5 mins", "15 min"
      const hoursMatch = etaString.match(/(\d+)\s*hour/);
      const minutesMatch = etaString.match(/(\d+)\s*min/);

      let totalSeconds = 0;

      if (hoursMatch) {
        totalSeconds += parseInt(hoursMatch[1]) * 3600;
      }

      if (minutesMatch) {
        totalSeconds += parseInt(minutesMatch[1]) * 60;
      }

      return totalSeconds;
    } catch (error) {
      console.error("Error converting ETA to seconds:", error);
      return 0;
    }
  };
  // Format countdown seconds to readable time
  const formatCountdown = (seconds) => {
    if (seconds <= 0) return "Arrived";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };


  // Calculate estimated arrival time based on current ETA
  const calculateArrivalTime = (etaSeconds) => {
    if (!etaSeconds || etaSeconds <= 0) return null;
    const arrival = new Date();
    arrival.setSeconds(arrival.getSeconds() + etaSeconds);
    return arrival;
  };

  // Recalculate remaining time based on current position and estimated arrival
  const recalculateRemainingTime = () => {
    if (!arrivalTime) return 0;

    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((arrivalTime - now) / 1000));
    return remainingSeconds;
  };


  // Improved countdown timer that adjusts based on driver movement
  useEffect(() => {
    if (!eta || eta === "N/A" || !driverLocation) {
      setCountdown(null);
      setCountdownSeconds(0);
      setArrivalTime(null);
      return;
    }

    // Only reset the arrival time when ETA changes significantly or driver moves meaningfully
    const totalSeconds = etaToSeconds(eta);

    if (totalSeconds <= 0) {
      setCountdown("Arrived");
      setCountdownSeconds(0);
      setArrivalTime(null);
      return;
    }

    // Check if driver has moved significantly
    const hasDriverMoved = lastDriverLocation && driverLocation
      ? calculateDistance(
        lastDriverLocation.latitude,
        lastDriverLocation.longitude,
        driverLocation.latitude,
        driverLocation.longitude
      ) > 50 // More than 50 meters movement
      : true;

    // Update arrival time if ETA changed significantly or driver moved meaningfully
    if (!arrivalTime || Math.abs(totalSeconds - countdownSeconds) > 30 || hasDriverMoved) {
      const newArrivalTime = calculateArrivalTime(totalSeconds);
      setArrivalTime(newArrivalTime);
      setCountdownSeconds(totalSeconds);
      setCountdown(formatCountdown(totalSeconds));
      setLastDriverLocation(driverLocation);
    }

    const timer = setInterval(() => {
      if (arrivalTime) {
        const remainingSeconds = recalculateRemainingTime();

        if (remainingSeconds <= 0) {
          clearInterval(timer);
          setCountdown("Arrived");
          setCountdownSeconds(0);
          setArrivalTime(null);
        } else {
          setCountdownSeconds(remainingSeconds);
          setCountdown(formatCountdown(remainingSeconds));
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [eta, driverLocation, arrivalTime]);

  // Destination countdown timer for when trip has started
  useEffect(() => {
    if (!startedTrip || !etaTrip || etaTrip === "N/A" || !userDestination) {
      setDestinationCountdown(null);
      setDestinationCountdownSeconds(0);
      setDestinationArrivalTime(null);
      return;
    }

    const totalSeconds = etaToSeconds(etaTrip);

    if (totalSeconds <= 0) {
      setDestinationCountdown("Arrived at Destination");
      setDestinationCountdownSeconds(0);
      setDestinationArrivalTime(null);
      return;
    }

    // Update destination arrival time
    const newDestinationArrivalTime = calculateArrivalTime(totalSeconds);
    setDestinationArrivalTime(newDestinationArrivalTime);
    setDestinationCountdownSeconds(totalSeconds);
    setDestinationCountdown(formatCountdown(totalSeconds));

    const timer = setInterval(() => {
      if (destinationArrivalTime) {
        const now = new Date();
        const remainingSeconds = Math.max(0, Math.floor((destinationArrivalTime - now) / 1000));

        if (remainingSeconds <= 0) {
          clearInterval(timer);
          setDestinationCountdown("Arrived at Destination");
          setDestinationCountdownSeconds(0);
          setDestinationArrivalTime(null);
        } else {
          setDestinationCountdownSeconds(remainingSeconds);
          setDestinationCountdown(formatCountdown(remainingSeconds));
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [etaTrip, startedTrip, userDestination]);

  // Calculate distance to destination when trip has started
  useEffect(() => {
    if (!startedTrip || !driverLocation || !userDestination) return;

    // Calculate distance between driver and destination
    const distanceToDestination = calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      userDestination.latitude,
      userDestination.longitude
    );

    // Check if driver is getting close to destination
    if (distanceToDestination <= 50 && !hasAlertedDestination.arrived) {
      setDestinationArrivalMessage("Arrived at destination")
      setDestinationArrivalStage('arrived')
      setHasAlertedDestination((prev) => ({ ...prev, arrived: true }));
      setDestinationCountdown("Arrived");
      setDestinationCountdownSeconds(0);
      setDestinationArrivalTime(null);
    } else if (distanceToDestination <= 250 && !hasAlertedDestination.close) {
      setDestinationArrivalMessage("Almost at destination")
      setDestinationArrivalStage('close')
      setHasAlertedDestination((prev) => ({ ...prev, close: true }));
    } else if (distanceToDestination <= 500 && !hasAlertedDestination.nearby) {
      setDestinationArrivalMessage("Approaching destination")
      setDestinationArrivalStage('nearby')
      setHasAlertedDestination((prev) => ({ ...prev, nearby: true }));
    }

    // Reset alerts if driver moves away
    if (distanceToDestination > 600) {
      setHasAlertedDestination({ nearby: false, close: false, arrived: false });
      setDestinationArrivalMessage(null)
      setDestinationArrivalStage(null)
    }
  }, [driverLocation, startedTrip, userDestination]);

  // Smart ETA adjustment based on driver progress
  useEffect(() => {
    if (!driverLocation || !lastDriverLocation || !userOrigin) return;

    // Calculate if driver is getting closer to user origin
    const currentDistance = calculateDistance(
      userOrigin.latitude,
      userOrigin.longitude,
      driverLocation.latitude,
      driverLocation.longitude
    );

    const previousDistance = calculateDistance(
      userOrigin.latitude,
      userOrigin.longitude,
      lastDriverLocation.latitude,
      lastDriverLocation.longitude
    );

    // If driver is getting closer faster than expected, adjust ETA
    if (currentDistance < previousDistance && arrivalTime) {
      const distanceImprovement = previousDistance - currentDistance;

      // If driver covered more than 100 meters in the update interval, recalculate
      if (distanceImprovement > 100) {
        console.log("Driver making good progress, recalculating ETA...");
        // This will trigger the parent useEffect to recalculate
        setLastDriverLocation(driverLocation);
      }
    }
  }, [driverLocation, userOrigin]);


  // Reset countdown when ETA changes significantly
  useEffect(() => {
    if (eta && eta !== "N/A") {
      const newSeconds = etaToSeconds(eta);
      // Only reset if the difference is more than 30 seconds
      if (Math.abs(newSeconds - countdownSeconds) > 30) {
        setCountdownSeconds(newSeconds);
        setCountdown(formatCountdown(newSeconds));
      }
    }
  }, [eta]);

  // Reset destination countdown when trip ETA changes
  useEffect(() => {
    if (startedTrip && etaTrip && etaTrip !== "N/A") {
      const newSeconds = etaToSeconds(etaTrip);
      if (Math.abs(newSeconds - destinationCountdownSeconds) > 30) {
        setDestinationCountdownSeconds(newSeconds);
        setDestinationCountdown(formatCountdown(newSeconds));
      }
    }
  }, [etaTrip, startedTrip]);

  const handleCancelTrip = () => {
    // Optional: Add confirmation alert
    Alert.alert(
      "Cancel Trip",
      "Are you sure you want to cancel this trip?",
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Yes",
          onPress: () => {
            // Open cancellation modal — actual emit will occur when user confirms inside the modal
            setCancelModalVisible(true);
          }
        }
      ]
    );
  };

  // Add this function near your other functions
  const handleTripCancellation = (source = 'socket') => {
    console.log(`Trip canceled via ${source}`);

    // Reset all trip-related states
    setTripStatus("canceled");
    setCountdown(null);
    setCountdownSeconds(0);
    setArrivalTime(null);
    setDriverLocation(null);
    setDestinationCountdown(null);
    setDestinationCountdownSeconds(0);
    setDestinationArrivalTime(null);
    setShowCancelAlert(true);
    setHasNavigated(false);
    setShowCancelButton(true); // Add this line to show cancel button again

    // Clear Redux state
    dispatch({
      type: 'SET_TRIP_DATA',
      payload: { status: 'canceled' }
    });
    dispatch(clearMessages());

    // Stop listening to socket events
    stopListeningToTripAccepted();
    stopListeningToTripDeclined();

    // Auto-navigate after showing alert
    setTimeout(() => {
      if (!hasNavigated) {
        setShowCancelAlert(false);
        setHasNavigated(true);
        navigation.navigate("RequestScreen");
      }
    }, 2000);
  };

  // And update your manual cancellation too:
  const handleCancel = async (reason) => {
    setCancelReason(reason);
    setHasNavigated(false);

    // Show alert immediately
    setShowCancelAlert(true);

    const tripId = tripData?.tripId;
    const distanceTraveled = distanceTrip || null;

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
      });

      if (response.status === 200) {
        emitTripCanceltToDrivers(tripData, driver_id);
        stopListeningToTripAccepted();
        stopListeningToTripDeclined();
        setShowCancelButton(true); // Add this line

        // Use the same cleanup function
        handleTripCancellation('manual');

      } else if (response.status === 404) {
        console.error("Trip not found:", await response.json());
        setShowCancelAlert(false);
        setPaymentStatusMessage("Trip Not Found - The trip does not exist or has been removed.");
      } else {
        console.log("Trip status not updated:", await response.json());
        setShowCancelAlert(false);
      }
    } catch (error) {
      console.error("Error canceling the trip:", error);
      setShowCancelAlert(false);
      setPaymentStatusMessage("Trip Not Found - The trip does not exist or has been removed.");
    }

    setCancelModalVisible(false);
  };
  const handleCloseModal = () => {
    setCancelModalVisible(false) // Close modal
  }

  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      stopListeningToTripAccepted();
      stopListeningToTripDeclined();
      setHasNavigated(false);
      setShowCancelButton(true); // Reset to show cancel button on unmount
    };
  }, []);
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
        setPaymentErrorMessage("Profile incomplete. Please complete your profile before making payments.");
        return null
      }
    } catch (error) {
      console.error("Error fetching customer code:", error)
      setPaymentErrorMessage("There was an error processing your payment. Please try again.");
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
      setTripStatus("accepted")
      setTripData(data)
      setArrivalMessage("Trip Accepted - Driver is on the way")
      dispatch({
        type: 'SET_TRIP_DATA',
        payload: { status: 'accepted' }
      });
    })

    // Listen for when the driver has arrived
    listenToDriverArrival((data) => {
      console.log("✅ Trip arrived:", data)
      setTripStatus("arrived")
      setArrivalMessage("Driver has arrived")
      setArrivalStage('arrived')
      setCountdown("Arrived")
      setCountdownSeconds(0)
      setArrivalTime(null)
    })

    // listener runs when trip starts
    listenToTripStarted((data) => {
      setTripStatus("started")
      setStartedTrip(true)
      setShowCancelButton(false) // Add this line to hide cancel button
      setArrivalMessage("Trip Started - Going to destination")
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
    listenToTripEnded((data) => {
      console.log("Trip ended data:", data);
      setStartedTrip(false)

      setTripStatus("ended");
      setCountdown(null);
      setCountdownSeconds(0);
      setArrivalTime(null);
      setDestinationCountdown(null);
      setDestinationCountdownSeconds(0);
      setDestinationArrivalTime(null);
      dispatch({
        type: 'SET_TRIP_DATA',
        payload: { status: 'completed' }
      });
      dispatch(clearMessages())

      // Clear trip-related AsyncStorage caches for this user
      try {
        clearTripCaches(user_id)
      } catch (e) {
        console.warn('Error clearing trip caches on trip end', e)
      }

      // Navigate to RideRatingScreen
      navigation.navigate("RideRatingScreen", {
        tripId: data.tripId,
        driverId: data.driver_id,
        userId: user_id
      });
    });

    // Then update your socket listener:
    listenToTripDeclined((data) => {
      console.log("❌ Trip canceled via socket:", data);
      setShowCancelButton(true) // Add this line
      // Wait a moment for toast to show, then handle cancellation
      setTimeout(() => {
        handleTripCancellation('socket');
      }, 500); // 0.5 second delay
    });

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

  useEffect(() => {
    const tripIsActive = tripStatusAccepted === "accepted" || tripStatusAccepted === "on-going";
    if (!tripIsActive) {
      stopSOSLiveTracking();
    }
  }, [tripStatusAccepted]);

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

  // Find this useEffect that checks trip status
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
            setCountdown(null);
            setCountdownSeconds(0);
            setArrivalTime(null);
            setDestinationCountdown(null);
            setDestinationCountdownSeconds(0);
            setDestinationArrivalTime(null);
            dispatch(clearMessages())
            stopListeningToTripAccepted();
            stopListeningToTripDeclined();
          }
        }
      } catch (error) {
        setPaymentStatusMessage("Failed to fetch trip statuses. Please try again later.");
      }
    };

    fetchTripStatuses();
    const intervalId = setInterval(fetchTripStatuses, 5000);
    return () => clearInterval(intervalId);
  }, [user_id, api, tripStatusAccepted]);

  // hndle payment initiation and trip status changes
  useEffect(() => {
    if (tripStatusAccepted === "canceled") {
      // Just do cleanup without navigation or alert
      setDriverLocation({ latitude: null, longitude: null });
      setCountdown(null);
      setCountdownSeconds(0);
      setArrivalTime(null);
      setDestinationCountdown(null);
      setDestinationCountdownSeconds(0);
      setDestinationArrivalTime(null);
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
              setPaymentStatus("success");
              setPaymentStatusMessage("Payment Success - Your saved card was charged successfully.")
              setTripMeta({
                tripId: tripData?.tripId,
                driverName: tripData?.driverName || "Your Driver",
                tripDistance: distanceTrip,
                tripDuration: etaTrip,
              });
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
              setPaymentStatusMessage("Failed to initialize or charge payment.");
            }
          } catch (err) {
            console.error("Payment init error:", err.message);
            setPaymentStatusMessage("Something went wrong while processing payment.");
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

            const latitude = Number(data.latitude)
            const longitude = Number(data.longitude)

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              setPaymentStatusMessage("Driver location data is incomplete.");
              return
            }

            setDriverLocation((prev) => ({
              latitude: latitude ?? prev.latitude,
              longitude: longitude ?? prev.longitude,
              // timestamp: data.timestamp ?? prev.timestamp,
            }))
          } else {
            // No driver location found yet - handled by UI state
          }
        },
        (error) => {
          setPaymentStatusMessage("Failed to fetch driver location. Please try again.");
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
      setArrivalMessage("Driver has arrived")
      setArrivalStage('arrived')
      setHasAlerted((prev) => ({ ...prev, arrived: true }));
      setCountdown("Arrived");
      setCountdownSeconds(0);
      setArrivalTime(null);
    } else if (distanceMeters <= 250 && !hasAlerted.close) {
      setArrivalMessage("Driver is almost there")
      setArrivalStage('close')
      setHasAlerted((prev) => ({ ...prev, close: true }));
    } else if (distanceMeters <= 500 && !hasAlerted.nearby) {
      setArrivalMessage("Driver nearby")
      setArrivalStage('nearby')
      setHasAlerted((prev) => ({ ...prev, nearby: true }));
    }
  }, [driverLocation]);

  useEffect(() => {
    if (distance > 600) {
      setHasAlerted({ nearby: false, close: false, arrived: false });
      // Clear arrival UI message when driver moves far away
      setArrivalMessage(null)
      setArrivalStage(null)
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
        setPaymentStatusMessage("Failed to fetch route details. Please try again.");
      }
    }

    fetchRouteDetails()
  }, [userOrigin, driverLocation])

  // **Fetch Route Details (distance and destination arrival time) for User and Destination**
  // Prefer `userDestination` (set when trip starts) but fall back to `destination` context.
  useEffect(() => {
    const fetchRouteDetails = async () => {
      try {
        const dest = (userDestination && userDestination.latitude) ? userDestination : destination;
        if (!userOrigin?.latitude || !dest?.latitude) return;

        const responseDestination = await axios.get(`https://maps.googleapis.com/maps/api/directions/json`, {
          params: {
            origin: `${userOrigin.latitude},${userOrigin.longitude}`,
            destination: `${dest.latitude},${dest.longitude}`,
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
        setPaymentStatusMessage("Failed to fetch route details. Please try again.");
      }
    }

    fetchRouteDetails()
  }, [userOrigin, destination, userDestination])

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
            setPaymentStatusMessage("Payment Failed - Something went wrong during payment.");
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
                {/* Show driver icon during accepted/on-going/started trips, otherwise show cancel button when available */}
                {(tripStatusAccepted === 'accepted' || tripStatusAccepted === 'on-going' || startedTrip) ? (
                  <TouchableOpacity
                    style={styles.driverIconContainer}
                    onPress={handleNavigation}
                    accessibilityLabel="View Driver"
                  >
                    <Icon name="account-circle" type="material" size={34} color="#0DCAF0" />
                  </TouchableOpacity>
                ) : (
                  showCancelButton && !startedTrip && (
                    <TouchableOpacity
                      style={styles.cancelButtonContainer}
                      onPress={handleCancelTrip}
                    >
                      <Icon name="cancel" color="#0DCAF0" size={30} />
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* Countdown Timer Display - SHOW DURING TRIP ACCEPTED/ARRIVED PHASE */}
            {/* ARRIVAL & DESTINATION CARDS */}
            <>
              {(tripStatusAccepted === "accepted" || tripStatusAccepted === "arrived") &&
                (countdown || arrivalMessage || distance || paymentStatusMessage || paymentErrorMessage) && (
                  <View style={styles.arrivalCard}>
                    <View style={styles.arrivalTop}>
                      <View style={styles.driverInfo}>
                        <View style={{ marginLeft: 10, maxWidth: SCREEN_WIDTH * 0.55 }}>
                          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.driverName}>
                            {tripData?.driverName || 'Driver'}
                          </Text>
                          {/* Show arrival message as subtitle */}
                          {(arrivalMessage || paymentStatusMessage || paymentErrorMessage) && (
                            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.arrivalStatusText}>
                              {arrivalMessage || paymentStatusMessage || paymentErrorMessage}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.timerPill}>
                        {arrivalStage === 'arrived' ? (
                          <Text style={styles.timerPillText}>Arrived</Text>
                        ) : (
                          <Text style={styles.timerPillText}>{countdown || 'Calculating...'}</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.arrivalBottom}>
                      <View style={styles.bottomLeft}>
                        {/* Arrival Stage Badge */}
                        {arrivalStage && (
                          <View style={[
                            styles.arrivalBadge,
                            arrivalStage === 'arrived' ? styles.arrivalBadgeArrived :
                              arrivalStage === 'close' ? styles.arrivalBadgeClose :
                                styles.arrivalBadgeNearby,
                          ]}>
                            <Text style={styles.arrivalBadgeText}>
                              {arrivalStage === 'arrived' ? 'Arrived' :
                                arrivalStage === 'close' ? 'Almost there' :
                                  'Nearby'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Distance and ETA Info */}
                      {distance && eta ? (
                        <Text style={styles.distanceTextCompact}>
                          {distance}{eta ? ` • ${eta}` : ''}
                        </Text>
                      ) : (
                        <Text style={styles.etaUpdateTextCompact}>
                          Location updates incoming
                        </Text>
                      )}
                    </View>
                  </View>
                )}

              {/* DESTINATION COUNTDOWN DISPLAY - SHOW WHEN TRIP HAS STARTED */}
              {startedTrip && userDestination && (
                <View style={styles.destinationCard}>
                  <View style={styles.destinationTop}>
                    <View style={styles.driverInfo}>
                      <View style={{ marginLeft: 10, maxWidth: SCREEN_WIDTH * 0.55 }}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.driverName}>
                          Going to Destination
                        </Text>
                        {(destinationArrivalMessage || paymentStatusMessage || paymentErrorMessage) && (
                          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.arrivalStatusText}>
                            {destinationArrivalMessage || paymentStatusMessage || paymentErrorMessage}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={[styles.timerPill, { backgroundColor: '#10B981' }]}> 
                      {destinationArrivalStage === 'arrived' ? (
                        <Text style={styles.timerPillText}>Arrived</Text>
                      ) : (
                        <Text style={styles.timerPillText}>{destinationCountdown || 'Calculating...'}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.arrivalBottom}>
                    <View style={styles.bottomLeft}>
                      {/* Destination Arrival Stage Badge */}
                      {destinationArrivalStage && (
                        <View style={[
                          styles.arrivalBadge,
                          destinationArrivalStage === 'arrived' ? styles.arrivalBadgeArrived :
                            destinationArrivalStage === 'close' ? styles.arrivalBadgeClose :
                              styles.arrivalBadgeNearby,
                        ]}>
                          <Text style={styles.arrivalBadgeText}>
                            {destinationArrivalStage === 'arrived' ? 'At Destination' :
                              destinationArrivalStage === 'close' ? 'Almost there' :
                                'Approaching'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Destination Distance and ETA Info */}
                    {distanceTrip && etaTrip ? (
                      <Text style={styles.distanceTextCompact}>
                        {distanceTrip}{etaTrip ? ` • ${etaTrip}` : ''}
                      </Text>
                    ) : (
                      <Text style={styles.etaUpdateTextCompact}>
                        En route to destination
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </>
          </View>
          {/* Action Buttons: View Driver & SOS */}
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <TouchableOpacity style={styles.rectangleButton} onPress={handleNavigation}>
              <Text style={styles.buttonText}>View Driver</Text>
            </TouchableOpacity>
          </View>

          {/* Floating SOS Button - bottom center, always visible after trip accepted or on-going */}
          {(tripStatusAccepted === 'accepted' || tripStatusAccepted === 'on-going') && (
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center', zIndex: 100 }} pointerEvents="box-none">
              <TouchableOpacity
                        style={{ backgroundColor: '#FF3B30', borderRadius: 32, width: 64, height: 64, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 8, zIndex: 101, opacity: sosSending ? 0.6 : 1 }}
                        onPress={async () => {
                          if (sosSending) return;
                          setSosSending(true);
                          try {
                            const location = (driverLocation && driverLocation.latitude && driverLocation.longitude) ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude } : userOrigin;
                            const payload = {
                              user_id: user_id || null,
                              user_type: 'rider',
                              trip_id: tripData?.tripId || null,
                              latitude: location?.latitude || null,
                              longitude: location?.longitude || null,
                              accuracy: location?.accuracy || (location?.coords && location.coords.accuracy) || null,
                              trigger_source: 'in_app_button',
                              address: null,
                              phone: null,
                              description: 'SOS triggered from app',
                              severity: 'high',
                              metadata: { user_name: user_name || null, userEmail: userEmail || null, driver_id: driver_id || null }
                            };

                            // emit SOS to socket in real-time
                            try { emitSOS(payload); } catch (e) { console.warn('emitSOS failed', e); }

                            const response = await fetch(`${api}emergency`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload),
                            });

                            if (response.ok) {
                              const createdEmergency = await response.json().catch(() => null);
                              const emergencyId = Number(createdEmergency?.id);
                              if (Number.isFinite(emergencyId)) {
                                startSOSLiveTracking(emergencyId);
                              }
                              Alert.alert('SOS Sent', 'Emergency alert sent. Help is on the way.');
                            } else {
                              const text = await response.text();
                              console.error('SOS failed:', text);
                              Alert.alert('SOS Failed', 'Failed to send emergency alert.');
                            }
                          } catch (err) {
                            console.error('Error sending SOS:', err);
                            Alert.alert('SOS Error', 'Could not send emergency. Check your connection.');
                          } finally {
                            setSosSending(false);
                          }
                        }}
                        activeOpacity={0.85}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>SOS</Text>
              </TouchableOpacity>
            </View>
          )}


          {/* Trip Cancellation Modal */}
          <TripCancelationModal isVisible={cancelModalVisible} onClose={handleCloseModal} onCancel={handleCancel} />
          {tripData?.driver_id && (
            <MapComponent
              driverLocation={driverLocation}
              tripStarted={startedTrip}
              userOrigin={userOrigin}
              userDestination={userDestination}
              showDirections={shouldShowDirections}
            />
          )}
        </View>
      </TouchableWithoutFeedback>

      {drawerOpen && <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />}

      <CancelAlertModal
        visible={showCancelAlert}
        message="Trip has been cancelled."
        onClose={() => {
          setShowCancelAlert(false);
          if (!hasNavigated) {
            setHasNavigated(true);
            navigation.navigate("RequestScreen");
          }
        }}
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
  arrivalStatusText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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

  driverIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 6,
  },
  profilePicture: {
    width: 30,
    height: 30,
    resizeMode: "contain",
  },
  rectangleButton: {
    position: "absolute",
    // raised above the SOS floating button
    bottom: 120,
    alignSelf: "center",
    backgroundColor: "#0DCAF0",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 8,
    zIndex: 200,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Countdown Timer Styles
  countdownContainer: {
    backgroundColor: "#F8FBFD",
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0DCAF0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  countdownContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  countdownLabel: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 8,
    marginRight: 12,
    fontWeight: "500",
  },
  countdownTimer: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    backgroundColor: "#E6F7FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    fontStyle: "italic",
  },
  etaUpdateText: {
    fontSize: 10,
    color: "#64748B",
    textAlign: "center",
    fontStyle: "italic",
  },
  arrivalBadge: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginVertical: 6,
  },
  arrivalBadgeNearby: {
    backgroundColor: '#E6F7FF',
  },
  arrivalBadgeClose: {
    backgroundColor: '#FFF7E6',
  },
  arrivalBadgeArrived: {
    backgroundColor: '#E6FFEF',
  },
  arrivalBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  /* New modern styles */
  arrivalCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(13,202,240,0.06)'
  },
  destinationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.06)'
  },
  arrivalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destinationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1FAFD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(13,202,240,0.10)'
  },
  driverAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D9FB8'
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  arrivalMessageText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  timerPill: {
    backgroundColor: '#0DCAF0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerPillText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  arrivalBottom: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceTextCompact: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  etaUpdateTextCompact: {
    fontSize: 10,
    color: '#9CA3AF'
  },
})

export default DestinationScreen