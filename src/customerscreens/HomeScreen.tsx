"use client"
import { useState, useEffect, useRef, useMemo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StyleSheet,
  Alert,
} from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import CustomDrawer from "../components/CustomDrawer"
import { useSelector } from "react-redux"
import useCachedUser from "../hooks/useCachedUser"
import { getRecentService, setRecentService } from '../utils/storage'
import { getRecentDestinations } from '../utils/storage'

const { width, height } = Dimensions.get("window")

// Constants
const POPULAR_CARD_WIDTH = width * 0.42
const POPULAR_CARD_SPACING = 12
const OFFER_CARD_WIDTH = width * 0.75
const OFFER_CARD_SPACING = 15
const RECENT_SEARCH_SPACING = 10
const SERVICE_CARD_WIDTH = width * 0.7
const SERVICE_CARD_SPACING = 15

// Images
const HEADER_RIGHT_IMAGE = require("../../assets/nthomeAir_images/homeScreen.png")

// Sample data (your existing data) - moved inside component to avoid hook issues


const popularDestinations = [
  { 
    id: "1", 
    city: "Sandton City", 
    image: { uri: "https://images.unsplash.com/photo-1555636222-cae831e670b3?w=400" },
    latitude: -26.1076,
    longitude: 28.0567,
    address: "Sandton City, Johannesburg, South Africa"
  },
  { 
    id: "2", 
    city: "Pretoria CBD", 
    image: { uri: "https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?w=400" },
    latitude: -25.7479,
    longitude: 28.2293,
    address: "Pretoria CBD, Pretoria, South Africa"
  },
  { 
    id: "3", 
    city: "OR Tambo Airport", 
    image: { uri: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400" },
    latitude: -26.1367,
    longitude: 28.2411,
    address: "OR Tambo International Airport, Johannesburg, South Africa"
  },
  { 
    id: "4", 
    city: "Menlyn Park", 
    image: { uri: "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=400" },
    latitude: -25.7859,
    longitude: 28.2773,
    address: "Menlyn Park Shopping Centre, Pretoria, South Africa"
  },
  { 
    id: "5", 
    city: "Fourways Mall", 
    image: { uri: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=400" },
    latitude: -26.0125,
    longitude: 28.0084,
    address: "Fourways Mall, Johannesburg, South Africa"
  },
]

const recentSearches = [
  { id: "1", term: "Cape Town, South Africa" },
  { id: "2", term: "Durban, South Africa" },
  { id: "3", term: "Johannesburg, South Africa" },
  { id: "4", term: "Victoria Falls, Zimbabwe" },
]

const exclusiveOffers = [
  {
    id: "1",
    title: "Security",
    description: "All drivers are vetted and trips are monitored in real-time for your safety.",
    discount: "Safe Rides",
    image: require("../../assets/nthomeAir_images/ride.jpg"),
    category: "Feature",
  },
  {
    id: "2",
    title: "Affordability",
    description: "Transparent pricing and frequent promotions to keep fares low for riders.",
    discount: "Low Fares",
    image: { uri: "https://images.unsplash.com/photo-1485463611174-f302f6a5c1c9?w=800&q=80" },
    category: "Feature",
  },
  {
    id: "3",
    title: "Reliability",
    description: "Fast pickups, accurate ETAs and reliable drivers when you need them most.",
    discount: "On-time",
    image: { uri: "https://images.unsplash.com/photo-1520975915474-6c0b5b0b7c9a?w=800&q=80" },
    category: "Feature",
  },
]

// Mock weather data fallback
const getMockWeatherData = () => {
  const saWeatherConditions = [
    { condition: "Sunny", icon: "weather-sunny", tempRange: [20, 35], windRange: [5, 15] },
    { condition: "Partly Cloudy", icon: "weather-partly-cloudy", tempRange: [18, 28], windRange: [8, 18] },
    { condition: "Cloudy", icon: "weather-cloudy", tempRange: [16, 24], windRange: [10, 20] },
    { condition: "Light Rain", icon: "weather-rainy", tempRange: [14, 22], windRange: [12, 25] },
    { condition: "Thunderstorms", icon: "weather-lightning-rainy", tempRange: [15, 23], windRange: [15, 30] },
    { condition: "Clear", icon: "weather-night", tempRange: [12, 20], windRange: [5, 12] }
  ];

  const randomCondition = saWeatherConditions[Math.floor(Math.random() * saWeatherConditions.length)];
  const [minTemp, maxTemp] = randomCondition.tempRange;
  const [minWind, maxWind] = randomCondition.windRange;

  const temp = Math.floor(Math.random() * (maxTemp - minTemp + 1)) + minTemp;
  const wind = Math.floor(Math.random() * (maxWind - minWind + 1)) + minWind;
  const humidity = Math.floor(Math.random() * 30) + 50;

  return {
    temp: temp,
    condition: randomCondition.condition,
    icon: randomCondition.icon,
    wind: wind,
    humidity: humidity,
    location: "Current Location"
  };
};

// Improved Weather Function with Fallback
const fetchWeatherData = async (latitude, longitude) => {
  // Try Google Weather API first
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_APIKEY;
    
    console.log('Fetching weather data from Google...');
    const response = await fetch(
      `https://weatherapi-com.p.rapidapi.com/current.json?q=${latitude},${longitude}`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': GOOGLE_API_KEY,
          'X-RapidAPI-Host': 'weatherapi-com.p.rapidapi.com'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        temp: Math.round(data.current.temp_c),
        condition: data.current.condition.text,
        icon: getWeatherIconFromCondition(data.current.condition.text),
        wind: Math.round(data.current.wind_kph),
        humidity: data.current.humidity,
        location: data.location.name
      };
    }
  } catch (error) {
    console.log('Google Weather API failed, trying OpenWeather...', error.message);
  }

  // Fallback to OpenWeather API
  try {
    const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

    console.log('Fetching weather data from OpenWeather...');
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`API failed with status: ${response.status}`);
    }

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].description,
      icon: getWeatherIcon(data.weather[0].id),
      wind: Math.round(data.wind.speed * 3.6),
      humidity: data.main.humidity,
      location: data.name
    };
  } catch (error) {
    console.log('All weather APIs failed, using mock data:', error.message);
    return getMockWeatherData();
  }
};

const getWeatherIconFromCondition = (condition) => {
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes('thunder') || lowerCondition.includes('storm')) return 'weather-lightning';
  if (lowerCondition.includes('drizzle')) return 'weather-pouring';
  if (lowerCondition.includes('rain')) return 'weather-rainy';
  if (lowerCondition.includes('snow') || lowerCondition.includes('sleet')) return 'weather-snowy';
  if (lowerCondition.includes('mist') || lowerCondition.includes('fog')) return 'weather-fog';
  if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) return 'weather-sunny';
  if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) return 'weather-cloudy';
  return 'weather-cloudy';
};

const getWeatherIcon = (weatherCode) => {
  if (weatherCode >= 200 && weatherCode < 300) return 'weather-lightning';
  if (weatherCode >= 300 && weatherCode < 500) return 'weather-pouring';
  if (weatherCode >= 500 && weatherCode < 600) return 'weather-rainy';
  if (weatherCode >= 600 && weatherCode < 700) return 'weather-snowy';
  if (weatherCode >= 700 && weatherCode < 800) return 'weather-fog';
  if (weatherCode === 800) return 'weather-sunny';
  if (weatherCode > 800) return 'weather-cloudy';
  return 'weather-cloudy';
};

const HomeScreen = ({ navigation }) => {
  // Define services with useMemo to stabilize reference
  const services = useMemo(() => [
    {
      id: "1",
      title: "NthomeRides",
      description: "Book safe, reliable rides anywhere in South Africa.",
      icon: <Ionicons name="car-sport" size={28} color="#0DCAF0" />,
      comingSoon: false,
    },
    {
      id: "2",
      title: "NthomeFood",
      description: "Order from your favourite SA restaurants in minutes.",
      icon: <Ionicons name="fast-food" size={28} color="#0DCAF0" />,
      comingSoon: true,
    },
    {
      id: "3",
      title: "NthomeAir",
      description: "Find the best deals on domestic and international flights.",
      icon: <Ionicons name="airplane" size={28} color="#0DCAF0" />,
      comingSoon: true,
    },
    {
      id: "4",
      title: "NthomeVan",
      description: "Move your belongings and heavy items anywhere in SA.",
      icon: <Ionicons name="bus" size={28} color="#0DCAF0" />,
      comingSoon: true,
    },
  ], []);

  const [weather, setWeather] = useState(null)
  const [loadingWeather, setLoadingWeather] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const _map = useRef(null)
  const [latlng, setLatlng] = useState(null)
  const [carsAround, setCarsAround] = useState([])
  const [recentDestinations, setRecentDestinations] = useState([])
  const [recentService, setRecentServiceState] = useState(null)
  const [displayServices, setDisplayServices] = useState(() => services)

  const user = useSelector((state) => state.auth.user)
  useCachedUser()
  const PROFILE_IMAGE = user?.profile_picture || "https://v0.dev/placeholder.svg?height=100&width=100"

  // Get location and weather
  useEffect(() => {
    let isMounted = true;

    const getLocationAndWeather = async () => {
      try {
        setLoadingWeather(true);

        // Request location permission
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied');
          // Use default South Africa location
          const defaultLocation = { latitude: -25.7479, longitude: 28.2293 }; // Pretoria
          setUserLocation(defaultLocation);
          setLatlng(defaultLocation);
          const weatherData = await fetchWeatherData(defaultLocation.latitude, defaultLocation.longitude);
          if (isMounted) setWeather(weatherData);
          return;
        }

        // Get current location
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMounted) return;

        const { latitude, longitude } = location.coords;
        setUserLocation({ latitude, longitude });
        setLatlng({ latitude, longitude });

        // Fetch weather data
        const weatherData = await fetchWeatherData(latitude, longitude);
        if (!isMounted) return;
        setWeather(weatherData);

        // Generate cars around location
        const generatedCars = Array.from({ length: 8 }).map(() => ({
          latitude: latitude + (Math.random() - 0.5) * 0.01,
          longitude: longitude + (Math.random() - 0.5) * 0.01,
        }));
        setCarsAround(generatedCars);

      } catch (error) {
        const msg = error && error.message ? String(error.message) : ''
        const isTransient = /Google Play services|connection to Google Play services|service disconnection|has been rejected|Service not Available|Location request has been rejected|Call to function/i.test(msg) || (error && (error.code === 20 || error.code === '20'))
        if (isTransient) {
          console.warn('Transient location error in HomeScreen suppressed:', msg || error)
        } else {
          console.log('Error:', error);
        }
        if (!isMounted) return;

        // Fallback to default data
        const fallbackLocation = { latitude: -25.7479, longitude: 28.2293 };
        setUserLocation(fallbackLocation);
        setLatlng(fallbackLocation);
        const fallbackWeather = getMockWeatherData();
        setWeather(fallbackWeather);
      } finally {
        if (isMounted) {
          setLoadingWeather(false);
        }
      }
    };

    getLocationAndWeather();

    const loadRecentService = async () => {
      try {
        const recent = await getRecentService()
        if (isMounted) {
          if (recent && recent.id) {
            const matched = services.find(s => s.id === recent.id)
            if (matched) {
              setRecentServiceState(matched)
              const rest = services.filter(s => s.id !== matched.id)
              setDisplayServices([matched, ...rest])
            } else {
              setDisplayServices(services)
            }
          } else {
            setDisplayServices(services)
          }
        }
      } catch (e) {
        // ignore
      }
    }
    loadRecentService();

    const loadRecents = async () => {
      try {
        const r = await getRecentDestinations(8)
        setRecentDestinations(r)
      } catch (e) {
        setRecentDestinations([])
      }
    }
    loadRecents();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  

  // Refresh weather
  const refreshWeather = async () => {
    setLoadingWeather(true);
    try {
      const locationToUse = userLocation || { latitude: -25.7479, longitude: 28.2293 };
      const weatherData = await fetchWeatherData(locationToUse.latitude, locationToUse.longitude);
      setWeather(weatherData);
    } catch (error) {
      console.error('Error refreshing weather:', error);
    } finally {
      setLoadingWeather(false);
    }
  };

  // Weather widget
  const renderWeatherWidget = () => (
    <TouchableOpacity onPress={refreshWeather} style={styles.weatherWidget}>
      {loadingWeather ? (
        <ActivityIndicator size="small" color="#0DCAF0" />
      ) : weather ? (
        <>
          <MaterialCommunityIcons
            name={weather.icon}
            color="#0DCAF0"
            size={20}
            style={styles.weatherIcon}
          />
          <Text style={styles.weatherTempText}>{weather.temp}°</Text>
          <View style={styles.weatherDetails}>
            <Text style={styles.weatherCondition}>
              {weather.condition.length > 10
                ? weather.condition.substring(0, 10) + '...'
                : weather.condition
              }
            </Text>
            <View style={styles.weatherMetric}>
              <MaterialCommunityIcons name="weather-windy" color="#666" size={12} />
              <Text style={styles.weatherMetricText}>{weather.wind} km/h</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.weatherError}>
          <MaterialCommunityIcons name="refresh" color="#666" size={16} />
          <Text style={styles.weatherErrorText}>Refresh</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  return (
    <View style={styles.fullScreenContainer}>
      {/* Header Section */}
      <View style={styles.newHeader}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerTopBar}>
            <TouchableOpacity onPress={toggleDrawer} style={styles.roundButton}>
              <Ionicons name="menu" color="#0DCAF0" size={30} />
            </TouchableOpacity>

            {renderWeatherWidget()}

            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profilePictureContainer}>
              <Image
                source={{ uri: PROFILE_IMAGE }}
                style={styles.profilePicture}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.mainHeaderContentRow}>
            <View style={styles.leftColumn}>
              <Text style={styles.welcomeText}>Welcome back!</Text>
              <Text style={styles.title}>
                Where are you <Text style={styles.titleAccent}>heading next?</Text>
              </Text>
              <Text style={styles.slogan}>Nthome ka Petjana!</Text>
              <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('RequestScreen')}>
                <Text style={styles.headerButtonText}>Request Ride</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.rightColumn}>
              <Image
                source={HEADER_RIGHT_IMAGE}
                style={styles.headerRightImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.headerDivider} />

      {/* Content Sections */}
      <ScrollView
        style={styles.scrollViewContent}
        contentContainerStyle={styles.scrollViewInnerContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Our Services</Text>
            <TouchableOpacity onPress={() => navigation.navigate('services')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={displayServices}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.serviceCard, item.comingSoon && styles.serviceCardDisabled]}
                onPress={async () => {
                  try {
                    // persist recent service id and bring it to front
                    await setRecentService({ id: item.id })
                    setRecentServiceState(item)
                    const rest = services.filter(s => s.id !== item.id)
                    setDisplayServices([item, ...rest])
                  } catch (e) {}
                  switch (item.id) {
                    case "1": 
                      navigation.navigate("RequestScreen"); 
                      break;
                    case "2": 
                      Alert.alert("Coming Soon", "NthomeFood service will be available soon!", [
                        { text: "OK" },
                      ]);
                      break;
                    case "3": 
                      Alert.alert("Coming Soon", "NthomeAir service will be available soon!", [
                        { text: "OK" },
                      ]);
                      break;
                    case "4": 
                      Alert.alert("Coming Soon", "NthomeVan service will be available soon!", [
                        { text: "OK" },
                      ]);
                      break;
                    default: break;
                  }
                }}
              >
                <View style={styles.serviceIcon}>{item.icon}</View>
                <View style={styles.serviceTextContainer}>
                  <Text style={styles.serviceCardTitle}>{item.title}</Text>
                  <Text style={styles.serviceCardDesc}>{item.description}</Text>
                  {item.comingSoon && (
                    <View style={styles.comingSoonBadgeHome}>
                      <Text style={styles.comingSoonTextHome}>Coming Soon</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        </View>

        {/* Other sections remain the same */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Destinations</Text>
          <FlatList
            data={popularDestinations}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.popularCard}
                onPress={() => {
                  navigation.navigate("RequestScreen", {
                    presetDestination: {
                      latitude: item.latitude,
                      longitude: item.longitude,
                      address: item.address
                    }
                  });
                }}
              >
                <Image source={item.image} style={styles.popularImage} />
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.popularCardOverlay}>
                  <Text style={styles.popularCity}>{item.city}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <FlatList
            data={recentDestinations && recentDestinations.length > 0 ? recentDestinations : recentSearches}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.recentSearchTag} onPress={() => {
                // If item is from storage it may have address/name fields
                const text = item.term || item.address || item.name
                // navigate to RequestScreen with pre-filled destination
                navigation.navigate('RequestScreen', { presetDestination: item })
              }}>
                <Text style={styles.recentSearchText}>{item.term || item.address || item.name}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item, idx) => item.id || item.savedAt?.toString() || idx.toString()}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exclusive Offers</Text>
          <FlatList
            data={exclusiveOffers}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.offerCard}
                onPress={() => navigation.navigate("RequestScreen")}
              >
                <Image source={item.image} style={styles.offerImage} />
                <View style={styles.offerContent}>
                  <Text style={styles.offerDiscount}>{item.discount}</Text>
                  <Text style={styles.offerTitle}>{item.title}</Text>
                  <Text style={styles.offerDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        </View>
      </ScrollView>

      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </View>
  )
}

// Styles remain the same as your previous version
const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#E8F0F2",
  },
  newHeader: {
    backgroundColor: "#FFFFFF",
    height: height * 0.40,
    minHeight: 360,
    paddingHorizontal: 20,
    paddingBottom: 10,
    justifyContent: "space-between",
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  headerTopBar: {
    top: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  roundButton: {
    backgroundColor: "#fff",
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  weatherWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 10,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  weatherError: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherErrorText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  weatherIcon: {
    marginRight: 6,
  },
  weatherTempText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0DCAF0',
    marginRight: 8,
  },
  weatherDetails: {
    flex: 1,
  },
  weatherCondition: {
    fontSize: 10,
    color: '#333',
    fontWeight: '500',
  },
  weatherMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  weatherMetricText: {
    fontSize: 9,
    color: '#666',
    marginLeft: 2,
  },
  profilePictureContainer: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: '#0DCAF0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#0DCAF0',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  mainHeaderContentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leftColumn: {
    flex: 1,
    maxWidth: '60%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingRight: 10,
  },
  rightColumn: {
    flex: 1,
    maxWidth: '50%',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerRightImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    maxWidth: 280,
    maxHeight: 290,
  },
  welcomeText: {
    fontSize: width < 400 ? 16 : 18,
    color: '#333',
    marginBottom: 6,
    fontWeight: '500',
  },
  title: {
    fontSize: width < 400 ? 22 : 28,
    color: "#1A202C",
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "left",
  },
  titleAccent: {
    color: "#0DCAF0",
    fontWeight: "bold",
  },
  slogan: {
    fontSize: width < 400 ? 12 : 14,
    color: '#555',
    fontStyle: 'italic',
    marginTop: 0,
    marginBottom: 10,
    textAlign: 'left',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0DCAF0',
    paddingVertical: 12,
    paddingHorizontal: width < 400 ? 15 : 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#0DCAF0',
    marginTop: 0,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: width < 400 ? 14 : 16,
    fontWeight: '600',
    marginRight: 8,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
    marginTop: -10,
    marginBottom: 20,
  },
  scrollViewContent: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollViewInnerContent: {
    paddingTop: 25,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginBottom: 10,
  },
  seeAllText: {
    color: '#0DCAF0',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 10,
    marginBottom: -10,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A202C",
    marginBottom: 18,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 15,
    padding: 18,
    width: SERVICE_CARD_WIDTH,
    marginRight: SERVICE_CARD_SPACING,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  serviceIcon: {
    marginRight: 15,
  },
  serviceTextContainer: {
    flex: 1,
  },
  serviceCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  serviceCardDesc: {
    color: "#777",
    fontSize: 13,
  },
  serviceCardDisabled: {
    opacity: 0.6,
  },
  comingSoonBadgeHome: {
    backgroundColor: "#0DCAF0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  comingSoonTextHome: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  horizontalListContent: {
    paddingHorizontal: 0,
  },
  servicesListContent: {
    paddingHorizontal: 0,
  },
  popularCard: {
    width: POPULAR_CARD_WIDTH,
    marginRight: POPULAR_CARD_SPACING,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  popularImage: {
    width: "100%",
    height: 140,
    resizeMode: "cover",
    borderRadius: 20,
  },
  popularCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 15,
  },
  popularCity: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "left",
  },
  recentSearchTag: {
    backgroundColor: "#F0F8FF",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 10,
    marginRight: RECENT_SEARCH_SPACING,
    borderWidth: 1,
    borderColor: "#D0EEF5",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  recentSearchText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "500",
  },
  offerCard: {
    width: OFFER_CARD_WIDTH,
    marginRight: OFFER_CARD_SPACING,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  offerImage: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  offerContent: {
    padding: 18,
  },
  offerDiscount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF5722",
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 5,
  },
  offerDescription: {
    fontSize: 14,
    color: "#777",
  },
})

export default HomeScreen