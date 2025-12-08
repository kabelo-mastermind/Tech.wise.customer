// OrderTrackingScreen.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from "@expo/vector-icons"
import axios from 'axios';
import { api } from '../../api';
import { connectSocket, disconnectSocket, listenToFoodOrderUpdates } from '../configSocket/socketConfig'; // Your socket config
import DriverTrackingMap from '../NthomeFood/Components/DriverTrackingMap';
import { useDispatch, useSelector } from 'react-redux';
import { updateOrderDetails, updateOrderDriverId } from '../redux/actions/orderDetailsAction';

const { width, height } = Dimensions.get('window');

const responsiveWidth = (percentage) => (width * percentage) / 100;
const responsiveHeight = (percentage) => (height * percentage) / 100;
const scaleFont = (size) => (width / 375) * size;

const OrderTrackingScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();

    const { orderId, orderNumber, customerId } = route.params || {};
    const [activeTab, setActiveTab] = useState('tracking');
    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [realTimeUpdate, setRealTimeUpdate] = useState(null);

    const [driverLocation, setDriverLocation] = useState(null);
    const [driverId, setDriverId] = useState(null);


    // Socket setup for real-time updates
    useEffect(() => {
        if (customerId) {

            // Connect socket for customer
            connectSocket(customerId, 'customer');

            // Listen for order status updates
            listenToFoodOrderUpdates((data) => {
                console.log('📥 Real-time order update received:', data);
                // Dispatch to Redux store
                dispatch(updateOrderDetails({
                    orderId: data.orderId,
                    status: data.status,
                    customerId: data.customerId,
                    driverId: data.driverId,
                    orderNumber: data.orderNumber,
                }));

                if (data.orderId === orderId) {
                    setRealTimeUpdate(data);
                    // Use driverId from socket OR from route params
                    setDriverId(data?.driverId || route.params?.driverId || null);
                    dispatch(updateOrderDriverId(data.orderId, data.driverId));

                }
            });
        }

        return () => {
            disconnectSocket();
        };
    }, [customerId, orderId, route.params?.driverId]);

    // Fetch order details from your API
    useEffect(() => {
        fetchOrderDetails();
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);

            if (!orderId) {
                throw new Error('Order ID is required');
            }

            console.log('Fetching order details for order ID:', orderId);

            const response = await axios.get(`${api}food-orders/${orderId}`);

            console.log('Order details response:', response.data);

            setOrderDetails(response.data);
            setDriverId(response.data.driverId);
        } catch (error) {
            console.error('Error fetching order details:', error);
            console.error('Error details:', error.response?.data);

            Alert.alert(
                'Error',
                'Failed to load order details. Please check your connection and try again.',
                [{ text: "OK" }]
            );
        } finally {
            setLoading(false);
        }
    };


    // Add this function to get tracking steps with map integration
    const getTrackingSteps = () => {
        const status = realTimeUpdate?.status || orderDetails?.status;
        const orderTime = orderDetails?.order_time;
        const estimatedDelivery = orderDetails?.estimated_delivery_time;
        const completedTime = orderDetails?.completed_time;
        const collectedTime = orderDetails?.collected_time;
        const arrivedTime = orderDetails?.arrived_time;

        // If order is cancelled, show cancelled status
        if (status === 'cancelled') {
            return [
                {
                    key: 'cancelled',
                    title: 'Order Cancelled',
                    description: 'This order has been cancelled',
                    icon: 'close-circle',
                    status: true,
                    timestamp: completedTime || orderTime,
                    isCancelled: true
                }
            ];
        }

        // Define status progression
        const statusProgression = {
            delivery: ['pending', 'confirmed', 'preparing', 'ready', 'collected', 'arrived', 'completed'],
            pickup: ['pending', 'confirmed', 'preparing', 'ready', 'completed']
        };

        const currentOrderType = orderDetails?.order_type || 'delivery';
        const currentStatusOrder = statusProgression[currentOrderType];
        const currentStatusIndex = currentStatusOrder.indexOf(status);

        const steps = [];

        // Common steps
        steps.push(
            {
                key: 'pending',
                title: 'Order Placed',
                description: 'Restaurant has received your order',
                icon: 'checkmark-circle',
                status: currentStatusIndex >= 0,
                timestamp: orderTime
            },
            {
                key: 'confirmed',
                title: 'Order Confirmed',
                description: 'Restaurant has confirmed your order',
                icon: 'checkmark-done',
                status: currentStatusIndex >= 1,
                timestamp: orderTime
            },
            {
                key: 'preparing',
                title: 'Preparing Order',
                description: 'Restaurant is preparing your food',
                icon: 'restaurant',
                status: currentStatusIndex >= 2,
                timestamp: orderTime
            },
            {
                key: 'ready',
                title: 'Order Ready',
                description: currentOrderType === 'delivery'
                    ? 'Your order is ready for delivery'
                    : 'Your order is ready for pickup',
                icon: 'bag-handle',
                status: currentStatusIndex >= 3,
                timestamp: estimatedDelivery
            }
        );

        // Delivery-specific steps
        if (currentOrderType === 'delivery') {
            steps.push(
                {
                    key: 'collected',
                    title: 'Order Collected',
                    description: 'Driver has collected your order from the restaurant',
                    icon: 'car',
                    status: currentStatusIndex >= 4,
                    timestamp: collectedTime,
                    showMap: true // Add this flag to show map
                },
                {
                    key: 'arrived',
                    title: 'Driver Arrived',
                    description: 'Driver has arrived at your location',
                    icon: 'location',
                    status: currentStatusIndex >= 5,
                    timestamp: arrivedTime,
                    showMap: true // Add this flag to show map
                },
                {
                    key: 'completed',
                    title: 'Delivered',
                    description: 'Order has been delivered successfully',
                    icon: 'home',
                    status: currentStatusIndex >= 6,
                    timestamp: completedTime
                }
            );
        } else {
            // Pickup completion
            steps.push({
                key: 'completed',
                title: 'Collected',
                description: 'Order has been collected successfully',
                icon: 'bag-check',
                status: currentStatusIndex >= 4,
                timestamp: completedTime
            });
        }

        return steps;
    };

    // Update your OrderStatusSteps component to include the map
    // Update your OrderStatusSteps component to include the map
    // Update your OrderStatusSteps component to include the map
    const OrderStatusSteps = () => {
        const steps = getTrackingSteps();
        const currentStatus = realTimeUpdate?.status || orderDetails?.status;
        const isCollectedStatus = currentStatus === 'collected';
        const isArrivedStatus = currentStatus === 'arrived';

        return (
            <View style={styles.trackingContainer}>
                <Text style={styles.trackingTitle}>Order Status</Text>
                {realTimeUpdate && (
                    <View style={styles.realTimeBanner}>
                        <Ionicons name="refresh-circle" size={scaleFont(20)} color="#0DCAF0" />
                        <Text style={styles.realTimeText}>
                            Live updates enabled
                        </Text>
                    </View>
                )}

                <View style={styles.stepsContainer}>
                    {steps.map((step, index) => (
                        <React.Fragment key={step.key}>
                            <View style={styles.stepItem}>
                                <View style={styles.stepLeft}>
                                    <View style={[
                                        styles.stepIconContainer,
                                        step.status && !step.isCancelled ? styles.stepCompleted : styles.stepPending,
                                        step.isCancelled && styles.stepCancelled
                                    ]}>
                                        <Ionicons
                                            name={step.status ? step.icon : step.icon + '-outline'}
                                            size={scaleFont(20)}
                                            color={step.isCancelled ? '#fff' : (step.status ? '#fff' : '#999')}
                                        />
                                    </View>
                                    {index < steps.length - 1 && !step.isCancelled && (
                                        <View style={[
                                            styles.stepConnector,
                                            step.status ? styles.connectorCompleted : styles.connectorPending
                                        ]} />
                                    )}
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[
                                        styles.stepTitle,
                                        step.status && styles.stepTitleCompleted,
                                        step.isCancelled && styles.stepCancelledText
                                    ]}>
                                        {step.title}
                                    </Text>
                                    <Text style={[
                                        styles.stepDescription,
                                        step.isCancelled && styles.stepCancelledText
                                    ]}>
                                        {step.description}
                                    </Text>
                                    {step.status && step.timestamp && (
                                        <Text style={styles.stepTimestamp}>
                                            {new Date(step.timestamp).toLocaleString()}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Show map specifically under the "collected" step when it's active */}
                            {step.key === 'collected' && step.status && isCollectedStatus && (
                                <View style={styles.mapSection}>
                                    <Text style={styles.mapTitle}>Live Driver Tracking</Text>
                                    <DriverTrackingMap
                                        orderId={orderId}
                                        driverId={driverId}
                                        restaurantLocation={orderDetails?.restaurant_coordinates}
                                        customerLocation={orderDetails?.delivery_coordinates}
                                        showRoute={true}
                                    />
                                    <View style={styles.mapInfo}>
                                        <Ionicons name="information-circle" size={scaleFont(16)} color="#0DCAF0" />
                                        <Text style={styles.mapInfoText}>
                                            {driverId
                                                ? "Tracking your driver in real-time. The map will update automatically."
                                                : "Waiting for driver assignment. Map will appear when driver starts delivery."
                                            }
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Optional: Also show map for arrived status if needed */}
                            {step.key === 'arrived' && step.status && isArrivedStatus && (
                                <View style={styles.mapSection}>
                                    <Text style={styles.mapTitle}>Driver Has Arrived</Text>
                                    <DriverTrackingMap
                                        orderId={orderId}
                                        driverId={driverId}
                                        restaurantLocation={orderDetails?.restaurant_coordinates}
                                        customerLocation={orderDetails?.delivery_coordinates}
                                        showRoute={true}
                                    />
                                    <View style={styles.mapInfo}>
                                        <Ionicons name="checkmark-circle" size={scaleFont(16)} color="#34C759" />
                                        <Text style={styles.mapInfoText}>
                                            Your driver has arrived at your location.
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </React.Fragment>
                    ))}
                </View>
            </View>
        );
    };

    // Rest of your component remains the same...
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTimeAgo = (dateString) => {
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
    };

    const getStatusColor = (status) => {
        const statusColors = {
            pending: '#FFA500',
            confirmed: '#0DCAF0',
            preparing: '#5856D6',
            ready: '#34C759',
            completed: '#32D74B',
            cancelled: '#FF3B30'
        };
        return statusColors[status] || '#8E8E93';
    };

    const OrderDetailsTab = () => (
        <ScrollView style={styles.tabContent}>
            {/* Order Summary */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                {orderDetails?.items?.map((item, index) => (
                    <View key={index} style={styles.orderItem}>
                        <View style={styles.itemLeft}>
                            <Text style={styles.itemName}>{item.item_name}</Text>
                            {item.special_instructions && (
                                <Text style={styles.specialInstructions}>
                                    Note: {item.special_instructions}
                                </Text>
                            )}
                        </View>
                        <View style={styles.itemRight}>
                            <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                            <Text style={styles.itemPrice}>R{item.total_price || (item.unit_price * item.quantity)}</Text>
                        </View>
                    </View>
                ))}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>R{orderDetails?.final_amount || orderDetails?.total_amount}</Text>
                </View>
            </View>

            {/* Order Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Information</Text>
                <InfoRow icon="receipt" label="Order Number" value={orderDetails?.order_number} />
                <InfoRow icon="calendar" label="Order Date" value={formatDate(orderDetails?.order_time)} />
                <InfoRow icon="time" label="Order Status" value={
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderDetails?.status) + '15' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(orderDetails?.status) }]}>
                            {orderDetails?.status ? orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1) : 'Unknown'}
                        </Text>
                    </View>
                } />
                {realTimeUpdate && (
                    <InfoRow icon="flash" label="Live Updates" value="Active" />
                )}
            </View>

            {/* Delivery/Pickup Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    {orderDetails?.order_type === 'delivery' ? 'Delivery Information' : 'Pickup Information'}
                </Text>
                {orderDetails?.order_type === 'delivery' ? (
                    <>
                        <InfoRow icon="location" label="Delivery Address" value={orderDetails?.delivery_address} />
                        {orderDetails?.estimated_delivery_time && (
                            <InfoRow icon="time" label="Estimated Delivery" value={formatDate(orderDetails.estimated_delivery_time)} />
                        )}
                    </>
                ) : (
                    <InfoRow icon="storefront" label="Pickup Location" value={orderDetails?.restaurant_name || 'Restaurant'} />
                )}
                {orderDetails?.special_instructions && (
                    <InfoRow icon="document-text" label="Special Instructions" value={orderDetails.special_instructions} />
                )}
            </View>

            {/* Customer Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Customer Information</Text>
                <InfoRow icon="person" label="Customer Name" value={orderDetails?.customer_name} />
                <InfoRow icon="call" label="Phone Number" value={orderDetails?.customer_phone} />
                {orderDetails?.customer_email && (
                    <InfoRow icon="mail" label="Email" value={orderDetails.customer_email} />
                )}
            </View>

            {/* Payment Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Information</Text>
                <InfoRow icon="card" label="Payment Method" value={
                    orderDetails?.payment_method === 'card' ? 'Credit/Debit Card' :
                        orderDetails?.payment_method === 'cash' ? 'Cash' : 'Not specified'
                } />
                <InfoRow icon="card" label="Payment Status" value={
                    orderDetails?.payment_status === 'paid' ? 'Paid' :
                        orderDetails?.payment_status === 'pending' ? 'Pending' : 'Not specified'
                } />
            </View>

            {/* Restaurant Information */}
            {orderDetails?.restaurant_name && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Restaurant Details</Text>
                    <InfoRow icon="restaurant" label="Restaurant" value={orderDetails.restaurant_name} />
                    {orderDetails?.restaurant_address && (
                        <InfoRow icon="location" label="Address" value={orderDetails.restaurant_address} />
                    )}
                    {orderDetails?.restaurant_phone && (
                        <InfoRow icon="call" label="Phone" value={orderDetails.restaurant_phone} />
                    )}
                </View>
            )}

            {/* Order Timeline */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Timeline</Text>
                <InfoRow icon="time" label="Order Placed" value={formatTimeAgo(orderDetails?.order_time)} />
                {orderDetails?.estimated_delivery_time && (
                    <InfoRow icon="time" label="Estimated Delivery" value={formatDate(orderDetails.estimated_delivery_time)} />
                )}
                {orderDetails?.completed_time && (
                    <InfoRow icon="checkmark" label="Completed" value={formatTimeAgo(orderDetails.completed_time)} />
                )}
                {realTimeUpdate && (
                    <InfoRow icon="flash" label="Last Update" value="Just now" />
                )}
            </View>
        </ScrollView>
    );

    const InfoRow = ({ icon, label, value }) => (
        <View style={styles.infoRow}>
            <Ionicons name={icon} size={scaleFont(16)} color="#0DCAF0" style={styles.infoIcon} />
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                {typeof value === 'string' ? (
                    <Text style={styles.infoValue}>{value}</Text>
                ) : (
                    value
                )}
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0DCAF0" />
                    <Text style={styles.loadingText}>Loading order details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!orderDetails) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={scaleFont(64)} color="#FF6B6B" />
                    <Text style={styles.errorTitle}>Order Not Found</Text>
                    <Text style={styles.errorText}>Unable to load order details.</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={fetchOrderDetails}
                    >
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={scaleFont(24)} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order Tracking</Text>
                <View style={styles.headerRight} />
            </View>

            {/* Order Status Banner */}
            <View style={styles.statusBanner}>
                <View style={styles.statusHeader}>
                    <Text style={styles.orderNumber}>#{orderDetails?.order_number}</Text>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(orderDetails?.status) + '15' }
                    ]}>
                        <Text style={[styles.statusText, { color: getStatusColor(orderDetails?.status) }]}>
                            {orderDetails?.status ? orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1) : 'Unknown'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.statusMessage}>
                    {orderDetails?.status === 'completed'
                        ? `Your order has been ${orderDetails?.order_type === 'delivery' ? 'delivered' : 'collected'} successfully!`
                        : `Your ${orderDetails?.order_type === 'delivery' ? 'delivery' : 'order'} is being processed`
                    }
                </Text>
                {realTimeUpdate && (
                    <View style={styles.liveIndicator}>
                        <Ionicons name="radio-button-on" size={scaleFont(12)} color="#34C759" />
                        <Text style={styles.liveText}>Live updates active</Text>
                    </View>
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'tracking' && styles.activeTab]}
                    onPress={() => setActiveTab('tracking')}
                >
                    <Text style={[styles.tabText, activeTab === 'tracking' && styles.activeTabText]}>
                        Tracking
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'details' && styles.activeTab]}
                    onPress={() => setActiveTab('details')}
                >
                    <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
                        Order Details
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'tracking' ? (
                <ScrollView style={{ flex: 1 }}>
                    <OrderStatusSteps />
                </ScrollView>
            ) : (
                <OrderDetailsTab />
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => navigation.navigate('Support')}
                >
                    <Ionicons name="help-circle" size={scaleFont(18)} color="#0DCAF0" />
                    <Text style={styles.secondaryButtonText}>Get Help</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => navigation.navigate('NthomeFoodLanding')}
                >
                    <Ionicons name="fast-food" size={scaleFont(18)} color="#fff" />
                    <Text style={styles.primaryButtonText}>Order Again</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: responsiveHeight(2),
        fontSize: scaleFont(16),
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: responsiveWidth(5),
    },
    errorTitle: {
        fontSize: scaleFont(20),
        fontWeight: 'bold',
        color: '#FF6B6B',
        marginTop: responsiveHeight(2),
        marginBottom: responsiveHeight(1),
    },
    errorText: {
        fontSize: scaleFont(16),
        color: '#666',
        textAlign: 'center',
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: responsiveWidth(5),
        paddingVertical: responsiveHeight(2),
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: responsiveWidth(2),
    },
    headerTitle: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#333',
    },
    headerRight: {
        width: responsiveWidth(10),
    },
    statusBanner: {
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
        marginBottom: responsiveHeight(2),
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: responsiveHeight(1),
    },
    orderNumber: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: responsiveWidth(3),
        paddingVertical: responsiveHeight(0.5),
        borderRadius: responsiveWidth(2),
    },
    statusText: {
        fontSize: scaleFont(12),
        fontWeight: 'bold',
    },
    statusMessage: {
        fontSize: scaleFont(14),
        color: '#666',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: responsiveWidth(5),
    },
    tab: {
        flex: 1,
        paddingVertical: responsiveHeight(2),
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#0DCAF0',
    },
    tabText: {
        fontSize: scaleFont(14),
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#0DCAF0',
        fontWeight: 'bold',
    },
    trackingContainer: {
        flex: 1,
        backgroundColor: '#fff',
        padding: responsiveWidth(5),
    },
    trackingTitle: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: responsiveHeight(3),
    },
    stepsContainer: {
        paddingLeft: responsiveWidth(2),
    },
    stepItem: {
        flexDirection: 'row',
        marginBottom: responsiveHeight(3),
    },
    stepLeft: {
        alignItems: 'center',
        marginRight: responsiveWidth(4),
    },
    stepIconContainer: {
        width: responsiveWidth(12),
        height: responsiveWidth(12),
        borderRadius: responsiveWidth(6),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    stepCompleted: {
        backgroundColor: '#0DCAF0',
        borderColor: '#0DCAF0',
    },
    stepPending: {
        backgroundColor: '#fff',
        borderColor: '#e0e0e0',
    },
    stepConnector: {
        width: 2,
        flex: 1,
        marginTop: responsiveHeight(1),
    },
    connectorCompleted: {
        backgroundColor: '#0DCAF0',
    },
    connectorPending: {
        backgroundColor: '#e0e0e0',
    },
    stepContent: {
        flex: 1,
        paddingTop: responsiveHeight(0.5),
    },
    stepTitle: {
        fontSize: scaleFont(16),
        fontWeight: '600',
        color: '#999',
        marginBottom: responsiveHeight(0.5),
    },
    stepTitleCompleted: {
        color: '#333',
    },
    stepDescription: {
        fontSize: scaleFont(14),
        color: '#666',
        marginBottom: responsiveHeight(0.5),
    },
    stepTimestamp: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        fontWeight: '500',
    },
    tabContent: {
        flex: 1,
        backgroundColor: '#fff',
    },
    section: {
        padding: responsiveWidth(5),
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sectionTitle: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: responsiveHeight(2),
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: responsiveHeight(1.5),
    },
    itemLeft: {
        flex: 1,
    },
    itemName: {
        fontSize: scaleFont(14),
        color: '#333',
        fontWeight: '500',
        marginBottom: responsiveHeight(0.5),
    },
    specialInstructions: {
        fontSize: scaleFont(12),
        color: '#666',
        fontStyle: 'italic',
    },
    itemRight: {
        alignItems: 'flex-end',
    },
    itemQuantity: {
        fontSize: scaleFont(12),
        color: '#666',
        marginBottom: responsiveHeight(0.5),
    },
    itemPrice: {
        fontSize: scaleFont(14),
        fontWeight: 'bold',
        color: '#333',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: responsiveHeight(2),
        paddingTop: responsiveHeight(2),
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    totalLabel: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#333',
    },
    totalAmount: {
        fontSize: scaleFont(18),
        fontWeight: 'bold',
        color: '#0DCAF0',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: responsiveHeight(2),
    },
    infoIcon: {
        marginRight: responsiveWidth(3),
        marginTop: responsiveHeight(0.2),
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: scaleFont(12),
        color: '#666',
        marginBottom: responsiveHeight(0.2),
    },
    infoValue: {
        fontSize: scaleFont(14),
        color: '#333',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        padding: responsiveWidth(5),
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0DCAF0',
        paddingVertical: responsiveHeight(2),
        borderRadius: responsiveWidth(3),
        marginLeft: responsiveWidth(2),
    },
    primaryButtonText: {
        fontSize: scaleFont(14),
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: responsiveWidth(1.5),
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: responsiveHeight(2),
        borderRadius: responsiveWidth(3),
        borderWidth: 1,
        borderColor: '#0DCAF0',
        marginRight: responsiveWidth(2),
    },
    secondaryButtonText: {
        fontSize: scaleFont(14),
        color: '#0DCAF0',
        fontWeight: 'bold',
        marginLeft: responsiveWidth(1.5),
    },
    // Add these to your styles
    stepCancelled: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    stepCancelledText: {
        color: '#FF3B30',
    },
    realTimeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6F7FF',
        padding: responsiveWidth(3),
        borderRadius: responsiveWidth(2),
        marginBottom: responsiveHeight(2),
    },
    realTimeText: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        marginLeft: responsiveWidth(2),
        fontWeight: '500',
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: responsiveHeight(1),
    },
    liveText: {
        fontSize: scaleFont(12),
        color: '#34C759',
        marginLeft: responsiveWidth(1),
        fontWeight: '500',
    },
    // mapSection: {
    //     marginBottom: responsiveHeight(3),
    // },
    // mapTitle: {
    //     fontSize: scaleFont(16),
    //     fontWeight: 'bold',
    //     color: '#333',
    //     marginBottom: responsiveHeight(1),
    // },
    // Add to your existing styles
    mapSection: {
        marginTop: responsiveHeight(2),
        marginBottom: responsiveHeight(1),
    },
    mapTitle: {
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: responsiveHeight(1),
    },
    mapInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6F7FF',
        padding: responsiveWidth(3),
        borderRadius: responsiveWidth(2),
        marginTop: responsiveHeight(1),
    },
    mapInfoText: {
        fontSize: scaleFont(12),
        color: '#0DCAF0',
        marginLeft: responsiveWidth(2),
        flex: 1,
    },
    stepMap: {
        backgroundColor: '#5856D6',
        borderColor: '#5856D6',
    },
});

export default OrderTrackingScreen;