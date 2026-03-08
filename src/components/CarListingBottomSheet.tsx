import { BlurView } from 'expo-blur';
import React, { useContext, useEffect, useState, useRef } from 'react';
import { Pressable, StyleSheet, SectionList, Image, Dimensions, Alert } from 'react-native';
import { View, Text } from 'react-native-animatable';
import { Icon } from 'react-native-elements';
import { DestinationContext, OriginContext } from '../contexts/contexts';
import { useSelector } from 'react-redux'; // Import useSelector
import { connectSocket, listenToTripDeclined, stopListeningToTripDeclined, listenToMultipleTripStatuses, stopListeningToMultipleTripStatuses } from '../configSocket/socketConfig';
import axios from 'axios'; // Import axios for API calls
import { api } from '../../api';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { saveCachedCarListings, getCachedCarListings, saveCachedDriverLocations, getCachedDriverLocations } from '../utils/storage';
import { db } from '../../FirebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

const { height } = Dimensions.get("window");

  const MAX_RESULTS = 5 // maximum drivers to show per radius

  // Select up to `max` drivers while attempting to balance vehicle classes (round-robin by `item.class`).
  const selectBalancedDrivers = (list, max) => {
    if (!Array.isArray(list) || list.length === 0) return []
    const groups = {}
    for (const item of list) {
      const key = item && (item.class !== undefined && item.class !== null) ? String(item.class) : 'unknown'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }

    const keys = Object.keys(groups)
    const selected = []
    // Round-robin pick from each class group in the order they first appear
    while (selected.length < max) {
      let added = false
      for (const k of keys) {
        if (groups[k].length > 0) {
          selected.push(groups[k].shift())
          added = true
          if (selected.length >= max) break
        }
      }
      if (!added) break
    }
    return selected
  }

const CarListingBottomSheet = ({ navigation, route }) => {
  const { dispatchDestination } = useContext(DestinationContext);
  const nthome_black = require('../../assets/uberGo.png');
  const nthome_x = require('../../assets/uberX.png');

  // Accessing distance and duration from the Redux store
  const distance = useSelector(state => state.location.distance);
  const duration = useSelector(state => state.location.duration);
  // console.log("disstanceeeeeeeeeeeeeee:", distance, "durationssssssssssss:", duration);
  const driverId = route?.params?.driverId || null;
  const user_id = useSelector((state) => state.auth?.user?.user_id);
  // const driverId = useSelector((state) => state.trip.tripData?.driver_id || "");
  // console.log("Driver IDoooooooooooooo:", driverId);


  // State to store car data
  const [carDataFull, setCarDataFull] = useState([]);
  const [carData, setCarData] = useState([]);
  const [isBlurViewVisible, setIsBlurViewVisible] = useState(true); // State to control BlurView visibility
  const [isConnected, setIsConnected] = useState(true);
  const offlineAlertShownRef = useRef(false);
  const [isCachedData, setIsCachedData] = useState(false);
  const [cachedSavedAt, setCachedSavedAt] = useState<number | null>(null);
  const isConnectedRef = useRef(true);
  const isBlurViewVisibleRef = useRef(true);

  const formatExactTime = (ts: number | null) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString();
  };

  const originContext = useContext(OriginContext)
  const originCoords = originContext?.origin || null
  const routeCenter = route?.params?.destinations || null

  const getItemCoords = (item) => {
    if (!item) return null
    if (item.latitude && item.longitude) return { latitude: item.latitude, longitude: item.longitude }
    if (item.lat && item.lon) return { latitude: item.lat, longitude: item.lon }
    if (item.driverLocation && item.driverLocation.latitude && item.driverLocation.longitude) return { latitude: item.driverLocation.latitude, longitude: item.driverLocation.longitude }
    if (item.location && item.location.latitude && item.location.longitude) return { latitude: item.location.latitude, longitude: item.location.longitude }
    return null
  }

  const haversineKm = (a, b) => {
    if (!a || !b) return Infinity
    const R = 6371
    const dLat = (b.latitude - a.latitude) * Math.PI / 180
    const dLon = (b.longitude - a.longitude) * Math.PI / 180
    const lat1 = a.latitude * Math.PI / 180
    const lat2 = b.latitude * Math.PI / 180
    const sinDLat = Math.sin(dLat/2)
    const sinDLon = Math.sin(dLon/2)
    const aa = sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLon*sinDLon
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa))
    return R * c
  }

  const [radiusKm, setRadiusKm] = useState(3)
  const radiusSteps = [3, 5, 10]

  // Fetch driver locations from Firestore with offline caching
  const fetchDriverLocations = async () => {
    try {
      const net = await NetInfo.fetch();
      
      // If offline, load from cache
      if (!net.isConnected) {
        console.log('Offline — loading cached driver locations');
        const cached = await getCachedDriverLocations();
        return cached || {};
      }
      
      // If online, fetch from Firestore
      const locationsRef = collection(db, "driver_locations");
      const snapshot = await getDocs(locationsRef);
      const locations = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId || doc.id; // Use document ID as fallback
        console.log(`📍 Firestore doc ID: ${doc.id}, userId field: ${data.userId}, using: ${userId}, lat: ${data.latitude}, lon: ${data.longitude}`);
        
        // Store with both string and number keys to handle type mismatches
        const userIdStr = String(userId);
        const userIdNum = Number(userId);
        
        const locationData = {
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
        };
        
        locations[userIdStr] = locationData;
        if (!isNaN(userIdNum)) {
          locations[userIdNum] = locationData;
        }
        // Also store by document ID
        locations[doc.id] = locationData;
      });
      
      const uniqueDriverCount = new Set(
        Object.keys(locations).filter(key => !isNaN(Number(key)) || key.length < 5)
      ).size;
      console.log('✅ Total driver locations fetched:', uniqueDriverCount, 'unique drivers');
      console.log('📦 Location keys stored:', Object.keys(locations).slice(0, 10));
      
      // Cache for offline use
      await saveCachedDriverLocations(locations);
      console.log('Driver locations cached successfully');
      
      return locations;
    } catch (error) {
      console.error("Error fetching driver locations from Firestore:", error);
      // Fallback to cache on error
      const cached = await getCachedDriverLocations();
      return cached || {};
    }
  };

  const filterByRadius = (fullList, center, radius) => {
    if (!center) return fullList
    return fullList.filter(item => {
      // Filter out drivers who are neither online nor recently flagged (declined/canceled/no-response)
      try {
        let statusParts = '';
        if (Array.isArray(item.driverStatus)) statusParts += item.driverStatus.join(' ');
        else statusParts += item.driverStatus || '';
        statusParts += ' ' + (item.driverState || '');
        const combined = statusParts.toString().toLowerCase();
        const isFlagged = ['declined', 'canceled', 'cancelled', 'no-response', 'no response', "didn't respond", 'noresponse'].some(s => combined.includes(s));

        if (item.driverState !== 'online' && !isFlagged) {
          console.log('Filtering out driver (not online):', item.driverName, 'State:', item.driverState);
          return false;
        }
      } catch (e) {
        // If anything goes wrong, be permissive and include the item so it can be inspected
        console.warn('Error checking driver status for filtering, including driver by default', e);
      }
      
      const coords = getItemCoords(item)
      if (!coords) {
        // Show warning but still include online drivers without coordinates
        console.log('⚠️ Driver has no location data:', item.driverName);
        return true
      }
      const d = haversineKm(center, coords)
      const inRadius = d <= radius
      console.log(`Driver ${item.driverName}: ${d.toFixed(2)}km away, in radius: ${inRadius}`);
      return inRadius
    })
  }

  // Helper: determine if a driver should be flagged (declined, canceled, no-response)
  const isFlaggedDriver = (item) => {
    if (!item) return false;
    const combined = `${item.driverStatus || ''} ${item.driverState || ''}`.toString().toLowerCase();
    return ['declined', 'canceled', 'cancelled', 'no-response', 'no response', "didn't respond", 'noresponse'].some(s => combined.includes(s));
  }

  // Move flagged drivers to the end of the list while preserving order otherwise
  const reorderDrivers = (list) => {
    if (!Array.isArray(list)) return list || [];
    const normal = [];
    const flagged = [];
    list.forEach(item => {
      if (isFlaggedDriver(item)) flagged.push(item);
      else normal.push(item);
    });
    return [...normal, ...flagged];
  }

  const getFlagLabel = (item) => {
    if (!item) return null;
    const combined = `${item.driverStatus || ''} ${item.driverState || ''}`.toString().toLowerCase();
    if (combined.includes('declined')) return 'Driver declined';
    if (combined.includes('canceled') || combined.includes('cancelled')) return 'Driver cancelled';
    if (combined.includes('no-response') || combined.includes('no response') || combined.includes("didn't respond") || combined.includes('noresponse')) return 'No response';
    return null;
  }

  // Move fetch function out so it can be retried from a button
  const fetchCarData = async () => {
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        console.log('Offline — loading cached car listings and locations');
        const cached = await getCachedCarListings();
        const cachedLocations = await getCachedDriverLocations();
        
          if (cached && Array.isArray(cached.list) && cached.list.length > 0) {
          // Merge cached locations with cached car listings
          const carDataWithLocations = cached.list.map(car => {
            const loc = cachedLocations && (
              cachedLocations[car.userId] ||
              cachedLocations[String(car.userId)] ||
              cachedLocations[Number(car.userId)] ||
              cachedLocations[car.driverId] ||
              cachedLocations[String(car.driverId)]
            );
            
            if (loc) {
              return {
                ...car,
                latitude: loc.latitude,
                longitude: loc.longitude,
                locationTimestamp: loc.timestamp,
              };
            }
            return car;
          });
          
          setCarDataFull(carDataWithLocations);
          // filter cached list with current radius, reorder flagged drivers and select balanced top results
          const center = routeCenter || originCoords
          let filtered = reorderDrivers(filterByRadius(carDataWithLocations, center, radiusKm));
          // sort by distance to center so each class group's items are ordered by proximity
          try {
            filtered.sort((a, b) => {
              const ac = getItemCoords(a)
              const bc = getItemCoords(b)
              const ad = ac ? haversineKm(center, ac) : Infinity
              const bd = bc ? haversineKm(center, bc) : Infinity
              return ad - bd
            })
          } catch (e) {}
          setCarData(selectBalancedDrivers(filtered, MAX_RESULTS));
          setIsCachedData(true);
          setCachedSavedAt(cached.savedAt || null);
        } else {
          setCarDataFull([]);
          setCarData([]);
          setIsCachedData(false);
          setCachedSavedAt(null);
        }
        return;
      }
      const response = await axios.get(api + 'api/car-listings');
      const carListingsData = response.data;

      // Fetch driver locations from Firestore
      const driverLocations = await fetchDriverLocations();
      
      console.log('📍 Fetched driver locations from Firestore');
      console.log('🚗 Car listings data count:', carListingsData.length);
      console.log('🔍 Sample car listing userIds:', carListingsData.slice(0, 3).map(c => `${c.driverName}: userId=${c.userId} (${typeof c.userId}), driverId=${c.driverId}`));
      
      // Merge car listings with driver locations
      const fullCarData = carListingsData.map(car => {
        // Try to match by userId (try both as-is, as string, and as number)
        let driverLocation = driverLocations[car.userId] 
          || driverLocations[String(car.userId)] 
          || driverLocations[Number(car.userId)]
          || driverLocations[car.driverId] // Also try driverId
          || driverLocations[String(car.driverId)];
        
        console.log(`Matching driver ${car.driverName} - userId: ${car.userId} (type: ${typeof car.userId}), driverId: ${car.driverId}, found location:`, !!driverLocation);
        
        if (driverLocation) {
          return {
            ...car,
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
            locationTimestamp: driverLocation.timestamp,
          };
        }
        return car;
      });

      console.log("Fetched Car Data with locations:", fullCarData);

      setCarDataFull(fullCarData);
      const center = routeCenter || originCoords
      let filtered = reorderDrivers(filterByRadius(fullCarData, center, radiusKm));
      try {
        filtered.sort((a, b) => {
          const ac = getItemCoords(a)
          const bc = getItemCoords(b)
          const ad = ac ? haversineKm(center, ac) : Infinity
          const bd = bc ? haversineKm(center, bc) : Infinity
          return ad - bd
        })
      } catch (e) {}
      setCarData(selectBalancedDrivers(filtered, MAX_RESULTS));
      setIsCachedData(false);
      // cache for offline use
      saveCachedCarListings(fullCarData).catch(() => {});
      setCachedSavedAt(Date.now());

      console.log("Fetched Car Data:", fullCarData);
    } catch (error) {
      console.log("Error fetching data:", error);
    }
  };
  // This effect manages the BlurView visibility when navigating back to RequestScreen
  useFocusEffect(
    React.useCallback(() => {
      // Show BlurView when this screen gains focus, hide on blur
      setIsBlurViewVisible(true);
      isBlurViewVisibleRef.current = true;
      return () => {
        setIsBlurViewVisible(false);
        isBlurViewVisibleRef.current = false;
      };
    }, [])
  );
  useEffect(() => {
    // Connect customer socket and listen for driver decline/cancel events
    if (!user_id) return;
    try {
      connectSocket(user_id, 'customer');
    } catch (e) {
      console.warn('Socket connect failed in CarListingBottomSheet', e);
    }

    const handleDecline = (data) => {
      const incomingDriverId = data?.driverId || data?.driver_id || data?.driver || data?.driverIdString;
      if (!incomingDriverId) return;
      setCarDataFull((prev = []) => {
        const updated = prev.map(item => {
          if (String(item.driverId) === String(incomingDriverId) || String(item.userId) === String(incomingDriverId)) {
            return { ...item, driverStatus: 'declined', driverState: 'declined' };
          }
          return item;
        });
        // update filtered & reordered list, then limit & balance to MAX_RESULTS
        const center = routeCenter || originCoords;
        let filtered = reorderDrivers(filterByRadius(updated, center, radiusKm));
        try {
          filtered.sort((a, b) => {
            const ac = getItemCoords(a)
            const bc = getItemCoords(b)
            const ad = ac ? haversineKm(center, ac) : Infinity
            const bd = bc ? haversineKm(center, bc) : Infinity
            return ad - bd
          })
        } catch (e) {}
        setCarData(selectBalancedDrivers(filtered, MAX_RESULTS));
        return updated;
      });
    };

    listenToTripDeclined(handleDecline);
    // Also listen to generic status stream just in case
    listenToMultipleTripStatuses((status, payload) => {
      if (status === 'declined' || status === 'start' && payload?.action === 'declined') handleDecline(payload);
      if (status === 'end' && payload?.action === 'canceled') handleDecline(payload);
    });

    return () => {
      try { stopListeningToTripDeclined(); } catch (e) {}
      try { stopListeningToMultipleTripStatuses(); } catch (e) {}
    };
  }, [user_id, routeCenter, originCoords, radiusKm]);

  useEffect(() => {
    // initial fetch (if online)
    fetchCarData();

    // progressive radius expansion timers
    const t1 = setTimeout(() => setRadiusKm(radiusSteps[1]), 5000)
    const t2 = setTimeout(() => setRadiusKm(radiusSteps[2]), 15000)

    // Set up polling interval to continuously check for driver updates
    const pollingInterval = setInterval(() => {
      if (isConnectedRef.current && isBlurViewVisibleRef.current) {
        console.log('🔄 Polling for driver updates...');
        fetchCarData();
      }
    }, 8000); // Poll every 8 seconds

    return () => { 
      clearTimeout(t1); 
      clearTimeout(t2); 
      clearInterval(pollingInterval);
    }
  }, []);

  useEffect(() => {
    // Subscribe to connectivity changes and show a friendly alert once when offline
    let unsubscribe = () => {};
    if (NetInfo && typeof NetInfo.addEventListener === 'function') {
      unsubscribe = NetInfo.addEventListener(state => {
        const connected = !!state.isConnected;
        setIsConnected(connected);
        isConnectedRef.current = connected;
        
        if (!state.isConnected && !offlineAlertShownRef.current) {
        Alert.alert(
          'No internet connection',
          'You appear to be offline. Car listings may be unavailable — please check your connection.',
        );
        offlineAlertShownRef.current = true;
      }
      if (state.isConnected) {
        // reset flag so we can alert again if it goes offline later
        offlineAlertShownRef.current = false;
        // try to refresh listings when connection returns
        fetchCarData();
      }
      });
    }

    return () => { try { unsubscribe(); } catch (e) {} };
  }, []);

  useEffect(() => {
    // Re-filter when radius, origin, or carDataFull changes
    const center = routeCenter || originCoords
    if (carDataFull && carDataFull.length > 0) {
      let filtered = reorderDrivers(filterByRadius(carDataFull, center, radiusKm))
      try {
        filtered.sort((a, b) => {
          const ac = getItemCoords(a)
          const bc = getItemCoords(b)
          const ad = ac ? haversineKm(center, ac) : Infinity
          const bd = bc ? haversineKm(center, bc) : Infinity
          return ad - bd
        })
      } catch (e) {}
      setCarData(selectBalancedDrivers(filtered, MAX_RESULTS))
    }

    // Logging the distance and duration whenever they change
    if (distance !== null && duration !== null) {
      // console.log('Distance:', distance, 'km');
      // console.log('Duration:', duration, 'mins');
    }
  }, [distance, duration, radiusKm, carDataFull, routeCenter, originCoords]);

  // Disable car selection if driverId is present
  const isCarSelectable = !driverId;
  // console.log("carDatatttttttttttttttttttttttttttttttttttttttttttttttt:", carData);

  const handleItemPress = (item) => {
    if (!driverId || driverId !== item.driverId) {  // Allow selection if no driverId or if the driverId doesn't match
      // Keep the car listing in the stack so closing driver details returns here
      navigation.navigate('DriverDetailsBottomSheet', {
        id: item.driverId,
        driverName: item.driverName,
        driverRating: item.driverRating,
        price: Math.round(item.costPerKm * distance),
        ETA: duration,
        driverPhoto: item.driverPhoto,
        classType: item.class,
        driverState: item.driverState || [],
        driverStatus: item.driverStatus || [],
        carData: item
      });
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={styles.overlay} />
      {isBlurViewVisible && ( // Conditionally render BlurView based on state
        <BlurView intensity={70} tint="light" style={[styles.blurView, { backgroundColor: 'white' }]}>
          {/* <Pressable onPress={() => navigation.goBack()} style={styles.cancelContainer}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable> */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>Choose Your Ride</Text>
            <Text style={styles.radiusText}>{`Searching within ${radiusKm} km`}</Text>
            <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
              <Icon name="close" type="material-community" size={22} color="#FF3B30" />
            </Pressable>
          </View>
          {!isConnected && (
            <View style={styles.offlineBanner}>
              <Icon name="wifi-off" type="material-community" size={18} color="#fff" />
              <Text style={styles.offlineText}>You're offline — car listings may be limited.</Text>
            </View>
          )}
          {isCachedData && (
            <View style={styles.cachedBadge}>
              <Text style={styles.cachedText}>{`Cached ${formatExactTime(cachedSavedAt)}`}</Text>
            </View>
          )}
          <SectionList
            sections={[{ title: 'Available Cars', data: carData }]}
            keyExtractor={(item) => item.driverId.toString()}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleItemPress(item)}
                style={[
                  styles.itemContainer,
                  { opacity: driverId === item.driverId ? 0.5 : 1 } // Reduce opacity only for the matching car
                ]}
                disabled={driverId === item.driverId} // Disable only the matching car
              >
                <Image
                  source={item.driverGender === 'female'
                    ? require('../../assets/uberGo.png')
                    : require('../../assets/uberX.png')
                  }
                  style={styles.carImage}
                />

                <View style={styles.carInfo}>
                  <Text style={styles.carName}>
                    {item.class === 1 ? "nthome_black" : item.class === 2 ? "nthome_x" : "Unknown Type"}
                  </Text>
                  <Text style={styles.carNote}>{item.description}</Text>
                  <View style={styles.promotionContainer}>
                    <View style={styles.iconTextRow}>
                      <Icon
                        name="account"
                        type="material-community"
                        size={16}
                        color="gray"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={styles.promotionText}>{item.numberOfSeats}</Text>
                    </View>
                    <Text style={styles.carPrice}>R{Math.round(item.costPerKm * distance)}</Text>
                  </View>
                  {isFlaggedDriver(item) && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{getFlagLabel(item)}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            )}
          />
        </BlurView>
      )}
    </View>
  );
};

export default CarListingBottomSheet;



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)', // Semi-transparent background for overlay
  },
  overlay: {
    flex: 1,
    height: '60%', // Adjust the height of the transparent area (adjust as needed)
  },
  cancelButton: {
    position: 'absolute',
    right: 8,
    top: 6,
    padding: 6,
  },
  blurView: {
    height: '40%', // Set the bottom sheet to occupy 40% of the screen height
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    padding: 20,
  },
  cancelContainer: {
    alignSelf: 'flex-end',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  headerContainer: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
    marginTop: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  carImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#f8f8f8',
    resizeMode: 'contain',
  },
  carInfo: {
    flex: 1,
  },
  carName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  carNote: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  promotionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
  },
  offlineText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  cachedBadge: {
    alignSelf: 'center',
    backgroundColor: '#f0ad4e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  cachedText: {
    color: '#fff',
    fontSize: 12,
  },
  radiusText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    alignSelf: 'center',
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promotionText: {
    fontSize: 14,
    color: '#ff0000',
    marginRight: 10,
  },
  carPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007BFF',
  },
  statusBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
});
