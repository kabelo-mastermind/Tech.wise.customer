"use client"

import { useEffect, useRef, memo, useCallback } from "react"
import { View, StyleSheet, Image } from "react-native"
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import { mapStyle } from "../global/mapStyle"
import { GOOGLE_MAPS_APIKEY } from "@env"
import { useDispatch } from "react-redux"
import { setDistance, setDuration } from "../redux/actions/locationActions"
import { Icon } from "react-native-elements"

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
  showDirections = true // Default to true
}) => {
  const dispatch = useDispatch()
  const mapRef = useRef(null)

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

  const initialRegion =
    userOrigin?.latitude && userOrigin?.longitude
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
        showsUserLocation={false} // Added to prevent conflicts
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

        {/* Render directions based on trip status */}
        {showDirections && userDestination?.latitude && userDestination?.longitude && (
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
      </MapView>
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
})

export default memo(MapComponent)
