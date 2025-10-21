"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  Modal,
  Linking,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import CustomDrawer from "../components/CustomDrawer"
import { Icon } from "react-native-elements"
import ChatBot from "../components/ChatBot" // Import the ChatBot component

const { width, height } = Dimensions.get("window")

// ServiceCard component with animation and modern styling
const ServiceCard = ({ title, description, isComingSoon, onPress, index }) => {
  const [animation] = useState(new Animated.Value(0))

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start()
  }, [])

  const getIconName = () => {
    switch (title) {
      case "NthomeRides":
        return "car-sport"
      case "NthomeAir":
        return "airplane"
      case "NthomeFood":
        return "restaurant"
      case "NthomeShop":
        return "cart"
      default:
        return "apps"
    }
  }

  return (
    <Animated.View
      style={{
        opacity: animation,
        transform: [
          {
            translateY: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        style={[styles.card, isComingSoon && styles.comingSoonCard]}
        disabled={isComingSoon}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Ionicons name={getIconName()} size={24} color="#0DCAF0" />
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          {isComingSoon ? (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          ) : (
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={20} color="#0DCAF0" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const NthomeServicesScreen = ({ navigation }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chatBotVisible, setChatBotVisible] = useState(false) // Chatbot modal state
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)
  const [scrollY] = useState(new Animated.Value(0))

  // Navigation handlers for each service
  const handleRidesPress = () => {
    navigation.navigate("RequestScreen")
  }

  const handleAirPress = () => {
    navigation.navigate("FlightWelcomeScreen")
  }

  const handleFoodPress = () => {
    Alert.alert("Coming Soon", "NthomeFood service will be available soon!", [
      { text: "OK", onPress: () => console.log("OK Pressed") },
    ])
  }

  const handleShopPress = () => {
    Alert.alert("Coming Soon", "NthomeShop service will be available soon!", [
      { text: "OK", onPress: () => console.log("OK Pressed") },
    ])
  }

  // Chatbot handlers
  const openChatBot = () => {
    setChatBotVisible(true)
  }

  const closeChatBot = () => {
    setChatBotVisible(false)
  }
     const handleEmailSupport = () => {
      const email = "nthomecouriers@gmail.com"; // Replace with your support email
      const subject = "Support Request";
      const body = "Hi, I need help with...";
      const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
      Linking.openURL(url).catch((err) =>
        console.error("Failed to open email client:", err)
      );
    };

  // Calculate header opacity based on scroll position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  })

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />

      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={["#0DCAF0", "#0AA8CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
              <Icon type="material-community" name="menu" color="#fff" size={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nthome Services</Text>
            <TouchableOpacity style={styles.notificationButton}>
              <Icon type="material-community" name="bell-outline" color="#fff" size={22} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        <Animated.ScrollView
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
        >
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Our Services</Text>
            <Text style={styles.heroSubtitle}>Discover the range of services we offer to make your life easier</Text>
          </View>

          <View style={styles.servicesContainer}>
            <ServiceCard
              title="NthomeRides"
              description="Your reliable ride, anytime, anywhere."
              isComingSoon={false}
              onPress={handleRidesPress}
              index={0}
            />
            <ServiceCard
              title="NthomeAir"
              description="Elevate your travel experience with premium air travel."
              isComingSoon={false}
              onPress={handleAirPress}
              index={1}
            />
            <ServiceCard
              title="NthomeFood"
              description="Delicious meals, delivered to your doorstep in minutes."
              isComingSoon={true}
              onPress={handleFoodPress}
              index={2}
            />
            <ServiceCard
              title="NthomeShop"
              description="Shop your favorite items with ease and fast delivery."
              isComingSoon={true}
              onPress={handleShopPress}
              index={3}
            />
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="information-circle" size={24} color="#0DCAF0" />
              </View>
              <Text style={styles.infoTitle}>Need Help?</Text>
              <Text style={styles.infoText}>
                Our customer support team is available 24/7 to assist you with any questions.
              </Text>
              <TouchableOpacity style={styles.infoButton} onPress={handleEmailSupport}>
                <Text style={styles.infoButtonText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.ScrollView>
      </View>

      {/* Floating Action Button for Chat */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={openChatBot}>
        <LinearGradient
          colors={["#0DCAF0", "#0AA8CC"]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ChatBot Modal */}
      <Modal
        visible={chatBotVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeChatBot}
      >
        <ChatBot onClose={closeChatBot} />
      </Modal>

      {/* Custom Drawer - Wrapped in an overlay View */}
      {drawerOpen && (
        <View style={styles.drawerOverlay}>
          <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    width: "100%",
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    paddingBottom: 40,
  },
  heroSection: {
    padding: 24,
    backgroundColor: "#0DCAF0",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 22,
  },
  servicesContainer: {
    padding: 16,
    paddingTop: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  comingSoonCard: {
    opacity: 0.8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(13, 202, 240, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  comingSoonBadge: {
    backgroundColor: "rgba(13, 202, 240, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  comingSoonText: {
    color: "#0DCAF0",
    fontSize: 12,
    fontWeight: "600",
  },
  arrowContainer: {
    padding: 8,
  },
  infoSection: {
    padding: 16,
    paddingTop: 8,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(13, 202, 240, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  infoButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  infoButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  drawerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
})

export default NthomeServicesScreen