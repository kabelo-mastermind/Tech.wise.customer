"use client"

import React, { useEffect, useCallback, useState } from "react"
import { View, Text, TouchableOpacity, Animated, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { api } from "../../api"
import axios from "axios"
import socket, { connectSocket, disconnectSocket, listenToFoodOrderUpdates } from "../configSocket/socketConfig" // Adjust path as needed
import NetInfo from '@react-native-community/netinfo'
import { saveCachedCustomerRating, getCachedCustomerRating } from '../utils/storage'
import { Socket } from "socket.io-client"
import { useDispatch, useSelector } from 'react-redux';
import { updateOrderDetails, updateOrderDriverId } from '../redux/actions/orderDetailsAction';

const ACCENT = "#0DCAF0"

const CustomDrawer = ({ isOpen, toggleDrawer, navigation, currentScreen }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user)
  const drawerWidth = 280
  const slideAnim = React.useRef(new Animated.Value(-drawerWidth)).current
  const user_id = user?.user_id || ""

  const animateDrawer = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -drawerWidth,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [isOpen, slideAnim])

  useEffect(() => {
    animateDrawer()
  }, [isOpen, animateDrawer])

  const [customerRating, setRating] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [driverIds, setDriverIds] = useState({});

  useEffect(() => {
    if (user_id && currentScreen === "NthomeFoodLanding") {
      connectSocket(user_id, 'customer');
      setSocketConnected(true);

      // Update socket listener
      listenToFoodOrderUpdates((processedData) => {
        console.log('📥 Real-time order update received in drawer:', processedData);
        // Dispatch to Redux store
        dispatch(updateOrderDetails({
          orderId: processedData.orderId,
          status: processedData.status,
          customerId: processedData.customerId,
          driverId: processedData.driverId,
          orderNumber: processedData.orderNumber,
        }));
        // Store driverId
        if (processedData.driverId) {
          setDriverIds(prev => ({
            ...prev,
            [processedData.orderId]: processedData.driverId
          }));
          dispatch(updateOrderDriverId(processedData.orderId, processedData.driverId));
        }

        // Update orders
        setRecentOrders(prevOrders =>
          prevOrders.map(order =>
            order.id == processedData.orderId
              ? { ...order, status: processedData.status }
              : order
          )
        );
      });
    }

    // return () => {
    //   if (socketConnected) {
    //     disconnectSocket();
    //     setSocketConnected(false);
    //   }
    // };
  }, [user_id, currentScreen]);

  // Fetch customer rating from the server
  useEffect(() => {
    if (!user_id) return
    const fetchCustomerRating = async () => {
      try {
        // If offline, use cached rating
        let isConnected = true
        if (NetInfo && typeof NetInfo.fetch === 'function') {
          try {
            const state = await NetInfo.fetch()
            isConnected = !!state.isConnected
          } catch (e) {
            isConnected = true
          }
        }

        if (!isConnected) {
          const cached = await getCachedCustomerRating(user_id)
          if (cached && cached.rating != null) {
            setRating(Number(cached.rating))
            return
          }
          setRating(null)
          return
        }

        const res = await axios.get(`${api}/tripHistory/${user_id}`, {
          params: {
            customerId: user_id,
          },
        })

        const trips = res.data

        const ratedTrips = trips.filter(
          (trip) =>
            trip.customer_rating !== null &&
            !isNaN(Number(trip.customer_rating)) &&
            Number(trip.customer_rating) > 0
        )

        if (ratedTrips.length > 0) {
          const total = ratedTrips.reduce(
            (sum, trip) => sum + Number(trip.customer_rating),
            0
          )
          const avg = total / ratedTrips.length
          const rounded = Number(avg.toFixed(1))
          setRating(rounded)
          // cache for offline use
          try { await saveCachedCustomerRating(user_id, rounded) } catch (e) {}
        } else {
          setRating(null)
          try { await saveCachedCustomerRating(user_id, null) } catch (e) {}
        }
      } catch (err) {
        console.error("Error fetching customer rating:", err)
        // fallback to cached rating on error
        try {
          const cached = await getCachedCustomerRating(user_id)
          if (cached && cached.rating != null) setRating(Number(cached.rating))
        } catch (e) {}
      }
    }

    fetchCustomerRating()
  }, [user_id])

  // Fetch recent orders when on food landing page
  useEffect(() => {
    if (currentScreen === "NthomeFoodLanding" && user_id) {
      fetchRecentOrders()
    } else {
      // Clear orders when not on food page
      setRecentOrders([])
    }
  }, [currentScreen, user_id])

  const fetchRecentOrders = async () => {
    if (!user_id) return

    try {
      setLoadingOrders(true)
      const response = await axios.get(`${api}food-orders/user/${user_id}`, {
        params: {
          status: 'all',
          limit: 3
        }
      })

      // Get the 3 most recent orders
      const orders = response.data.slice(0, 3)

      // Store driverIds in local state
      const newDriverIds = {};
      orders.forEach(order => {
        if (order.driverId) {
          newDriverIds[order.id] = order.driverId;
        }
      });
      setDriverIds(prev => ({ ...prev, ...newDriverIds }));

      setRecentOrders(orders);
    } catch (error) {
      console.error("Error fetching recent orders:", error)
      setRecentOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  // Function to render stars based on rating
  const renderStars = (rating) => {
    if (!rating || isNaN(rating)) {
      return (
        <View style={styles.starsContainer}>
          {[...Array(5)].map((_, i) => (
            <Icon key={i} name="star-outline" size={16} color="#E5E7EB" />
          ))}
          <Text style={styles.ratingValue}>0.0</Text>
        </View>
      )
    }

    const stars = []
    const fullStars = Math.floor(rating)
    const halfStar = rating - fullStars >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Icon key={i} name="star" size={16} color="#FFD700" />)
      } else if (i === fullStars && halfStar) {
        stars.push(<Icon key={i} name="star-half-full" size={16} color="#FFD700" />)
      } else {
        stars.push(<Icon key={i} name="star-outline" size={16} color="#E5E7EB" />)
      }
    }

    return (
      <View style={styles.starsContainer}>
        {stars}
        <Text style={styles.ratingValue}>{Number(rating).toFixed(1)}</Text>
      </View>
    )
  }

  const getStatusColor = (status) => {
    const statusColors = {
      pending: '#F59E0B',
      confirmed: '#3B82F6',
      preparing: '#8B5CF6',
      ready: '#10B981',
      completed: '#059669',
      cancelled: '#EF4444',
      collected: '#0DCAF0',
      arrived: '#8B5CF6'
    };
    return statusColors[status] || '#6B7280';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString) => {
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

  // Check if any order has real-time updates
  const hasActiveOrders = recentOrders.some(order =>
    ['pending', 'confirmed', 'preparing', 'ready', 'collected', 'arrived'].includes(order.status)
  );

  // Render order history section when on food landing page
  const renderOrderHistorySection = () => {
    if (currentScreen !== "NthomeFoodLanding") return null

    return (
      <View style={styles.orderHistorySection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {socketConnected && hasActiveOrders && (
              <View style={styles.liveIndicator}>
                <Icon name="radio-tower" size={12} color="#34C759" />
                <Text style={styles.liveText}>Live</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("OrderHistory")}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {loadingOrders ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : recentOrders.length > 0 ? (
          <ScrollView style={styles.orderList} showsVerticalScrollIndicator={false}>
            {recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderItem}
                onPress={() => navigation.navigate("OrderTracking", {
                  orderId: order.id,
                  orderNumber: order.order_number,
                  customerId: user_id
                })}
              >
                <View style={styles.orderInfo}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>#{order.order_number}</Text>
                    {socketConnected && ['pending', 'confirmed', 'preparing', 'ready', 'collected', 'arrived'].includes(order.status) && (
                      <Icon name="circle" size={8} color="#34C759" style={styles.liveDot} />
                    )}
                  </View>
                  <Text style={styles.orderItems} numberOfLines={1}>
                    {order.items_summary || `${order.total_items || order.items?.length || 0} items`}
                  </Text>
                  <Text style={styles.orderDate}>{formatTimeAgo(order.order_time)}</Text>
                </View>
                <View style={styles.orderStatus}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>
                      {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.orderTotal}>R{order.final_amount || order.total_amount}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noOrders}>
            <Icon name="food" size={40} color="#E5E7EB" />
            <Text style={styles.noOrdersText}>No recent orders</Text>
            <Text style={styles.noOrdersSubText}>Your food orders will appear here</Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <>
      {isOpen && (
        <Pressable style={styles.overlay} onPress={toggleDrawer}>
          <View style={styles.overlayInner} />
        </Pressable>
      )}

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
          {/* Enhanced Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.profileContainer}>
              <View style={styles.avatarContainer}>
                <Image
                  source={require('../../assets/logoNthome.png')}
                  style={styles.avatarImage}
                />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.greeting}>
                  {user ? `Hello, ${user.name.split(" ")[0]}!` : "Loading..."}
                </Text>
                <Text style={styles.slogan}>Nthome ka Petjana!</Text>
              </View>
            </View>

            {/* Enhanced Rating Section */}
            <View style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Icon name="star-circle" size={20} color={ACCENT} />
                <Text style={styles.ratingLabel}>Your Rating</Text>
              </View>
              <View style={styles.ratingContent}>
                {renderStars(customerRating)}
                <Text style={styles.ratingDescription}>
                  {customerRating && !isNaN(customerRating)
                    ? customerRating >= 4.5
                      ? "Excellent passenger!"
                      : customerRating >= 4.0
                        ? "Great traveler!"
                        : customerRating >= 3.5
                          ? "Good passenger!"
                          : "Keep improving!"
                    : "No ratings yet"}
                </Text>
              </View>
            </View>
          </View>

          {/* Order History Section (only shown on Food Landing) */}
          {renderOrderHistorySection()}

          {/* Menu Items */}
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Home")}>
              <View style={styles.menuIconContainer}>
                <Icon name="home" size={20} color={ACCENT} />
              </View>
              <Text style={styles.menuText}>Home</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("RequestScreen")}>
              <View style={styles.menuIconContainer}>
                <Icon name="car" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>Ride with us!</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Profile")}>
              <View style={styles.menuIconContainer}>
                <Icon name="account" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>Profile</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            {/* Conditionally show Trips or Order History based on current screen */}
            {currentScreen === "NthomeFoodLanding" ? (
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("OrderHistory")}>
                <View style={styles.menuIconContainer}>
                  <Icon name="history" size={20} color="#666666" />
                </View>
                <Text style={styles.menuText}>Order History</Text>
                <Icon name="chevron-right" size={16} color="#C4C4C4" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("TripHistory")}>
                <View style={styles.menuIconContainer}>
                  <Icon name="navigation" size={20} color="#666666" />
                </View>
                <Text style={styles.menuText}>Trips</Text>
                <Icon name="chevron-right" size={16} color="#C4C4C4" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("services")}>
              <View style={styles.menuIconContainer}>
                <Icon name="wrench" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>Services</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("About")}>
              <View style={styles.menuIconContainer}>
                <Icon name="information" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>About</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Support")}>
              <View style={styles.menuIconContainer}>
                <Icon name="phone" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>Support</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={() => navigation.navigate("LogoutPage")}
            >
              <View style={styles.menuIconContainer}>
                <Icon name="logout" size={20} color="#F43F5E" />
              </View>
              <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
              <Icon name="chevron-right" size={16} color="#F43F5E" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 1,
  },
  overlayInner: {
    flex: 1,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 280,
    backgroundColor: "#fff",
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.58,
    shadowRadius: 16.0,
    elevation: 24,
  },
  drawerContent: {
    flex: 1,
  },
  // Enhanced Welcome Section Styles
  welcomeSection: {
    backgroundColor: "#F8FAFC",
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
  },
  userInfo: {
    marginLeft: 15,
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  slogan: {
    fontSize: 12,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#0A94B8',
  },
  // Enhanced Rating Section Styles
  ratingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  ratingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
  },
  ratingContent: {
    alignItems: "center",
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: "700",
    color: ACCENT,
    marginLeft: 8,
  },
  ratingDescription: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  // Order History Section Styles
  orderHistorySection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6F7FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  liveText: {
    fontSize: 10,
    color: "#0DCAF0",
    fontWeight: "600",
    marginLeft: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: "600",
  },
  orderList: {
    maxHeight: 200,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  orderInfo: {
    flex: 1,
    marginRight: 10,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  liveDot: {
    marginLeft: 6,
    marginBottom: 2,
  },
  orderItems: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  orderStatus: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  noOrders: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  noOrdersText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 8,
  },
  noOrdersSubText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
  // Menu Section Styles
  menuSection: {
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
    marginHorizontal: 20,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: "#F43F5E",
  },
})

export default CustomDrawer