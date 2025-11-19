// screens/SeeAllRestaurantsScreen.js
import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Image,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Dimensions,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { Icon } from "react-native-elements"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { useSelector } from 'react-redux';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// Responsive sizing functions
const responsiveWidth = (percentage) => (width * percentage) / 100;
const responsiveHeight = (percentage) => (height * percentage) / 100;
const scaleFont = (size) => (width / 375) * size;

// Weather function with mock data for South Africa
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
        return getMockWeatherData();
    }
};

// Realistic South Africa weather data
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
    const humidity = Math.floor(Math.random() * 30) + 50; // 50-80% typical for SA

    return {
        temp: temp,
        condition: randomCondition.condition,
        icon: randomCondition.icon,
        wind: wind,
        humidity: humidity,
        location: "Current Location"
    };
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

// Extended restaurant data with more details
const allRestaurants = [
    {
        id: 1,
        name: 'KFC Mamelodi',
        category: 'Fast Food',
        image: require('../../assets/nthomeFood_images/kfc.jpg'),
        rating: 4.2,
        deliveryTime: '20-30 min',
        priceRange: 'R50 - R200',
        isOpen: true,
        discount: '10% OFF',
        featured: true
    },
    {
        id: 2,
        name: 'Chicken Licken',
        category: 'Fast Food',
        image: require('../../assets/nthomeFood_images/chicken-licken.jpg'),
        rating: 4.0,
        deliveryTime: '25-35 min',
        priceRange: 'R60 - R180',
        isOpen: true,
        discount: null,
        featured: false
    },
    {
        id: 3,
        name: 'Debonairs Pizza',
        category: 'Pizza',
        image: require('../../assets/nthomeFood_images/debonairs.png'),
        rating: 4.3,
        deliveryTime: '30-40 min',
        priceRange: 'R80 - R300',
        isOpen: true,
        discount: 'Free Delivery',
        featured: true
    },
    {
        id: 4,
        name: 'Nandos',
        category: 'Grill',
        image: require('../../assets/nthomeFood_images/nandos.png'),
        rating: 4.1,
        deliveryTime: '35-45 min',
        priceRange: 'R90 - R250',
        isOpen: true,
        discount: '15% OFF',
        featured: false
    },
    {
        id: 5,
        name: 'Steers',
        category: 'Burgers',
        image: require('../../assets/nthomeFood_images/steers.jpg'),
        rating: 4.4,
        deliveryTime: '25-35 min',
        priceRange: 'R70 - R220',
        isOpen: true,
        discount: null,
        featured: true
    },
    {
        id: 6,
        name: 'Fish & Chips Co',
        category: 'Seafood',
        image: require('../../assets/nthomeFood_images/fish-chips.png'),
        rating: 4.2,
        deliveryTime: '20-30 min',
        priceRange: 'R60 - R150',
        isOpen: false,
        discount: '20% OFF',
        featured: false
    },
    {
        id: 7,
        name: 'Mochachos',
        category: 'Mexican',
        image: require('../../assets/nthomeFood_images/mochachos.jpg'),
        rating: 4.0,
        deliveryTime: '30-40 min',
        priceRange: 'R65 - R190',
        isOpen: true,
        discount: null,
        featured: false
    },
    {
        id: 8,
        name: 'Romans Pizza',
        category: 'Pizza',
        image: require('../../assets/nthomeFood_images/romans.png'),
        rating: 4.1,
        deliveryTime: '35-45 min',
        priceRange: 'R75 - R280',
        isOpen: true,
        discount: 'Buy 1 Get 1 Free',
        featured: true
    },
    {
        id: 9,
        name: 'McDonalds',
        category: 'Fast Food',
        image: require('../../assets/nthomeFood_images/kfc.jpg'), // placeholder
        rating: 4.3,
        deliveryTime: '15-25 min',
        priceRange: 'R45 - R180',
        isOpen: true,
        discount: 'Free Fries',
        featured: false
    },
    {
        id: 10,
        name: 'Burger King',
        category: 'Burgers',
        image: require('../../assets/nthomeFood_images/steers.jpg'), // placeholder
        rating: 4.2,
        deliveryTime: '20-30 min',
        priceRange: 'R55 - R200',
        isOpen: true,
        discount: null,
        featured: false
    }
];

const categories = [
    'All',
    'Fast Food',
    'Pizza',
    'Burgers',
    'Grill',
    'Seafood',
    'Mexican',
    'Asian',
    'Desserts'
];

const SeeAllRestaurantsScreen = ({ navigation, route }) => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('rating'); // rating, deliveryTime, name
    const [weather, setWeather] = useState(null)
    const [loadingWeather, setLoadingWeather] = useState(true)
    const [userLocation, setUserLocation] = useState(null)

    const user = useSelector((state) => state.auth.user)

    // Get location and weather
    useEffect(() => {
        let isMounted = true;

        const getLocationAndWeather = async () => {
            try {
                setLoadingWeather(true);

                // Get current location
                let location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                if (!isMounted) return;

                const { latitude, longitude } = location.coords;
                setUserLocation({ latitude, longitude });

                // Fetch weather data
                const weatherData = await fetchWeatherData(latitude, longitude);
                if (!isMounted) return;
                setWeather(weatherData);

            } catch (error) {
                console.log('Error:', error);
                if (!isMounted) return;
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

    // Weather widget component
    const renderWeatherWidget = () => (
        <TouchableOpacity onPress={refreshWeather} style={styles.weatherWidget}>
            {loadingWeather ? (
                <ActivityIndicator size="small" color="#0DCAF0" />
            ) : weather ? (
                <>
                    <MaterialCommunityIcons
                        name={weather.icon}
                        color="#0DCAF0"
                        size={scaleFont(18)}
                        style={styles.weatherIcon}
                    />
                    <Text style={styles.weatherTempText}>{weather.temp}°</Text>
                    <View style={styles.weatherDetails}>
                        <Text style={styles.weatherCondition}>
                            {weather.condition.length > 8
                                ? weather.condition.substring(0, 8) + '...'
                                : weather.condition
                            }
                        </Text>
                        <View style={styles.weatherMetric}>
                            <MaterialCommunityIcons name="weather-windy" color="#666" size={scaleFont(12)} />
                            <Text style={styles.weatherMetricText}>{weather.wind} km/h</Text>
                        </View>
                    </View>
                </>
            ) : (
                <View style={styles.weatherError}>
                    <MaterialCommunityIcons name="refresh" color="#666" size={scaleFont(16)} />
                    <Text style={styles.weatherErrorText}>Refresh</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    // Filter and sort restaurants
    const filteredRestaurants = useMemo(() => {
        let filtered = allRestaurants;

        // Filter by category
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(restaurant => restaurant.category === selectedCategory);
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(restaurant =>
                restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                restaurant.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Sort restaurants
        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'rating':
                    return b.rating - a.rating;
                case 'deliveryTime':
                    return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
                case 'name':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [selectedCategory, searchQuery, sortBy]);

    // Render restaurant card in 2-column grid (matching landing page style)
    const renderRestaurantItem = ({ item, index }) => (
        <TouchableOpacity 
            style={styles.shopItem}
            onPress={() => navigation.navigate('RestaurantDetail', { restaurant: item })}
        >
            <View style={[
                styles.shopImageContainer,
                { backgroundColor: index % 2 === 0 ? '#E6F7FF' : '#F0F9FF' }
            ]}>
                <Image source={item.image} style={styles.shopImage} />
                {item.discount && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{item.discount}</Text>
                    </View>
                )}
                <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>⭐ {item.rating}</Text>
                </View>
                {!item.isOpen && (
                    <View style={styles.closedOverlay}>
                        <Text style={styles.closedText}>Closed</Text>
                    </View>
                )}
            </View>
            <View style={styles.shopInfo}>
                <Text style={styles.shopName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.shopCategory}>{item.category}</Text>
                <Text style={styles.deliveryTime}>{item.deliveryTime}</Text>
                {item.featured && (
                    <View style={styles.featuredTag}>
                        <Text style={styles.featuredTagText}>Featured</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header - Same as landing page */}
            <View style={styles.header}>
                {/* Left: Back button */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundButton}>
                    <Icon type="material-community" name="arrow-left" color={"#0DCAF0"} size={scaleFont(24)} />
                </TouchableOpacity>

                {/* Center: Weather Widget */}
                {renderWeatherWidget()}

                {/* Right: Profile picture */}
                <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileButton}>
                    <Image
                        source={user?.profile_picture ? { uri: user.profile_picture } : require('../../assets/placeholder.jpg')}
                        style={styles.profileImage}
                    />
                </TouchableOpacity>
            </View>

            {/* Search Bar - Same as landing page */}
            <View style={styles.searchContainer}>
                <View style={styles.searchWrapper}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search restaurants in Mamelodi..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity style={styles.searchIcon}>
                        <Icon type="material-community" name="magnify" color={"#fff"} size={scaleFont(18)} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filter Section */}
            <View style={styles.filterSection}>
                {/* Categories Filter */}
                <View style={styles.categoriesContainer}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesScrollContent}
                    >
                        {categories.map((category) => (
                            <TouchableOpacity
                                key={category}
                                style={[
                                    styles.categoryChip,
                                    selectedCategory === category && styles.categoryChipSelected
                                ]}
                                onPress={() => setSelectedCategory(category)}
                            >
                                <Text style={[
                                    styles.categoryText,
                                    selectedCategory === category && styles.categoryTextSelected
                                ]}>
                                    {category}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Sort Options */}
                <View style={styles.sortContainer}>
                    <Text style={styles.sortLabel}>Sort by:</Text>
                    <TouchableOpacity 
                        style={[styles.sortOption, sortBy === 'rating' && styles.sortOptionSelected]}
                        onPress={() => setSortBy('rating')}
                    >
                        <Text style={[styles.sortText, sortBy === 'rating' && styles.sortTextSelected]}>
                            Rating
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.sortOption, sortBy === 'deliveryTime' && styles.sortOptionSelected]}
                        onPress={() => setSortBy('deliveryTime')}
                    >
                        <Text style={[styles.sortText, sortBy === 'deliveryTime' && styles.sortTextSelected]}>
                            Fastest
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.sortOption, sortBy === 'name' && styles.sortOptionSelected]}
                        onPress={() => setSortBy('name')}
                    >
                        <Text style={[styles.sortText, sortBy === 'name' && styles.sortTextSelected]}>
                            A-Z
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Results Count */}
            <View style={styles.resultsContainer}>
                <Text style={styles.resultsText}>
                    {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'restaurant' : 'restaurants'} found
                    {selectedCategory !== 'All' && ` in ${selectedCategory}`}
                </Text>
            </View>

            {/* Restaurants Grid - 2 columns matching landing page style */}
            <FlatList
                data={filteredRestaurants}
                renderItem={renderRestaurantItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.restaurantsGrid}
                columnWrapperStyle={styles.columnWrapper}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="restaurant-outline" size={scaleFont(64)} color="#ccc" />
                        <Text style={styles.emptyStateTitle}>No restaurants found</Text>
                        <Text style={styles.emptyStateText}>
                            Try adjusting your search or filter criteria
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    // Header Styles - Same as landing page
    header: {
        position: "absolute",
        top: responsiveHeight(2),
        left: responsiveWidth(5),
        right: responsiveWidth(5),
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 100,
    },
    roundButton: {
        backgroundColor: "#fff",
        borderRadius: responsiveWidth(15),
        width: responsiveWidth(12),
        height: responsiveWidth(12),
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    // Weather Widget Styles - Same as landing page
    weatherWidget: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(1),
        borderRadius: responsiveWidth(8),
        marginHorizontal: responsiveWidth(2),
        minWidth: responsiveWidth(35),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E6F7FF',
    },
    weatherIcon: {
        marginRight: responsiveWidth(1.5),
    },
    weatherTempText: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#0DCAF0',
        marginRight: responsiveWidth(2),
    },
    weatherDetails: {
        flex: 1,
    },
    weatherCondition: {
        fontSize: scaleFont(10),
        color: '#333',
        fontWeight: '500',
    },
    weatherMetric: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: responsiveHeight(0.3),
    },
    weatherMetricText: {
        fontSize: scaleFont(9),
        color: '#666',
        marginLeft: responsiveWidth(0.5),
    },
    weatherError: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weatherErrorText: {
        fontSize: scaleFont(10),
        color: '#666',
        marginLeft: responsiveWidth(1),
    },
    profileButton: {
        width: responsiveWidth(12),
        height: responsiveWidth(12),
        borderRadius: responsiveWidth(15),
        backgroundColor: '#0DCAF0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#0DCAF0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    profileImage: {
        width: responsiveWidth(10),
        height: responsiveWidth(10),
        borderRadius: responsiveWidth(11),
        backgroundColor: "#ccc",
        borderWidth: 2,
        borderColor: "#fff",
    },
    // Search Bar - Same as landing page
    searchContainer: {
        paddingHorizontal: responsiveWidth(5),
        paddingTop: responsiveHeight(10),
        paddingBottom: responsiveHeight(2),
    },
    searchWrapper: {
        position: 'relative',
    },
    searchInput: {
        backgroundColor: '#fff',
        paddingHorizontal: responsiveWidth(5),
        paddingVertical: responsiveHeight(1.8),
        borderRadius: responsiveWidth(4),
        fontSize: scaleFont(16),
        color: '#333',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        paddingRight: responsiveWidth(15),
        borderWidth: 1,
        borderColor: '#E6F7FF',
    },
    searchIcon: {
        position: 'absolute',
        right: responsiveWidth(2.5),
        top: responsiveHeight(1),
        backgroundColor: '#0DCAF0',
        width: responsiveWidth(10),
        height: responsiveWidth(10),
        borderRadius: responsiveWidth(5),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#0DCAF0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    // Filter Section
    filterSection: {
        backgroundColor: '#fff',
        paddingHorizontal: responsiveWidth(5),
        borderBottomWidth: 1,
        borderBottomColor: '#E6F7FF',
    },
    categoriesContainer: {
        paddingVertical: responsiveHeight(1),
    },
    categoriesScrollContent: {
        paddingVertical: responsiveHeight(1),
    },
    categoryChip: {
        paddingHorizontal: responsiveWidth(4),
        paddingVertical: responsiveHeight(1),
        borderRadius: responsiveWidth(8),
        backgroundColor: '#f8f9fa',
        marginRight: responsiveWidth(3),
        borderWidth: 1,
        borderColor: '#E6F7FF',
    },
    categoryChipSelected: {
        backgroundColor: '#0DCAF0',
        borderColor: '#0DCAF0',
    },
    categoryText: {
        fontSize: scaleFont(12),
        color: '#666',
        fontWeight: '500',
    },
    categoryTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    sortContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: responsiveHeight(1.5),
        borderTopWidth: 1,
        borderTopColor: '#E6F7FF',
    },
    sortLabel: {
        fontSize: scaleFont(14),
        color: '#666',
        marginRight: responsiveWidth(4),
    },
    sortOption: {
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(3),
        marginRight: responsiveWidth(2),
    },
    sortOptionSelected: {
        backgroundColor: '#E6F7FF',
    },
    sortText: {
        fontSize: scaleFont(12),
        color: '#666',
    },
    sortTextSelected: {
        color: '#0DCAF0',
        fontWeight: '600',
    },
    resultsContainer: {
        paddingHorizontal: responsiveWidth(5),
        paddingVertical: responsiveHeight(2),
        backgroundColor: '#fff',
    },
    resultsText: {
        fontSize: scaleFont(16),
        color: '#2D3748',
        fontWeight: '600',
    },
    // Restaurants Grid - 2 columns matching landing page style
    restaurantsGrid: {
        padding: responsiveWidth(5),
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: responsiveHeight(2),
    },
    // Shop Items Styles - Same as landing page
    shopItem: {
        alignItems: 'center',
        width: (width - responsiveWidth(15)) / 2, // 2 columns with spacing
    },
    shopImageContainer: {
        width: '100%',
        height: responsiveWidth(25),
        borderRadius: responsiveWidth(4),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: responsiveHeight(1),
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        position: 'relative',
        borderWidth: 2,
        borderColor: '#E6F7FF',
    },
    shopImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    discountBadge: {
        position: 'absolute',
        top: responsiveHeight(1),
        left: responsiveWidth(2),
        backgroundColor: '#FF6B6B',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(2),
    },
    discountText: {
        fontSize: scaleFont(10),
        color: '#fff',
        fontWeight: 'bold',
    },
    ratingBadge: {
        position: 'absolute',
        top: responsiveHeight(1),
        right: responsiveWidth(2),
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(3),
        borderWidth: 1,
        borderColor: '#E6F7FF',
    },
    ratingText: {
        fontSize: scaleFont(10),
        color: '#0DCAF0',
        fontWeight: 'bold',
    },
    closedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closedText: {
        fontSize: scaleFont(12),
        color: '#fff',
        fontWeight: 'bold',
    },
    shopInfo: {
        width: '100%',
        alignItems: 'flex-start',
    },
    shopName: {
        fontSize: scaleFont(14),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(0.5),
    },
    shopCategory: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        fontWeight: '600',
        marginBottom: responsiveHeight(0.5),
    },
    deliveryTime: {
        fontSize: scaleFont(11),
        color: '#718096',
        marginBottom: responsiveHeight(0.5),
    },
    featuredTag: {
        backgroundColor: '#FFA726',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.3),
        borderRadius: responsiveWidth(2),
        alignSelf: 'flex-start',
    },
    featuredTagText: {
        fontSize: scaleFont(10),
        color: '#fff',
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: responsiveHeight(10),
        width: '100%',
    },
    emptyStateTitle: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#666',
        marginTop: responsiveHeight(2),
        marginBottom: responsiveHeight(1),
    },
    emptyStateText: {
        fontSize: scaleFont(14),
        color: '#999',
        textAlign: 'center',
    },
});

export default SeeAllRestaurantsScreen;