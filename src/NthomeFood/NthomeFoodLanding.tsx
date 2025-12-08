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
import { useSelector, useDispatch } from 'react-redux'; // Added useDispatch
import { addToCart } from '../redux/actions/orderActions'; // Import addToCart action
import * as Location from 'expo-location';
import { api } from '../../api';

const { width, height } = Dimensions.get('window');

// Responsive sizing functions
const responsiveWidth = (percentage) => (width * percentage) / 100;
const responsiveHeight = (percentage) => (height * percentage) / 100;
const scaleFont = (size) => (width / 375) * size; // Base width 375 (iPhone 6/7/8)

const API_BASE_URL = api

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
    const cart = useSelector((state) => state.order.cart) // Get cart from Redux
    const dispatch = useDispatch() // Initialize dispatch

    const [weather, setWeather] = useState(null)
    const [loadingWeather, setLoadingWeather] = useState(true)
    const [weatherError, setWeatherError] = useState(false)
    const [userLocation, setUserLocation] = useState(null)
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState({
        shops: [],
        specials: [],
        recommendations: []
    });

    // New state for real data
    const [restaurants, setRestaurants] = useState([]);
    const [loadingRestaurants, setLoadingRestaurants] = useState(true);
    const [restaurantError, setRestaurantError] = useState(null);

    // New state for today's specials
    const [todaySpecials, setTodaySpecials] = useState([]);
    const [loadingSpecials, setLoadingSpecials] = useState(true);

    // Get location and weather
    useEffect(() => {
        let isMounted = true;

        const getLocationAndWeather = async () => {
            try {
                setLoadingWeather(true);

                // Request location permission
                let { status } = await Location.requestForegroundPermissionsAsync();

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

    // Fetch restaurants from API
    useEffect(() => {
        fetchRestaurants();
    }, []);

    // Fetch today's specials from all restaurants
    useEffect(() => {
        if (restaurants.length > 0) {
            fetchTodaySpecials();
        }
    }, [restaurants]);

    // Function to fetch restaurants from your API
    const fetchRestaurants = async () => {
        try {
            setLoadingRestaurants(true);
            setRestaurantError(null);

            const response = await fetch(`${API_BASE_URL}/restaurants_info`);

            if (!response.ok) {
                throw new Error(`Failed to fetch restaurants: ${response.status}`);
            }

            const data = await response.json();

            // Transform API data to match your existing structure
            const transformedRestaurants = data.map(restaurant => ({
                id: restaurant.id,
                name: restaurant.name,
                category: restaurant.category || 'Restaurant',
                image: restaurant.image_url
                    ? { uri: restaurant.image_url }
                    : require('../../assets/nthomeFood_images/restaurants/default-restaurant.png'),
                rating: restaurant.rating || 4.0,
                deliveryTime: '20-40 min',
                address: restaurant.address,
                phone: restaurant.phone,
                email: restaurant.email,
                opening_hours: restaurant.opening_hours,
                description: restaurant.description,
                user_id: restaurant.user_id
            }));

            setRestaurants(transformedRestaurants);
        } catch (error) {
            console.error('Error fetching restaurants:', error);
            setRestaurantError(error.message);
            // Fallback to dummy data if API fails
            setRestaurants(getFallbackRestaurants());
        } finally {
            setLoadingRestaurants(false);
        }
    };

    // Function to fetch today's specials (items with discounts)
    const fetchTodaySpecials = async () => {
        try {
            setLoadingSpecials(true);

            let allSpecials = [];

            // Fetch menu items from each restaurant that has discounts
            for (const restaurant of restaurants) {
                try {
                    const response = await fetch(`${API_BASE_URL}/menu_items/user/${restaurant.user_id}`);

                    if (response.ok) {
                        const menuItems = await response.json();

                        // Filter items with discounts
                        const discountedItems = menuItems.filter(item =>
                            item.discount_percentage > 0 && item.available
                        );

                        // Transform to specials format
                        const restaurantSpecials = discountedItems.map(item => ({
                            id: item.id,
                            name: item.item_name,
                            description: item.description || 'Delicious special item',
                            originalPrice: `R${item.price}`,
                            specialPrice: `R${item.discounted_price}`,
                            discount: `${item.discount_percentage}% OFF`,
                            shop: restaurant.name,
                            shopId: restaurant.id,
                            category: item.category || item.category_name || 'Special',
                            image: item.image_url
                                ? { uri: item.image_url }
                                : require('../../assets/nthomeFood_images/restaurants/default-restaurant.png'),
                            timeLeft: getRandomTimeLeft(), // Generate random time for urgency
                            tags: getTagsForItem(item),
                            restaurant: restaurant
                        }));

                        allSpecials = [...allSpecials, ...restaurantSpecials];
                    }
                } catch (error) {
                    console.error(`Error fetching menu for ${restaurant.name}:`, error);
                }
            }

            // Limit to 6 specials and shuffle
            const shuffledSpecials = allSpecials.sort(() => 0.5 - Math.random()).slice(0, 6);
            setTodaySpecials(shuffledSpecials);

        } catch (error) {
            console.error('Error fetching today\'s specials:', error);
            // Fallback to dummy specials
            setTodaySpecials(getFallbackSpecials());
        } finally {
            setLoadingSpecials(false);
        }
    };

    // Helper function to generate random time left
    const getRandomTimeLeft = () => {
        const hours = Math.floor(Math.random() * 12) + 1;
        const minutes = Math.floor(Math.random() * 60);
        return `${hours}h ${minutes}m`;
    };

    // Helper function to generate tags based on item properties
    const getTagsForItem = (item) => {
        const tags = [];
        if (item.is_special) tags.push('Limited Time');
        if (item.discount_percentage > 20) tags.push('Best Deal');
        if (tags.length === 0) tags.push('Popular');
        return tags;
    };

    // Fallback restaurants data in case API fails
    const getFallbackRestaurants = () => {
        return [
            {
                id: 1,
                name: 'Flaka cloud',
                category: 'Fast Food',
                image: require('../../assets/nthomeFood_images/restaurants/flaka.png'),
                rating: 4.2,
                deliveryTime: '20-30 min',
                address: 'Mamelodi, Pretoria',
                phone: '+27 12 345 6789',
                email: 'info@flaka.com',
                opening_hours: '08:00 - 22:00',
                user_id: 1
            },
        ];
    };

    // Fallback specials data in case API fails
    const getFallbackSpecials = () => {
        return [
            {
                id: 1,
                name: 'Special Meal',
                description: 'Chef\'s special meal of the day',
                originalPrice: 'R187.50',
                specialPrice: 'R150',
                discount: '20% OFF',
                shop: 'Flaka Cloud',
                shopId: 1,
                category: 'Special',
                image: require('../../assets/nthomeFood_images/buff-burger.jpg'),
                timeLeft: '6h 30m',
                tags: ['Limited Time', 'Popular']
            }
        ];
    };

    // Search functionality - updated to use real restaurants data
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setIsSearching(false);
            setSearchResults({
                shops: [],
                specials: [],
                recommendations: []
            });
            return;
        }

        setIsSearching(true);
        const query = searchQuery.toLowerCase().trim();

        // Filter restaurants (shops)
        const filteredShops = restaurants.filter(restaurant =>
            restaurant.name.toLowerCase().includes(query) ||
            restaurant.category.toLowerCase().includes(query) ||
            (restaurant.description && restaurant.description.toLowerCase().includes(query))
        );

        // Filter specials
        const filteredSpecials = todaySpecials.filter(special =>
            special.name.toLowerCase().includes(query) ||
            special.shop.toLowerCase().includes(query) ||
            special.category.toLowerCase().includes(query) ||
            special.description.toLowerCase().includes(query)
        );

        // Filter recommendations
        const filteredRecommendations = recommendations.filter(rec =>
            rec.name.toLowerCase().includes(query) ||
            rec.restaurant.toLowerCase().includes(query)
        );

        setSearchResults({
            shops: filteredShops,
            specials: filteredSpecials,
            recommendations: filteredRecommendations
        });
    }, [searchQuery, restaurants, todaySpecials]);

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

    // Refresh restaurants and specials
    const refreshRestaurants = () => {
        fetchRestaurants();
    };

    // Refresh specials only
    const refreshSpecials = () => {
        fetchTodaySpecials();
    };

    // Handle search
    const handleSearch = (text) => {
        setSearchQuery(text);
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
        setIsSearching(false);
    };

    // Add special to cart using Redux
    const addSpecialToCart = (special) => {
        const restaurant = restaurants.find(shop => shop.id === special.shopId);

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
            },
            cartId: `${special.id}-${special.shopId}-special` // Unique cart ID
        };

        // Dispatch the addToCart action
        dispatch(addToCart(cartItem));

        Alert.alert(
            "Added to Cart!",
            `${special.name} from ${special.shop} has been added to your cart`,
            [
                { text: "Continue Shopping" },
                {
                    text: "View Cart",
                    onPress: () => navigation.navigate('Cart', {
                        restaurant: null
                    })
                }
            ]
        );
    };

    // Handle special press
    const handleSpecialPress = (special) => {
        Alert.alert(
            special.name,
            `Add ${special.name} from ${special.shop} to cart?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "View Restaurant",
                    onPress: () => {
                        const restaurant = restaurants.find(shop => shop.id === special.shopId);
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
        const restaurant = restaurants.find(shop => shop.id === shopId);
        if (restaurant) {
            navigation.navigate('RestaurantDetail', { restaurant: restaurant });
        }
    };

    // Calculate total cart items count
    const getCartItemCount = () => {
        return cart.reduce((total, item) => total + item.quantity, 0);
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

    // Recommendations Data (you can make this dynamic too)
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
    ];

    // Render loading state for specials
    const renderSpecialsLoading = () => (
        <View style={styles.specialsLoadingContainer}>
            <ActivityIndicator size="small" color="#0DCAF0" />
            <Text style={styles.specialsLoadingText}>Loading specials...</Text>
        </View>
    );

    // Render empty state for specials
    const renderSpecialsEmpty = () => (
        <View style={styles.specialsEmptyContainer}>
            <Ionicons name="pricetag-outline" size={scaleFont(48)} color="#ccc" />
            <Text style={styles.specialsEmptyTitle}>No Specials Today</Text>
            <Text style={styles.specialsEmptyText}>
                Check back later for amazing deals!
            </Text>
        </View>
    );

    // Render search results
    const renderSearchResults = () => {
        const hasResults = searchResults.shops.length > 0 ||
            searchResults.specials.length > 0 ||
            searchResults.recommendations.length > 0;

        if (!hasResults && searchQuery.trim() !== '') {
            return (
                <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>
                        No results found for "{searchQuery}"
                    </Text>
                    <Text style={styles.noResultsSubText}>
                        Try searching for restaurants, food items, or categories
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.searchResultsContainer}>
                {/* Search Results for Shops */}
                {searchResults.shops.length > 0 && (
                    <View style={styles.searchSection}>
                        <Text style={styles.searchSectionTitle}>Restaurants</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                            {searchResults.shops.map((restaurant, index) => (
                                <TouchableOpacity
                                    key={restaurant.id}
                                    style={styles.shopItem}
                                    onPress={() => navigation.navigate('RestaurantDetail', { restaurant: restaurant })}
                                >
                                    <View style={[
                                        styles.shopImageContainer,
                                        { backgroundColor: index % 2 === 0 ? '#E6F7FF' : '#F0F9FF' }
                                    ]}>
                                        <Image
                                            source={restaurant.image}
                                            style={styles.shopImage}
                                            defaultSource={require('../../assets/nthomeFood_images/restaurants/default-restaurant.png')}
                                        />
                                        <View style={styles.ratingBadge}>
                                            <Text style={styles.ratingText}>⭐ {restaurant.rating}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.shopInfo}>
                                        <Text style={styles.shopName} numberOfLines={1}>{restaurant.name}</Text>
                                        <Text style={styles.shopCategory}>{restaurant.category}</Text>
                                        <Text style={styles.deliveryTime}>{restaurant.deliveryTime}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Search Results for Specials */}
                {searchResults.specials.length > 0 && (
                    <View style={styles.searchSection}>
                        <Text style={styles.searchSectionTitle}>Specials</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specialsScroll}>
                            {searchResults.specials.map((special) => (
                                <TouchableOpacity
                                    key={special.id}
                                    style={styles.specialItem}
                                    onPress={() => handleSpecialPress(special)}
                                >
                                    <View style={styles.discountBadge}>
                                        <Text style={styles.discountText}>{special.discount}</Text>
                                    </View>
                                    <Image
                                        source={special.image}
                                        style={styles.specialImage}
                                        defaultSource={require('../../assets/nthomeFood_images/restaurants/default-restaurant.png')}
                                    />
                                    <View style={styles.specialInfo}>
                                        <Text style={styles.specialShop}>{special.shop}</Text>
                                        <Text style={styles.specialName}>{special.name}</Text>
                                        <Text style={styles.specialCategory}>{special.category}</Text>
                                        <View style={styles.priceSection}>
                                            <Text style={styles.originalPrice}>{special.originalPrice}</Text>
                                            <Text style={styles.specialPrice}>{special.specialPrice}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Search Results for Recommendations */}
                {searchResults.recommendations.length > 0 && (
                    <View style={styles.searchSection}>
                        <Text style={styles.searchSectionTitle}>Food Items</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll}>
                            {searchResults.recommendations.map((item) => (
                                <TouchableOpacity key={item.id} style={styles.recommendationItem}>
                                    <Image source={item.image} style={styles.recommendationImage} />
                                    <View style={styles.recommendationInfo}>
                                        <Text style={styles.recommendationName} numberOfLines={2}>{item.name}</Text>
                                        <Text style={styles.recommendationRestaurant}>{item.restaurant}</Text>
                                        <View style={styles.recommendationDetails}>
                                            <View style={styles.recommendationRating}>
                                                <Icon type="material-community" name="star" color={"#FFD700"} size={scaleFont(14)} />
                                                <Text style={styles.ratingText}>{item.rating}</Text>
                                            </View>
                                            <Text style={styles.recommendationPrice}>{item.price}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };

    // Render normal content when not searching
    const renderNormalContent = () => (
        <>
            {/* Banner Image */}
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
                    <TouchableOpacity onPress={refreshRestaurants}>
                        <MaterialCommunityIcons name="refresh" color="#0DCAF0" size={scaleFont(20)} />
                    </TouchableOpacity>
                </View>
                {loadingRestaurants ? (
                    <ActivityIndicator size="small" color="#0DCAF0" />
                ) : restaurants.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                        {restaurants.map((restaurant, index) => (
                            <TouchableOpacity
                                key={restaurant.id}
                                style={styles.shopItem}
                                onPress={() => navigation.navigate('RestaurantDetail', { restaurant: restaurant })}
                            >
                                <View style={[
                                    styles.shopImageContainer,
                                    { backgroundColor: index % 2 === 0 ? '#E6F7FF' : '#F0F9FF' }
                                ]}>
                                    <Image
                                        source={restaurant.image}
                                        style={styles.shopImage}
                                        defaultSource={require('../../assets/nthomeFood_images/restaurants/default-restaurant.png')}
                                    />
                                    <View style={styles.ratingBadge}>
                                        <Text style={styles.ratingText}>⭐ {restaurant.rating}</Text>
                                    </View>
                                </View>
                                <View style={styles.shopInfo}>
                                    <Text style={styles.shopName} numberOfLines={1}>{restaurant.name}</Text>
                                    <Text style={styles.shopCategory}>{restaurant.category}</Text>
                                    <Text style={styles.deliveryTime}>{restaurant.deliveryTime}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    <Text style={styles.noRestaurantsText}>No restaurants available</Text>
                )}
            </View>

            {/* Today's Special - Now Dynamic */}
            <View style={styles.specialsSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Today's Special</Text>
                    <TouchableOpacity onPress={refreshSpecials}>
                        <MaterialCommunityIcons name="refresh" color="#0DCAF0" size={scaleFont(20)} />
                    </TouchableOpacity>
                </View>

                {loadingSpecials ? (
                    renderSpecialsLoading()
                ) : todaySpecials.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.specialsScroll}
                    >
                        {todaySpecials.map((special) => (
                            <TouchableOpacity
                                key={`${special.id}-${special.shopId}`}
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

                                <Image
                                    source={special.image}
                                    style={styles.specialImage}
                                    defaultSource={require('../../assets/nthomeFood_images/restaurants/default-restaurant.png')}
                                />

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
                ) : (
                    renderSpecialsEmpty()
                )}
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
                                        // Find the restaurant in restaurants
                                        const restaurant = restaurants.find(shop => shop.name === item.restaurant);
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
        </>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            {/* Header */}
            <View style={[styles.header, drawerOpen && styles.headerHidden]}>
                <TouchableOpacity onPress={toggleDrawer} style={styles.roundButton}>
                    <Icon type="material-community" name="menu" color={"#0DCAF0"} size={scaleFont(24)} />
                </TouchableOpacity>

                {renderWeatherWidget()}

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.cartButton}
                        onPress={() => navigation.navigate('Cart', {
                            restaurant: null
                        })}
                    >
                        <Ionicons name="cart-outline" size={scaleFont(24)} color="#0DCAF0" />
                        {getCartItemCount() > 0 && (
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>
                                    {getCartItemCount()}
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
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery ? (
                        <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                            <Icon type="material-community" name="close" color={"#fff"} size={scaleFont(18)} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.searchIcon}>
                            <Icon type="material-community" name="magnify" color={"#fff"} size={scaleFont(18)} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
                {isSearching || searchQuery ? renderSearchResults() : renderNormalContent()}
            </ScrollView>
            <CustomDrawer
                isOpen={drawerOpen}
                toggleDrawer={toggleDrawer}
                navigation={navigation}
                currentScreen="NthomeFoodLanding"
            />
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
    // Search Results Styles
    searchResultsContainer: {
        paddingHorizontal: responsiveWidth(5),
        paddingTop: responsiveHeight(2),
    },
    searchSection: {
        marginBottom: responsiveHeight(3),
    },
    searchSectionTitle: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(2),
    },
    noResultsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: responsiveHeight(10),
        paddingHorizontal: responsiveWidth(10),
    },
    noResultsText: {
        fontSize: scaleFont(16),
        fontWeight: '600',
        color: '#718096',
        textAlign: 'center',
        marginBottom: responsiveHeight(1),
    },
    noResultsSubText: {
        fontSize: scaleFont(14),
        color: '#A0AEC0',
        textAlign: 'center',
    },
    clearButton: {
        position: 'absolute',
        right: responsiveWidth(2.5),
        top: responsiveHeight(1),
        backgroundColor: '#FF6B6B',
        width: responsiveWidth(10),
        height: responsiveWidth(10),
        borderRadius: responsiveWidth(5),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: responsiveHeight(10),
    },
    loadingText: {
        fontSize: scaleFont(16),
        color: '#666',
        marginTop: responsiveHeight(2),
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: responsiveHeight(10),
        paddingHorizontal: responsiveWidth(10),
    },
    errorText: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#FF6B6B',
        textAlign: 'center',
        marginTop: responsiveHeight(2),
    },
    errorSubText: {
        fontSize: scaleFont(14),
        color: '#666',
        textAlign: 'center',
        marginTop: responsiveHeight(1),
        marginBottom: responsiveHeight(3),
    },
    retryButton: {
        backgroundColor: '#0DCAF0',
        paddingHorizontal: responsiveWidth(6),
        paddingVertical: responsiveHeight(1.5),
        borderRadius: responsiveWidth(3),
    },
    retryButtonText: {
        color: '#fff',
        fontSize: scaleFont(14),
        fontWeight: 'bold',
    },
    noRestaurantsText: {
        textAlign: 'center',
        fontSize: scaleFont(16),
        color: '#666',
        marginTop: responsiveHeight(2),
    },
    specialsLoadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: responsiveHeight(4),
    },
    specialsLoadingText: {
        fontSize: scaleFont(14),
        color: '#666',
        marginTop: responsiveHeight(1),
    },
    specialsEmptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: responsiveHeight(6),
        paddingHorizontal: responsiveWidth(10),
    },
    specialsEmptyTitle: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#666',
        marginTop: responsiveHeight(2),
        marginBottom: responsiveHeight(1),
    },
    specialsEmptyText: {
        fontSize: scaleFont(14),
        color: '#999',
        textAlign: 'center',
    },
});

export default NthomeFoodLanding;