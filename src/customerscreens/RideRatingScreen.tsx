"use client"

import React, { useState, useContext } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native"
import Icon from "react-native-vector-icons/FontAwesome"
import { Ionicons } from "@expo/vector-icons"
import axios from "axios"
import { api } from "../../api"
import { DestinationContext, OriginContext } from "../contexts/contexts"

const { width } = Dimensions.get("window")

const RideRatingScreen = ({ route, navigation }) => {
  const { tripId, userId } = route.params
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { dispatchOrigin } = useContext(OriginContext);
  const { dispatchDestination } = useContext(DestinationContext);
  // Animation values
  const scaleAnim = React.useRef(new Animated.Value(1)).current

  const handleStarPress = (star) => {
    setRating(star)
    // Add a subtle animation when star is pressed
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handleSubmit = async () => {
    if (!rating) {
      Alert.alert("Rating Required", "Please select a rating before submitting.")
      return
    }

    setIsSubmitting(true)

    try {
      await axios.post(api + "ride/rating", {
        tripId,
        userId,
        rating,
        feedback,
        role: "customer",
      })

      // Directly set submitted state without animation
      setSubmitted(true)

      // Start the auto-redirect timer
      setTimeout(() => {
        dispatchOrigin({ type: "RESET_ORIGIN" });
        dispatchDestination({ type: "RESET_DESTINATION" });

        navigation.navigate("RequestScreen");
      }, 4000)
    } catch (error) {
      console.error("Rating submission error:", error)
      Alert.alert("Submission Failed", "Unable to submit your rating. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRatingText = () => {
    switch (rating) {
      case 1:
        return "We're sorry to hear that"
      case 2:
        return "We'll work to improve"
      case 3:
        return "Thank you for your feedback"
      case 4:
        return "Great! We're glad you enjoyed"
      case 5:
        return "Excellent! You made our day"
      default:
        return ""
    }
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.thankYouContainer}>
          <View style={styles.thankYouIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.thankYouTitle}>Thank You!</Text>
          <Text style={styles.thankYouMessage}>
            Your rating was submitted successfully. We appreciate your feedback and are glad you rode with NthomeRides!
          </Text>
          <Text style={styles.redirectMessage}>
            Looking for another ride? We'll take you there shortly...
          </Text>
          <TouchableOpacity style={styles.bookNowButton} onPress={() => navigation.navigate("RequestScreen")}>
            <Text style={styles.bookNowButtonText}>Book Another Ride</Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0A2240" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Main Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>How was your ride?</Text>
            <Text style={styles.questionSubtext}>Your feedback helps us improve our service</Text>
          </View>

          {/* Star Rating */}
          <Animated.View style={[styles.starsContainer, { transform: [{ scale: scaleAnim }] }]}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleStarPress(star)}
                style={styles.starButton}
                activeOpacity={0.7}
              >
                <Icon name="star" size={45} color={star <= rating ? "#FFC107" : "#E5E7EB"} style={styles.star} />
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* Rating Text */}
          {rating > 0 && <Text style={styles.ratingText}>{getRatingText()}</Text>}

          {/* Feedback Input */}
          <View style={styles.feedbackContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Tell us more about your experience (optional)"
              placeholderTextColor="#9CA3AF"
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, !rating && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!rating || isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={[styles.submitButtonText, !rating && styles.submitButtonTextDisabled]}>
              {isSubmitting ? "Submitting..." : "Submit Rating"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0A2240",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  questionContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  questionText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0A2240",
    textAlign: "center",
    marginBottom: 12,
  },
  questionSubtext: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  starButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  star: {
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    marginBottom: 40,
  },
  feedbackContainer: {
    marginBottom: 40,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#0A2240",
    backgroundColor: "#F9FAFB",
    minHeight: 100,
    maxHeight: 120,
  },
  submitButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  submitButtonTextDisabled: {
    color: "#9CA3AF",
  },
  // Thank You Screen Styles
  thankYouContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  thankYouIconContainer: {
    marginBottom: 32,
  },
  thankYouTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0A2240",
    marginBottom: 20,
    textAlign: "center",
  },
  thankYouMessage: {
    fontSize: 18,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 16,
  },
  thankYouSubMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
    fontWeight: "500",
  },
  redirectMessage: {
    fontSize: 14,
    color: "#000",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 30,
    fontWeight: "500",
    fontStyle: "italic",
  },
  bookNowButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bookNowButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  scrollContent: {
    flexGrow: 1,
  },
})

export default RideRatingScreen
