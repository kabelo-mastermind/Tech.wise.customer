import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Dimensions,
    RefreshControl,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
    FlatList,
    Animated
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { api } from '../../api';

const { width, height } = Dimensions.get('window');

// Responsive sizing
const responsiveWidth = (percentage) => (width * percentage) / 100;
const responsiveHeight = (percentage) => (height * percentage) / 100;
const scaleFont = (size) => (width / 375) * size;

const OrderHistory = ({ navigation }) => {
    const user = useSelector((state) => state.auth.user);
    const user_id = user?.user_id;

    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));

    // Filter options - Add "active" filter
    const [filterOptions, setFilterOptions] = useState([
        { key: 'all', label: 'All', count: 0 },
        { key: 'active', label: 'Active', count: 0 },
        { key: 'pending', label: 'Pending', count: 0 },
        { key: 'confirmed', label: 'Confirmed', count: 0 },
        { key: 'preparing', label: 'Preparing', count: 0 },
        { key: 'ready', label: 'Ready', count: 0 },
        { key: 'completed', label: 'Completed', count: 0 },
        { key: 'cancelled', label: 'Cancelled', count: 0 }
    ]);

    // Helper function to check if order should show tracking
    const shouldShowTracking = (status) => {
        // All statuses except cancelled should show tracking
        return status !== 'cancelled';
    };

    // Helper function to check if order is active (still in progress)
    const isOrderActive = useCallback((status) => {
        const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'accepted', 'collected', 'arrived'];
        return activeStatuses.includes(status);
    }, []);

    // Helper function to get tracking button text based on status
    const getTrackingButtonText = (status) => {
        if (status === 'completed') {
            return 'View Details';
        } else if (status === 'cancelled') {
            return null; // No button for cancelled
        }
        return 'Track Order';
    };

    // Fetch orders and stats
    const fetchOrders = useCallback(async () => {
        if (!user_id) {
            console.log('No user_id found');
            setLoading(false);
            return;
        }
        
        fadeAnim.setValue(0); // Reset animation
        
        try {
            setLoading(true);
            console.log('Fetching orders for user:', user_id);

            // Define all possible statuses from your database
            const allStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'accepted', 'collected', 'arrived', 'completed', 'cancelled'];

            // Statuses considered "active" (still in progress, not final)
            const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'accepted', 'collected', 'arrived'];

            const params = {};

            // Handle different filter cases
            if (selectedFilter === 'active') {
                // For "active" filter, we'll fetch all and filter client-side
                // Or you could send multiple statuses to backend if your API supports it
                params.status = activeStatuses.join(','); // This depends on your API
            } else if (selectedFilter !== 'all') {
                params.status = selectedFilter;
            }

            if (searchQuery) params.search = searchQuery;

            console.log('API URL:', `${api}food-orders/user/${user_id}`);
            console.log('Request params:', params);

            const [ordersResponse, statsResponse] = await Promise.all([
                axios.get(`${api}food-orders/user/${user_id}`, { params }),
                axios.get(`${api}food-orders/user/${user_id}/stats`)
            ]);

            console.log('Orders response:', ordersResponse.data);
            console.log('Stats response:', statsResponse.data);

            let processedOrders = ordersResponse.data;

            // If "active" filter is selected and backend doesn't support multiple statuses,
            // filter client-side
            if (selectedFilter === 'active' && (!params.status || typeof params.status === 'string')) {
                processedOrders = ordersResponse.data.filter(order =>
                    activeStatuses.includes(order.status)
                );
            }

            setOrders(processedOrders);
            setFilteredOrders(processedOrders);
            setStats(statsResponse.data);

            // Calculate active orders count for stats
            const activeOrdersCount = ordersResponse.data.filter(order =>
                activeStatuses.includes(order.status)
            ).length;

            // Update filter counts
            const updatedFilterOptions = filterOptions.map(filter => {
                const newFilter = { ...filter };
                switch (newFilter.key) {
                    case 'all':
                        newFilter.count = statsResponse.data.total_orders || 0;
                        break;
                    case 'active':
                        newFilter.count = activeOrdersCount;
                        break;
                    default:
                        const statusKey = `${newFilter.key}_orders`;
                        newFilter.count = statsResponse.data[statusKey] || 0;
                        break;
                }
                return newFilter;
            });
            setFilterOptions(updatedFilterOptions);
            
            // Animate content in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();

        } catch (error) {
            console.error('Error fetching orders:', error);
            console.error('Error details:', error.response?.data);

            // Show user-friendly error message
            let errorMessage = 'Failed to load orders. Please check your connection.';
            if (error.response) {
                // Server responded with error
                if (error.response.status === 404) {
                    errorMessage = 'No orders found for this user.';
                } else if (error.response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }
            } else if (error.request) {
                // Request made but no response
                errorMessage = 'No response from server. Check your internet connection.';
            }

            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user_id, selectedFilter, searchQuery, filterOptions]);

    useEffect(() => {
        fetchOrders();
    }, [user_id, selectedFilter]);

    useEffect(() => {
        // Filter orders based on search query AND selected filter
        let filtered = orders;

        // Apply search filter
        if (searchQuery.trim() !== '') {
            filtered = filtered.filter(order =>
                order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.delivery_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply "active" filter client-side if needed
        if (selectedFilter === 'active') {
            filtered = filtered.filter(order =>
                isOrderActive(order.status)
            );
        }

        setFilteredOrders(filtered);
    }, [searchQuery, orders, selectedFilter, isOrderActive]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchOrders();
    }, [fetchOrders]);

    const handleFilterSelect = useCallback((filterKey) => {
        setSelectedFilter(filterKey);
        setSearchQuery('');
    }, []);

    const handleOrderPress = useCallback((order) => {
        setSelectedOrder(order);
        setModalVisible(true);
    }, []);

    const getStatusColor = useCallback((status) => {
        const statusColors = {
            pending: '#FFA500',
            confirmed: '#0DCAF0',
            preparing: '#5856D6',
            ready: '#34C759',
            accepted: '#0DCAF0',
            collected: '#0DCAF0',
            arrived: '#8B5CF6',
            completed: '#32D74B',
            cancelled: '#FF3B30'
        };
        return statusColors[status] || '#8E8E93';
    }, []);

    const getStatusIcon = useCallback((status) => {
        const statusIcons = {
            pending: 'clock-outline',
            confirmed: 'check-circle-outline',
            preparing: 'chef-hat',
            ready: 'package-variant',
            accepted: 'check-circle-outline',
            collected: 'truck-delivery-outline',
            arrived: 'map-marker-outline',
            completed: 'check-all',
            cancelled: 'close-circle-outline'
        };
        return statusIcons[status] || 'help-circle-outline';
    }, []);

    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    const formatTimeAgo = useCallback((dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return formatDate(dateString);
    }, [formatDate]);

    // Generate items summary from order items
    const getItemsSummary = useCallback((order) => {
        if (order.items_summary) return order.items_summary;
        if (order.items && order.items.length > 0) {
            return order.items.map(item => `${item.quantity}x ${item.item_name}`).join(', ');
        }
        return `${order.total_items || 0} items`;
    }, []);

    const handleReorder = useCallback((order) => {
        Alert.alert(
            'Reorder',
            `Would you like to reorder this order?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reorder',
                    onPress: () => {
                        navigation.navigate('NthomeFoodLanding');
                        Alert.alert('Success', 'Items added to cart for reordering');
                    }
                }
            ]
        );
    }, [navigation]);

    const renderOrderItem = useCallback(({ item, index }) => {
        const itemsSummary = getItemsSummary(item);
        const shouldTrack = shouldShowTracking(item.status);
        const trackingButtonText = getTrackingButtonText(item.status);

        return (
            <Animated.View 
                style={[styles.orderCard, { 
                    opacity: fadeAnim,
                    transform: [{
                        translateY: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0]
                        })
                    }]
                }]}
            >
                <TouchableOpacity
                    style={styles.orderCardContent}
                    onPress={() => handleOrderPress(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.orderHeader}>
                        <View style={styles.orderInfo}>
                            <Text style={styles.orderNumber}>#{item.order_number}</Text>
                            <Text style={styles.orderDate}>{formatTimeAgo(item.order_time)}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                            <Icon
                                name={getStatusIcon(item.status)}
                                size={scaleFont(14)}
                                color={getStatusColor(item.status)}
                            />
                            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.orderDetails}>
                        <Text style={styles.itemsText} numberOfLines={2}>
                            {itemsSummary}
                        </Text>
                        <View style={styles.orderFooter}>
                            <View style={styles.amountContainer}>
                                <Text style={styles.totalAmount}>R{item.final_amount || item.total_amount || 0}</Text>
                                <View style={styles.deliveryInfo}>
                                    <Icon
                                        name={item.order_type === 'delivery' ? "truck-delivery-outline" : "storefront-outline"}
                                        size={scaleFont(12)}
                                        color="#8E8E93"
                                    />
                                    <Text style={styles.deliveryText}>
                                        {item.order_type === 'delivery' ? 'Delivery' : 'Pickup'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.chevronContainer}>
                                <Ionicons name="chevron-forward" size={scaleFont(16)} color="#C7C7CC" />
                            </View>
                        </View>
                    </View>

                    {/* Track Order Button - Show for ALL non-cancelled orders */}
                    {shouldTrack && trackingButtonText && (
                        <TouchableOpacity
                            style={styles.trackOrderButton}
                            onPress={() => navigation.navigate("OrderTracking", {
                                orderId: item.id,
                                orderNumber: item.order_number,
                                customerId: user_id
                            })}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="navigate" size={scaleFont(14)} color="#0DCAF0" />
                            <Text style={styles.trackOrderText}>
                                {trackingButtonText}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Status badges */}
                    {item.status === 'ready' && (
                        <View style={[styles.readyBadge, { backgroundColor: getStatusColor('ready') }]}>
                            <Icon name="run" size={scaleFont(14)} color="#fff" />
                            <Text style={styles.readyText}>
                                Ready for {item.order_type === 'delivery' ? 'delivery' : 'pickup'}
                            </Text>
                        </View>
                    )}

                    {item.status === 'accepted' && (
                        <View style={[styles.readyBadge, { backgroundColor: getStatusColor('accepted') }]}>
                            <Icon name="check-circle-outline" size={scaleFont(14)} color="#fff" />
                            <Text style={styles.readyText}>
                                Driver Accepted
                            </Text>
                        </View>
                    )}

                    {item.status === 'collected' && (
                        <View style={[styles.readyBadge, { backgroundColor: getStatusColor('collected') }]}>
                            <Icon name="truck-delivery-outline" size={scaleFont(14)} color="#fff" />
                            <Text style={styles.readyText}>
                                Order Collected
                            </Text>
                        </View>
                    )}

                    {item.status === 'arrived' && (
                        <View style={[styles.readyBadge, { backgroundColor: getStatusColor('arrived') }]}>
                            <Icon name="map-marker-outline" size={scaleFont(14)} color="#fff" />
                            <Text style={styles.readyText}>
                                Driver Arrived
                            </Text>
                        </View>
                    )}

                    {/* Show "Delivered" badge for completed orders */}
                    {item.status === 'completed' && (
                        <View style={[styles.deliveredBadge, { backgroundColor: getStatusColor('completed') }]}>
                            <Icon name="check-circle-outline" size={scaleFont(14)} color="#fff" />
                            <Text style={styles.deliveredText}>Delivered</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    }, [fadeAnim, getItemsSummary, getStatusColor, getStatusIcon, formatTimeAgo, handleOrderPress, navigation, user_id]);

    const renderStats = useCallback(() => (
        <View style={styles.statsContainer}>
            <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#0DCAF015' }]}>
                    <Icon name="clipboard-list-outline" size={scaleFont(20)} color="#0DCAF0" />
                </View>
                <Text style={styles.statNumber}>{stats?.total_orders || 0}</Text>
                <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FFA50015' }]}>
                    <Icon name="clock-outline" size={scaleFont(20)} color="#FFA500" />
                </View>
                <Text style={styles.statNumber}>{stats?.pending_orders || 0}</Text>
                <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#34C75915' }]}>
                    <Icon name="check-circle-outline" size={scaleFont(20)} color="#34C759" />
                </View>
                <Text style={styles.statNumber}>{stats?.completed_orders || 0}</Text>
                <Text style={styles.statLabel}>Completed</Text>
            </View>
            {/* Add active orders stat */}
            <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#0DCAF015' }]}>
                    <Icon name="clock-outline" size={scaleFont(20)} color="#0DCAF0" />
                </View>
                <Text style={styles.statNumber}>
                    {filterOptions.find(f => f.key === 'active')?.count || 0}
                </Text>
                <Text style={styles.statLabel}>Active</Text>
            </View>
        </View>
    ), [stats, filterOptions]);

    const renderOrderDetailsModal = useCallback(() => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalTitleContainer}>
                            <Text style={styles.modalTitle}>Order Details</Text>
                            <Text style={styles.modalSubtitle}>#{selectedOrder?.order_number}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={scaleFont(24)} color="#8E8E93" />
                        </TouchableOpacity>
                    </View>

                    {selectedOrder && (
                        <ScrollView
                            style={styles.modalBody}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Status Banner */}
                            <View style={[styles.statusBanner, { backgroundColor: getStatusColor(selectedOrder.status) + '15' }]}>
                                <View style={styles.statusBannerContent}>
                                    <Icon
                                        name={getStatusIcon(selectedOrder.status)}
                                        size={scaleFont(24)}
                                        color={getStatusColor(selectedOrder.status)}
                                    />
                                    <View style={styles.statusBannerText}>
                                        <Text style={[styles.statusBannerTitle, { color: getStatusColor(selectedOrder.status) }]}>
                                            {selectedOrder.status ? selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1) : 'Unknown'}
                                        </Text>
                                        <Text style={styles.statusBannerSubtitle}>
                                            {selectedOrder.status === 'completed'
                                                ? 'Order delivered successfully'
                                                : `Order placed ${formatTimeAgo(selectedOrder.order_time)}`
                                            }
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Order Items */}
                            <View style={styles.detailSection}>
                                <Text style={styles.sectionTitle}>Order Items</Text>
                                <View style={styles.itemsContainer}>
                                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                                        selectedOrder.items.map((item, index) => (
                                            <View key={index} style={styles.itemRow}>
                                                <View style={styles.itemInfo}>
                                                    <Text style={styles.itemName}>{item.item_name}</Text>
                                                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                                                </View>
                                                <Text style={styles.itemPrice}>R{item.total_price || (item.unit_price * item.quantity)}</Text>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.noItemsText}>No items found</Text>
                                    )}
                                </View>
                            </View>

                            {/* Order Summary */}
                            <View style={styles.detailSection}>
                                <Text style={styles.sectionTitle}>Order Summary</Text>
                                <View style={styles.summaryContainer}>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Subtotal</Text>
                                        <Text style={styles.summaryValue}>R{selectedOrder.total_amount || 0}</Text>
                                    </View>
                                    {selectedOrder.discount_amount > 0 && (
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Discount</Text>
                                            <Text style={[styles.summaryValue, { color: '#34C759' }]}>-R{selectedOrder.discount_amount || 0}</Text>
                                        </View>
                                    )}
                                    <View style={[styles.summaryRow, styles.totalRow]}>
                                        <Text style={styles.totalLabel}>Total</Text>
                                        <Text style={styles.totalValue}>R{selectedOrder.final_amount || selectedOrder.total_amount || 0}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Customer & Delivery Info */}
                            <View style={styles.detailSection}>
                                <Text style={styles.sectionTitle}>
                                    {selectedOrder.order_type === 'delivery' ? 'Delivery Information' : 'Pickup Information'}
                                </Text>
                                <View style={styles.infoGrid}>
                                    <View style={styles.infoItem}>
                                        <Icon name="account-outline" size={scaleFont(16)} color="#0DCAF0" />
                                        <Text style={styles.infoLabel}>Customer</Text>
                                        <Text style={styles.infoValue}>{selectedOrder.customer_name || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Icon name="phone-outline" size={scaleFont(16)} color="#0DCAF0" />
                                        <Text style={styles.infoLabel}>Phone</Text>
                                        <Text style={styles.infoValue}>{selectedOrder.customer_phone || 'N/A'}</Text>
                                    </View>
                                    {selectedOrder.delivery_address && (
                                        <View style={styles.infoItem}>
                                            <Icon name="map-marker-outline" size={scaleFont(16)} color="#0DCAF0" />
                                            <Text style={styles.infoLabel}>Address</Text>
                                            <Text style={styles.infoValue}>{selectedOrder.delivery_address}</Text>
                                        </View>
                                    )}
                                    <View style={styles.infoItem}>
                                        <Icon name="credit-card-outline" size={scaleFont(16)} color="#0DCAF0" />
                                        <Text style={styles.infoLabel}>Payment</Text>
                                        <Text style={styles.infoValue}>
                                            {selectedOrder.payment_method === 'card' ? 'Credit Card' :
                                                selectedOrder.payment_method === 'cash' ? 'Cash' : 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Special Instructions */}
                            {selectedOrder.special_instructions && (
                                <View style={styles.detailSection}>
                                    <Text style={styles.sectionTitle}>Special Instructions</Text>
                                    <View style={styles.instructionsContainer}>
                                        <Text style={styles.instructionsText}>{selectedOrder.special_instructions}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Order Timeline with Track Order Button */}
                            <View style={styles.detailSection}>
                                <View style={styles.sectionHeaderWithButton}>
                                    <Text style={styles.sectionTitle}>Order Timeline</Text>
                                    {/* Track Order Button - Show for ALL non-cancelled orders */}
                                    {selectedOrder && selectedOrder.status !== 'cancelled' && (
                                        <TouchableOpacity
                                            style={styles.trackOrderHeaderButton}
                                            onPress={() => {
                                                setModalVisible(false);
                                                navigation.navigate("OrderTracking", {
                                                    orderId: selectedOrder.id,
                                                    orderNumber: selectedOrder.order_number,
                                                    customerId: user_id
                                                });
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="navigate" size={scaleFont(16)} color="#0DCAF0" />
                                            <Text style={styles.trackOrderHeaderText}>
                                                {selectedOrder.status === 'completed' ? 'View Tracking' : 'Track Order'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <View style={styles.timelineContainer}>
                                    <View style={styles.timelineItem}>
                                        <View style={styles.timelineDot} />
                                        <View style={styles.timelineContent}>
                                            <Text style={styles.timelineTitle}>Order Placed</Text>
                                            <Text style={styles.timelineDate}>{formatDate(selectedOrder.order_time)}</Text>
                                        </View>
                                    </View>
                                    {selectedOrder.estimated_delivery_time && (
                                        <View style={styles.timelineItem}>
                                            <View style={styles.timelineDot} />
                                            <View style={styles.timelineContent}>
                                                <Text style={styles.timelineTitle}>Estimated Delivery</Text>
                                                <Text style={styles.timelineDate}>{formatDate(selectedOrder.estimated_delivery_time)}</Text>
                                            </View>
                                        </View>
                                    )}
                                    {selectedOrder.completed_time && (
                                        <View style={styles.timelineItem}>
                                            <View style={styles.timelineDot} />
                                            <View style={styles.timelineContent}>
                                                <Text style={styles.timelineTitle}>Completed</Text>
                                                <Text style={styles.timelineDate}>{formatDate(selectedOrder.completed_time)}</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </ScrollView>
                    )}

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => setModalVisible(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.secondaryButtonText}>Close</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => {
                                setModalVisible(false);
                                handleReorder(selectedOrder);
                            }}
                            activeOpacity={0.7}
                        >
                            <Icon name="refresh" size={scaleFont(18)} color="#fff" />
                            <Text style={styles.primaryButtonText}>Reorder</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    ), [modalVisible, selectedOrder, getStatusColor, getStatusIcon, formatTimeAgo, formatDate, navigation, user_id, handleReorder]);

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0DCAF0" />
                    <Text style={styles.loadingText}>Loading your orders...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!user_id) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <View style={styles.errorContainer}>
                    <Icon name="account-alert" size={scaleFont(64)} color="#FF6B6B" />
                    <Text style={styles.errorTitle}>Not Logged In</Text>
                    <Text style={styles.errorText}>Please log in to view your order history</Text>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => navigation.navigate('Login')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.loginButtonText}>Go to Login</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={scaleFont(24)} color="#000" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Order History</Text>
                    <Text style={styles.headerSubtitle}>{filteredOrders.length} orders</Text>
                </View>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={fetchOrders}
                    activeOpacity={0.7}
                >
                    <Ionicons name="refresh" size={scaleFont(24)} color="#0DCAF0" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchWrapper}>
                    <Ionicons name="search" size={scaleFont(20)} color="#8E8E93" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search orders..."
                        placeholderTextColor="#8E8E93"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close-circle" size={scaleFont(20)} color="#8E8E93" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Stats Overview - Only show if we have stats */}
            {stats && Object.keys(stats).length > 0 && renderStats()}

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}
                >
                    {filterOptions.map((filter) => (
                        <TouchableOpacity
                            key={filter.key}
                            style={[
                                styles.filterTab,
                                selectedFilter === filter.key && styles.filterTabActive
                            ]}
                            onPress={() => handleFilterSelect(filter.key)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.filterText,
                                selectedFilter === filter.key && styles.filterTextActive
                            ]}>
                                {filter.label}
                            </Text>
                            <View style={[
                                styles.filterCount,
                                selectedFilter === filter.key && styles.filterCountActive
                            ]}>
                                <Text style={[
                                    styles.filterCountText,
                                    selectedFilter !== filter.key && styles.filterCountTextInactive
                                ]}>
                                    {filter.count}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Orders List */}
            <FlatList
                data={filteredOrders}
                renderItem={renderOrderItem}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.ordersList,
                    filteredOrders.length === 0 && styles.emptyOrdersList
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#0DCAF0']}
                        tintColor={'#0DCAF0'}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="clipboard-text-outline" size={scaleFont(80)} color="#E5E5EA" />
                        <Text style={styles.emptyTitle}>No orders found</Text>
                        <Text style={styles.emptyText}>
                            {selectedFilter === 'all'
                                ? "You haven't placed any orders yet"
                                : selectedFilter === 'active'
                                    ? "You don't have any active orders"
                                    : `You don't have any ${selectedFilter} orders`
                            }
                        </Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => navigation.navigate('NthomeFoodLanding')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.browseButtonText}>Browse Restaurants</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Order Details Modal */}
            {renderOrderDetailsModal()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: responsiveWidth(5),
        paddingVertical: responsiveHeight(2),
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    backButton: {
        padding: responsiveWidth(2),
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: scaleFont(20),
        fontWeight: '700',
        color: '#000000',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: scaleFont(12),
        color: '#8E8E93',
        marginTop: responsiveHeight(0.5),
    },
    refreshButton: {
        padding: responsiveWidth(2),
    },
    searchContainer: {
        paddingHorizontal: responsiveWidth(5),
        paddingVertical: responsiveHeight(2),
        backgroundColor: '#FFFFFF',
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: responsiveWidth(3),
        paddingHorizontal: responsiveWidth(4),
        paddingVertical: responsiveHeight(1.5),
    },
    searchInput: {
        flex: 1,
        marginLeft: responsiveWidth(3),
        fontSize: scaleFont(16),
        color: '#000000',
        fontWeight: '400',
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: responsiveWidth(5),
        paddingVertical: responsiveHeight(3),
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: responsiveWidth(2),
    },
    statIconContainer: {
        width: responsiveWidth(12),
        height: responsiveWidth(12),
        borderRadius: responsiveWidth(6),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: responsiveHeight(1),
    },
    statNumber: {
        fontSize: scaleFont(18),
        fontWeight: '700',
        color: '#000000',
        marginBottom: responsiveHeight(0.5),
    },
    statLabel: {
        fontSize: scaleFont(12),
        color: '#8E8E93',
        fontWeight: '500',
    },
    filterContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    filterScrollContent: {
        paddingHorizontal: responsiveWidth(5),
        paddingVertical: responsiveHeight(2),
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: responsiveWidth(4),
        paddingVertical: responsiveHeight(1),
        marginRight: responsiveWidth(2),
        borderRadius: responsiveWidth(6),
        backgroundColor: '#F2F2F7',
    },
    filterTabActive: {
        backgroundColor: '#0DCAF0',
    },
    filterText: {
        fontSize: scaleFont(14),
        color: '#8E8E93',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    filterCount: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.3),
        borderRadius: responsiveWidth(2),
        marginLeft: responsiveWidth(1.5),
    },
    filterCountActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    filterCountText: {
        fontSize: scaleFont(10),
        color: '#FFFFFF',
        fontWeight: '700',
    },
    filterCountTextInactive: {
        color: '#8E8E93',
    },
    ordersList: {
        padding: responsiveWidth(5),
        paddingBottom: responsiveHeight(10),
    },
    emptyOrdersList: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: responsiveWidth(4),
        marginBottom: responsiveHeight(2),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    orderCardContent: {
        padding: responsiveWidth(4),
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: responsiveHeight(1.5),
    },
    orderInfo: {
        flex: 1,
    },
    orderNumber: {
        fontSize: scaleFont(16),
        fontWeight: '700',
        color: '#000000',
        marginBottom: responsiveHeight(0.5),
        letterSpacing: -0.5,
    },
    orderDate: {
        fontSize: scaleFont(13),
        color: '#8E8E93',
        fontWeight: '400',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(3),
    },
    statusText: {
        fontSize: scaleFont(12),
        fontWeight: '600',
        marginLeft: responsiveWidth(1),
    },
    orderDetails: {
        marginTop: responsiveHeight(1),
    },
    itemsText: {
        fontSize: scaleFont(15),
        color: '#1C1C1E',
        lineHeight: scaleFont(20),
        marginBottom: responsiveHeight(1.5),
        fontWeight: '400',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    totalAmount: {
        fontSize: scaleFont(17),
        fontWeight: '700',
        color: '#000000',
        marginRight: responsiveWidth(3),
    },
    deliveryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        paddingHorizontal: responsiveWidth(2),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(2),
    },
    deliveryText: {
        fontSize: scaleFont(12),
        color: '#8E8E93',
        fontWeight: '500',
        marginLeft: responsiveWidth(1),
    },
    chevronContainer: {
        padding: responsiveWidth(1),
    },
    readyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(3),
        marginTop: responsiveHeight(1),
        alignSelf: 'flex-start',
    },
    readyText: {
        fontSize: scaleFont(12),
        color: '#fff',
        fontWeight: '600',
        marginLeft: responsiveWidth(1),
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: responsiveWidth(6),
        borderTopRightRadius: responsiveWidth(6),
        maxHeight: responsiveHeight(90),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: responsiveWidth(5),
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    modalTitleContainer: {
        flex: 1,
    },
    modalTitle: {
        fontSize: scaleFont(20),
        fontWeight: '700',
        color: '#000000',
        letterSpacing: -0.5,
    },
    modalSubtitle: {
        fontSize: scaleFont(14),
        color: '#8E8E93',
        marginTop: responsiveHeight(0.5),
    },
    closeButton: {
        padding: responsiveWidth(1),
    },
    modalBody: {
        padding: responsiveWidth(5),
    },
    statusBanner: {
        borderRadius: responsiveWidth(4),
        padding: responsiveWidth(4),
        marginBottom: responsiveHeight(3),
    },
    statusBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBannerText: {
        marginLeft: responsiveWidth(3),
        flex: 1,
    },
    statusBannerTitle: {
        fontSize: scaleFont(16),
        fontWeight: '700',
        marginBottom: responsiveHeight(0.5),
    },
    statusBannerSubtitle: {
        fontSize: scaleFont(14),
        color: '#8E8E93',
        fontWeight: '400',
    },
    detailSection: {
        marginBottom: responsiveHeight(4),
    },
    sectionTitle: {
        fontSize: scaleFont(18),
        fontWeight: '700',
        color: '#000000',
        marginBottom: responsiveHeight(2),
        letterSpacing: -0.5,
    },
    itemsContainer: {
        backgroundColor: '#F2F2F7',
        borderRadius: responsiveWidth(4),
        overflow: 'hidden',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: responsiveWidth(4),
        paddingVertical: responsiveHeight(1.5),
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    itemInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemName: {
        fontSize: scaleFont(15),
        color: '#1C1C1E',
        fontWeight: '500',
    },
    itemQuantity: {
        fontSize: scaleFont(13),
        color: '#8E8E93',
        marginLeft: responsiveWidth(2),
        fontWeight: '400',
    },
    itemPrice: {
        fontSize: scaleFont(15),
        color: '#1C1C1E',
        fontWeight: '600',
    },
    noItemsText: {
        fontSize: scaleFont(14),
        color: '#8E8E93',
        textAlign: 'center',
        padding: responsiveWidth(4),
        fontStyle: 'italic',
    },
    summaryContainer: {
        backgroundColor: '#F2F2F7',
        borderRadius: responsiveWidth(4),
        padding: responsiveWidth(4),
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: responsiveHeight(1),
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
        paddingTop: responsiveHeight(1.5),
        marginTop: responsiveHeight(0.5),
    },
    summaryLabel: {
        fontSize: scaleFont(15),
        color: '#8E8E93',
        fontWeight: '400',
    },
    summaryValue: {
        fontSize: scaleFont(15),
        color: '#1C1C1E',
        fontWeight: '500',
    },
    totalLabel: {
        fontSize: scaleFont(16),
        color: '#000000',
        fontWeight: '600',
    },
    totalValue: {
        fontSize: scaleFont(18),
        color: '#0DCAF0',
        fontWeight: '700',
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: responsiveWidth(-1),
    },
    infoItem: {
        width: '50%',
        paddingHorizontal: responsiveWidth(1),
        paddingVertical: responsiveHeight(1),
        alignItems: 'flex-start',
    },
    infoLabel: {
        fontSize: scaleFont(12),
        color: '#8E8E93',
        fontWeight: '500',
        marginTop: responsiveHeight(0.5),
        marginBottom: responsiveHeight(0.3),
    },
    infoValue: {
        fontSize: scaleFont(14),
        color: '#1C1C1E',
        fontWeight: '500',
    },
    instructionsContainer: {
        backgroundColor: '#F2F2F7',
        borderRadius: responsiveWidth(4),
        padding: responsiveWidth(4),
    },
    instructionsText: {
        fontSize: scaleFont(14),
        color: '#1C1C1E',
        fontStyle: 'italic',
        lineHeight: scaleFont(20),
        fontWeight: '400',
    },
    timelineContainer: {
        backgroundColor: '#F2F2F7',
        borderRadius: responsiveWidth(4),
        padding: responsiveWidth(4),
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: responsiveHeight(2),
    },
    timelineDot: {
        width: responsiveWidth(3),
        height: responsiveWidth(3),
        borderRadius: responsiveWidth(1.5),
        backgroundColor: '#0DCAF0',
        marginRight: responsiveWidth(3),
        marginTop: responsiveHeight(0.5),
    },
    timelineContent: {
        flex: 1,
    },
    timelineTitle: {
        fontSize: scaleFont(14),
        color: '#1C1C1E',
        fontWeight: '500',
        marginBottom: responsiveHeight(0.5),
    },
    timelineDate: {
        fontSize: scaleFont(12),
        color: '#8E8E93',
        fontWeight: '400',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: responsiveWidth(5),
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0DCAF0',
        paddingVertical: responsiveHeight(1.8),
        borderRadius: responsiveWidth(4),
        marginHorizontal: responsiveWidth(1),
        minWidth: responsiveWidth(25),
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: scaleFont(16),
        fontWeight: '600',
        marginLeft: responsiveWidth(1.5),
    },
    secondaryButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: responsiveHeight(1.8),
        borderRadius: responsiveWidth(4),
        borderWidth: 1,
        borderColor: '#E5E5EA',
        marginHorizontal: responsiveWidth(1),
        minWidth: responsiveWidth(25),
    },
    secondaryButtonText: {
        color: '#1C1C1E',
        fontSize: scaleFont(16),
        fontWeight: '600',
    },
    // Loading and Empty States
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        fontSize: scaleFont(16),
        color: '#8E8E93',
        marginTop: responsiveHeight(2),
        fontWeight: '400',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: responsiveHeight(10),
        paddingHorizontal: responsiveWidth(10),
    },
    emptyTitle: {
        fontSize: scaleFont(18),
        fontWeight: '700',
        color: '#8E8E93',
        marginTop: responsiveHeight(2),
        marginBottom: responsiveHeight(1),
        letterSpacing: -0.5,
    },
    emptyText: {
        fontSize: scaleFont(14),
        color: '#C7C7CC',
        textAlign: 'center',
        marginBottom: responsiveHeight(3),
        fontWeight: '400',
        lineHeight: scaleFont(20),
    },
    browseButton: {
        backgroundColor: '#0DCAF0',
        paddingHorizontal: responsiveWidth(6),
        paddingVertical: responsiveHeight(1.5),
        borderRadius: responsiveWidth(4),
    },
    browseButtonText: {
        color: '#fff',
        fontSize: scaleFont(14),
        fontWeight: '600',
    },
    // Track Order Button Styles
    trackOrderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E6F7FF',
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(1),
        borderRadius: responsiveWidth(3),
        marginTop: responsiveHeight(1.5),
        borderWidth: 1,
        borderColor: '#0DCAF0',
    },
    trackOrderText: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        fontWeight: '600',
        marginLeft: responsiveWidth(1),
    },
    // Section Header with Button
    sectionHeaderWithButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: responsiveHeight(2),
    },
    // Track Order Header Button
    trackOrderHeaderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6F7FF',
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(1),
        borderRadius: responsiveWidth(4),
        borderWidth: 1,
        borderColor: '#0DCAF0',
    },
    trackOrderHeaderText: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        fontWeight: '600',
        marginLeft: responsiveWidth(1),
    },
    // Delivered Badge
    deliveredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(3),
        marginTop: responsiveHeight(1),
        alignSelf: 'flex-start',
        backgroundColor: '#32D74B',
    },
    deliveredText: {
        fontSize: scaleFont(12),
        color: '#fff',
        fontWeight: '600',
        marginLeft: responsiveWidth(1),
    },
    // Error State
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: responsiveWidth(10),
    },
    errorTitle: {
        fontSize: scaleFont(20),
        fontWeight: '700',
        color: '#FF6B6B',
        marginTop: responsiveHeight(2),
        marginBottom: responsiveHeight(1),
    },
    errorText: {
        fontSize: scaleFont(16),
        color: '#8E8E93',
        textAlign: 'center',
        marginBottom: responsiveHeight(3),
    },
    loginButton: {
        backgroundColor: '#0DCAF0',
        paddingHorizontal: responsiveWidth(6),
        paddingVertical: responsiveHeight(1.5),
        borderRadius: responsiveWidth(4),
    },
    loginButtonText: {
        color: '#fff',
        fontSize: scaleFont(14),
        fontWeight: '600',
    },
});

export default OrderHistory;