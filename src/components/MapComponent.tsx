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

const DestinationMarker = memo(({ coordinate }) => (
  <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 1 }}>
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

const MapComponent = ({ userOrigin, userDestination, driverLocation }) => {
  const dispatch = useDispatch()
  const mapRef = useRef(null)

  // Optimize map centering with useCallback
  const centerMap = useCallback(() => {
    if (!mapRef.current) return

    if (driverLocation?.latitude && driverLocation?.longitude) { 
      mapRef.current.animateToRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      })
    } else if (userOrigin?.latitude && userOrigin?.longitude) {
      mapRef.current.animateToRegion({
        latitude: userOrigin.latitude,
        longitude: userOrigin.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      })
    }
  }, [driverLocation, userOrigin])

  // Optimize fitting coordinates with useCallback
  const fitCoordinates = useCallback(() => {
    if (!mapRef.current) return

    if (userOrigin?.latitude && userDestination?.latitude) {
      const coordinates = [userOrigin, userDestination]

      // Only add driver location if it exists
      if (driverLocation?.latitude && driverLocation?.longitude) {
        coordinates.push(driverLocation)
      }

      // Filter out any invalid coordinates
      const validCoordinates = coordinates.filter((coord) => coord?.latitude && coord?.longitude)

      if (validCoordinates.length > 0) {
        mapRef.current.fitToCoordinates(validCoordinates, {
          edgePadding: {
            top: 450,
            right: 50,
            bottom: 350,
            left: 50,
          },
          animated: true,
        })
      }
    }
  }, [userOrigin, userDestination, driverLocation])

  // Effect for centering map
  useEffect(() => {
    centerMap()
  }, [centerMap])

  // Effect for fitting coordinates
  useEffect(() => {
    fitCoordinates()
  }, [fitCoordinates])

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
      dispatch(setDistance(result.distance))
      dispatch(setDuration(result.duration))
    },
    [dispatch],
  )

  // Optimize directions error callback
  const onDirectionsError = useCallback((errorMessage) => {
    console.log(errorMessage)
  }, [])

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={mapStyle}
        ref={mapRef}
        initialRegion={initialRegion}
        maxZoomLevel={18}
      >
        {userOrigin?.latitude && userOrigin?.longitude && <OriginMarker coordinate={userOrigin} />}

        {userDestination?.latitude && userDestination?.longitude && <DestinationMarker coordinate={userDestination} />}

        {driverLocation?.latitude && driverLocation?.longitude && <DriverMarker coordinate={driverLocation} />}

        {userOrigin?.latitude && userDestination?.latitude && (
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
          />
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
  },
  carImage: {
    width: 30,
    height: 30,
  },
})

export default memo(MapComponent)
