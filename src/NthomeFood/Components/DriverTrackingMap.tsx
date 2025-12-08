import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../FirebaseConfig';
import { useSelector } from 'react-redux';
import { GOOGLE_MAPS_APIKEY } from "@env"

const { width, height } = Dimensions.get('window');

const responsiveWidth = (percentage) => (width * percentage) / 100;
const responsiveHeight = (percentage) => (height * percentage) / 100;
const scaleFont = (size) => (width / 375) * size;

// Production configuration
const PRODUCTION_CONFIG = {
  UPDATE_THROTTLE: {
    MIN_DISTANCE: 8,
    MIN_TIME: 4000,
    HEADING_CHANGE: 15,
  },
  OFFLINE_DETECTION: {
    TIMEOUT: 15000,
    RETRY_INTERVAL: 5000,
    MAX_RETRIES: 3,
  },
  ANIMATION: {
    DURATION: 900,
    MAX_QUEUE_SIZE: 2,
  },
  MAP: {
    MIN_ZOOM: 14,
    MAX_ZOOM: 18,
    TRACKING_PADDING: { top: 100, right: 50, bottom: 100, left: 50 },
  },
  PERFORMANCE: {
    MARKER_TRACKS_VIEW_CHANGES: false,
    MAX_CONCURRENT_ANIMATIONS: 1,
  }
};

// Helper function to calculate distance between coordinates (in meters)
const getDistance = (coord1, coord2) => {
  if (!coord1 || !coord2) return 0;
  
  const R = 6371e3;
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Calculate bearing (direction) between two points
const calculateBearing = (prevCoord, newCoord) => {
  if (!prevCoord || !newCoord) return 0;
  
  const φ1 = prevCoord.latitude * Math.PI / 180;
  const φ2 = newCoord.latitude * Math.PI / 180;
  const Δλ = (newCoord.longitude - prevCoord.longitude) * Math.PI / 180;
  
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
          Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  
  return ((θ * 180 / Math.PI) + 360) % 360;
};

// Google Maps Directions API (Optional)
const getDirections = async (origin, destination, waypoints = []) => {
  try {
    const apiKey = GOOGLE_MAPS_APIKEY;
    if (!apiKey) {
      console.warn('Google Maps API key not configured');
      return null;
    }
    
    const waypointsParam = waypoints.length > 0 
      ? `&waypoints=${waypoints.map(wp => `${wp.latitude},${wp.longitude}`).join('|')}`
      : '';
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${origin.latitude},${origin.longitude}` +
      `&destination=${destination.latitude},${destination.longitude}` +
      `${waypointsParam}` +
      `&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const points = route.overview_polyline.points;
      return decodePolyline(points);
    }
  } catch (error) {
    console.error('Directions API error:', error);
  }
  return null;
};

// Decode Google Maps polyline
const decodePolyline = (encoded) => {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat * 1e-5,
      longitude: lng * 1e-5
    });
  }
  return points;
};

const DriverTrackingMap = ({ 
  orderId, 
  driverId: propDriverId,
  restaurantLocation, 
  customerLocation,
  showRoute = true,
  followDriver = true,
  useDirectionsAPI = false
}) => {
  // State
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapFitted, setMapFitted] = useState(false);
  const [driverBearing, setDriverBearing] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs
  const mapRef = useRef(null);
  const lastLocationRef = useRef(null);
  const lastCameraZoomRef = useRef(15);
  const lastFollowRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const lastHeadingRef = useRef(0);
  const animationQueueRef = useRef([]);
  const isAnimatingRef = useRef(false);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef(null);

  // Default region
  const defaultRegion = {
    latitude: -26.2041,
    longitude: 28.0473,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // Get driverId from Redux store
  const reduxDriverId = useSelector((state) => {
    if (orderId && state.orderDetails?.orders?.[orderId]) {
      return state.orderDetails.orders[orderId].driverId;
    }
    return null;
  });

  // Use driverId from props first, then from Redux
  const driverId = propDriverId || reduxDriverId;

  // Server timestamp simulation
  const getServerTimestamp = () => Date.now();

  // Fit map to show all relevant markers
  const fitToMarkers = useCallback(() => {
    if (!mapRef.current || mapFitted) return;

    const markers = [];
    
    if (driverLocation) {
      markers.push({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
      });
    }
    
    if (restaurantLocation) {
      markers.push({
        latitude: restaurantLocation.latitude,
        longitude: restaurantLocation.longitude,
      });
    }
    
    if (customerLocation) {
      markers.push({
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
      });
    }

    if (markers.length > 0) {
      mapRef.current.fitToCoordinates(markers, {
        edgePadding: PRODUCTION_CONFIG.MAP.TRACKING_PADDING,
        animated: true,
      });
      setMapFitted(true);
    }
  }, [driverLocation, restaurantLocation, customerLocation, mapFitted]);

  // Center map on driver (manual control)
  const centerOnDriver = useCallback(() => {
    if (!driverLocation || !mapRef.current) return;

    try {
      mapRef.current.animateCamera(
        {
          center: driverLocation,
          zoom: 15,
        },
        { duration: 600 }
      );
    } catch (error) {
      console.warn('Center on driver error:', error);
    }
  }, [driverLocation]);

  // Update route coordinates
  const updateRoute = useCallback(() => {
    if (!restaurantLocation || !customerLocation) {
      setRouteCoordinates([]);
      return;
    }

    let newRoute = [];

    if (useDirectionsAPI && driverLocation) {
      // Simplified route - just connect the dots
      newRoute = [restaurantLocation, driverLocation, customerLocation];
    } else if (driverLocation) {
      newRoute = [restaurantLocation, driverLocation, customerLocation];
    } else {
      newRoute = [restaurantLocation, customerLocation];
    }

    setRouteCoordinates(newRoute);
  }, [restaurantLocation, customerLocation, driverLocation, useDirectionsAPI]);

  // Smart camera follow with throttling
  const smartFollowCamera = useCallback(() => {
    if (!driverLocation || !mapRef.current || !followDriver) return;

    const now = Date.now();
    const timeSinceLastCameraUpdate = now - lastUpdateTimeRef.current;

    // Throttle camera updates
    if (timeSinceLastCameraUpdate < 3000) {
      return;
    }

    try {
      mapRef.current.animateCamera(
        {
          center: driverLocation,
          zoom: 15,
        },
        { duration: 800 }
      );

      lastUpdateTimeRef.current = now;
    } catch (error) {
      console.warn('Camera animation error:', error);
    }
  }, [driverLocation, followDriver]);

  // Listen for driver location updates
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!driverId) {
      console.log('No driver ID available');
      setError('Driver not assigned yet');
      setLoading(false);
      return;
    }

    console.log('🚗 Starting driver tracking for:', driverId);
    
    const driverLocationRef = doc(db, "driver_locations", driverId.toString());
    
    // Setup Firebase listener
    unsubscribeRef.current = onSnapshot(
      driverLocationRef,
      (docSnapshot) => {
        try {
          if (!isMountedRef.current) return;

          if (docSnapshot.exists()) {
            const locationData = docSnapshot.data();
            
            console.log('📍 Location data received:', locationData);
            
            // Check if this location is for the current order
            if (!orderId || locationData.orderId === orderId) {
              const newLocation = {
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                timestamp: locationData.timestamp || Date.now(),
              };

              console.log('✅ Setting driver location:', newLocation);
              
              // Calculate bearing if we have previous location
              if (lastLocationRef.current) {
                const bearing = calculateBearing(lastLocationRef.current, newLocation);
                setDriverBearing(bearing);
              }
              
              // Update driver location state
              setDriverLocation(newLocation);
              lastLocationRef.current = newLocation;
              
              setError(null);
              setLoading(false);

              // Update route
              updateRoute();

              // Follow driver if enabled
              if (followDriver) {
                smartFollowCamera();
              }
            } else {
              console.log('⚠️ Location not for current order:', locationData.orderId, 'expected:', orderId);
            }
          } else {
            console.log('❌ Driver location document does not exist');
            setError('Driver location not available yet');
            setLoading(false);
          }
        } catch (err) {
          console.error('Error processing driver location:', err);
          setError('Error processing location data');
          setLoading(false);
        }
      },
      (error) => {
        console.error('Firestore connection error:', error);
        if (isMountedRef.current) {
          setError('Connection issue - retrying...');
          setRetryCount(prev => prev + 1);
          setLoading(false);
        }
      }
    );

    // Set timeout to stop loading if no data arrives
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && loading) {
        console.log('⏰ Loading timeout reached');
        setError('No location data received');
        setLoading(false);
      }
    }, 10000);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [driverId, orderId, followDriver, updateRoute, smartFollowCamera]);

  // Initial map fitting
  useEffect(() => {
    if (driverLocation || restaurantLocation || customerLocation) {
      const timer = setTimeout(() => {
        fitToMarkers();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [driverLocation, restaurantLocation, customerLocation, fitToMarkers]);

  // Update route when locations change
  useEffect(() => {
    updateRoute();
  }, [updateRoute]);

  // Memoized markers for performance
  const MemoizedDriverMarker = useMemo(() => {
    if (!driverId || !driverLocation) return null;
    
    return (
      <Marker
        coordinate={driverLocation}
        title="Driver"
        description={`Updated ${new Date(driverLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        anchor={{ x: 0.5, y: 0.5 }}
        rotation={driverBearing}
        flat={true}
      >
        <View style={[styles.marker, styles.driverMarker]}>
          <Text style={styles.driverMarkerText}>🚗</Text>
        </View>
      </Marker>
    );
  }, [driverId, driverLocation, driverBearing]);

  const MemoizedRestaurantMarker = useMemo(() => {
    if (!restaurantLocation) return null;
    
    return (
      <Marker
        coordinate={restaurantLocation}
        title="Restaurant"
        description="Pickup location"
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={[styles.marker, styles.restaurantMarker]}>
          <Text style={styles.markerText}>🏪</Text>
        </View>
      </Marker>
    );
  }, [restaurantLocation]);

  const MemoizedCustomerMarker = useMemo(() => {
    if (!customerLocation) return null;
    
    return (
      <Marker
        coordinate={customerLocation}
        title="Delivery Location"
        description="Your location"
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={[styles.marker, styles.customerMarker]}>
          <Text style={styles.markerText}>🏠</Text>
        </View>
      </Marker>
    );
  }, [customerLocation]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0DCAF0" />
        <Text style={styles.loadingText}>
          {driverId ? 'Tracking driver location...' : 'Waiting for driver assignment...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        loadingEnabled={true}
        loadingIndicatorColor="#0DCAF0"
        loadingBackgroundColor="#f8f9fa"
        mapType="standard"
        onMapReady={() => {
          console.log('✅ Map ready');
          if (driverLocation || restaurantLocation || customerLocation) {
            fitToMarkers();
          }
        }}
      >
        {/* Restaurant Marker */}
        {MemoizedRestaurantMarker}

        {/* Customer Location Marker */}
        {MemoizedCustomerMarker}

        {/* Driver Marker */}
        {MemoizedDriverMarker}

        {/* Route Polyline */}
        {showRoute && routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#0DCAF0"
            strokeWidth={3}
            lineDashPattern={[]}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {/* Floating Controls */}
      <View style={styles.floatingControls}>
        <View style={styles.controlGroup}>
          <TouchableOpacity style={styles.controlButton} onPress={fitToMarkers}>
            <Text style={styles.controlIcon}>📍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={centerOnDriver}>
            <Text style={styles.controlIcon}>🚗</Text>
          </TouchableOpacity>
        </View>
        
        {/* Status Indicator */}
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {driverLocation ? 
              `Updated ${new Date(driverLocation.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}` : 
              'Waiting for location...'
            }
          </Text>
        </View>
      </View>

      {/* Legend */}
      {(driverLocation || restaurantLocation || customerLocation) && (
        <View style={styles.legend}>
          {driverLocation && (
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.driverDot]} />
              <Text style={styles.legendLabel}>Driver</Text>
            </View>
          )}
          {restaurantLocation && (
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.restaurantDot]} />
              <Text style={styles.legendLabel}>Restaurant</Text>
            </View>
          )}
          {customerLocation && (
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.customerDot]} />
              <Text style={styles.legendLabel}>Your Location</Text>
            </View>
          )}
        </View>
      )}

      {/* Error Banner */}
      {error && !loading && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          {retryCount > 0 && (
            <Text style={styles.retryCountText}>Retry #{retryCount}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: responsiveHeight(65),
    backgroundColor: '#f8f9fa',
    borderRadius: responsiveWidth(3),
    overflow: 'hidden',
    marginVertical: responsiveHeight(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    marginTop: responsiveHeight(2),
    fontSize: scaleFont(14),
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: responsiveWidth(5),
  },
  marker: {
    width: responsiveWidth(10),
    height: responsiveWidth(10),
    borderRadius: responsiveWidth(5),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  driverMarker: {
    backgroundColor: '#0DCAF0',
  },
  restaurantMarker: {
    backgroundColor: '#34C759',
  },
  customerMarker: {
    backgroundColor: '#5856D6',
  },
  markerText: {
    fontSize: scaleFont(14),
  },
  driverMarkerText: {
    fontSize: scaleFont(16),
  },
  // Floating Controls
  floatingControls: {
    position: 'absolute',
    top: responsiveHeight(2),
    right: responsiveWidth(2),
    alignItems: 'flex-end',
  },
  controlGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: responsiveWidth(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: responsiveHeight(1),
  },
  controlButton: {
    padding: responsiveWidth(3),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  controlIcon: {
    fontSize: scaleFont(20),
  },
  statusIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: responsiveWidth(4),
    paddingVertical: responsiveHeight(0.8),
    paddingHorizontal: responsiveWidth(3),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statusDot: {
    width: responsiveWidth(2),
    height: responsiveWidth(2),
    borderRadius: responsiveWidth(1),
    backgroundColor: '#34C759',
    marginRight: responsiveWidth(2),
  },
  statusText: {
    fontSize: scaleFont(10),
    color: '#666',
    fontWeight: '500',
  },
  // Legend
  legend: {
    position: 'absolute',
    bottom: responsiveHeight(2),
    left: responsiveWidth(2),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: responsiveWidth(3),
    padding: responsiveWidth(2.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsiveHeight(0.8),
  },
  legendDot: {
    width: responsiveWidth(3),
    height: responsiveWidth(3),
    borderRadius: responsiveWidth(1.5),
    marginRight: responsiveWidth(2),
  },
  driverDot: {
    backgroundColor: '#0DCAF0',
  },
  restaurantDot: {
    backgroundColor: '#34C759',
  },
  customerDot: {
    backgroundColor: '#5856D6',
  },
  legendLabel: {
    fontSize: scaleFont(11),
    color: '#333',
    fontWeight: '500',
  },
  // Error Banner
  errorBanner: {
    position: 'absolute',
    top: responsiveHeight(2),
    left: responsiveWidth(2),
    right: responsiveWidth(2),
    backgroundColor: 'rgba(255, 107, 107, 0.95)',
    borderRadius: responsiveWidth(2),
    padding: responsiveWidth(3),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  errorBannerText: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontWeight: '600',
    flex: 1,
  },
  retryCountText: {
    color: '#fff',
    fontSize: scaleFont(10),
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: responsiveWidth(2),
    paddingVertical: responsiveHeight(0.5),
    borderRadius: responsiveWidth(1),
  },
});

export default DriverTrackingMap;