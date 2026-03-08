import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GOOGLE_MAPS_APIKEY } from "@env"
import {
    GooglePlacesAutocomplete
} from "react-native-google-places-autocomplete"
import {
    View,
    Text,
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
import { useSelector, useDispatch } from 'react-redux';
import { addToCart, removeFromCart, clearCart } from '../redux/actions/orderActions';
import * as Location from 'expo-location';
import { api } from '../../api';

const { width, height } = Dimensions.get('window');

const responsiveWidth = (percentage) => (width * percentage) / 100;
const responsiveHeight = (percentage) => (height * percentage) / 100;
const scaleFont = (size) => (width / 375) * size;

const CartScreen = ({ navigation, route }) => {
    const { restaurant } = route.params || {};
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [addressDetails, setAddressDetails] = useState(null);
    const [isManualAddress, setIsManualAddress] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [orderType, setOrderType] = useState('delivery'); // 'delivery' or 'collection'

    const user = useSelector((state) => state.auth.user);
    const cart = useSelector((state) => state.order.cart);
    const dispatch = useDispatch();
    const placesRef = useRef(null);
    const manualInputRef = useRef(null);

    useEffect(() => {
        console.log("🛒 Cart Updated:", cart);
    }, [cart]);

    const mamelodiShops = [
        {
            id: 1,
            name: 'KFC Mamelodi',
            category: 'Fast Food',
            image: require('../../assets/nthomeFood_images/kfc.jpg'),
            rating: 4.2,
            deliveryTime: '20-30 min',
            address: '123 Mamelodi Street, Mamelodi'
        },
        {
            id: 2,
            name: 'Chicken Licken',
            category: 'Fast Food',
            image: require('../../assets/nthomeFood_images/chicken-licken.jpg'),
            rating: 4.0,
            deliveryTime: '25-35 min',
            address: '456 Mamelodi Road, Mamelodi'
        },
        // ... other shops with address property
    ];

    // Calculate totals based on order type
    const { subtotal, deliveryFee, tax, total } = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => {
            const price = parseInt(item.price.replace('R', '').trim());
            return sum + (price * item.quantity);
        }, 0);

        // No delivery fee for collection orders
        const deliveryFee = orderType === 'delivery' ? 25 : 0;
        const tax = subtotal * 0.15;
        const total = subtotal + deliveryFee + tax;

        return {
            subtotal,
            deliveryFee,
            tax: Math.round(tax),
            total: Math.round(total)
        };
    }, [cart, orderType]);

    // Function to create order in database
    const createOrderInDatabase = async (orderData) => {
        try {
            const response = await fetch(`${api}/food-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                throw new Error(`Failed to create order: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    };

    const getCurrentLocation = async () => {
        setIsLoadingLocation(true);

        try {
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
                    setIsManualAddress(true);
                    setAddressDetails({
                        formattedAddress: formattedAddress,
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        isCurrentLocation: true
                    });
                }
            }

        } catch (error) {
            console.error('Error getting location:', error);
            const msg = error && error.message ? String(error.message) : ''
            const isTransient = /Google Play services|connection to Google Play services|service disconnection|has been rejected|Service not Available|Location request has been rejected|Call to function/i.test(msg) || (error && (error.code === 20 || error.code === '20'))
            if (isTransient) {
                // Suppress noisy Google Play / service-disconnection errors; allow manual entry
                console.warn('Transient location error suppressed in CartScreen:', msg)
            } else {
                Alert.alert(
                    "Location Error",
                    "Unable to get your current location. Please make sure location services are enabled and try again.",
                    [{ text: "OK" }]
                );
            }
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handlePlaceSelected = (data, details = null) => {
        if (details) {
            const address = details.formatted_address;
            setDeliveryAddress(address);
            setIsManualAddress(false);
            setAddressDetails({
                formattedAddress: address,
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
                placeId: details.place_id,
                name: details.name,
                addressComponents: details.address_components
            });
        }
    };

    const handleManualAddressChange = (text) => {
        setDeliveryAddress(text);
        setIsManualAddress(true);
        setAddressDetails(null);
    };

    const switchToAutocomplete = () => {
        setIsManualAddress(false);
        setDeliveryAddress('');
        setAddressDetails(null);
    };

    const handleAddToCart = (item) => {
        dispatch(addToCart({ ...item, quantity: 1 }));
    };

    const handleRemoveFromCart = (cartId) => {
        dispatch(removeFromCart(cartId));
    };

    const handleRemoveItemCompletely = (item) => {
        dispatch(removeFromCart(item.cartId));
    };

    const handleClearCart = () => {
        Alert.alert(
            "Clear Cart",
            "Are you sure you want to remove all items from your cart?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Clear", style: "destructive", onPress: () => dispatch(clearCart()) }
            ]
        );
    };

    const placeOrder = async () => {
        if (cart.length === 0) {
            Alert.alert("Empty Cart", "Please add some items to your cart before placing an order.");
            return;
        }

        // Validate delivery address only for delivery orders
        if (orderType === 'delivery' && !deliveryAddress.trim()) {
            Alert.alert("Delivery Address", "Please enter your delivery address.");
            return;
        }

        const restaurantNames = [...new Set(cart.map(item => item.restaurant))];
        const restaurantIds = [...new Set(cart.map(item => item.restaurantId))];
        const restaurantText = restaurantNames.length === 1
            ? `from ${restaurantNames[0]}`
            : `from ${restaurantNames.length} different restaurants`;

        const orderTypeText = orderType === 'delivery' ? 'Delivery' : 'Collection';
        const addressText = orderType === 'delivery' ? `\nDelivery to: ${deliveryAddress}` : `\nCollection from: ${restaurant?.name || restaurantNames[0]}`;

        Alert.alert(
            "Confirm Order",
            `Are you ready to place your ${orderTypeText.toLowerCase()} order for R${total} ${restaurantText}?${addressText}`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Place Order",
                    style: "default",
                    onPress: async () => {
                        setIsPlacingOrder(true);

                        try {
                            // Prepare order data for API
                            const orderData = {
                                user_id: user?.user_id || 1,
                                customer_name: user?.name || 'Customer',
                                customer_phone: user?.phoneNumber || '',
                                customer_email: user?.email || '',
                                delivery_address: orderType === 'delivery' ? deliveryAddress : (restaurant?.address || 'Collection'),
                                order_type: orderType,
                                restaurant_id: restaurantIds[0] || restaurant?.id, // Include restaurant ID
                                // restaurant_name: restaurantNames[0] || restaurant?.name,
                                items: cart.map(item => ({
                                    menu_item_id: item.id,
                                    item_name: item.name,
                                    quantity: item.quantity,
                                    unit_price: parseInt(item.price.replace('R', '').trim()),
                                    special_instructions: item.specialInstructions || '',
                                    restaurant_id: item.restaurantId // Include restaurant ID for each item
                                })),
                                special_instructions: specialInstructions,
                                payment_method: selectedPaymentMethod
                            };

                            console.log('Sending order data:', orderData);

                            // Create order in database
                            const createdOrder = await createOrderInDatabase(orderData);

                            console.log('Order created successfully:', createdOrder);

                            // Success alert
                            Alert.alert(
                                "Order Placed!",
                                `Your ${orderTypeText.toLowerCase()} order ${restaurantText} has been placed successfully.\n\nOrder Number: ${createdOrder.order_number}\nYou will receive a confirmation shortly.`,
                                [
                                    {
                                        text: "Track Order",
                                        onPress: () => {
                                            dispatch(clearCart());
                                            setIsPlacingOrder(false);
                                            navigation.navigate('OrderTracking', {
                                                orderId: createdOrder.id,
                                                orderNumber: createdOrder.order_number,
                                                customerId: user?.user_id
                                            });
                                        }
                                    }
                                ]
                            );

                        } catch (error) {
                            console.error('Error placing order:', error);
                            setIsPlacingOrder(false);

                            Alert.alert(
                                "Order Failed",
                                "There was an error placing your order. Please try again.",
                                [
                                    { text: "OK" }
                                ]
                            );
                        }
                    }
                }
            ]
        );
    };

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

    const hasMultipleRestaurants = restaurantsInCart.length > 1;

    const renderCartItem = ({ item }) => (
        <View style={styles.cartItem}>
            <Image source={item.image} style={styles.cartItemImage} />

            <View style={styles.cartItemInfo}>
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

                {item.isSpecial && (
                    <View style={styles.specialBadge}>
                        <Ionicons name="flash" size={scaleFont(12)} color="#FFD700" />
                        <Text style={styles.specialBadgeText}>Today's Special</Text>
                    </View>
                )}

                <Text style={styles.cartItemDescription} numberOfLines={2}>
                    {item.description}
                </Text>

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
                        onPress={() => handleRemoveFromCart(item.cartId)}
                    >
                        <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>

                    <Text style={styles.quantityText}>{item.quantity}</Text>

                    <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleAddToCart(item)}
                    >
                        <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItemCompletely(item)}
                >
                    <Ionicons name="trash-outline" size={scaleFont(18)} color="#FF6B6B" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderRestaurantChip = ({ item, index }) => (
        <View key={index} style={styles.restaurantChip}>
            <Ionicons name="restaurant" size={scaleFont(12)} color="#0DCAF0" />
            <Text style={styles.restaurantChipText}>{item.name}</Text>
            <Text style={styles.restaurantItemCount}>({item.items.length})</Text>
        </View>
    );

    const CartItemsSection = () => (
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
                    keyExtractor={(item) => item.cartId}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={scaleFont(24)} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Your Cart</Text>
                {cart.length > 0 && (
                    <TouchableOpacity onPress={handleClearCart} style={styles.clearButton}>
                        <Text style={styles.clearButtonText}>Clear All</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={[{ key: 'content' }]}
                renderItem={({ item }) => (
                    <View style={styles.scrollContent}>
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
                                        {restaurant.address && (
                                            <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ) : hasMultipleRestaurants ? (
                            <View style={styles.multipleRestaurantsSection}>
                                <Text style={styles.sectionTitle}>Order from {restaurantsInCart.length} Restaurants</Text>
                                <FlatList
                                    data={restaurantsInCart}
                                    renderItem={renderRestaurantChip}
                                    keyExtractor={(item, index) => `restaurant-${index}`}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.restaurantsScroll}
                                />
                            </View>
                        ) : null}

                        <CartItemsSection />

                        {/* Order Type Selection */}
                        {cart.length > 0 && (
                            <View style={styles.orderTypeSection}>
                                <Text style={styles.sectionTitle}>Order Type</Text>
                                <View style={styles.orderTypeOptions}>
                                    <TouchableOpacity
                                        style={[
                                            styles.orderTypeOption,
                                            orderType === 'delivery' && styles.orderTypeOptionSelected
                                        ]}
                                        onPress={() => setOrderType('delivery')}
                                    >
                                        <Ionicons
                                            name={orderType === 'delivery' ? "car" : "car-outline"}
                                            size={scaleFont(20)}
                                            color={orderType === 'delivery' ? "#0DCAF0" : "#666"}
                                        />
                                        <Text style={[
                                            styles.orderTypeText,
                                            orderType === 'delivery' && styles.orderTypeTextSelected
                                        ]}>
                                            Delivery
                                        </Text>
                                        {orderType === 'delivery' && (
                                            <Text style={styles.deliveryFeeText}>+R{deliveryFee}</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.orderTypeOption,
                                            orderType === 'collection' && styles.orderTypeOptionSelected
                                        ]}
                                        onPress={() => setOrderType('collection')}
                                    >
                                        <Ionicons
                                            name={orderType === 'collection' ? "storefront" : "storefront-outline"}
                                            size={scaleFont(20)}
                                            color={orderType === 'collection' ? "#0DCAF0" : "#666"}
                                        />
                                        <Text style={[
                                            styles.orderTypeText,
                                            orderType === 'collection' && styles.orderTypeTextSelected
                                        ]}>
                                            Collection
                                        </Text>
                                        {orderType === 'collection' && (
                                            <Text style={styles.collectionSaveText}>Save R{deliveryFee}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Delivery Address Section - Only show for delivery orders */}
                        {cart.length > 0 && orderType === 'delivery' && (
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
                                    {!isManualAddress ? (
                                        <>
                                            <GooglePlacesAutocomplete
                                                ref={placesRef}
                                                placeholder="Search for your address..."
                                                onPress={handlePlaceSelected}
                                                query={{
                                                    key: GOOGLE_MAPS_APIKEY,
                                                    language: 'en',
                                                    components: 'country:za',
                                                }}
                                                styles={{
                                                    textInputContainer: styles.placesTextInputContainer,
                                                    textInput: styles.placesTextInput,
                                                    listView: styles.placesListView,
                                                    description: styles.placesDescription,
                                                    poweredContainer: styles.placesPoweredContainer,
                                                }}
                                                fetchDetails={true}
                                                enablePoweredByContainer={false}
                                                debounce={400}
                                                minLength={2}
                                                nearbyPlacesAPI="GooglePlacesSearch"
                                                listViewDisplayed="auto"
                                                renderLeftButton={() => (
                                                    <View style={styles.placesLeftButton}>
                                                        <Ionicons name="search-outline" size={scaleFont(20)} color="#0DCAF0" />
                                                    </View>
                                                )}
                                                textInputProps={{
                                                    placeholderTextColor: '#999',
                                                    returnKeyType: 'search',
                                                }}
                                                predefinedPlaces={[
                                                    {
                                                        description: 'Current Location',
                                                        geometry: { location: { lat: 0, lng: 0 } },
                                                    },
                                                ]}
                                                currentLocation={false}
                                                currentLocationLabel="Current location"
                                            />
                                            <TouchableOpacity
                                                style={styles.switchToManualButton}
                                                onPress={() => setIsManualAddress(true)}
                                            >
                                                <Text style={styles.switchToManualText}>
                                                    Or enter address manually
                                                </Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <View style={styles.manualInputContainer}>
                                            <View style={styles.manualInputWrapper}>
                                                <Ionicons name="location-outline" size={scaleFont(20)} color="#0DCAF0" />
                                                <TextInput
                                                    ref={manualInputRef}
                                                    style={styles.manualAddressInput}
                                                    placeholder="Enter your delivery address"
                                                    placeholderTextColor="#999"
                                                    value={deliveryAddress}
                                                    onChangeText={handleManualAddressChange}
                                                    multiline
                                                    numberOfLines={2}
                                                    autoFocus={true}
                                                />
                                            </View>
                                            <TouchableOpacity
                                                style={styles.switchToAutocompleteButton}
                                                onPress={switchToAutocomplete}
                                            >
                                                <Text style={styles.switchToAutocompleteText}>
                                                    Use address search instead
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Collection Info Section - Only show for collection orders */}
                        {cart.length > 0 && orderType === 'collection' && (
                            <View style={styles.collectionSection}>
                                <Text style={styles.sectionTitle}>Collection Information</Text>
                                <View style={styles.collectionInfo}>
                                    <Ionicons name="storefront" size={scaleFont(24)} color="#0DCAF0" />
                                    <View style={styles.collectionDetails}>
                                        <Text style={styles.collectionTitle}>Collect from Restaurant</Text>
                                        <Text style={styles.collectionText}>
                                            {restaurant ? `Collect your order from ${restaurant.name}` : 'Collect your order from the restaurant'}
                                        </Text>
                                        {restaurant?.address && (
                                            <Text style={styles.collectionAddress}>
                                                <Ionicons name="location" size={scaleFont(12)} color="#666" />
                                                {restaurant.address}
                                            </Text>
                                        )}
                                        <Text style={styles.collectionNote}>
                                            You'll receive a notification when your order is ready for collection.
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

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
                                            {orderType === 'delivery' ? 'Cash on Delivery' : 'Pay at Collection'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {cart.length > 0 && (
                            <View style={styles.summarySection}>
                                <Text style={styles.sectionTitle}>Order Summary</Text>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Subtotal</Text>
                                    <Text style={styles.summaryValue}>R{subtotal}</Text>
                                </View>
                                {orderType === 'delivery' && (
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Delivery Fee</Text>
                                        <Text style={styles.summaryValue}>R{deliveryFee}</Text>
                                    </View>
                                )}
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Tax (15%)</Text>
                                    <Text style={styles.summaryValue}>R{tax}</Text>
                                </View>
                                <View style={[styles.summaryRow, styles.totalRow]}>
                                    <Text style={styles.totalLabel}>Total</Text>
                                    <Text style={styles.totalValue}>R{total}</Text>
                                </View>
                                {orderType === 'collection' && (
                                    <View style={styles.collectionSavings}>
                                        <Ionicons name="checkmark-circle" size={scaleFont(14)} color="#4CAF50" />
                                        <Text style={styles.collectionSavingsText}>
                                            You save R{deliveryFee} with collection
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.spacer} />
                    </View>
                )}
                keyExtractor={(item) => item.key}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
            />

            {cart.length > 0 && (
                <View style={styles.placeOrderContainer}>
                    <TouchableOpacity
                        style={[styles.placeOrderButton, isPlacingOrder && styles.placeOrderButtonDisabled]}
                        onPress={placeOrder}
                        disabled={isPlacingOrder}
                    >
                        {isPlacingOrder ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.placeOrderText}>
                                    Place {orderType === 'delivery' ? 'Delivery' : 'Collection'} Order - R{total}
                                </Text>
                                <Ionicons name="arrow-forward" size={scaleFont(20)} color="#fff" />
                            </>
                        )}
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
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    backButton: {
        padding: responsiveWidth(2),
    },
    headerTitle: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        textAlign: 'center',
    },
    clearButton: {
        padding: responsiveWidth(2),
    },
    clearButtonText: {
        fontSize: scaleFont(14),
        color: '#FF6B6B',
        fontWeight: '600',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    scrollContent: {
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
    restaurantAddress: {
        fontSize: scaleFont(12),
        color: '#666',
        marginTop: responsiveHeight(0.5),
        fontStyle: 'italic',
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
    // Order Type Section
    orderTypeSection: {
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
        marginBottom: responsiveHeight(2),
    },
    orderTypeOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    orderTypeOption: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        padding: responsiveWidth(4),
        borderRadius: responsiveWidth(3),
        borderWidth: 2,
        borderColor: 'transparent',
        marginHorizontal: responsiveWidth(1),
    },
    orderTypeOptionSelected: {
        backgroundColor: '#E6F7FF',
        borderColor: '#0DCAF0',
    },
    orderTypeText: {
        fontSize: scaleFont(14),
        color: '#666',
        fontWeight: '500',
        marginTop: responsiveHeight(1),
        textAlign: 'center',
    },
    orderTypeTextSelected: {
        color: '#0DCAF0',
        fontWeight: '600',
    },
    deliveryFeeText: {
        fontSize: scaleFont(12),
        color: '#666',
        marginTop: responsiveHeight(0.5),
    },
    collectionSaveText: {
        fontSize: scaleFont(12),
        color: '#4CAF50',
        fontWeight: '600',
        marginTop: responsiveHeight(0.5),
    },
    // Collection Section
    collectionSection: {
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
        marginBottom: responsiveHeight(2),
    },
    collectionInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    collectionDetails: {
        flex: 1,
        marginLeft: responsiveWidth(3),
    },
    collectionTitle: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(0.5),
    },
    collectionText: {
        fontSize: scaleFont(14),
        color: '#666',
        marginBottom: responsiveHeight(1),
    },
    collectionAddress: {
        fontSize: scaleFont(12),
        color: '#666',
        marginBottom: responsiveHeight(1),
        flexDirection: 'row',
        alignItems: 'center',
    },
    collectionNote: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        fontStyle: 'italic',
    },
    // Collection Savings in Summary
    collectionSavings: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8F5E8',
        padding: responsiveWidth(3),
        borderRadius: responsiveWidth(2),
        marginTop: responsiveHeight(1),
    },
    collectionSavingsText: {
        fontSize: scaleFont(12),
        color: '#4CAF50',
        fontWeight: '600',
        marginLeft: responsiveWidth(1),
    },
    // ... rest of your existing styles remain the same
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
        marginTop: responsiveHeight(1),
    },
    // Manual input styles
    manualInputContainer: {
        marginTop: responsiveHeight(1),
    },
    manualInputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#f8f9fa',
        borderRadius: responsiveWidth(3),
        padding: responsiveWidth(4),
        borderWidth: 1,
        borderColor: '#E6F7FF',
        marginBottom: responsiveHeight(1),
    },
    manualAddressInput: {
        flex: 1,
        fontSize: scaleFont(14),
        color: '#333',
        marginLeft: responsiveWidth(3),
        textAlignVertical: 'top',
        padding: 0,
    },
    switchToAutocompleteButton: {
        alignSelf: 'flex-start',
        padding: responsiveWidth(2),
    },
    switchToAutocompleteText: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        fontWeight: '600',
    },
    switchToManualButton: {
        alignSelf: 'flex-start',
        padding: responsiveWidth(2),
        marginTop: responsiveHeight(1),
    },
    switchToManualText: {
        fontSize: scaleFont(12),
        color: '#666',
        fontWeight: '500',
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

    // Google Places Autocomplete Styles
    placesTextInputContainer: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        borderBottomWidth: 0,
        paddingHorizontal: 0,
    },
    placesTextInput: {
        height: responsiveHeight(6),
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 8,
        paddingHorizontal: responsiveWidth(4),
        fontSize: scaleFont(14),
        color: '#333',
    },
    placesListView: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderTopWidth: 0,
        marginHorizontal: responsiveWidth(2),
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    placesDescription: {
        fontSize: scaleFont(14),
        color: '#333',
    },
    placesPoweredContainer: {
        display: 'none',
    },
    placesLeftButton: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: responsiveWidth(3),
        marginRight: responsiveWidth(1),
    },
    placeOrderButtonDisabled: {
        backgroundColor: '#666',
        opacity: 0.7,
    },
});

export default CartScreen;