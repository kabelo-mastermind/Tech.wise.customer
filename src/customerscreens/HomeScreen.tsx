"use client"
import { useState, useEffect, useRef } from "react"
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
} from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import CustomDrawer from "../components/CustomDrawer"
import { useSelector } from "react-redux"

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

// Sample data (your existing data)
const services = [
  {
    id: "1",
    title: "NthomeRides",
    description: "Book safe, reliable rides anywhere in South Africa.",
    icon: <Ionicons name="car-sport" size={28} color="#0A94B8" />,
  },
  {
    id: "2",
    title: "NthomeAir",
    description: "Find the best deals on domestic and international flights.",
    icon: <Ionicons name="airplane" size={28} color="#0A94B8" />,
  },
  {
    id: "3",
    title: "NthomeFood",
    description: "Order from your favourite SA restaurants in minutes.",
    icon: <Ionicons name="fast-food" size={28} color="#0A94B8" />,
  },
];

const popularDestinations = [
  { id: "1", city: "Cape Town", image: require("../../assets/nthomeAir_images/download.jpg") },
  { id: "2", city: "Durban", image: require("../../assets/nthomeAir_images/download (1).jpg") },
  { id: "3", city: "Johannesburg", image: require("../../assets/nthomeAir_images/download (2).jpg") },
  { id: "4", city: "Kruger National Park", image: require("../../assets/nthomeAir_images/greater.jpg") },
  { id: "5", city: "Victoria Falls", image: require("../../assets/nthomeAir_images/Victoria.jpg") },
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
    title: "Mzansi Getaway",
    description: "Fly from Joburg to Cape Town from just R999!",
    discount: "FROM R999",
    image: require("../../assets/nthomeAir_images/fly.jpg"),
    category: "Flights",
  },
  {
    id: "2",
    title: "Local Eats Deal",
    description: "Free delivery from your favourite local restaurants in Soweto.",
    discount: "FREE DELIVERY",
    image: require("../../assets/nthomeAir_images/food.jpg"),
    category: "Food Delivery",
  },
  {
    id: "3",
    title: "Gauteng Rider Special",
    description: "Get 20% off your next ride in Pretoria or Johannesburg.",
    discount: "20% OFF",
    image: require("../../assets/nthomeAir_images/ride.jpg"),
    category: "E-Hailing",
  },
]

// Improved Weather Function with Fallback
const fetchWeatherData = async (latitude, longitude) => {
  try {
    const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

    console.log('Fetching real weather data...');
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
    console.log('Using mock weather data due to error:', error.message);
    // return getMockWeatherData();
  }
};

// Realistic South Africa weather data
// const getMockWeatherData = () => {
//   // const saWeatherConditions = [
//   //   { condition: "Sunny", icon: "weather-sunny", tempRange: [20, 35], windRange: [5, 15] },
//   //   { condition: "Partly Cloudy", icon: "weather-partly-cloudy", tempRange: [18, 28], windRange: [8, 18] },
//   //   { condition: "Cloudy", icon: "weather-cloudy", tempRange: [16, 24], windRange: [10, 20] },
//   //   { condition: "Light Rain", icon: "weather-rainy", tempRange: [14, 22], windRange: [12, 25] },
//   //   { condition: "Thunderstorms", icon: "weather-lightning-rainy", tempRange: [15, 23], windRange: [15, 30] },
//   //   { condition: "Clear", icon: "weather-night", tempRange: [12, 20], windRange: [5, 12] }
//   // ];
  
//   const randomCondition = saWeatherConditions[Math.floor(Math.random() * saWeatherConditions.length)];
//   const [minTemp, maxTemp] = randomCondition.tempRange;
//   const [minWind, maxWind] = randomCondition.windRange;
  
//   const temp = Math.floor(Math.random() * (maxTemp - minTemp + 1)) + minTemp;
//   const wind = Math.floor(Math.random() * (maxWind - minWind + 1)) + minWind;
//   const humidity = Math.floor(Math.random() * 30) + 50; // 50-80% typical for SA
  
//   return {
//     temp: temp,
//     condition: randomCondition.condition,
//     icon: randomCondition.icon,
//     wind: wind,
//     humidity: humidity,
//     location: "Current Location"
//   };
// };

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
  const [weather, setWeather] = useState(null)
  const [loadingWeather, setLoadingWeather] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const _map = useRef(null)
  const [latlng, setLatlng] = useState(null)
  const [carsAround, setCarsAround] = useState([])

  const user = useSelector((state) => state.auth.user)
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
        console.log('Error:', error);
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

    return () => {
      isMounted = false;
    };
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
            data={services}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.serviceCard}
                onPress={() => {
                  switch (item.id) {
                    case "1": navigation.navigate("RequestScreen"); break;
                    case "2": navigation.navigate("FlightWelcomeScreen"); break;
                    case "3": navigation.navigate("services"); break;
                    default: break;
                  }
                }}
              >
                <View style={styles.serviceIcon}>{item.icon}</View>
                <View style={styles.serviceTextContainer}>
                  <Text style={styles.serviceCardTitle}>{item.title}</Text>
                  <Text style={styles.serviceCardDesc}>{item.description}</Text>
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
              <TouchableOpacity style={styles.popularCard}>
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
            data={recentSearches}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.recentSearchTag}>
                <Text style={styles.recentSearchText}>{item.term}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
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
              <TouchableOpacity style={styles.offerCard}>
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
    color: "#0A94B8",
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
    backgroundColor: '#0A94B8',
    paddingVertical: 12,
    paddingHorizontal: width < 400 ? 15 : 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#0A94B8',
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
    color: '#0A94B8',
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