"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
  Dimensions,
  Platform,
  Animated,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { Ionicons } from "@expo/vector-icons"
import CustomDrawer from "../components/CustomDrawer"
import { LinearGradient } from "expo-linear-gradient"

const { width } = Dimensions.get("window")

const AboutScreen = ({ navigation }) => {
  const appVersion = "1.0.0" // Update with your app version
  const [scrollY] = useState(new Animated.Value(0)) // Add this line

  const openFacebook = () => {
    // Replace with your Facebook page URL
    Linking.openURL("https://www.facebook.com/yourpage")
  }

  const rateApp = () => {
    // Replace with your App Store/Play Store link
    Linking.openURL("https://play.google.com/store/apps/details?id=com.yourapp")
  }

  const openLegal = () => {
    // Replace with your legal information URL
    Linking.openURL("https://www.yourapp.com/legal")
  }

  const openPrivacy = () => {
    // Replace with your privacy policy URL
    Linking.openURL("https://www.yourapp.com/privacy")
  }

  const features = [
    {
      id: "rate",
      title: "Rate the App",
      icon: "star",
      iconColor: "#FFD700",
      onPress: rateApp,
      description: "Share your experience with other users",
    },
    {
      id: "facebook",
      title: "Like Us on Facebook",
      icon: "facebook",
      iconColor: "#4267B2",
      onPress: openFacebook,
      description: "Follow us for updates and promotions",
    },
    {
      id: "legal",
      title: "Legal Information",
      icon: "file-document-outline",
      iconColor: "#0DCAF0",
      onPress: openLegal,
      description: "Terms of service and conditions",
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      icon: "shield-lock-outline",
      iconColor: "#0DCAF0",
      onPress: openPrivacy,
      description: "How we handle your data",
    },
  ]
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />

      {/* Header */}
      <Animated.View style={styles.header}>
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
            <Text style={styles.headerTitle}>About us</Text>
            <TouchableOpacity style={styles.notificationButton}>
              <Icon type="material-community" name="information-outline" color="#fff" size={22} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>Nthome Rides</Text>
          <Text style={styles.versionText}>Version {appVersion}</Text>
        </View>

        {/* About Section */}
        <View style={styles.aboutCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={22} color="#0DCAF0" />
            <Text style={styles.cardTitle}>Our Mission</Text>
          </View>
          <Text style={styles.aboutText}>
            Welcome to Nthome Rides! This platform is designed to provide a safe, efficient, and user-friendly
            experience for customers and drivers alike. Our mission is to connect people through seamless ride-sharing
            and ensure satisfaction for all users.
          </Text>
        </View>

        {/* Features Section */}
        <Text style={styles.sectionTitle}>Features & Links</Text>
        <View style={styles.featuresCard}>
          {features.map((feature, index) => (
            <TouchableOpacity
              key={feature.id}
              style={[styles.featureItem, index < features.length - 1 && styles.featureItemBorder]}
              onPress={feature.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${feature.iconColor}15` }]}>
                <Icon name={feature.icon} size={22} color={feature.iconColor} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#0DCAF0" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactText}>Have questions or feedback? We'd love to hear from you!</Text>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>Contact Us</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} Nthome Rides. All rights reserved.</Text>
        </View>
      </ScrollView>
      {drawerOpen && (
        <View style={styles.drawerOverlay}>
          <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
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
  scrollContent: {
    paddingBottom: 30,
  },
  logoSection: {
    alignItems: "center",
    paddingVertical: 30,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 4,
  },
  versionText: {
    fontSize: 14,
    color: "#6c757d",
  },
  aboutCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
    marginLeft: 8,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#495057",
    textAlign: "left",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  featuresCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    overflow: "hidden",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  featureItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: "#6c757d",
  },
  contactSection: {
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  contactText: {
    fontSize: 15,
    color: "#495057",
    textAlign: "center",
    marginBottom: 16,
  },
  contactButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  contactButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: "#6c757d",
    textAlign: "center",
  },
  drawerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000, // Ensure this is higher than any other zIndex
    backgroundColor: "rgba(0,0,0,0.5)", // Optional: adds a semi-transparent background dimming
  },
})

export default AboutScreen
