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
  Modal,
  TextInput,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { Ionicons } from "@expo/vector-icons"
import CustomDrawer from "../components/CustomDrawer"
import { LinearGradient } from "expo-linear-gradient"
import CustomAlert from "../components/AllCustomAlert";
import { useSelector } from "react-redux"
import ChatBot from "../components/ChatBot" // Import the ChatBot component
import { api } from "../../api"


const { width } = Dimensions.get("window")

const AboutScreen = ({ navigation }) => {
  const appVersion = "1.0.0" // Update with your app version
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const user = useSelector((state) => state.auth?.user || "")
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info"); // "info", "error", "success"

  const showCustomAlert = (title, message, type = "info") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const hideCustomAlert = () => {
    setAlertVisible(false);
  };
  // Open modal instead of Play Store link
  const openFeedbackModal = () => {
    setRating(0);
    setFeedback('');
    setModalVisible(true);
  };

  // Submit rating and feedback to backend
  const submitFeedback = async () => {
    if (rating === 0) {
      showCustomAlert("Oops!", "Please provide a rating", "error");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(api + "/app/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.user_id,
          rating,
          content: feedback,
          role: user?.role || "user",
        }),
      });
      const data = await response.json();

      if (response.ok) {
        showCustomAlert("Thank you!", "Your feedback has been submitted.", "success");
        setModalVisible(false);
      } else {
        showCustomAlert("Error", data.error || "Failed to submit feedback", "error");
      }
    } catch (error) {
      showCustomAlert("Error", "Network error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Render stars for rating selection
  const renderStars = () => {
    let stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)}>
          <Icon
            name={i <= rating ? 'star' : 'star-outline'}
            size={32}
            color="#FFD700"
            style={{ marginHorizontal: 6 }}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };
  const [scrollY] = useState(new Animated.Value(0)) // Add this line

  const openFacebook = () => {
    // Replace with your Facebook page URL
    Linking.openURL("https://www.facebook.com/yourpage")
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
      onPress: openFeedbackModal,
      description: "Share your experience with other users",
    },
    {
      id: "facebook",
      title: "Like Us on Facebook",
      icon: "facebook",
      iconColor: "#4267B2",
      // onPress: openFacebook,
      description: "Follow us for updates and promotions",
    },
    {
      id: "legal",
      title: "Legal Information",
      icon: "file-document-outline",
      iconColor: "#0DCAF0",
      // onPress: openLegal,
      description: "Terms of service and conditions",
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      icon: "shield-lock-outline",
      iconColor: "#0DCAF0",
      // onPress: openPrivacy,
      description: "How we handle your data",
    },
  ]
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = () => setDrawerOpen(!drawerOpen)
  const [chatBotVisible, setChatBotVisible] = useState(false) // Chatbot modal state

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
          <TouchableOpacity style={styles.contactButton} onPress={handleEmailSupport}>
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
      {/* Feedback Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Nthome Rides</Text>
            <View style={styles.starsContainer}>{renderStars()}</View>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Leave your feedback (optional)"
              multiline
              numberOfLines={4}
              value={feedback}
              onChangeText={setFeedback}
              editable={!submitting}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalButton, styles.cancelButton]}
                disabled={submitting}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitFeedback}
                style={[styles.modalButton, styles.submitButton]}
                disabled={submitting}
              >
                <Text style={styles.modalButtonText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onConfirm={hideCustomAlert}
        hideAlert={hideCustomAlert}
        showCancelButton={false} // or true depending on your needs
      />
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
  // feedback 

  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  feedbackInput: {
    borderColor: '#0DCAF0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#212529',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#bbb',
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#0DCAF0',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
})

export default AboutScreen
