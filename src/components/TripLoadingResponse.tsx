"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import { StyleSheet, Pressable, Animated, View, Text, Alert, Dimensions, StatusBar } from "react-native"
import {
  connectSocket,
  listenToTripAccepted,
  stopListeningToTripAccepted,
  stopListeningToTripDeclined,
} from "../configSocket/socketConfig"
import { useSelector } from "react-redux"
import { api } from "../../api"
import axios from "axios"
import { LinearGradient } from "expo-linear-gradient"

const { width, height } = Dimensions.get("window")

const TripLoadingResponse = ({ navigation, route }) => {
  const [durationReached, setDurationReached] = useState(false)
  const [modalVisible, setModalVisible] = useState(true)
  const user_id = useSelector((state) => state.auth?.user.user_id)
  const [timeoutSeconds] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds)
  const { tripId } = route.params || {}
  // Animation refs
  const scaleRef = useRef(new Animated.Value(1))
  const opacityRef = useRef(new Animated.Value(1))
  const pulseAnim = useRef(new Animated.Value(0)).current
  const [tripStatus, setTripStatus] = useState()


  console.log("TripLoadingResponse ", tripId);

  const driverId = useSelector((state) => state.trip.tripData?.driver_id || "")
  const [tripStatusAccepted, setTripStatusAccepted] = useState(null)
  const [isManuallyCanceled, setIsManuallyCanceled] = useState(false)

  // Countdown timer reference
  const countdownRef = useRef(null)

  const fetchTripStatuses = async () => {
    if (!user_id) return

    try {
      const response = await axios.get(`${api}/trips/statuses/${user_id}`)
      if (response.status === 200) {
        setTripStatusAccepted(response.data.latestTrip?.statuses)
      }
    } catch (error) {
      // console.warn("⚠️fetching trip statuses, please wait...");
    }
  }

  useEffect(() => {
    connectSocket(user_id, "customer")

    listenToTripAccepted((data) => {
      setTripStatus("accepted")
      setModalVisible(false)
      fetchTripStatuses()
    })

    return () => {
      stopListeningToTripAccepted()
      stopListeningToTripDeclined()
    }
  }, [user_id, tripStatus])

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [pulseAnim])

  // Loading animation
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleRef.current, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleRef.current, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityRef.current, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacityRef.current, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start()
  }, [])

  // Handle no response timeout
  useEffect(() => {
    if (!durationReached && !isManuallyCanceled && tripStatusAccepted !== "accepted") {
      // Start countdown timer
      countdownRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Set overall timeout
      const timeoutId = setTimeout(() => {
        if (!isManuallyCanceled && tripStatusAccepted !== "accepted") {
          setDurationReached(true)
          updateTripStatus()
        }
      }, timeoutSeconds * 1000)

      return () => {
        clearTimeout(timeoutId)
        clearInterval(countdownRef.current)
      }
    }
  }, [durationReached, tripStatusAccepted, isManuallyCanceled])

  // Update trip status to "no response"
  const updateTripStatus = async () => {
    try {
      await fetch(`${api}trips/${tripId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "no-response",
          cancellation_reason: "driver did not respond",
          cancel_by: null,
        }),
      })


      Alert.alert(
        "Driver Not Responding",
        "The driver is not responding at the moment. Please try choosing a different driver.",
        [
          {
            text: "OK",
            onPress: () => {
              setModalVisible(false)
              navigation.navigate("RequestScreen")
              setTimeout(() => {
                navigation.navigate("CarListingBottomSheet", { driverId })
              }, 50)
            },
          },
        ]
      )
    } catch (error) {
      console.error("Failed to update trip status:", error)
      // Fallback to navigation even if update fails
      navigation.navigate("CarListingBottomSheet", { driverId })
    }
  }

  // Effect to navigate to DestinationScreen if trip is accepted
  useEffect(() => {
    if (tripStatusAccepted === "accepted") {
      setTimeout(() => {
        navigation.navigate("DestinationScreen")
      }, 2000)
    }
  }, [tripStatusAccepted, navigation])

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  })

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />
      <LinearGradient colors={["#0DCAF0", "#0AA8CD"]} style={styles.gradientBackground}>
        <View style={styles.contentContainer}>
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                }),
              },
            ]}
          />

          <Animated.Text
            style={[
              styles.loadingText,
              {
                opacity: opacityRef.current,
              },
            ]}
          >
            {`Connecting you with a driver... ${secondsLeft}s`}
          </Animated.Text>

          <View style={styles.dotsContainer}>
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 0.3, 0.6, 1],
                    outputRange: [0.3, 1, 0.3, 0.3],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 0.3, 0.6, 1],
                    outputRange: [0.3, 0.3, 1, 0.3],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 0.3, 0.6, 1],
                    outputRange: [0.3, 0.3, 0.3, 1],
                  }),
                },
              ]}
            />
          </View>

          <Text style={styles.subText}>Please wait while we find the perfect driver for your trip</Text>
          <Pressable
            style={styles.cancelButton}
            onPress={() => {
              clearInterval(countdownRef.current);
              setIsManuallyCanceled(true);

              Alert.alert(
                "Cancelling the request",
                "Are you sure you want to cancel the request?",
                [
                  { text: "No", style: "cancel" },
                  {
                    text: "OK",
                    onPress: async () => {
                      try {
                        const response = await fetch(`${api}trips/${tripId}/status`, {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            status: "no-response",
                            cancellation_reason: "customer changed mind",
                            cancel_by: "customer",
                          }),
                        })
                        console.log("Trip status updated:", response);

                        // Navigate back to relevant screens
                        setModalVisible(false);
                        navigation.navigate("RequestScreen");
                        setTimeout(() => {
                          navigation.navigate("CarListingBottomSheet", { driverId });
                        }, 50);
                      } catch (error) {
                        console.error("Cancel trip error:", error);
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel Request</Text>
          </Pressable>

        </View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  gradientBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pulseCircle: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#fff",
    opacity: 0.6,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    marginBottom: 30,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    marginHorizontal: 5,
  },
  subText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#fff",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
})

export default TripLoadingResponse