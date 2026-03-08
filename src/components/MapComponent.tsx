"use client"

import { useEffect, useRef, memo, useCallback, useState } from "react"
import { View, StyleSheet, Image, TouchableOpacity } from "react-native"
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import { mapStyle } from "../global/mapStyle"
import { GOOGLE_MAPS_APIKEY } from "@env"
import { useDispatch } from "react-redux"
import { setDistance, setDuration } from "../redux/actions/locationActions"
import { Icon } from "react-native-elements"

// Utility functions for navigation
function calculateBearing(start, end) {
  if (!start || !end) return 0
  const toRad = (deg) => (deg * Math.PI) / 180
  const toDeg = (rad) => (rad * 180) / Math.PI
  const lat1 = toRad(start.latitude)
  const lon1 = toRad(start.longitude)
  const lat2 = toRad(end.latitude)
  const lon2 = toRad(end.longitude)
  const dLon = lon2 - lon1
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  let brng = Math.atan2(y, x)
  brng = toDeg(brng)
  return (brng + 360) % 360
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function getRouteDirection(currentLocation, polylineCoords, lookAheadDistance = 200) {
  if (!polylineCoords || polylineCoords.length < 2) return 0
  let currentIndex = 0
  let minDistance = Number.POSITIVE_INFINITY
  for (let i = 0; i < polylineCoords.length; i++) {
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      polylineCoords[i].latitude,
      polylineCoords[i].longitude,
    )
    if (distance < minDistance) {
      minDistance = distance
      currentIndex = i
    }
  }
  let accumulatedDistance = 0
  let targetIndex = currentIndex
  for (let i = currentIndex; i < polylineCoords.length - 1; i++) {
    const segmentDistance = calculateDistance(
      polylineCoords[i].latitude,
      polylineCoords[i].longitude,
      polylineCoords[i + 1].latitude,
      polylineCoords[i + 1].longitude,
    )
    accumulatedDistance += segmentDistance
    if (accumulatedDistance >= lookAheadDistance) {
      targetIndex = i + 1
      break
    }
    targetIndex = i + 1
  }
  return calculateBearing(polylineCoords[currentIndex], polylineCoords[targetIndex])
}

const CAMERA_MODES = {
  FOLLOW: 'follow',
  NORTH_UP: 'north_up',
  OVERVIEW: 'overview',
}

// Memoized markers for better performance
const OriginMarker = memo(({ coordinate }) => (
  <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 1 }}>
    <View style={styles.markerContainer}>
      <Icon type="material-community" name="map-marker" size={36} color="#4CAF50" />
    </View>
  </Marker>
))

// Fixed DestinationMarker with all required props
const DestinationMarker = memo(({ coordinate, onDragEnd, onDragStart, onDrag }) => (
  <Marker
    coordinate={coordinate}
    anchor={{ x: 0.5, y: 1 }}
    draggable
    onDragStart={onDragStart || (() => { })} // Added fallback
    onDrag={onDrag || (() => { })} // Added fallback
    onDragEnd={onDragEnd || (() => { })} // Added fallback
  >
    <View style={styles.markerContainer}>
      <Icon type="material-community" name="map-marker" size={36} color="#F44336" />
    </View>
  </Marker>
))

// Driver marker using the original car image without rotation animation
const DriverMarker = memo(({ coordinate }) => (
  <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
    <View style={styles.driverMarkerContainer}>
      <Image source={require("../../assets/carM.png")} style={styles.carImage} resizeMode="contain" />
    </View>
  </Marker>
))

const MapComponent = ({
  userOrigin,
  userDestination,
  driverLocation,
  tripStarted,
  onDestinationDrag,
  onDestinationDragEnd,
  onDestinationDragStart, // Added this prop
  showDirections = true, // Default to true
  onMapLongPress, // callback when user long-presses map
  onMapPress, // callback for single tap
  pinCoordinate, // temporary pin to render
  isConnected = true, // network state
}) => {
  const dispatch = useDispatch()
  const mapRef = useRef(null)

  // Camera mode and navigation state
  const [cameraMode, setCameraMode] = useState(CAMERA_MODES.FOLLOW)
  const [polylineCoords, setPolylineCoords] = useState([])
  const [driverHeading, setDriverHeading] = useState(0)
  const [prevDriverLocation, setPrevDriverLocation] = useState(null)

  // Debug logging to track props
  useEffect(() => {
    console.log('MapComponent Props:', {
      userOrigin,
      userDestination,
      driverLocation,
      tripStarted, // Added tripStarted to debug logs
      showDirections
    })
  }, [userOrigin, userDestination, driverLocation, showDirections, tripStarted])

  // Optimize map centering with useCallback
  const centerMap = useCallback(() => {
    if (!mapRef.current) return;

    if (userDestination?.latitude && userDestination?.longitude) {
      mapRef.current.animateToRegion({
        latitude: userDestination.latitude,
        longitude: userDestination.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    } else if (driverLocation?.latitude && driverLocation?.longitude) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    } else if (userOrigin?.latitude && userOrigin?.longitude) {
      mapRef.current.animateToRegion({
        latitude: userOrigin.latitude,
        longitude: userOrigin.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [userDestination, driverLocation, userOrigin]);

  // Optimize fitting coordinates with useCallback
  const fitCoordinates = useCallback(() => {
    if (!mapRef.current) return

    const coordinates = []

    // Add all valid coordinates
    if (userOrigin?.latitude && userOrigin?.longitude && !tripStarted) {
      coordinates.push(userOrigin)
    }

    if (userDestination?.latitude && userDestination?.longitude) {
      coordinates.push(userDestination)
    }

    if (driverLocation?.latitude && driverLocation?.longitude) {
      coordinates.push(driverLocation)
    }

    if (coordinates.length === 0) return

    // If we have exactly two points AND one is driverLocation, keep driver at center
    const hasDriver = driverLocation && driverLocation.latitude && driverLocation.longitude
    if (coordinates.length === 2 && hasDriver) {
      // Determine the other point (destination or origin)
      const other = coordinates.find(c => !(c.latitude === driverLocation.latitude && c.longitude === driverLocation.longitude))
      if (other) {
        // Compute deltas that will include the other point while centering on driver
        const latDiff = Math.abs(other.latitude - driverLocation.latitude)
        const lngDiff = Math.abs(other.longitude - driverLocation.longitude)

        // Add padding multiplier and minimum delta to avoid overzoom
        const PADDING_MULTIPLIER = 1.8
        const minDelta = 0.005
        const latitudeDelta = Math.max(latDiff * PADDING_MULTIPLIER, minDelta)
        const longitudeDelta = Math.max(lngDiff * PADDING_MULTIPLIER, minDelta)

        // Vertical offset so the driver appears lower on the screen (stable when toggling marker)
        const VERTICAL_OFFSET_FACTOR = 0.25 // 0 = exact center, positive moves driver lower on screen
        const centerLatitude = driverLocation.latitude + (latitudeDelta * VERTICAL_OFFSET_FACTOR)

        // Animate region with driver offset from center
        mapRef.current.animateToRegion({
          latitude: centerLatitude,
          longitude: driverLocation.longitude,
          latitudeDelta,
          longitudeDelta,
        }, 500)
        return
      }
    }

    // Fallback: use fitToCoordinates for multiple points
    if (coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 100,
          right: 50,
          bottom: 100,
          left: 50,
        },
        animated: true,
      })
    }
  }, [userOrigin, userDestination, driverLocation, tripStarted])

  // Effect for centering map
  useEffect(() => {
    centerMap()
  }, [centerMap])

  // Effect for fitting coordinates when destinations change
  useEffect(() => {
    if (userOrigin || userDestination || driverLocation) {
      fitCoordinates()
    }
  }, [userOrigin, userDestination, driverLocation, fitCoordinates])

  // Calculate bearing when driver moves
  useEffect(() => {
    if (driverLocation && prevDriverLocation) {
      const bearing = calculateBearing(prevDriverLocation, driverLocation)
      setDriverHeading(bearing)
    }
    if (driverLocation) {
      setPrevDriverLocation(driverLocation)
    }
  }, [driverLocation, prevDriverLocation])

  // Update camera based on mode
  useEffect(() => {
    if (!mapRef.current || !driverLocation || !tripStarted) return

    let cameraConfig = {}

    switch (cameraMode) {
      case CAMERA_MODES.FOLLOW:
        // Follow driver with rotation based on movement
        cameraConfig = {
          center: {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          },
          heading: driverHeading,
          pitch: 45,
          zoom: 18,
          altitude: 1000,
        }
        break

      case CAMERA_MODES.NORTH_UP:
        // North up view (0 degrees) with destination appearing from top
        let destinationBearing = 0
        if (polylineCoords.length > 0) {
          destinationBearing = getRouteDirection(driverLocation, polylineCoords, 100)
        } else if (userDestination) {
          destinationBearing = calculateBearing(driverLocation, userDestination)
        }
        
        cameraConfig = {
          center: {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          },
          heading: destinationBearing, // Rotate so destination appears from top
          pitch: 0,
          zoom: 16,
          altitude: 1000,
        }
        break

      case CAMERA_MODES.OVERVIEW:
        // Show entire route
        if (polylineCoords.length > 0) {
          const lats = polylineCoords.map((coord) => coord.latitude)
          const lngs = polylineCoords.map((coord) => coord.longitude)
          const minLat = Math.min(...lats)
          const maxLat = Math.max(...lats)
          const minLng = Math.min(...lngs)
          const maxLng = Math.max(...lngs)

          cameraConfig = {
            center: {
              latitude: (minLat + maxLat) / 2,
              longitude: (minLng + maxLng) / 2,
            },
            heading: 0,
            pitch: 0,
            zoom: 14,
            altitude: 2000,
          }
        }
        break
    }

    if (Object.keys(cameraConfig).length > 0) {
      mapRef.current.animateCamera(cameraConfig, { duration: 500 })
    }
  }, [cameraMode, driverLocation, driverHeading, polylineCoords, userDestination, tripStarted])

  const initialRegion = userOrigin?.latitude && userOrigin?.longitude
    ? {
      latitude: userOrigin.latitude,
      longitude: userOrigin.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }
    : {
      latitude: -25.5399,
      longitude: 28.1,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }

  // Optimize directions ready callback
  const onDirectionsReady = useCallback(
    (result) => {
      console.log('Directions ready:', result)
      dispatch(setDistance(result.distance))
      dispatch(setDuration(result.duration))
      
      // Store polyline coordinates for navigation
      if (result.coordinates?.length > 0) {
        setPolylineCoords(result.coordinates)
      }
    },
    [dispatch],
  )

  // Optimize directions error callback
  const onDirectionsError = useCallback((errorMessage) => {
    console.log('Directions error:', errorMessage)
  }, [])

  // Handle marker drag events with better error handling
  const handleMarkerDragStart = useCallback((e) => {
    console.log('Drag start:', e.nativeEvent.coordinate)
    if (onDestinationDragStart) {
      onDestinationDragStart(e.nativeEvent.coordinate)
    }
  }, [onDestinationDragStart])

  const handleMarkerDrag = useCallback((e) => {
    console.log('Dragging:', e.nativeEvent.coordinate)
    if (onDestinationDrag) {
      onDestinationDrag(e.nativeEvent.coordinate)
    }
  }, [onDestinationDrag])

  const handleMarkerDragEnd = useCallback((e) => {
    console.log('Drag end:', e.nativeEvent.coordinate)
    if (onDestinationDragEnd) {
      onDestinationDragEnd(e.nativeEvent.coordinate)
    }
  }, [onDestinationDragEnd])

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={mapStyle}
        ref={mapRef}
        initialRegion={initialRegion}
        maxZoomLevel={18}
        showsUserLocation={false}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        onLongPress={(e) => {
          if (onMapLongPress) onMapLongPress(e.nativeEvent.coordinate)
        }}
        onPress={(e) => {
          if (onMapPress) onMapPress(e.nativeEvent.coordinate)
        }}
      >
        {/* Render origin marker */}
        {userOrigin?.latitude && userOrigin?.longitude && !tripStarted && (
          <OriginMarker coordinate={userOrigin} />
        )}

        {/* Render destination marker */}
        {userDestination?.latitude && userDestination?.longitude && (
          <DestinationMarker
            coordinate={userDestination}
            onDragStart={handleMarkerDragStart}
            onDrag={handleMarkerDrag}
            onDragEnd={handleMarkerDragEnd}
          />
        )}

        {/* Render driver marker */}
        {driverLocation?.latitude && driverLocation?.longitude && (
          <DriverMarker coordinate={driverLocation} />
        )}

        {/* Render temporary pin if provided */}
        {pinCoordinate && pinCoordinate.latitude && pinCoordinate.longitude && (
          <Marker coordinate={pinCoordinate} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.pinMarkerContainer}>
              <Icon type="material-community" name="map-marker-radius" size={40} color="#FF9800" />
            </View>
          </Marker>
        )}

        {/* Render directions based on trip status */}
        {showDirections && isConnected && userDestination?.latitude && userDestination?.longitude && (
          tripStarted && driverLocation?.latitude && driverLocation?.longitude ? (
            // During trip: Show directions from driver to destination
            <MapViewDirections
              origin={driverLocation}
              destination={userDestination}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={4}
              strokeColor="#4CAF50" // Different color for active trip
              onReady={onDirectionsReady}
              onError={onDirectionsError}
              precision="high"
              timePrecision="now"
              mode="DRIVING"
            />
          ) : userOrigin?.latitude && userOrigin?.longitude ? (
            // Before trip: Show directions from origin to destination
            <MapViewDirections
              origin={userOrigin}
              destination={userDestination}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={4}
              strokeColor="#2c3e50"
              onReady={onDirectionsReady}
              onError={onDirectionsError}
              precision="high"
              timePrecision="now"
              optimizeWaypoints={true}
              mode="DRIVING"
            />
          ) : null
        )}
          {/* If offline, optionally show a simple polyline? For now skip directions when offline */}
      </MapView>

        {/* Map long press handled at MapView level */}

      {/* Camera mode buttons */}
      {tripStarted && driverLocation && (
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={[
              styles.cameraButton,
              cameraMode === CAMERA_MODES.FOLLOW && styles.activeCameraButton
            ]}
            onPress={() => setCameraMode(CAMERA_MODES.FOLLOW)}
          >
            <Icon name="navigation" type="material" size={20} color={cameraMode === CAMERA_MODES.FOLLOW ? "#fff" : "#333"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cameraButton,
              cameraMode === CAMERA_MODES.NORTH_UP && styles.activeCameraButton
            ]}
            onPress={() => setCameraMode(CAMERA_MODES.NORTH_UP)}
          >
            <Icon name="compass" type="material-community" size={20} color={cameraMode === CAMERA_MODES.NORTH_UP ? "#fff" : "#333"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cameraButton,
              cameraMode === CAMERA_MODES.OVERVIEW && styles.activeCameraButton
            ]}
            onPress={() => setCameraMode(CAMERA_MODES.OVERVIEW)}
          >
            <Icon name="map-outline" type="material-community" size={20} color={cameraMode === CAMERA_MODES.OVERVIEW ? "#fff" : "#333"} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    height: "100%",
    width: "100%",
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  driverMarkerContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: "#0DCAF0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carImage: {
    width: 30,
    height: 30,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  activeCameraButton: {
    backgroundColor: '#091E3E',
    borderColor: '#091E3E',
  },
  pinMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
})

export default memo(MapComponent)