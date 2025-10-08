"use client"

import React, { useEffect, useCallback, useState } from "react"

import { View, Text, TouchableOpacity, Animated, StyleSheet, Pressable, ScrollView, Image } from "react-native"

import { useSelector } from "react-redux"

import Icon from "react-native-vector-icons/MaterialCommunityIcons"

import { api } from "../../api"

import axios from "axios"

const ACCENT = "#0DCAF0" // Use your brand color here

const CustomDrawer = ({ isOpen, toggleDrawer, navigation }) => {
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

  // Fetch customer rating from the server
  useEffect(() => {
    if (!user_id) return // Ensure user_id is available before making the request

    const fetchCustomerRating = async () => {
      try {
        const res = await axios.get(`${api}/tripHistory/${user_id}`, {
          params: {
            customerId: user_id,
          },
        })

        const trips = res.data

        // ✅ Filter out trips that are null or have 0.0 ratings
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
          setRating(Number(avg.toFixed(1))) // ✅ show one decimal (e.g. 4.9)
        } else {
          setRating(null)
        }
      } catch (err) {
        console.error("Error fetching customer rating:", err)
      }
    }

    fetchCustomerRating()
  }, [user_id])

  // Function to render stars based on rating
  const renderStars = (rating) => {
    if (!rating || isNaN(rating)) {
      return (
        <View style={styles.starsContainer}>
          {[...Array(5)].map((_, i) => (
            <Icon key={i} name="star-outline" size={16} color="#E5E7EB" />
          ))}
          <Text style={styles.ratingValue}>N/A</Text>
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
                  // source={user?.profile_picture ? { uri: user.profile_picture } : require('../../assets/logoNthome.png')}
                  source={ require('../../assets/logoNthome.png')}
                  style={styles.avatarImage}
                />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.greeting}>
                  {user ? `Hello, ${user.name.split(" ")[0]}!` : "Loading..."}
                </Text>
                {/* <Text style={styles.subtitle}>Welcome back</Text> */}
                <Text style={styles.slogan}>Nthome ka Petjana!</Text> {/* Slogan added here */}
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

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("TripHistory")}>
              <View style={styles.menuIconContainer}>
                <Icon name="navigation" size={20} color="#666666" />
              </View>
              <Text style={styles.menuText}>Trips</Text>
              <Icon name="chevron-right" size={16} color="#C4C4C4" />
            </TouchableOpacity>

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
      </Animated.View >
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
    borderRadius: 25, // Makes it circular
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
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  slogan: {
    fontSize: 12,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#0A94B8', // Darker version of #0DCAF0
    // marginTop: 4,
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