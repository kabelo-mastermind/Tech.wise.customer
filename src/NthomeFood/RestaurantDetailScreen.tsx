// screens/RestaurantDetailScreen.js
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
    ActivityIndicator,
    Modal
} from 'react-native';
import { Icon } from "react-native-elements"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { useSelector } from 'react-redux';

const { width, height } = Dimensions.get('window');

// Responsive sizing functions
const responsiveWidth = (percentage) => (width * percentage) / 100;
const responsiveHeight = (percentage) => (height * percentage) / 100;
const scaleFont = (size) => (width / 375) * size;

// Enhanced food items data with sizes
const foodItemsData = {
    'KFC Mamelodi': [
        {
            id: 1,
            name: 'Spicy Chicken Wings',
            description: 'Crispy chicken wings with our special spicy sauce',
            sizes: [
                { size: '6 pieces', price: 'R129' },
                { size: '12 pieces', price: 'R189' },
                { size: '24 pieces', price: 'R299' }
            ],
            rating: 4.5,
            image: require('../../assets/nthomeFood_images/chicken-wings.jpg'),
            category: 'Chicken',
            preparationTime: '15-20 min',
            isVegetarian: false,
            isSpicy: true
        },
        {
            id: 2,
            name: 'Zinger Burger Meal',
            description: 'Crispy zinger burger with fries and drink',
            sizes: [
                { size: 'Regular', price: 'R99' },
                { size: 'Large', price: 'R129' },
                { size: 'Family', price: 'R189' }
            ],
            rating: 4.3,
            image: require('../../assets/nthomeFood_images/chicken-burger.jpg'),
            category: 'Burgers',
            preparationTime: '10-15 min',
            isVegetarian: false,
            isSpicy: true
        },
        {
            id: 3,
            name: 'Streetwise 2',
            description: '2 pieces of chicken, chips, and a drink',
            sizes: [
                { size: 'Regular', price: 'R89' },
                { size: 'Large', price: 'R119' }
            ],
            rating: 4.2,
            image: require('../../assets/nthomeFood_images/buff-burger.jpg'),
            category: 'Meals',
            preparationTime: '12-18 min',
            isVegetarian: false,
            isSpicy: false
        }
    ],
    'Chicken Licken': [
        {
            id: 1,
            name: 'Fire Grilled Chicken',
            description: 'Flame-grilled chicken with special seasoning',
            sizes: [
                { size: 'Quarter', price: 'R125' },
                { size: 'Half', price: 'R175' },
                { size: 'Full', price: 'R299' }
            ],
            rating: 4.4,
            image: require('../../assets/nthomeFood_images/grilled-chicken.png'),
            category: 'Chicken',
            preparationTime: '20-25 min',
            isVegetarian: false,
            isSpicy: true
        }
    ],
    'Debonairs Pizza': [
        {
            id: 1,
            name: 'Pepperoni Pizza',
            description: 'Classic pepperoni pizza with mozzarella cheese',
            sizes: [
                { size: 'Small', price: 'R199' },
                { size: 'Medium', price: 'R299' },
                { size: 'Large', price: 'R399' }
            ],
            rating: 4.7,
            image: require('../../assets/nthomeFood_images/pepperoni-pizza.png'),
            category: 'Pizza',
            preparationTime: '25-30 min',
            isVegetarian: false,
            isSpicy: false
        }
    ]
};

// Default food items if restaurant not found
const defaultFoodItems = [
    {
        id: 1,
        name: 'Special Meal',
        description: 'Chef\'s special meal of the day',
        sizes: [
            { size: 'Regular', price: 'R150' },
            { size: 'Large', price: 'R200' }
        ],
        rating: 4.0,
        image: require('../../assets/nthomeFood_images/buff-burger.jpg'),
        category: 'Special',
        preparationTime: '15-20 min',
        isVegetarian: false,
        isSpicy: false
    }
];

const RestaurantDetailScreen = ({ navigation, route }) => {
    const { restaurant } = route.params;
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [cart, setCart] = useState([]);
    const [sizeModalVisible, setSizeModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const user = useSelector((state) => state.auth.user);

    // Get food items for this restaurant
    const restaurantFoodItems = foodItemsData[restaurant.name] || defaultFoodItems;

    // Get unique categories
    const categories = ['All', ...new Set(restaurantFoodItems.map(item => item.category))];

    // Filter items by category
    const filteredFoodItems = useMemo(() => {
        return selectedCategory === 'All'
            ? restaurantFoodItems
            : restaurantFoodItems.filter(item => item.category === selectedCategory);
    }, [selectedCategory, restaurantFoodItems]);

    // Show size selection modal
    const showSizeSelection = (item) => {
        setSelectedItem(item);
        setSizeModalVisible(true);
    };

    // Add item to cart with selected size
    const addToCartWithSize = (item, selectedSize) => {
        const cartItem = {
            ...item,
            selectedSize: selectedSize.size,
            price: selectedSize.price,
            cartId: `${item.id}-${selectedSize.size}` // Unique ID for cart items with different sizes
        };

        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => 
                cartItem.cartId === `${item.id}-${selectedSize.size}`
            );
            
            if (existingItem) {
                return prevCart.map(cartItem =>
                    cartItem.cartId === `${item.id}-${selectedSize.size}`
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                );
            } else {
                return [...prevCart, { ...cartItem, quantity: 1 }];
            }
        });
        
        setSizeModalVisible(false);
        setSelectedItem(null);
    };

    // Remove item from cart
    const removeFromCart = (cartId) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.cartId === cartId);
            if (existingItem && existingItem.quantity > 1) {
                return prevCart.map(item =>
                    item.cartId === cartId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                );
            } else {
                return prevCart.filter(item => item.cartId !== cartId);
            }
        });
    };

    // Get cart total
    const cartTotal = cart.reduce((total, item) => {
        const price = parseInt(item.price.replace('R', '').trim());
        return total + (price * item.quantity);
    }, 0);

    // Get lowest price for display on food card
    const getLowestPrice = (sizes) => {
        const prices = sizes.map(size => parseInt(size.price.replace('R', '').trim()));
        return `R${Math.min(...prices)}`;
    };

    // Render food item card in 2-column grid
    const renderFoodItem = ({ item, index }) => (
        <TouchableOpacity
            style={styles.foodItemCard}
            onPress={() => showSizeSelection(item)}
        >
            <View style={[
                styles.foodImageContainer,
                { backgroundColor: index % 2 === 0 ? '#E6F7FF' : '#F0F9FF' }
            ]}>
                <Image source={item.image} style={styles.foodImage} />
                <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>⭐ {item.rating}</Text>
                </View>
                {item.isSpicy && (
                    <View style={styles.spicyBadge}>
                        <Ionicons name="flame" size={scaleFont(10)} color="#FF6B6B" />
                    </View>
                )}
            </View>

            <View style={styles.foodInfo}>
                <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.foodDescription} numberOfLines={2}>{item.description}</Text>

                {/* Size indicators */}
                <View style={styles.sizesContainer}>
                    {item.sizes.slice(0, 2).map((size, idx) => (
                        <View key={idx} style={styles.sizeChip}>
                            <Text style={styles.sizeChipText}>{size.size}</Text>
                        </View>
                    ))}
                    {item.sizes.length > 2 && (
                        <View style={styles.moreSizesChip}>
                            <Text style={styles.moreSizesText}>+{item.sizes.length - 2}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.foodDetails}>
                    <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={scaleFont(10)} color="#666" />
                        <Text style={styles.detailText}>{item.preparationTime}</Text>
                    </View>
                </View>

                <View style={styles.priceContainer}>
                    <View>
                        <Text style={styles.priceFrom}>From</Text>
                        <Text style={styles.foodPrice}>{getLowestPrice(item.sizes)}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => showSizeSelection(item)}
                    >
                        <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    // Render cart item
    const renderCartItem = ({ item }) => (
        <View style={styles.cartItem}>
            <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemSize}>{item.selectedSize}</Text>
                <Text style={styles.cartItemPrice}>{item.price} x {item.quantity}</Text>
            </View>
            <View style={styles.cartItemControls}>
                <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => removeFromCart(item.cartId)}
                >
                    <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => addToCartWithSize(item, { 
                        size: item.selectedSize, 
                        price: item.price 
                    })}
                >
                    <Text style={styles.quantityButtonText}>+</Text>
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
                <Text style={styles.headerTitle} numberOfLines={1}>{restaurant.name}</Text>
                <TouchableOpacity
                    style={styles.cartButton}
                    onPress={() => navigation.navigate('Cart', {
                        cart: cart,
                        restaurant: restaurant
                    })}
                >
                    <Ionicons name="cart-outline" size={scaleFont(24)} color="#0DCAF0" />
                    {cart.length > 0 && (
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Restaurant Info Banner */}
            <View style={styles.restaurantBanner}>
                <Image source={restaurant.image} style={styles.restaurantImage} />
                <View style={styles.restaurantOverlay}>
                    <Text style={styles.restaurantName}>{restaurant.name}</Text>
                    <View style={styles.restaurantDetails}>
                        <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                                <Ionicons name="star" size={scaleFont(14)} color="#FFD700" />
                                <Text style={styles.detailText}>{restaurant.rating}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Ionicons name="time-outline" size={scaleFont(14)} color="#fff" />
                                <Text style={styles.detailText}>{restaurant.deliveryTime}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Ionicons name="pricetag-outline" size={scaleFont(14)} color="#fff" />
                                <Text style={styles.detailText}>{restaurant.category}</Text>
                            </View>
                        </View>
                    </View>
                    <Text style={styles.restaurantCategory}>{restaurant.category}</Text>
                </View>
            </View>

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

            {/* Food Items Grid */}
            <View style={styles.foodItemsSection}>
                <Text style={styles.sectionTitle}>Menu ({filteredFoodItems.length} items)</Text>
                <FlatList
                    data={filteredFoodItems}
                    renderItem={renderFoodItem}
                    keyExtractor={(item) => `${item.id}-${selectedCategory}`}
                    numColumns={2}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.foodItemsGrid}
                    columnWrapperStyle={styles.columnWrapper}
                    key={`food-grid-${selectedCategory}`}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="restaurant-outline" size={scaleFont(64)} color="#ccc" />
                            <Text style={styles.emptyStateTitle}>No items found</Text>
                            <Text style={styles.emptyStateText}>
                                Try selecting a different category
                            </Text>
                        </View>
                    }
                />
            </View>

            {/* Size Selection Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={sizeModalVisible}
                onRequestClose={() => {
                    setSizeModalVisible(false);
                    setSelectedItem(null);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedItem && (
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Select Size</Text>
                                    <TouchableOpacity 
                                        style={styles.closeButton}
                                        onPress={() => {
                                            setSizeModalVisible(false);
                                            setSelectedItem(null);
                                        }}
                                    >
                                        <Ionicons name="close" size={scaleFont(24)} color="#666" />
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={styles.modalItemInfo}>
                                    <Image source={selectedItem.image} style={styles.modalItemImage} />
                                    <View style={styles.modalItemDetails}>
                                        <Text style={styles.modalItemName}>{selectedItem.name}</Text>
                                        <Text style={styles.modalItemDescription}>
                                            {selectedItem.description}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.sizesTitle}>Available Sizes</Text>
                                
                                <ScrollView style={styles.sizesList}>
                                    {selectedItem.sizes.map((sizeOption, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.sizeOption}
                                            onPress={() => addToCartWithSize(selectedItem, sizeOption)}
                                        >
                                            <View style={styles.sizeInfo}>
                                                <Text style={styles.sizeLabel}>{sizeOption.size}</Text>
                                                <Text style={styles.sizePrice}>{sizeOption.price}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={scaleFont(20)} color="#ccc" />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Cart Summary (Floating) */}
            {cart.length > 0 && (
                <View style={styles.cartSummary}>
                    <View style={styles.cartItemsPreview}>
                        <FlatList
                            data={cart}
                            renderItem={renderCartItem}
                            keyExtractor={(item) => item.cartId}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        />
                    </View>
                    <View style={styles.cartTotal}>
                        <Text style={styles.totalText}>Total: R{cartTotal}</Text>
                        <TouchableOpacity
                            style={styles.checkoutButton}
                            onPress={() => navigation.navigate('Cart', {
                                cart: cart,
                                restaurant: restaurant
                            })}
                        >
                            <Text style={styles.checkoutButtonText}>Checkout</Text>
                        </TouchableOpacity>
                    </View>
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
        flex: 1,
        textAlign: 'center',
        marginHorizontal: responsiveWidth(2),
    },
    cartButton: {
        padding: responsiveWidth(2),
        position: 'relative',
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
    },
    cartBadgeText: {
        fontSize: scaleFont(10),
        color: '#fff',
        fontWeight: 'bold',
    },
    restaurantBanner: {
        height: responsiveHeight(25),
        position: 'relative',
    },
    restaurantImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    restaurantOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
        padding: responsiveWidth(5),
    },
    restaurantName: {
        fontSize: scaleFont(24),
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: responsiveHeight(1),
    },
    restaurantCategory: {
        fontSize: scaleFont(16),
        color: '#0DCAF0',
        fontWeight: '600',
        marginTop: responsiveHeight(1),
    },
    restaurantDetails: {
        marginBottom: responsiveHeight(1),
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: responsiveWidth(4),
    },
    detailText: {
        fontSize: scaleFont(12),
        color: '#fff',
        marginLeft: responsiveWidth(1),
        fontWeight: '500',
    },
    categoriesContainer: {
        backgroundColor: '#fff',
        paddingVertical: responsiveHeight(1),
        borderBottomWidth: 1,
        borderBottomColor: '#E6F7FF',
    },
    categoriesScrollContent: {
        paddingHorizontal: responsiveWidth(5),
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
    foodItemsSection: {
        flex: 1,
        paddingHorizontal: responsiveWidth(5),
        paddingTop: responsiveHeight(2),
    },
    sectionTitle: {
        fontSize: scaleFont(20),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(2),
    },
    foodItemsGrid: {
        paddingBottom: responsiveHeight(10),
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: responsiveHeight(2),
    },
    foodItemCard: {
        width: (width - responsiveWidth(15)) / 2,
        backgroundColor: '#fff',
        borderRadius: responsiveWidth(4),
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#E6F7FF',
    },
    foodImageContainer: {
        position: 'relative',
        width: '100%',
        height: responsiveHeight(15),
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    foodImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
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
    spicyBadge: {
        position: 'absolute',
        top: responsiveHeight(1),
        left: responsiveWidth(2),
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: responsiveWidth(1),
        borderRadius: responsiveWidth(2),
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    foodInfo: {
        padding: responsiveWidth(3),
    },
    foodName: {
        fontSize: scaleFont(14),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(0.5),
    },
    foodDescription: {
        fontSize: scaleFont(11),
        color: '#718096',
        marginBottom: responsiveHeight(1),
        lineHeight: scaleFont(14),
    },
    sizesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: responsiveHeight(1),
    },
    sizeChip: {
        backgroundColor: '#E6F7FF',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(2),
        marginRight: responsiveWidth(1),
        marginBottom: responsiveHeight(0.5),
    },
    sizeChipText: {
        fontSize: scaleFont(9),
        color: '#0DCAF0',
        fontWeight: '500',
    },
    moreSizesChip: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(2),
        marginBottom: responsiveHeight(0.5),
    },
    moreSizesText: {
        fontSize: scaleFont(9),
        color: '#666',
        fontWeight: '500',
    },
    foodDetails: {
        marginBottom: responsiveHeight(1),
    },
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceFrom: {
        fontSize: scaleFont(10),
        color: '#666',
        marginBottom: responsiveHeight(0.25),
    },
    foodPrice: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#000',
    },
    addButton: {
        backgroundColor: '#000',
        width: responsiveWidth(8),
        height: responsiveWidth(8),
        borderRadius: responsiveWidth(4),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#0DCAF0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    addButtonText: {
        color: '#fff',
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        lineHeight: scaleFont(20),
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: responsiveWidth(6),
        borderTopRightRadius: responsiveWidth(6),
        maxHeight: responsiveHeight(70),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: responsiveWidth(5),
        borderBottomWidth: 1,
        borderBottomColor: '#E6F7FF',
    },
    modalTitle: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#2D3748',
    },
    closeButton: {
        padding: responsiveWidth(1),
    },
    modalItemInfo: {
        flexDirection: 'row',
        padding: responsiveWidth(5),
        borderBottomWidth: 1,
        borderBottomColor: '#E6F7FF',
    },
    modalItemImage: {
        width: responsiveWidth(20),
        height: responsiveWidth(20),
        borderRadius: responsiveWidth(3),
        marginRight: responsiveWidth(4),
    },
    modalItemDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    modalItemName: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(1),
    },
    modalItemDescription: {
        fontSize: scaleFont(12),
        color: '#666',
        lineHeight: scaleFont(16),
    },
    sizesTitle: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#2D3748',
        paddingHorizontal: responsiveWidth(5),
        paddingTop: responsiveHeight(2),
        paddingBottom: responsiveHeight(1),
    },
    sizesList: {
        maxHeight: responsiveHeight(30),
    },
    sizeOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: responsiveWidth(5),
        paddingVertical: responsiveHeight(2),
        borderBottomWidth: 1,
        borderBottomColor: '#E6F7FF',
    },
    sizeInfo: {
        flex: 1,
    },
    sizeLabel: {
        fontSize: scaleFont(14),
        fontWeight: '600',
        color: '#2D3748',
        marginBottom: responsiveHeight(0.5),
    },
    sizePrice: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#0DCAF0',
    },
    cartSummary: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E6F7FF',
        padding: responsiveWidth(5),
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    cartItemsPreview: {
        marginBottom: responsiveHeight(1),
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa',
        padding: responsiveWidth(3),
        borderRadius: responsiveWidth(3),
        marginRight: responsiveWidth(2),
        minWidth: responsiveWidth(40),
    },
    cartItemInfo: {
        flex: 1,
    },
    cartItemName: {
        fontSize: scaleFont(14),
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: responsiveHeight(0.5),
    },
    cartItemSize: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        fontWeight: '500',
        marginBottom: responsiveHeight(0.5),
    },
    cartItemPrice: {
        fontSize: scaleFont(12),
        color: '#666',
    },
    cartItemControls: {
        flexDirection: 'row',
        alignItems: 'center',
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
        fontSize: scaleFont(14),
        fontWeight: 'bold',
        marginHorizontal: responsiveWidth(2),
        color: '#2D3748',
    },
    cartTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalText: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#2D3748',
    },
    checkoutButton: {
        backgroundColor: '#000',
        paddingHorizontal: responsiveWidth(6),
        paddingVertical: responsiveHeight(1.5),
        borderRadius: responsiveWidth(3),
    },
    checkoutButtonText: {
        fontSize: scaleFont(14),
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

export default RestaurantDetailScreen;