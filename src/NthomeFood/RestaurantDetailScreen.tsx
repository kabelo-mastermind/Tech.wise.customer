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
    ActivityIndicator,
    Modal,
    Alert
} from 'react-native';
import { Icon } from "react-native-elements"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { useSelector, useDispatch } from 'react-redux';
import { addToCart, removeFromCart } from '../redux/actions/orderActions';
import { api } from '../../api';

const { width, height } = Dimensions.get('window');

const responsiveWidth = (percentage) => (width * percentage) / 100;
const responsiveHeight = (percentage) => (height * percentage) / 100;
const scaleFont = (size) => (width / 375) * size;

const API_BASE_URL = api;

const RestaurantDetailScreen = ({ navigation, route }) => {
    const { restaurant } = route.params;
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sizeModalVisible, setSizeModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [menuError, setMenuError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const user = useSelector((state) => state.auth.user);
    const cart = useSelector((state) => state.order.cart);
    const dispatch = useDispatch();

    useEffect(() => {
        fetchMenuItems();
    }, [restaurant]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
    }, [searchQuery]);

    const fetchMenuItems = async () => {
        try {
            setLoadingMenu(true);
            setMenuError(null);

            const response = await fetch(`${API_BASE_URL}/menu_items/user/${restaurant.user_id}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch menu items: ${response.status}`);
            }

            const data = await response.json();

            const transformedMenuItems = data.map(item => ({
                id: item.id,
                name: item.item_name,
                description: item.description || '',
                sizes: [
                    {
                        size: 'Regular',
                        price: `R${item.discounted_price || item.price}`
                    }
                ],
                rating: 4.0,
                image: item.image_url
                    ? { uri: item.image_url }
                    : require('../../assets/nthomeFood_images/restaurants/default-restaurant.png'),
                category: item.category || item.category_name || 'Main',
                preparationTime: '15-25 min',
                isVegetarian: false,
                isSpicy: false,
                originalPrice: item.discount_percentage > 0 ? `R${item.price}` : null,
                specialPrice: item.discount_percentage > 0 ? `R${item.discounted_price}` : null,
                discount: item.discount_percentage > 0 ? `${item.discount_percentage}% OFF` : null,
                isSpecial: item.is_special || false
            }));

            setMenuItems(transformedMenuItems);
        } catch (error) {
            console.error('Error fetching menu items:', error);
            setMenuError(error.message);
            setMenuItems(getFallbackMenuItems());
        } finally {
            setLoadingMenu(false);
        }
    };

    const getFallbackMenuItems = () => {
        return [
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
    };

    const categories = useMemo(() => {
        const uniqueCategories = [...new Set(menuItems.map(item => item.category))];
        return ['All', ...uniqueCategories];
    }, [menuItems]);

    const filteredFoodItems = useMemo(() => {
        let filtered = menuItems;

        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query)
            );
        }

        if (selectedCategory !== 'All') {
            filtered = filtered.filter(item => item.category === selectedCategory);
        }

        return filtered;
    }, [selectedCategory, menuItems, searchQuery]);

    const clearSearch = () => {
        setSearchQuery('');
        setIsSearching(false);
    };

    const showSizeSelection = (item) => {
        setSelectedItem(item);
        setSizeModalVisible(true);
    };

    const addToCartWithSize = (item, selectedSize) => {
        const cartItem = {
            ...item,
            selectedSize: selectedSize.size,
            price: selectedSize.price,
            cartId: `${item.id}-${selectedSize.size}`,
            quantity: 1,
            restaurant: restaurant.name,
            restaurantId: restaurant.id, // Make sure this is included
            restaurant_user_id: restaurant.user_id // Also include user_id if needed
        };

        dispatch(addToCart(cartItem));
        setSizeModalVisible(false);
        setSelectedItem(null);
    };

    const getLowestPrice = (sizes) => {
        const prices = sizes.map(size => parseInt(size.price.replace('R', '').trim()));
        return `R${Math.min(...prices)}`;
    };

    const getDisplayPrice = (item) => {
        if (item.specialPrice && item.originalPrice) {
            return {
                currentPrice: item.specialPrice,
                originalPrice: item.originalPrice,
                hasDiscount: true
            };
        }
        return {
            currentPrice: getLowestPrice(item.sizes),
            originalPrice: null,
            hasDiscount: false
        };
    };

    const renderLoading = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0DCAF0" />
            <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
    );

    const renderError = () => (
        <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={scaleFont(48)} color="#FF6B6B" />
            <Text style={styles.errorText}>Failed to load menu</Text>
            <Text style={styles.errorSubText}>{menuError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchMenuItems}>
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    );

    const renderSearchInfo = () => {
        if (searchQuery.trim() === '') return null;

        return (
            <View style={styles.searchInfoContainer}>
                <Text style={styles.searchInfoText}>
                    {filteredFoodItems.length} {filteredFoodItems.length === 1 ? 'result' : 'results'} for "{searchQuery}"
                </Text>
                <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
                    <Text style={styles.clearSearchText}>Clear</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderFoodItem = ({ item, index }) => {
        const priceInfo = getDisplayPrice(item);

        return (
            <TouchableOpacity
                style={styles.foodItemCard}
                onPress={() => showSizeSelection(item)}
            >
                <View style={[
                    styles.foodImageContainer,
                    { backgroundColor: index % 2 === 0 ? '#E6F7FF' : '#F0F9FF' }
                ]}>
                    <Image
                        source={item.image}
                        style={styles.foodImage}
                        defaultSource={require('../../assets/nthomeFood_images/restaurants/default-restaurant.png')}
                    />

                    {item.discount && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{item.discount}</Text>
                        </View>
                    )}

                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>⭐ {item.rating}</Text>
                    </View>

                    {item.isSpecial && (
                        <View style={styles.specialBadge}>
                            <Ionicons name="flash" size={scaleFont(10)} color="#FFD700" />
                        </View>
                    )}

                    {item.isSpicy && (
                        <View style={styles.spicyBadge}>
                            <Ionicons name="flame" size={scaleFont(10)} color="#FF6B6B" />
                        </View>
                    )}
                </View>

                <View style={styles.foodInfo}>
                    <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.foodDescription} numberOfLines={2}>{item.description}</Text>

                    <View style={styles.priceContainer}>
                        <View>
                            {priceInfo.hasDiscount ? (
                                <>
                                    <Text style={styles.originalPrice}>{priceInfo.originalPrice}</Text>
                                    <Text style={styles.specialPrice}>{priceInfo.currentPrice}</Text>
                                </>
                            ) : (
                                <Text style={styles.foodPrice}>{priceInfo.currentPrice}</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => showSizeSelection(item)}
                        >
                            <Text style={styles.addButtonText}>+</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.foodDetails}>
                        <View style={styles.detailItem}>
                            <Ionicons name="time-outline" size={scaleFont(10)} color="#666" />
                            <Text style={styles.detailText}>{item.preparationTime}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

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
                    onPress={() => dispatch(removeFromCart(item.cartId))}
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

    const cartTotal = cart.reduce((total, item) => {
        const price = parseInt(item.price.replace('R', '').trim());
        return total + (price * item.quantity);
    }, 0);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={scaleFont(24)} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{restaurant.name}</Text>
                <TouchableOpacity
                    style={styles.cartButton}
                    onPress={() => navigation.navigate('Cart', {
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

            <View style={styles.restaurantBanner}>
                <Image
                    source={restaurant.image}
                    style={styles.restaurantImage}
                    defaultSource={require('../../assets/nthomeFood_images/restaurants/default-restaurant.png')}
                />
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

            <View style={styles.searchContainer}>
                <View style={styles.searchWrapper}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search menu items..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
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

            {categories.length > 1 && searchQuery.trim() === '' && (
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
            )}

            {renderSearchInfo()}

            <View style={styles.foodItemsSection}>
                <Text style={styles.sectionTitle}>
                    {searchQuery.trim() !== '' ? 'Search Results' : 'Menu'} ({filteredFoodItems.length} {filteredFoodItems.length === 1 ? 'item' : 'items'})
                </Text>

                {loadingMenu ? (
                    renderLoading()
                ) : menuError && menuItems.length === 0 ? (
                    renderError()
                ) : (
                    <FlatList
                        data={filteredFoodItems}
                        renderItem={renderFoodItem}
                        keyExtractor={(item) => `${item.id}-${selectedCategory}-${searchQuery}`}
                        numColumns={2}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.foodItemsGrid}
                        columnWrapperStyle={styles.columnWrapper}
                        key={`food-grid-${selectedCategory}-${searchQuery}`}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons
                                    name={searchQuery ? "search-outline" : "restaurant-outline"}
                                    size={scaleFont(64)}
                                    color="#ccc"
                                />
                                <Text style={styles.emptyStateTitle}>
                                    {searchQuery ? 'No items found' : 'No menu items available'}
                                </Text>
                                <Text style={styles.emptyStateText}>
                                    {searchQuery
                                        ? `No results for "${searchQuery}". Try different keywords.`
                                        : 'This restaurant hasn\'t added any items to their menu yet.'
                                    }
                                </Text>
                                {searchQuery && (
                                    <TouchableOpacity style={styles.clearSearchFullButton} onPress={clearSearch}>
                                        <Text style={styles.clearSearchFullButtonText}>Clear Search</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        }
                    />
                )}
            </View>

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
                                    <Text style={styles.modalTitle}>Add to Cart</Text>
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
                                    <Image
                                        source={selectedItem.image}
                                        style={styles.modalItemImage}
                                        defaultSource={require('../../assets/nthomeFood_images/restaurants/default-restaurant.png')}
                                    />
                                    <View style={styles.modalItemDetails}>
                                        <Text style={styles.modalItemName}>{selectedItem.name}</Text>
                                        <Text style={styles.modalItemDescription}>
                                            {selectedItem.description}
                                        </Text>
                                        <View style={styles.modalPriceContainer}>
                                            {selectedItem.specialPrice && selectedItem.originalPrice ? (
                                                <>
                                                    <Text style={styles.modalOriginalPrice}>{selectedItem.originalPrice}</Text>
                                                    <Text style={styles.modalSpecialPrice}>{selectedItem.specialPrice}</Text>
                                                </>
                                            ) : (
                                                <Text style={styles.modalRegularPrice}>
                                                    {getLowestPrice(selectedItem.sizes)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.addToCartSection}>
                                    <TouchableOpacity
                                        style={styles.addToCartButton}
                                        onPress={() => addToCartWithSize(selectedItem, selectedItem.sizes[0])}
                                    >
                                        <Text style={styles.addToCartButtonText}>
                                            Add to Cart - {getLowestPrice(selectedItem.sizes)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

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
    // Search Bar Styles
    searchContainer: {
        paddingHorizontal: responsiveWidth(5),
        paddingTop: responsiveHeight(2),
        paddingBottom: responsiveHeight(1),
        backgroundColor: '#fff',
    },
    searchWrapper: {
        position: 'relative',
    },
    searchInput: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: responsiveWidth(5),
        paddingVertical: responsiveHeight(1.8),
        borderRadius: responsiveWidth(4),
        fontSize: scaleFont(16),
        color: '#333',
        borderWidth: 1,
        borderColor: '#E6F7FF',
        paddingRight: responsiveWidth(15),
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
    },
    // Search Info Styles
    searchInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: responsiveWidth(5),
        paddingVertical: responsiveHeight(1),
        backgroundColor: '#E6F7FF',
    },
    searchInfoText: {
        fontSize: scaleFont(14),
        color: '#0DCAF0',
        fontWeight: '500',
    },
    clearSearchButton: {
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(0.5),
    },
    clearSearchText: {
        fontSize: scaleFont(12),
        color: '#FF6B6B',
        fontWeight: '600',
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
    discountBadge: {
        position: 'absolute',
        top: responsiveHeight(1),
        left: responsiveWidth(2),
        backgroundColor: '#FF6B6B',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(3),
        zIndex: 2,
    },
    discountText: {
        fontSize: scaleFont(9),
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
    specialBadge: {
        position: 'absolute',
        bottom: responsiveHeight(1),
        left: responsiveWidth(2),
        backgroundColor: 'rgba(255,215,0,0.95)',
        padding: responsiveWidth(1),
        borderRadius: responsiveWidth(2),
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    spicyBadge: {
        position: 'absolute',
        bottom: responsiveHeight(1),
        right: responsiveWidth(2),
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
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: responsiveHeight(1),
    },
    originalPrice: {
        fontSize: scaleFont(12),
        color: '#718096',
        textDecorationLine: 'line-through',
        marginBottom: responsiveHeight(0.25),
    },
    specialPrice: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#000',
    },
    foodPrice: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#000',
    },
    foodDetails: {
        marginBottom: responsiveHeight(1),
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
        maxHeight: responsiveHeight(50),
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
        marginBottom: responsiveHeight(1),
    },
    modalPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalOriginalPrice: {
        fontSize: scaleFont(14),
        color: '#718096',
        textDecorationLine: 'line-through',
        marginRight: responsiveWidth(2),
    },
    modalSpecialPrice: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#000',
    },
    modalRegularPrice: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#000',
    },
    addToCartSection: {
        padding: responsiveWidth(5),
    },
    addToCartButton: {
        backgroundColor: '#000',
        paddingVertical: responsiveHeight(2),
        borderRadius: responsiveWidth(3),
        alignItems: 'center',
    },
    addToCartButtonText: {
        fontSize: scaleFont(16),
        color: '#fff',
        fontWeight: 'bold',
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
        marginBottom: responsiveHeight(2),
    },
    clearSearchFullButton: {
        backgroundColor: '#0DCAF0',
        paddingHorizontal: responsiveWidth(6),
        paddingVertical: responsiveHeight(1.5),
        borderRadius: responsiveWidth(3),
    },
    clearSearchFullButtonText: {
        color: '#fff',
        fontSize: scaleFont(14),
        fontWeight: 'bold',
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
});

export default RestaurantDetailScreen;