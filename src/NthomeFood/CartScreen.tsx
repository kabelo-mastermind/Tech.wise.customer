// screens/CartScreen.js
import React, { useState, useMemo } from 'react';
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
    Alert,
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

const CartScreen = ({ navigation, route }) => {
    const { cart: initialCart, restaurant } = route.params || {};
    const [cart, setCart] = useState(initialCart || []);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const user = useSelector((state) => state.auth.user);

    // Mamelodi Shop Names Data
    const mamelodiShops = [
        {
            id: 1,
            name: 'KFC Mamelodi',
            category: 'Fast Food',
            image: require('../../assets/nthomeFood_images/kfc.jpg'),
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

    // Update the price calculation to handle special items
    const { subtotal, deliveryFee, tax, total } = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => {
            const price = parseInt(item.price.replace('R', '').trim());
            return sum + (price * item.quantity);
        }, 0);

        const deliveryFee = 25; // Fixed delivery fee
        const tax = subtotal * 0.15; // 15% tax
        const total = subtotal + deliveryFee + tax;

        return {
            subtotal,
            deliveryFee,
            tax: Math.round(tax),
            total: Math.round(total)
        };
    }, [cart]);

    // Function to get current location
    const getCurrentLocation = async () => {
        setIsLoadingLocation(true);

        try {
            // Request permission
            let { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    "Permission Denied",
                    "Please enable location permissions in your settings to use this feature.",
                    [{ text: "OK" }]
                );
                setIsLoadingLocation(false);
                return;
            }

            // Get current position
            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            // Reverse geocode to get address
            let geocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (geocode.length > 0) {
                const address = geocode[0];
                const formattedAddress = `${address.street || ''} ${address.streetNumber || ''}, ${address.city || ''}, ${address.region || ''}, ${address.postalCode || ''}`.trim();

                if (formattedAddress) {
                    setDeliveryAddress(formattedAddress);
                    Alert.alert(
                        "Location Found",
                        "Your current address has been filled automatically.",
                        [{ text: "OK" }]
                    );
                } else {
                    throw new Error('Could not format address');
                }
            } else {
                throw new Error('No address found for this location');
            }

        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert(
                "Location Error",
                "Unable to get your current location. Please make sure location services are enabled and try again, or enter your address manually.",
                [{ text: "OK" }]
            );
        } finally {
            setIsLoadingLocation(false);
        }
    };

    // In CartScreen.js - Update the cart management functions

    // Add item to cart with proper identification
    const addToCart = (item) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(cartItem =>
                cartItem.id === item.id &&
                cartItem.restaurantId === item.restaurantId
            );

            if (existingItemIndex !== -1) {
                return prevCart.map((cartItem, index) =>
                    index === existingItemIndex
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                );
            } else {
                return [...prevCart, { ...item, quantity: 1 }];
            }
        });
    };

    // Remove item from cart
    const removeFromCart = (item) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(cartItem =>
                cartItem.id === item.id &&
                cartItem.restaurantId === item.restaurantId
            );

            if (existingItemIndex !== -1) {
                const existingItem = prevCart[existingItemIndex];
                if (existingItem.quantity > 1) {
                    return prevCart.map((cartItem, index) =>
                        index === existingItemIndex
                            ? { ...cartItem, quantity: cartItem.quantity - 1 }
                            : cartItem
                    );
                } else {
                    return prevCart.filter((_, index) => index !== existingItemIndex);
                }
            }
            return prevCart;
        });
    };

    // Remove item completely from cart
    const removeItemCompletely = (item) => {
        setCart(prevCart => prevCart.filter(cartItem =>
            !(cartItem.id === item.id && cartItem.restaurantId === item.restaurantId)
        ));
    };

    // Clear entire cart
    const clearCart = () => {
        Alert.alert(
            "Clear Cart",
            "Are you sure you want to remove all items from your cart?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Clear", style: "destructive", onPress: () => setCart([]) }
            ]
        );
    };

    // Update the placeOrder function to show restaurant information

    const placeOrder = () => {
        if (cart.length === 0) {
            Alert.alert("Empty Cart", "Please add some items to your cart before placing an order.");
            return;
        }

        if (!deliveryAddress.trim()) {
            Alert.alert("Delivery Address", "Please enter your delivery address.");
            return;
        }

        const restaurantNames = [...new Set(cart.map(item => item.restaurant))];
        const restaurantText = restaurantNames.length === 1
            ? `from ${restaurantNames[0]}`
            : `from ${restaurantNames.length} different restaurants`;

        Alert.alert(
            "Confirm Order",
            `Are you ready to place your order for R${total} ${restaurantText}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Place Order",
                    style: "default",
                    onPress: () => {
                        console.log('Order placed:', {
                            restaurants: restaurantsInCart,
                            items: cart,
                            deliveryAddress,
                            specialInstructions,
                            paymentMethod: selectedPaymentMethod,
                            total
                        });

                        Alert.alert(
                            "Order Placed!",
                            `Your order ${restaurantText} has been placed successfully. You will receive a confirmation shortly.`,
                            [
                                {
                                    text: "OK",
                                    onPress: () => {
                                        setCart([]);
                                        navigation.navigate('NthomeFoodLanding');
                                    }
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    // Group items by restaurant for mixed cart
    const restaurantsInCart = useMemo(() => {
        const restaurants = {};
        cart.forEach(item => {
            if (item.restaurant && !restaurants[item.restaurant]) {
                restaurants[item.restaurant] = {
                    name: item.restaurant,
                    items: cart.filter(cartItem => cartItem.restaurant === item.restaurant)
                };
            }
        });
        return Object.values(restaurants);
    }, [cart]);

    // If cart has items from multiple restaurants, show a different header
    const hasMultipleRestaurants = restaurantsInCart.length > 1;

    // Update the renderCartItem to handle the unique key
    const renderCartItem = ({ item }) => (
        <View style={styles.cartItem}>
            <Image source={item.image} style={styles.cartItemImage} />

            <View style={styles.cartItemInfo}>
                {/* Shop Name */}
                <TouchableOpacity
                    style={styles.shopNameContainer}
                    onPress={() => {
                        if (item.restaurantId) {
                            const restaurant = mamelodiShops.find(shop => shop.id === item.restaurantId);
                            if (restaurant) {
                                navigation.navigate('RestaurantDetail', { restaurant: restaurant });
                            }
                        }
                    }}
                >
                    <Ionicons name="storefront-outline" size={scaleFont(12)} color="#0DCAF0" />
                    <Text style={styles.shopNameText}>{item.restaurant}</Text>
                </TouchableOpacity>

                <Text style={styles.cartItemName}>{item.name}</Text>

                {/* Show special badge if it's a special item */}
                {item.isSpecial && (
                    <View style={styles.specialBadge}>
                        <Ionicons name="flash" size={scaleFont(12)} color="#FFD700" />
                        <Text style={styles.specialBadgeText}>Today's Special</Text>
                    </View>
                )}

                <Text style={styles.cartItemDescription} numberOfLines={2}>
                    {item.description}
                </Text>

                {/* Show original price if it's a special item */}
                {item.isSpecial && item.specialDetails ? (
                    <View style={styles.specialPriceContainer}>
                        <Text style={styles.originalPrice}>
                            {item.specialDetails.originalPrice}
                        </Text>
                        <Text style={styles.specialPrice}>{item.price}</Text>
                        <Text style={styles.discountText}>
                            {item.specialDetails.discount}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.cartItemPrice}>{item.price}</Text>
                )}
            </View>

            <View style={styles.cartItemControls}>
                <View style={styles.quantityControls}>
                    <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => removeFromCart(item)}
                    >
                        <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>

                    <Text style={styles.quantityText}>{item.quantity}</Text>

                    <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => addToCart(item)}
                    >
                        <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeItemCompletely(item)}
                >
                    <Ionicons name="trash-outline" size={scaleFont(18)} color="#FF6B6B" />
                </TouchableOpacity>
            </View>
        </View>
    );


    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={scaleFont(24)} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Your Cart</Text>
                {cart.length > 0 && (
                    <TouchableOpacity onPress={clearCart} style={styles.clearButton}>
                        <Text style={styles.clearButtonText}>Clear All</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >

                {/* Restaurant Info - Show differently for mixed cart */}
                {restaurant && !hasMultipleRestaurants ? (
                    <View style={styles.restaurantSection}>
                        <View style={styles.restaurantHeader}>
                            <Image source={restaurant.image} style={styles.restaurantImage} />
                            <View style={styles.restaurantInfo}>
                                <Text style={styles.restaurantName}>{restaurant.name}</Text>
                                <Text style={styles.restaurantCategory}>{restaurant.category}</Text>
                                <View style={styles.restaurantDetails}>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="star" size={scaleFont(12)} color="#FFD700" />
                                        <Text style={styles.detailText}>{restaurant.rating}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="time-outline" size={scaleFont(12)} color="#666" />
                                        <Text style={styles.detailText}>{restaurant.deliveryTime}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                ) : hasMultipleRestaurants ? (
                    <View style={styles.multipleRestaurantsSection}>
                        <Text style={styles.sectionTitle}>Order from {restaurantsInCart.length} Restaurants</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.restaurantsScroll}
                        >
                            {restaurantsInCart.map((restaurant, index) => (
                                <View key={index} style={styles.restaurantChip}>
                                    <Ionicons name="restaurant" size={scaleFont(12)} color="#0DCAF0" />
                                    <Text style={styles.restaurantChipText}>{restaurant.name}</Text>
                                    <Text style={styles.restaurantItemCount}>({restaurant.items.length})</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                ) : null}

                {/* Cart Items */}
                <View style={styles.cartSection}>
                    <Text style={styles.sectionTitle}>
                        Order Items {cart.length > 0 && `(${cart.length})`}
                    </Text>

                    {cart.length === 0 ? (
                        <View style={styles.emptyCart}>
                            <Ionicons name="cart-outline" size={scaleFont(64)} color="#ccc" />
                            <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
                            <Text style={styles.emptyCartText}>
                                Add some delicious items from the menu
                            </Text>
                            <TouchableOpacity
                                style={styles.browseButton}
                                onPress={() => navigation.goBack()}
                            >
                                <Text style={styles.browseButtonText}>Browse Menu</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={cart}
                            renderItem={renderCartItem}
                            keyExtractor={(item) => `${item.id}-${item.restaurantId}-${item.isSpecial ? 'special' : 'regular'}`}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>

                {/* Delivery Address */}
                {cart.length > 0 && (
                    <View style={styles.addressSection}>
                        <View style={styles.addressHeader}>
                            <Text style={styles.sectionTitle}>Delivery Address</Text>
                            <TouchableOpacity
                                style={styles.locationButton}
                                onPress={getCurrentLocation}
                                disabled={isLoadingLocation}
                            >
                                {isLoadingLocation ? (
                                    <ActivityIndicator size="small" color="#0DCAF0" />
                                ) : (
                                    <Ionicons name="navigate" size={scaleFont(18)} color="#0DCAF0" />
                                )}
                                <Text style={styles.locationButtonText}>
                                    {isLoadingLocation ? 'Getting Location...' : 'Use Current Location'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.addressInputContainer}>
                            <Ionicons name="location-outline" size={scaleFont(20)} color="#0DCAF0" />
                            <TextInput
                                style={styles.addressInput}
                                placeholder="Enter your delivery address"
                                placeholderTextColor="#999"
                                value={deliveryAddress}
                                onChangeText={setDeliveryAddress}
                                multiline
                            />
                        </View>
                    </View>
                )}

                {/* Special Instructions */}
                {cart.length > 0 && (
                    <View style={styles.instructionsSection}>
                        <Text style={styles.sectionTitle}>Special Instructions</Text>
                        <TextInput
                            style={styles.instructionsInput}
                            placeholder="Any special instructions for the restaurant?"
                            placeholderTextColor="#999"
                            value={specialInstructions}
                            onChangeText={setSpecialInstructions}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                )}

                {/* Payment Method */}
                {cart.length > 0 && (
                    <View style={styles.paymentSection}>
                        <Text style={styles.sectionTitle}>Payment Method</Text>
                        <View style={styles.paymentOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.paymentOption,
                                    selectedPaymentMethod === 'card' && styles.paymentOptionSelected
                                ]}
                                onPress={() => setSelectedPaymentMethod('card')}
                            >
                                <Ionicons
                                    name={selectedPaymentMethod === 'card' ? "card" : "card-outline"}
                                    size={scaleFont(20)}
                                    color={selectedPaymentMethod === 'card' ? "#0DCAF0" : "#666"}
                                />
                                <Text style={[
                                    styles.paymentOptionText,
                                    selectedPaymentMethod === 'card' && styles.paymentOptionTextSelected
                                ]}>
                                    Credit/Debit Card
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.paymentOption,
                                    selectedPaymentMethod === 'cash' && styles.paymentOptionSelected
                                ]}
                                onPress={() => setSelectedPaymentMethod('cash')}
                            >
                                <Ionicons
                                    name={selectedPaymentMethod === 'cash' ? "cash" : "cash-outline"}
                                    size={scaleFont(20)}
                                    color={selectedPaymentMethod === 'cash' ? "#0DCAF0" : "#666"}
                                />
                                <Text style={[
                                    styles.paymentOptionText,
                                    selectedPaymentMethod === 'cash' && styles.paymentOptionTextSelected
                                ]}>
                                    Cash on Delivery
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Order Summary */}
                {cart.length > 0 && (
                    <View style={styles.summarySection}>
                        <Text style={styles.sectionTitle}>Order Summary</Text>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Subtotal</Text>
                            <Text style={styles.summaryValue}>R{subtotal}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Delivery Fee</Text>
                            <Text style={styles.summaryValue}>R{deliveryFee}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Tax (15%)</Text>
                            <Text style={styles.summaryValue}>R{tax}</Text>
                        </View>
                        <View style={[styles.summaryRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>R{total}</Text>
                        </View>
                    </View>
                )}

                {/* Spacer for bottom button */}
                <View style={styles.spacer} />
            </ScrollView>

            {/* Place Order Button */}
            {cart.length > 0 && (
                <View style={styles.placeOrderContainer}>
                    <TouchableOpacity
                        style={styles.placeOrderButton}
                        onPress={placeOrder}
                    >
                        <Text style={styles.placeOrderText}>Place Order - R{total}</Text>
                        <Ionicons name="arrow-forward" size={scaleFont(20)} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: responsiveWidth(5),
        paddingVertical: responsiveHeight(2),
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E6F7FF',
    },
    backButton: {
        padding: responsiveWidth(2),
    },
    headerTitle: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#2D3748',
    },
    clearButton: {
        padding: responsiveWidth(2),
    },
    clearButtonText: {
        fontSize: scaleFont(14),
        color: '#FF6B6B',
        fontWeight: '600',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: responsiveHeight(10),
    },
    restaurantSection: {
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
        marginBottom: responsiveHeight(2),
        borderBottomWidth: 1,
        borderBottomColor: '#E6F7FF',
    },
    restaurantHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    restaurantImage: {
        width: responsiveWidth(20),
        height: responsiveWidth(20),
        borderRadius: responsiveWidth(4),
        marginRight: responsiveWidth(4),
    },
    restaurantInfo: {
        flex: 1,
    },
    restaurantName: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(0.5),
    },
    restaurantCategory: {
        fontSize: scaleFont(14),
        color: '#0DCAF0',
        fontWeight: '600',
        marginBottom: responsiveHeight(1),
    },
    restaurantDetails: {
        flexDirection: 'row',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: responsiveWidth(4),
    },
    detailText: {
        fontSize: scaleFont(12),
        color: '#666',
        marginLeft: responsiveWidth(1),
    },
    cartSection: {
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
        marginBottom: responsiveHeight(2),
    },
    sectionTitle: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(2),
    },
    emptyCart: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: responsiveHeight(5),
    },
    emptyCartTitle: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#666',
        marginTop: responsiveHeight(2),
        marginBottom: responsiveHeight(1),
    },
    emptyCartText: {
        fontSize: scaleFont(14),
        color: '#999',
        textAlign: 'center',
        marginBottom: responsiveHeight(3),
    },
    browseButton: {
        backgroundColor: '#0DCAF0',
        paddingHorizontal: responsiveWidth(6),
        paddingVertical: responsiveHeight(1.5),
        borderRadius: responsiveWidth(3),
    },
    browseButtonText: {
        fontSize: scaleFont(14),
        color: '#fff',
        fontWeight: 'bold',
    },
    cartItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: responsiveWidth(4),
        borderRadius: responsiveWidth(4),
        marginBottom: responsiveHeight(2),
        borderWidth: 1,
        borderColor: '#E6F7FF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cartItemImage: {
        width: responsiveWidth(20),
        height: responsiveWidth(20),
        borderRadius: responsiveWidth(3),
        marginRight: responsiveWidth(4),
    },
    cartItemInfo: {
        flex: 1,
        marginRight: responsiveWidth(2),
    },
    cartItemName: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(0.5),
    },
    cartItemDescription: {
        fontSize: scaleFont(12),
        color: '#718096',
        marginBottom: responsiveHeight(1),
        lineHeight: scaleFont(16),
    },
    cartItemPrice: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#000',
    },
    cartItemControls: {
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: responsiveHeight(1),
    },
    quantityButton: {
        backgroundColor: '#0DCAF0',
        width: responsiveWidth(8),
        height: responsiveWidth(8),
        borderRadius: responsiveWidth(4),
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityButtonText: {
        fontSize: scaleFont(16),
        color: '#fff',
        fontWeight: 'bold',
    },
    quantityText: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        marginHorizontal: responsiveWidth(2),
        color: '#2D3748',
        minWidth: responsiveWidth(6),
        textAlign: 'center',
    },
    removeButton: {
        padding: responsiveWidth(1),
    },
    addressSection: {
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
        marginBottom: responsiveHeight(2),
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: responsiveHeight(2),
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6F7FF',
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(1),
        borderRadius: responsiveWidth(2),
    },
    locationButtonText: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        fontWeight: '600',
        marginLeft: responsiveWidth(1),
    },
    addressInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#f8f9fa',
        borderRadius: responsiveWidth(3),
        padding: responsiveWidth(4),
        borderWidth: 1,
        borderColor: '#E6F7FF',
    },
    addressInput: {
        flex: 1,
        fontSize: scaleFont(14),
        color: '#333',
        marginLeft: responsiveWidth(3),
        textAlignVertical: 'top',
    },
    instructionsSection: {
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
        marginBottom: responsiveHeight(2),
    },
    instructionsInput: {
        backgroundColor: '#f8f9fa',
        borderRadius: responsiveWidth(3),
        padding: responsiveWidth(4),
        borderWidth: 1,
        borderColor: '#E6F7FF',
        fontSize: scaleFont(14),
        color: '#333',
        textAlignVertical: 'top',
        minHeight: responsiveHeight(10),
    },
    paymentSection: {
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
        marginBottom: responsiveHeight(2),
    },
    paymentOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    paymentOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        padding: responsiveWidth(4),
        borderRadius: responsiveWidth(3),
        borderWidth: 2,
        borderColor: 'transparent',
        marginHorizontal: responsiveWidth(1),
    },
    paymentOptionSelected: {
        backgroundColor: '#E6F7FF',
        borderColor: '#0DCAF0',
    },
    paymentOptionText: {
        fontSize: scaleFont(14),
        color: '#666',
        fontWeight: '500',
        marginLeft: responsiveWidth(2),
    },
    paymentOptionTextSelected: {
        color: '#0DCAF0',
        fontWeight: '600',
    },
    summarySection: {
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
        marginBottom: responsiveHeight(2),
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: responsiveHeight(1),
        borderBottomWidth: 1,
        borderBottomColor: '#E6F7FF',
    },
    totalRow: {
        borderBottomWidth: 0,
        paddingTop: responsiveHeight(2),
        marginTop: responsiveHeight(1),
        borderTopWidth: 2,
        borderTopColor: '#E6F7FF',
    },
    summaryLabel: {
        fontSize: scaleFont(14),
        color: '#666',
    },
    summaryValue: {
        fontSize: scaleFont(14),
        color: '#333',
        fontWeight: '500',
    },
    totalLabel: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#2D3748',
    },
    totalValue: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#0DCAF0',
    },
    spacer: {
        height: responsiveHeight(2),
    },
    placeOrderContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
        borderTopWidth: 1,
        borderTopColor: '#E6F7FF',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    placeOrderButton: {
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: responsiveHeight(2),
        borderRadius: responsiveWidth(3),
    },
    placeOrderText: {
        fontSize: scaleFont(16),
        color: '#fff',
        fontWeight: 'bold',
        marginRight: responsiveWidth(2),
    },
    // Add these styles to the CartScreen styles

    specialBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9E6',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(2),
        alignSelf: 'flex-start',
        marginBottom: responsiveHeight(0.5),
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    specialBadgeText: {
        fontSize: scaleFont(10),
        color: '#B8860B',
        fontWeight: 'bold',
        marginLeft: responsiveWidth(0.5),
    },
    specialPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: responsiveHeight(0.5),
    },
    originalPrice: {
        fontSize: scaleFont(12),
        color: '#718096',
        textDecorationLine: 'line-through',
        marginRight: responsiveWidth(1),
    },
    specialPrice: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#000',
        marginRight: responsiveWidth(2),
    },
    discountText: {
        fontSize: scaleFont(10),
        color: '#FF6B6B',
        fontWeight: 'bold',
        backgroundColor: '#FFE6E6',
        paddingHorizontal: responsiveWidth(1.5),
        paddingVertical: responsiveHeight(0.3),
        borderRadius: responsiveWidth(1),
    },
    shopNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6F7FF',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.3),
        borderRadius: responsiveWidth(2),
        alignSelf: 'flex-start',
        marginBottom: responsiveHeight(0.5),
    },
    shopNameText: {
        fontSize: scaleFont(10),
        color: '#0DCAF0',
        fontWeight: '600',
        marginLeft: responsiveWidth(0.5),
    },
    // Add these styles to the CartScreen styles

    multipleRestaurantsSection: {
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
        marginBottom: responsiveHeight(2),
        borderBottomWidth: 1,
        borderBottomColor: '#E6F7FF',
    },
    restaurantsScroll: {
        marginHorizontal: responsiveWidth(-1),
    },
    restaurantChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6F7FF',
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(1),
        borderRadius: responsiveWidth(3),
        marginHorizontal: responsiveWidth(1),
        borderWidth: 1,
        borderColor: '#0DCAF0',
    },
    restaurantChipText: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        fontWeight: '600',
        marginLeft: responsiveWidth(1),
        marginRight: responsiveWidth(0.5),
    },
    restaurantItemCount: {
        fontSize: scaleFont(10),
        color: '#666',
        fontWeight: '500',
    },
});

export default CartScreen;