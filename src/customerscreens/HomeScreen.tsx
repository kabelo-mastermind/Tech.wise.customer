"use client"
import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  SafeAreaView, // Added SafeAreaView for top content
} from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps"
import { LinearGradient } from 'expo-linear-gradient';
import CustomDrawer from "../components/CustomDrawer"
import { useSelector } from "react-redux"

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get("window") // Added height for header sizing

// Constants for card sizing
const POPULAR_CARD_WIDTH = width * 0.42
const POPULAR_CARD_SPACING = 12 // Spacing between popular cards
const OFFER_CARD_WIDTH = width * 0.75
const OFFER_CARD_SPACING = 15 // Spacing between offer cards
const RECENT_SEARCH_SPACING = 10 // Spacing between recent search tags

// New constants for service cards
const SERVICE_CARD_WIDTH = width * 0.7 // Example: 70% of screen width
const SERVICE_CARD_SPACING = 15 // Spacing between service cards

// Placeholder images for the new header
const HEADER_RIGHT_IMAGE = require("../../assets/nthomeAir_images/homeScreen.png") // Increased size for better visibility
const CAR_MARKER_IMAGE = "https://v0.dev/placeholder.svg?height=30&width=30"

// Sample data
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
  { id: "5", city: "Victoria Falls", image: require("../../assets/nthomeAir_images/Victoria.jpg") }, // cross-border
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

const HomeScreen = ({ navigation }) => {
  // State for Weather Section
  const [weather, setWeather] = useState(null)
  const [loadingWeather, setLoadingWeather] = useState(true)
  const [weatherError, setWeatherError] = useState(false)

  // State for Drawer Navigation
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Function to toggle the drawer
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  // State for Map Section
  const _map = useRef(null)
  const [latlng, setLatlng] = useState(null)
  const [carsAround, setCarsAround] = useState([])
  const [mapError, setMapError] = useState(false)

  const user = useSelector((state) => state.auth.user)
  const PROFILE_IMAGE = user?.profile_picture || "https://v0.dev/placeholder.svg?height=100&width=100"

  // Simulate fetching weather data
  useEffect(() => {
    setLoadingWeather(true)
    setWeatherError(false)
    const timer = setTimeout(() => {
      if (Math.random() > 0.2) {
        setWeather({
          temp: 25,
          condition: "Partly Cloudy",
          icon: "weather-partly-cloudy",
          wind: 15,
        })
        setLoadingWeather(false)
      } else {
        setWeatherError(true)
        setLoadingWeather(false)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Simulate fetching map data (user location and cars around)
  useEffect(() => {
    setMapError(false)
    const timer = setTimeout(() => {
      if (Math.random() > 0.1) {
        const dummyLat = 34.0522
        const dummyLng = -118.2437
        setLatlng({ latitude: dummyLat, longitude: dummyLng })
        const generatedCars = Array.from({ length: 10 }).map(() => ({
          latitude: dummyLat + (Math.random() - 0.5) * 0.02,
          longitude: dummyLng + (Math.random() - 0.5) * 0.02,
        }))
        setCarsAround(generatedCars)
      } else {
        setMapError(true)
      }
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <View style={styles.fullScreenContainer}>
      {/* New Header Section */}
      <View style={styles.newHeader}>
        <SafeAreaView style={styles.safeArea}>
          {/* Top Row: Drawer Icon (Left) and Profile Picture (Right) */}
        // In your HomeScreen component, update the headerTopBar section:
          <View style={styles.headerTopBar}>
            <TouchableOpacity onPress={toggleDrawer} style={styles.roundButton}>
              <Ionicons type="material-community" name="menu" color={"#0DCAF0"} size={30} />
            </TouchableOpacity>

            {/* Weather Widget - Added between menu and profile */}
            <View style={styles.weatherWidget}>
              {loadingWeather ? (
                <ActivityIndicator size="small" color="#0DCAF0" />
              ) : weatherError || !weather ? (
                <MaterialCommunityIcons name="weather-cloudy-alert" color="#666" size={20} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={weather.icon}
                    color="#0DCAF0"
                    size={20}
                    style={styles.weatherIcon}
                  />
                  <Text style={styles.weatherTempText}>{weather.temp}°</Text>
                  <View style={styles.weatherDetails}>
                    <Text style={styles.weatherCondition}>{weather.condition}</Text>
                    <View style={styles.weatherMetric}>
                      <MaterialCommunityIcons name="weather-windy" color="#666" size={14} />
                      <Text style={styles.weatherMetricText}>{weather.wind} km/h</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profilePictureContainer}>
              <Image
                source={{ uri: PROFILE_IMAGE }}
                style={styles.profilePicture}
              />
            </TouchableOpacity>
          </View>
          {/* Main Content Row: Left Column (Text + Button) and Right Column (Image) */}
          <View style={styles.mainHeaderContentRow}>
            {/* Left Column: Text and Button */}
            <View style={styles.leftColumn}>
              <Text style={styles.welcomeText}>Welcome back!</Text>
              <Text style={styles.title}>
                Where are you <Text style={styles.titleAccent}>heading next?</Text>
              </Text>
              <Text style={styles.slogan}>Nthome ka Petjana!</Text>
              <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('RequestScreen')}>
                <Text style={styles.headerButtonText}>Request Ride</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.headerButtonIcon} />
              </TouchableOpacity>
            </View>
            {/* Right Column: Image */}
            <View style={styles.rightColumn}>
              <Image
                source={HEADER_RIGHT_IMAGE} // Main header image
                style={styles.headerRightImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
      {/* Divider */}
      <View style={styles.headerDivider} />
      {/* Content Sections (formerly bottom sheet) */}
      <ScrollView
        style={styles.scrollViewContent}
        contentContainerStyle={styles.scrollViewInnerContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Services Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Our Services</Text>
            <TouchableOpacity onPress={() => navigation.navigate('services')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={services}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesListContent}
            snapToInterval={SERVICE_CARD_WIDTH + SERVICE_CARD_SPACING}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.serviceCard}
                activeOpacity={0.8}
                onPress={() => {
                  switch (item.id) {
                    case "1":
                      navigation.navigate("RequestScreen");
                      break;
                    case "2":
                      navigation.navigate("FlightWelcomeScreen");
                      break;
                    case "3":
                      navigation.navigate("services");
                      break;
                    default:
                      break;
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
          />
        </View>
        {/* Popular Destinations Slider */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Destinations</Text>
          <FlatList
            data={popularDestinations}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.popularCard} activeOpacity={0.8}>
                <Image source={item.image} style={styles.popularImage} />
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.popularCardOverlay}>
                  <Text style={styles.popularCity}>{item.city}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          />
        </View>
        {/* Recent Searches Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <FlatList
            data={recentSearches}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.recentSearchTag} activeOpacity={0.7}>
                <Text style={styles.recentSearchText}>{item.term}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
        {/* Exclusive Offers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exclusive Offers</Text>
          <FlatList
            data={exclusiveOffers}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            snapToInterval={OFFER_CARD_WIDTH + OFFER_CARD_SPACING}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.offerCard} activeOpacity={0.8}>
                <Image source={item.image} style={styles.offerImage} />
                <View style={styles.offerContent}>
                  <Text style={styles.offerDiscount}>{item.discount}</Text>
                  <Text style={styles.offerTitle}>{item.title}</Text>
                  <Text style={styles.offerDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
        {/* Weather Section */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weather Forecast</Text>
          <View style={styles.weatherCard}>
            {loadingWeather ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0DCAF0" />
                <Text style={styles.loadingText}>Loading weather data...</Text>
              </View>
            ) : weatherError || !weather ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="weather-cloudy-alert" color="#666" size={48} />
                <Text style={styles.errorText}>Unable to load weather data</Text>
              </View>
            ) : (
              <View style={styles.currentWeather}>
                <View style={styles.weatherMain}>
                  <MaterialCommunityIcons name={weather.icon} color="#0DCAF0" size={48} />
                  <Text style={styles.tempText}>{weather.temp}°C</Text>
                </View>
                <View style={styles.weatherDetails}>
                  <Text style={styles.conditionText}>{weather.condition}</Text>
                  <View style={styles.weatherMetrics}>
                    <View style={styles.metric}>
                      <MaterialCommunityIcons name="weather-windy" color="#666" size={18} />
                      <Text style={styles.metricText}>{weather.wind} km/h</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View> */}
      </ScrollView>
      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </View>
  )
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#E8F0F2",
  },
  newHeader: {
    backgroundColor: "#FFFFFF", // White background
    height: height * 0.40, // Adjust header height as needed
    minHeight: 360, // Minimum height to ensure content fits
    paddingHorizontal: 20,
    paddingBottom: 10,
    justifyContent: "space-between", // Distribute content vertically
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
    paddingTop: Platform.OS === 'android' ? 30 : 0, // Adjust for Android status bar
  },
  headerTopBar: {
    top: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
    // marginBottom: 10, // Space below the top bar
  },
  roundButton: {
    backgroundColor: "#fff",
    borderRadius: 30,
    width: width < 400 ? 50 : 50,
    height: width < 400 ? 50 : 50,
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
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  weatherIcon: {
    marginRight: 5,
  },
  weatherTempText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  weatherDetails: {
    alignItems: 'flex-start',
  },
  weatherCondition: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  weatherMetric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherMetricText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 3,
  },
  drawerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0', // Light background for the icon
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureContainer: {

    width: width < 400 ? 50 : 50,
    height: width < 400 ? 50 : 50,
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
    flex: 1, // Takes up remaining vertical space
    flexDirection: 'row',
    alignItems: 'center', // Vertically center items in the row
    justifyContent: 'space-between', // Space out left and right columns
    marginBottom: 10, // Space above the bottom button
  },
  leftColumn: {
    flex: 1, // Takes up available space
    maxWidth: '60%',
    justifyContent: 'center', // Vertically center content within its column
    alignItems: 'flex-start', // Align text and button to the left
    paddingRight: 10, // Add some spacing from the right image
  },
  rightColumn: {
    flex: 1,
    maxWidth: '50%', // Limit image column width
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerRightImage: {
    width: '100%', // Use percentage for responsive width
    height: undefined,
    aspectRatio: 1, // Maintain square aspect ratio
    maxWidth: 280, // Maximum size
    maxHeight: 290,
  },
  welcomeText: {
    fontSize: width < 400 ? 16 : 18,
    color: '#333', // Dark color for white background
    marginBottom: 6,
    fontWeight: '500',
  },
  title: {
    fontSize: width < 400 ? 22 : 28,
    color: "#1A202C", // Dark color for white background
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "left",
  },
  titleAccent: {
    color: "#0A94B8", // Accent color
    fontWeight: "bold",
  },
  slogan: {
    fontSize: width < 400 ? 12 : 14,
    color: '#555', // Dark color for white background
    fontStyle: 'italic',
    marginTop: 0,
    marginBottom: 10,
    textAlign: 'left',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A94B8', // Solid color for visibility
    paddingVertical: 12,
    paddingHorizontal: width < 400 ? 15 : 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#0A94B8',
    marginTop: 0,
  },
  headerButtonText: {
    color: '#FFFFFF', // White for contrast
    fontSize: width < 400 ? 14 : 16,
    fontWeight: '600',
    marginRight: 8,
  },
  headerButtonIcon: {
    // No specific styles needed
  },
  headerDivider: {
    height: 1, // Thickness of the divider
    backgroundColor: '#E0E0E0', // Color of the divider
    marginHorizontal: 20, // Match padding of sections
    marginTop: -10, // Pull it up slightly to be closer to the header
    marginBottom: 20, // Space between divider and first section
  },
  scrollViewContent: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Background for the scrollable content
  },
  scrollViewInnerContent: {
    paddingTop: 25, // Padding at the top of the scrollable content
    paddingBottom: 40, // Ensure enough space at the bottom
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginBottom: 10,
  },
  seeAllText: {
    color: '#0A94B8', // or any accent color
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 10, // Further reduced
    marginBottom: -10, // Pulls up the next section
    paddingHorizontal: 20, // Consistent horizontal padding for all sections
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
  weatherCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
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
    minHeight: 130,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#888",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#A0A0A0",
    textAlign: "center",
  },
  currentWeather: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  weatherMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  tempText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 15,
  },
  weatherDetails: {
    alignItems: "flex-end",
  },
  conditionText: {
    fontSize: 18,
    color: "#555",
    marginBottom: 8,
  },
  weatherMetrics: {
    flexDirection: "row",
    marginTop: 5,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 20,
  },
  metricText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
  },
  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
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
  map: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  mapLoading: {
    backgroundColor: "#F0F8FF",
  },
  carsAround: {
    width: 35,
    height: 35,
  },
})

export default HomeScreen