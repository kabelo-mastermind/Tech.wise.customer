import React, { useState, useEffect } from 'react';
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
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native';
import CustomDrawer from "../components/CustomDrawer"
import { Icon } from "react-native-elements"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { colors } from '../global/styles';
import { useSelector } from 'react-redux';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// Responsive sizing functions
const responsiveWidth = (percentage) => (width * percentage) / 100;
const responsiveHeight = (percentage) => (height * percentage) / 100;
const scaleFont = (size) => (width / 375) * size; // Base width 375 (iPhone 6/7/8)

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
        // return getMockWeatherData();
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

const NthomeFoodLanding = ({ navigation }) => {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const toggleDrawer = () => setDrawerOpen(!drawerOpen)
    const user = useSelector((state) => state.auth.user)

    const [weather, setWeather] = useState(null)
    const [loadingWeather, setLoadingWeather] = useState(true)
    const [weatherError, setWeatherError] = useState(false)
    const [userLocation, setUserLocation] = useState(null)
    const [cart, setCart] = useState([]);
    // Get location and weather
    useEffect(() => {
        let isMounted = true;

        const getLocationAndWeather = async () => {
            try {
                setLoadingWeather(true);

                // Request location permission
                let { status } = await Location.requestForegroundPermissionsAsync();
                // if (status !== 'granted') {
                //     console.log('Location permission denied');
                //     // Use default South Africa location
                //     const defaultLocation = { latitude: -25.7479, longitude: 28.2293 }; // Pretoria
                //     setUserLocation(defaultLocation);
                //     const weatherData = await fetchWeatherData(defaultLocation.latitude, defaultLocation.longitude);
                //     if (isMounted) setWeather(weatherData);
                //     return;
                // }

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

    // Mamelodi Shop Names Data
    const mamelodiShops = [
        {
            id: 1,
            name: 'Flaka cloud',
            category: 'Fast Food',
            image: require('../../assets/nthomeFood_images/restaurants/flaka.png'),
            rating: 4.2,
            deliveryTime: '20-30 min'
        },
        {
            id: 2,
            name: 'Chicken Licken',
            category: 'Fast Food',
            image: require('../../assets/nthomeFood_images/chicken-licken.jpg'),
            rating: 4.0,
            deliveryTime: '25-35 min'
        },
        {
            id: 3,
            name: 'Debonairs Pizza',
            category: 'Pizza',
            image: require('../../assets/nthomeFood_images/debonairs.png'),
            rating: 4.3,
            deliveryTime: '30-40 min'
        },
        {
            id: 4,
            name: 'Nandos',
            category: 'Grill',
            image: require('../../assets/nthomeFood_images/nandos.png'),
            rating: 4.1,
            deliveryTime: '35-45 min'
        },
        {
            id: 5,
            name: 'Steers',
            category: 'Burgers',
            image: require('../../assets/nthomeFood_images/steers.jpg'),
            rating: 4.4,
            deliveryTime: '25-35 min'
        },
        {
            id: 6,
            name: 'Fish & Chips Co',
            category: 'Seafood',
            image: require('../../assets/nthomeFood_images/fish-chips.png'),
            rating: 4.2,
            deliveryTime: '20-30 min'
        },
        {
            id: 7,
            name: 'Mochachos',
            category: 'Mexican',
            image: require('../../assets/nthomeFood_images/mochachos.jpg'),
            rating: 4.0,
            deliveryTime: '30-40 min'
        },
        {
            id: 8,
            name: 'Romans Pizza',
            category: 'Pizza',
            image: require('../../assets/nthomeFood_images/romans.png'),
            rating: 4.1,
            deliveryTime: '35-45 min'
        }
    ];

    // Enhanced Today's Specials with shop information
    const todaySpecials = [
        {
            id: 1,
            name: 'Chomee na Chomee',
            originalPrice: 'R187.50',
            specialPrice: 'R150',
            discount: '20% OFF',
            shop: 'Flava cloud',
            shopId: 1,
            category: 'Burger Meal',
            description: '2x rib burger chips and 2x cappy juice mocktails',
            image: require('../../assets/nthomeFood_images/special/flaka-special.png'),
            timeLeft: '6h 30m',
            tags: ['Limited Time', 'Popular']
        },
        {
            id: 2,
            name: 'Fire Grilled Chicken',
            originalPrice: 'R175',
            specialPrice: 'R139',
            discount: '25% OFF',
            shop: 'Chicken Licken',
            shopId: 2,
            category: 'Grilled Chicken',
            description: 'Flame-grilled chicken with special seasoning',
            image: require('../../assets/nthomeFood_images/chicken-burger.jpg'),
            timeLeft: '4h 15m',
            tags: ['Best Seller', 'Healthy']
        },
        {
            id: 3,
            name: 'Pepperoni Pizza',
            originalPrice: 'R299',
            specialPrice: 'R229',
            discount: '30% OFF',
            shop: 'Debonairs Pizza',
            shopId: 3,
            category: 'Pizza',
            description: 'Large pepperoni pizza with extra cheese',
            image: require('../../assets/nthomeFood_images/pepperoni-pizza.png'),
            timeLeft: '8h 45m',
            tags: ['Family Deal', 'Cheesy']
        },
        {
            id: 4,
            name: 'Buff Burger Combo',
            originalPrice: 'R120',
            specialPrice: 'R89',
            discount: '15% OFF',
            shop: 'Steers',
            shopId: 5,
            category: 'Burger Meal',
            description: 'Juicy beef burger with fries and drink',
            image: require('../../assets/nthomeFood_images/buff-burger.jpg'),
            timeLeft: '5h 20m',
            tags: ['Combo Deal', 'Value']
        }
    ];

    // Recommendations Data
    const recommendations = [
        {
            id: 1,
            name: 'Spicy Chicken Wings',
            restaurant: 'KFC Mamelodi',
            price: 'R189',
            rating: 4.5,
            image: require('../../assets/nthomeFood_images/chicken-wings.jpg')
        },
        {
            id: 2,
            name: 'Pepperoni Pizza',
            restaurant: 'Debonairs Pizza',
            price: 'R299',
            rating: 4.7,
            image: require('../../assets/nthomeFood_images/pepperoni-pizza.png')
        },
        {
            id: 3,
            name: 'Grilled Chicken',
            restaurant: 'Nandos',
            price: 'R245',
            rating: 4.3,
            image: require('../../assets/nthomeFood_images/grilled-chicken.png')
        },
        {
            id: 4,
            name: 'Fish & Chips',
            restaurant: 'Fish & Chips Co',
            price: 'R175',
            rating: 4.4,
            image: require('../../assets/nthomeFood_images/fish&chips.png')
        },
    ];

    // In NthomeFoodLanding.js - Update the addSpecialToCart function

    const addSpecialToCart = (special) => {
        const restaurant = mamelodiShops.find(shop => shop.id === special.shopId);

        if (!restaurant) {
            Alert.alert("Error", "Restaurant not found");
            return;
        }

        const cartItem = {
            id: special.id,
            name: special.name,
            description: special.description,
            price: special.specialPrice,
            image: special.image,
            restaurant: special.shop,
            restaurantId: special.shopId,
            quantity: 1,
            isSpecial: true,
            specialDetails: {
                originalPrice: special.originalPrice,
                discount: special.discount
            }
        };

        // Check if item already exists in cart
        const existingItemIndex = cart.findIndex(item =>
            item.id === special.id &&
            item.restaurantId === special.shopId &&
            item.isSpecial
        );

        if (existingItemIndex !== -1) {
            // Item already exists - show message and increase quantity
            const updatedCart = [...cart];
            updatedCart[existingItemIndex].quantity += 1;
            setCart(updatedCart);

            Alert.alert(
                "Item Updated",
                `${special.name} from ${special.shop} quantity increased to ${updatedCart[existingItemIndex].quantity}`,
                [
                    { text: "Continue Shopping" },
                    {
                        text: "Go to Cart",
                        onPress: () => navigation.navigate('Cart', {
                            cart: updatedCart,
                            restaurant: null
                        })
                    }
                ]
            );
        } else {
            // New item - add to cart
            setCart(prevCart => [...prevCart, cartItem]);

            Alert.alert(
                "Added to Cart!",
                `${special.name} from ${special.shop} has been added to your cart`,
                [
                    { text: "Continue Shopping" },
                    {
                        text: "View Cart",
                        onPress: () => navigation.navigate('Cart', {
                            cart: [...cart, cartItem],
                            restaurant: null
                        })
                    }
                ]
            );
        }
    };
    
    // Update the handleSpecialPress function to show options
    const handleSpecialPress = (special) => {
        Alert.alert(
            special.name,
            `Add ${special.name} from ${special.shop} to cart?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "View Restaurant",
                    onPress: () => {
                        const restaurant = mamelodiShops.find(shop => shop.id === special.shopId);
                        if (restaurant) {
                            navigation.navigate('RestaurantDetail', {
                                restaurant: restaurant,
                                highlightedItem: special.name
                            });
                        }
                    }
                },
                {
                    text: "Add to Cart",
                    style: "default",
                    onPress: () => addSpecialToCart(special)
                }
            ]
        );
    };

    // Handle shop press from special item
    const handleShopPress = (shopId) => {
        const restaurant = mamelodiShops.find(shop => shop.id === shopId);
        if (restaurant) {
            navigation.navigate('RestaurantDetail', { restaurant: restaurant });
        }
    };




    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

       // In NthomeFoodLanding.js - Update the header section

            {/* Header */}
            <View style={[styles.header, drawerOpen && styles.headerHidden]}>
                {/* Left: Menu button */}
                <TouchableOpacity onPress={toggleDrawer} style={styles.roundButton}>
                    <Icon type="material-community" name="menu" color={"#0DCAF0"} size={scaleFont(24)} />
                </TouchableOpacity>

                {/* Center: Weather Widget */}
                {renderWeatherWidget()}

                {/* Right: Cart and Profile */}
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.cartButton}
                        onPress={() => navigation.navigate('Cart', {
                            cart: cart,
                            restaurant: null // No specific restaurant for mixed cart
                        })}
                    >
                        <Ionicons name="cart-outline" size={scaleFont(24)} color="#0DCAF0" />
                        {cart.length > 0 && (
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>
                                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileButton}>
                        <Image
                            source={user?.profile_picture ? { uri: user.profile_picture } : require('../../assets/placeholder.jpg')}
                            style={styles.profileImage}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchWrapper}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search restaurants in Mamelodi..."
                        placeholderTextColor="#999"
                    />
                    <TouchableOpacity style={styles.searchIcon}>
                        <Icon type="material-community" name="magnify" color={"#fff"} size={scaleFont(18)} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
                {/* Banner Image - Made Thicker */}
                <View style={styles.bannerContainer}>
                    <Image
                        source={require('../../assets/nthomeFood_images/food-banner.png')}
                        style={styles.bannerImage}
                        resizeMode="cover"
                    />
                </View>

                {/* Popular in Mamelodi */}
                <View style={styles.categoriesSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Popular in Mamelodi</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('SeeAllRestaurants', { type: 'popular' })}>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                        {mamelodiShops.map((shop, index) => (
                            <TouchableOpacity
                                key={shop.id}
                                style={styles.shopItem}
                                onPress={() => navigation.navigate('RestaurantDetail', { restaurant: shop })}
                            >
                                <View style={[
                                    styles.shopImageContainer,
                                    { backgroundColor: index % 2 === 0 ? '#E6F7FF' : '#F0F9FF' }
                                ]}>
                                    <Image source={shop.image} style={styles.shopImage} />
                                    <View style={styles.ratingBadge}>
                                        <Text style={styles.ratingText}>⭐ {shop.rating}</Text>
                                    </View>
                                </View>
                                <View style={styles.shopInfo}>
                                    <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                                    <Text style={styles.shopCategory}>{shop.category}</Text>
                                    <Text style={styles.deliveryTime}>{shop.deliveryTime}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Today's Special */}
                <View style={styles.specialsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Today's Special</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>View all</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.specialsScroll}
                    >
                        {todaySpecials.map((special) => (
                            <TouchableOpacity
                                key={special.id}
                                style={styles.specialItem}
                                onPress={() => handleSpecialPress(special)}
                            >
                                {/* Discount Badge */}
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>{special.discount}</Text>
                                </View>

                                {/* Time Left Badge */}
                                <View style={styles.timeBadge}>
                                    <Ionicons name="time-outline" size={scaleFont(10)} color="#fff" />
                                    <Text style={styles.timeText}>{special.timeLeft}</Text>
                                </View>

                                <Image source={special.image} style={styles.specialImage} />

                                <View style={styles.specialInfo}>
                                    {/* Shop Name */}
                                    <TouchableOpacity
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            handleShopPress(special.shopId);
                                        }}
                                    >
                                        <Text style={styles.specialShop}>{special.shop}</Text>
                                    </TouchableOpacity>

                                    {/* Item Name */}
                                    <Text style={styles.specialName}>{special.name}</Text>

                                    {/* Category */}
                                    <Text style={styles.specialCategory}>{special.category}</Text>

                                    {/* Description */}
                                    <Text style={styles.specialDescription} numberOfLines={2}>
                                        {special.description}
                                    </Text>

                                    {/* Tags */}
                                    <View style={styles.tagsContainer}>
                                        {special.tags.map((tag, index) => (
                                            <View key={index} style={styles.tag}>
                                                <Text style={styles.tagText}>{tag}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Price Section */}
                                    <View style={styles.priceSection}>
                                        <View style={styles.priceContainer}>
                                            <Text style={styles.originalPrice}>{special.originalPrice}</Text>
                                            <Text style={styles.specialPrice}>{special.specialPrice}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.orderButton}
                                            onPress={() => addSpecialToCart(special)}
                                        >
                                            <Text style={styles.orderButtonText}>Order Now</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Recommendations Section */}
                <View style={styles.recommendationsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recommended for You</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('SeeAllRestaurants', { type: 'recommendations' })}>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll}>
                        {recommendations.map((item) => (
                            <TouchableOpacity key={item.id} style={styles.recommendationItem}>
                                <Image source={item.image} style={styles.recommendationImage} />
                                <View style={styles.recommendationInfo}>
                                    <Text style={styles.recommendationName} numberOfLines={2}>{item.name}</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            // Find the restaurant in mamelodiShops
                                            const restaurant = mamelodiShops.find(shop => shop.name === item.restaurant);
                                            if (restaurant) {
                                                navigation.navigate('RestaurantDetail', { restaurant: restaurant });
                                            }
                                        }}
                                    >
                                        <Text style={styles.recommendationRestaurant}>{item.restaurant}</Text>
                                    </TouchableOpacity>
                                    <View style={styles.recommendationDetails}>
                                        <View style={styles.recommendationRating}>
                                            <Icon type="material-community" name="star" color={"#FFD700"} size={scaleFont(14)} />
                                            <Text style={styles.ratingText}>{item.rating}</Text>
                                        </View>
                                        <Text style={styles.recommendationPrice}>{item.price}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.recommendationButton}>
                                        <Text style={styles.recommendationButtonText}>Add to Cart</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
            <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
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
    headerHidden: {
        display: 'none',
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
    // Weather Widget Styles
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
    scrollView: {
        flex: 1,
    },
    // Banner Styles - Made Thicker
    bannerContainer: {
        paddingHorizontal: responsiveWidth(5),
        paddingBottom: responsiveHeight(2),
    },
    bannerImage: {
        width: '100%',
        height: responsiveHeight(17), // Increased from 150 to 20% of screen height
        borderRadius: responsiveWidth(4),
    },
    categoriesSection: {
        paddingHorizontal: responsiveWidth(5),
        paddingTop: 0,
        paddingBottom: responsiveHeight(2),
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: responsiveHeight(2),
    },
    sectionTitle: {
        fontSize: scaleFont(20),
        fontWeight: 'bold',
        color: '#2D3748',
    },
    seeAllText: {
        fontSize: scaleFont(14),
        color: '#0DCAF0',
        fontWeight: '600',
    },
    categoriesScroll: {
        marginHorizontal: responsiveWidth(-1.5),
    },
    // Shop Items Styles
    shopItem: {
        alignItems: 'center',
        marginHorizontal: responsiveWidth(2),
        width: responsiveWidth(35),
    },
    shopImageContainer: {
        width: responsiveWidth(30),
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
    ratingBadge: {
        position: 'absolute',
        top: responsiveHeight(1),
        left: responsiveWidth(2),
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
    },
    // Specials Section Styles
    specialsSection: {
        paddingHorizontal: responsiveWidth(5),
        paddingTop: 0,
        paddingBottom: responsiveHeight(2),

    },
    specialsScroll: {
        marginHorizontal: responsiveWidth(-1.5),
    },
    specialItem: {
        width: responsiveWidth(70),
        backgroundColor: '#fff',
        borderRadius: responsiveWidth(4),
        marginHorizontal: responsiveWidth(2),
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#E6F7FF',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 25,
    },
    discountBadge: {
        position: 'absolute',
        top: responsiveHeight(1),
        left: responsiveWidth(2),
        backgroundColor: '#FF6B6B',
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(3),
        zIndex: 2,
    },
    discountText: {
        fontSize: scaleFont(10),
        color: '#fff',
        fontWeight: 'bold',
    },
    timeBadge: {
        position: 'absolute',
        top: responsiveHeight(1),
        right: responsiveWidth(2),
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(3),
        zIndex: 2,
    },
    timeText: {
        fontSize: scaleFont(10),
        color: '#fff',
        fontWeight: '500',
        marginLeft: responsiveWidth(0.5),
    },
    specialImage: {
        width: '100%',
        height: responsiveHeight(15),
        resizeMode: 'cover',
    },
    specialInfo: {
        padding: responsiveWidth(4),
    },
    specialShop: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        fontWeight: '600',
        marginBottom: responsiveHeight(0.5),
    },
    specialName: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(0.5),
    },
    specialCategory: {
        fontSize: scaleFont(12),
        color: '#666',
        fontWeight: '500',
        marginBottom: responsiveHeight(1),
    },
    specialDescription: {
        fontSize: scaleFont(12),
        color: '#718096',
        lineHeight: scaleFont(16),
        marginBottom: responsiveHeight(1),
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: responsiveHeight(1.5),
    },
    tag: {
        backgroundColor: '#E6F7FF',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.3),
        borderRadius: responsiveWidth(2),
        marginRight: responsiveWidth(1),
        marginBottom: responsiveHeight(0.5),
    },
    tagText: {
        fontSize: scaleFont(9),
        color: '#0DCAF0',
        fontWeight: '500',
    },
    priceSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    originalPrice: {
        fontSize: scaleFont(14),
        color: '#718096',
        textDecorationLine: 'line-through',
        marginRight: responsiveWidth(2),
    },
    specialPrice: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#2D3748',
    },
    orderButton: {
        backgroundColor: '#0DCAF0',
        paddingHorizontal: responsiveWidth(4),
        paddingVertical: responsiveHeight(1),
        borderRadius: responsiveWidth(3),
    },
    orderButtonText: {
        fontSize: scaleFont(12),
        color: '#fff',
        fontWeight: 'bold',
    },
    // Recommendations Styles
    recommendationsSection: {
        marginTop: 25,
        paddingHorizontal: responsiveWidth(5),
        paddingTop: 0,
        paddingBottom: responsiveHeight(5),
    },
    recommendationsScroll: {
        marginHorizontal: responsiveWidth(-1.5),
    },
    recommendationItem: {
        width: responsiveWidth(50),
        backgroundColor: '#fff',
        borderRadius: responsiveWidth(4),
        marginHorizontal: responsiveWidth(2),
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#E6F7FF',
        marginBottom: 25,
    },
    recommendationImage: {
        width: '100%',
        height: responsiveHeight(15),
        borderTopLeftRadius: responsiveWidth(4),
        borderTopRightRadius: responsiveWidth(4),
        resizeMode: 'cover',
    },
    recommendationInfo: {
        padding: responsiveWidth(3),
    },
    recommendationName: {
        fontSize: scaleFont(14),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(0.5),
        height: responsiveHeight(5),
    },
    recommendationRestaurant: {
        fontSize: scaleFont(12),
        color: '#000',
        fontWeight: '600',
        marginBottom: responsiveHeight(1),
    },
    recommendationDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: responsiveHeight(1),
    },
    recommendationRating: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recommendationPrice: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#000',
    },
    recommendationButton: {
        backgroundColor: '#0DCAF0',
        paddingVertical: responsiveHeight(1),
        borderRadius: responsiveWidth(3),
        alignItems: 'center',
    },
    recommendationButtonText: {
        color: '#fff',
        fontSize: scaleFont(12),
        fontWeight: 'bold',
    },
    // Add to your existing styles in NthomeFoodLanding.js

    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cartButton: {
        padding: responsiveWidth(2),
        position: 'relative',
        marginRight: responsiveWidth(2),
    },
    cartBadge: {
        position: 'absolute',
        top: responsiveHeight(0.5),
        right: responsiveWidth(1),
        backgroundColor: '#FF6B6B',
        borderRadius: responsiveWidth(3),
        minWidth: responsiveWidth(5),
        height: responsiveWidth(5),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff',
    },
    cartBadgeText: {
        fontSize: scaleFont(10),
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default NthomeFoodLanding;