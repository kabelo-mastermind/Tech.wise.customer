"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import { StyleSheet, Pressable, View, Text, Alert, Dimensions, StatusBar, ActivityIndicator } from "react-native"
import NetInfo from '@react-native-community/netinfo'
import { addPendingUpdate } from '../utils/storage'
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
import { getPendingUpdates, removePendingUpdate } from '../utils/storage'

const { width, height } = Dimensions.get("window")

const TripLoadingResponse = ({ navigation, route }) => {
  const [durationReached, setDurationReached] = useState(false)
  const [modalVisible, setModalVisible] = useState(true)
  const user_id = useSelector((state) => state.auth?.user.user_id)
  const [timeoutSeconds] = useState(40)
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds)
  const { tripId } = route.params || {}
  const reduxTrip = useSelector((state) => state.trip.tripData || {});
  const [displayTripId, setDisplayTripId] = useState(tripId)
  useEffect(() => {
    if (reduxTrip?.tripId && typeof reduxTrip.tripId === 'string' && !reduxTrip.tripId.startsWith('pending-')) {
      if (displayTripId !== reduxTrip.tripId) setDisplayTripId(reduxTrip.tripId)
    }
  }, [reduxTrip?.tripId]);
  const pendingCreatedAt = route.params?.pendingCreatedAt || null
  const [tripStatus, setTripStatus] = useState()

  // Log only once on mount to avoid memory issues
  useEffect(() => {
    console.log("TripLoadingResponse mounted with tripId:", tripId);
  }, []);

  const driverId = useSelector((state) => state.trip.tripData?.driver_id || "")
  const [tripStatusAccepted, setTripStatusAccepted] = useState(null)
  const [isManuallyCanceled, setIsManuallyCanceled] = useState(false)
  const [isConnectedState, setIsConnectedState] = useState(true)
  const [cancelledDueToOffline, setCancelledDueToOffline] = useState(false)

  // Countdown timer reference
  const countdownRef = useRef(null)
  const alertShownRef = useRef<{ [key: string]: boolean }>({})

  const showAlertOnce = (key, title, message, buttons) => {
    if (alertShownRef.current[key]) return false
    alertShownRef.current[key] = true
    Alert.alert(title, message, buttons)
    return true
  }
  
  // Memoize fetchTripStatuses to prevent recreation on every render
  const fetchTripStatuses = useRef(async () => {
    if (!user_id) return

    try {
      const response = await axios.get(`${api}/trips/statuses/${user_id}`)
      if (response.status === 200) {
        setTripStatusAccepted(response.data.latestTrip?.statuses)
      }
    } catch (error) {
      // console.warn("⚠️fetching trip statuses, please wait...");
    }
  })
 
  useEffect(() => {
    connectSocket(user_id, "customer")

    listenToTripAccepted((data) => {
      setTripStatus("accepted")
      setModalVisible(false)
      fetchTripStatuses.current()
    })

    return () => {
      stopListeningToTripAccepted()
      stopListeningToTripDeclined()
    }
  }, [user_id])

  // Listen for connectivity changes: if network goes offline while waiting, cancel appropriately
  useEffect(() => {
    let unsubscribe = () => {}
    if (NetInfo && typeof NetInfo.addEventListener === 'function') {
      unsubscribe = NetInfo.addEventListener(state => {
        const connected = !!state.isConnected
        setIsConnectedState(connected)
        // If we lose connectivity while waiting for driver response, cancel the trip
        if (!connected && !cancelledDueToOffline && !isManuallyCanceled && tripStatusAccepted !== 'accepted') {
          // perform offline-cancel
          (async () => {
            try {
              if (typeof tripId === 'string' && tripId.startsWith('pending-') && pendingCreatedAt) {
                // remove queued pending trip so it won't be synced later
                try { await removePendingUpdate(pendingCreatedAt) } catch (e) {}
                setCancelledDueToOffline(true)
                showAlertOnce(
                  'offline-queued-cancelled',
                  'Offline',
                  'Your queued trip was cancelled while offline. Try connecting to the network to continue.'
                );
                setModalVisible(false)
                navigation.navigate('RequestScreen')
                setTimeout(() => { navigation.navigate('CarListingBottomSheet', { driverId }) }, 50)
              } else if (tripId) {
                // trip has server id -> enqueue a cancel status to submit when back online
                try {
                  await addPendingUpdate({
                    type: 'trip_status_update',
                    payload: {
                      tripId,
                      status: 'no-response',
                      cancellation_reason: 'no response (lost connectivity)',
                      cancel_by: null,
                    },
                  })
                } catch (e) {}
                setCancelledDueToOffline(true)
                showAlertOnce(
                  'offline-trip-cancelled',
                  'Offline',
                  'You went offline — trip cancelled locally and will be updated when online.'
                );
                setModalVisible(false)
                navigation.navigate('RequestScreen')
                setTimeout(() => { navigation.navigate('CarListingBottomSheet', { driverId }) }, 50)
              }
            } catch (e) {
              // ignore
            }
          })()
        }
      })
    }

    return () => { try { unsubscribe(); } catch (e) {} }
  }, [tripId, pendingCreatedAt, cancelledDueToOffline, isManuallyCanceled, tripStatusAccepted])

  // If this is a queued (pending) trip, poll pending updates to see if it's been synced
  useEffect(() => {
    let pollInterval = null
    const isPending = typeof tripId === 'string' && tripId.startsWith('pending-') && pendingCreatedAt
    if (isPending) {
      pollInterval = setInterval(async () => {
        try {
          const list = await getPendingUpdates()
          const exists = list.some(i => i.createdAt === pendingCreatedAt)
          if (!exists) {
            // pending item removed -> assume synced; update display id from redux if available
            clearInterval(pollInterval)
            // check connectivity to decide whether removal means "submitted" or "cancelled"
            let isConnected = true
            try {
              if (NetInfo && typeof NetInfo.fetch === 'function') {
                const s = await NetInfo.fetch()
                isConnected = !!s.isConnected
              }
            } catch (e) { isConnected = true }

            const serverId = reduxTrip?.tripId
            if (serverId && !serverId.startsWith('pending-')) {
              setDisplayTripId(serverId)
              showAlertOnce(
                'queued-submitted-with-id',
                'Queued trip submitted',
                `Your queued trip was submitted (ID: ${serverId}).`
              );
            } else if (isConnected) {
              showAlertOnce(
                'queued-submitted',
                'Queued trip submitted',
                'Your queued trip was submitted when online.'
              );
            } else {
              // offline + pending removed -> likely cancelled locally
              showAlertOnce(
                'queued-cancelled',
                'Queued trip cancelled',
                'Your queued trip was cancelled while offline.'
              );
            }
            // continue to stay on this screen; other flow will continue when driver accepts
          }
        } catch (e) {
          // ignore
        }
      }, 3000)
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [tripId, pendingCreatedAt, navigation, reduxTrip?.tripId])

  // Pulse animation
  // Animations removed to reduce CPU usage on lower-end devices

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
      let isConnected = true
      if (NetInfo && typeof NetInfo.fetch === 'function') {
        try {
          const state = await NetInfo.fetch()
          isConnected = !!state.isConnected
        } catch (e) {
          isConnected = true
        }
      }

      // If offline, either remove pending queued trip or enqueue a status update
      if (!isConnected) {
        if (typeof tripId === 'string' && tripId.startsWith('pending-') && pendingCreatedAt) {
          try {
            await removePendingUpdate(pendingCreatedAt)
          } catch (e) {
            // ignore
          }
          showAlertOnce(
            'queued-cancelled-manual',
            'Cancelled',
            'Your queued trip has been cancelled.'
          );
        } else {
          try {
            await addPendingUpdate({
              type: 'trip_status_update',
              payload: {
                tripId,
                status: 'no-response',
                cancellation_reason: 'driver did not respond',
                cancel_by: null,
              },
            })
            showAlertOnce(
              'offline-status-saved',
              'Offline',
              'Trip status update saved and will be submitted when online.'
            );
          } catch (e) {
            // ignore enqueue errors
          }
        }

        setModalVisible(false)
        navigation.navigate('RequestScreen')
        setTimeout(() => {
          navigation.navigate('CarListingBottomSheet', { driverId })
        }, 50)
        return
      }

      // Online: perform server update
      await fetch(`${api}trips/${tripId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'no-response',
          cancellation_reason: 'driver did not respond',
          cancel_by: null,
        }),
      })

      const shown = showAlertOnce(
        'driver-not-responding',
        'Driver Not Responding',
        'The driver is not responding at the moment. Please try choosing a different driver.',
        [
          {
            text: 'OK',
            onPress: () => {
              setModalVisible(false)
              navigation.navigate('RequestScreen')
              setTimeout(() => {
                navigation.navigate('CarListingBottomSheet', { driverId })
              }, 50)
            },
          },
        ]
      )
      if (!shown) {
        setModalVisible(false)
        navigation.navigate('RequestScreen')
        setTimeout(() => {
          navigation.navigate('CarListingBottomSheet', { driverId })
        }, 50)
      }
    } catch (error) {
      console.error('Failed to update trip status:', error)
      // As a fallback, enqueue the status update so it can be retried
      try {
        await addPendingUpdate({
          type: 'trip_status_update',
          payload: {
            tripId,
            status: 'no-response',
            cancellation_reason: 'driver did not respond',
            cancel_by: null,
          },
        })
      } catch (e) {}
      navigation.navigate('CarListingBottomSheet', { driverId })
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


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />
      <LinearGradient colors={["#0DCAF0", "#0AA8CD"]} style={styles.gradientBackground}>
        <View style={styles.contentContainer}>
          <View style={styles.pulseCircle} />

          <Text style={styles.loadingText}>{`Connecting you with a driver... ${secondsLeft}s`}</Text>

          <View style={styles.dotsContainer}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
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
                        if (typeof tripId === 'string' && tripId.startsWith('pending-') && pendingCreatedAt) {
                          // remove pending update instead of calling server
                          await removePendingUpdate(pendingCreatedAt)
                        } else {
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
                        }

                        // Navigate back to relevant screens
                        setModalVisible(false);
                        navigation.navigate("RequestScreen");
                        setTimeout(() => {
                          navigation.navigate("CarListingBottomSheet", { driverId });
                        }, 50);
                      } catch (error) {
                        console.error("Cancel trip error:", error);
                        try {
                          // If cancellation failed while online or we couldn't reach server,
                          // enqueue a trip status update so it will be retried when online.
                          if (!(typeof tripId === 'string' && tripId.startsWith('pending-') && pendingCreatedAt)) {
                            await addPendingUpdate({
                              type: 'trip_status_update',
                              payload: {
                                tripId,
                                status: 'no-response',
                                cancellation_reason: 'customer changed mind',
                                cancel_by: 'customer',
                              },
                            })
                          }
                        } catch (e) {
                          // ignore enqueue errors
                        }
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