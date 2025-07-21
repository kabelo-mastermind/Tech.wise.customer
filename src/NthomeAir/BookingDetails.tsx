"use client"

import { useState, useCallback } from "react"
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import axios from "axios"
import { api } from "../../api" // Assuming this path is correct for your project
import { SafeAreaView } from "react-native-safe-area-context"
import { useFocusEffect } from "@react-navigation/native"

const { width, height } = Dimensions.get("window")

const colors = {
  background: "#F8F9FA", // Very light gray
  cardBackground: "#FFFFFF", // Pure white for cards
  textPrimary: "#343A40", // Darker charcoal for main text
  textSecondary: "#495057", // Medium-dark gray for secondary text/labels
  border: "#CED4DA", // A more visible light gray for borders
  accentBlue: "#007BFF", // A standard blue for accents/buttons
  accentBlueLight: "#EBF5FF", // Lighter blue for backgrounds of info cards
  success: "#28A745", // Green for success
  warning: "#FFC107", // Yellow for warning
  error: "#DC3545", // Red for error
  iconBackground: "#E9ECEF", // Slightly darker light gray for icon backgrounds
  white: "#FFFFFF", // Pure white
}

const Barcode = () => (
  <View style={styles.barcodeContainer}>
    {Array.from({ length: 50 }, (_, i) => (
      <View
        key={i}
        style={[
          styles.barcodeLine,
          {
            width: Math.random() > 0.3 ? 2 : 4,
            marginRight: Math.random() > 0.5 ? 1 : 2,
          },
        ]}
      />
    ))}
  </View>
)

const DottedLine = () => (
  <View style={styles.dottedLineContainer}>
    {Array.from({ length: 30 }, (_, i) => (
      <View key={i} style={styles.dot} />
    ))}
  </View>
)

const InfoCard = ({ icon, title, description, type = "default" }) => {
  const getCardStyle = () => {
    switch (type) {
      case "warning":
        return { backgroundColor: colors.warning + "20", borderLeftColor: colors.warning } // 20 is for 20% opacity
      case "success":
        return { backgroundColor: colors.success + "20", borderLeftColor: colors.success }
      case "info":
        return { backgroundColor: colors.accentBlueLight, borderLeftColor: colors.accentBlue }
      default:
        return { backgroundColor: colors.cardBackground, borderLeftColor: colors.border }
    }
  }
  return (
    <View style={[styles.infoCard, getCardStyle()]}>
      <View style={styles.infoIconContainer}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </View>
  )
}

const formatDate = (dateStr) => {
  if (!dateStr) return ""
  const dateObj = new Date(dateStr)
  return dateObj
    .toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    })
    .toUpperCase()
}

const formatDateTime = (isoString) => {
  if (!isoString) return "N/A"
  try {
    const date = new Date(isoString)
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch (e) {
    console.error("Error formatting date:", e)
    return "Invalid Date"
  }
}

const formatTime = (dateStr) => {
  if (!dateStr) return "TBD"
  const dateObj = new Date(dateStr)
  return dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

const getAirportCode = (location) => {
  if (!location) return "TBD"
  return location.split(",")[0].substring(0, 3).toUpperCase()
}

const BookingDetails = ({ route, navigation }) => {
  const booking = route?.params?.booking || null
  const userId = route?.params?.userId || null

  // Calculate if the booking is editable (within 2 hours of creation)
  const isBookingEditable = useCallback(() => {
    if (!booking?.createdAt) return false
    const bookingCreationTime = new Date(booking.createdAt).getTime()
    const twoHoursInMs = 2 * 60 * 60 * 1000
    return Date.now() - bookingCreationTime < twoHoursInMs
  }, [booking?.createdAt])

  const [canEdit, setCanEdit] = useState(isBookingEditable())

  useFocusEffect(
    useCallback(() => {
      setCanEdit(isBookingEditable())
    }, [isBookingEditable]),
  )

  if (!booking || !userId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking details or User ID not provided.</Text>
      </View>
    )
  }

  const handleCancelBooking = () => {
    Alert.alert("Cancel Booking", "Are you sure you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "default",
        onPress: async () => {
          console.log("Cancelling booking with:", {
            id: booking.id,
            user_id: userId,
            status: "Cancelled",
          })
          try {
            await axios.put(`${api}helicopter_quotes`, {
              data: {
                id: booking.id,
                status: "Cancelled",
                user_id: userId,
              },
            })
            Alert.alert("Success", "Booking cancelled successfully!")
            navigation.navigate("BookingList", { userId })
          } catch (error) {
            console.error("Error cancelling booking:", error.response?.data || error.message)
            Alert.alert("Error", "Could not cancel booking. Please try again.")
          }
        },
      },
    ])
  }

  const departureCode = getAirportCode(booking.departurePoint)
  const destinationCode = getAirportCode(booking.destination)
  const flightDate = formatDate(booking.flightDate)
  const departureTime = formatTime(booking.flightDate)

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Booking details</Text>
          </View>

          {/* Boarding Pass Card */}
          <View style={styles.boardingPassCard}>
            {/* Premium Seats Section */}
            <View style={styles.premiumSection}>
              <Text style={styles.premiumText}>FLIGHT BOOKING</Text>
              <View style={styles.underline} />
            </View>

            {/* Barcode Section */}
            <View style={styles.barcodeSection}>
              <Barcode />
              <Text style={styles.barcodeNumber}>Booking code {booking.id}38830-408226</Text>
            </View>

            {/* Dotted Line */}
            <DottedLine />

            {/* Airport Codes */}
            <View style={styles.airportSection}>
              <Text style={styles.airportCode}>{departureCode}</Text>
              <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} style={styles.arrow} />
              <Text style={styles.airportCode}>{destinationCode}</Text>
            </View>

            {/* Flight Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailColumn}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Aircraft</Text>
                  <Text style={styles.detailValue}>
                    {booking.numberOfPassengers}
                    {booking.aircraftType === "aircraft" ? "A" : "H"}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{flightDate}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Departure time</Text>
                  <Text style={styles.detailValue}>{departureTime}</Text>
                </View>
              </View>
              <View style={styles.detailColumn}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{booking.statuses}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Booked On</Text>
                  <Text style={styles.detailValue}>{formatDate(booking.created_at)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Passengers</Text>
                  <Text style={styles.detailValue}>{booking.numberOfPassengers}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Info Card
          <InfoCard
            type={canEdit ? "info" : "warning"}
            icon={
              <MaterialCommunityIcons
                name={canEdit ? "pencil-circle" : "clock-alert-outline"}
                size={24}
                color={canEdit ? colors.accentBlue : colors.warning}
              />
            }
            title={canEdit ? "Editing Available" : "Editing Window"}
            description={
              canEdit
                ? "You can still edit this booking. Changes are allowed within 2 hours of creation."
                : "Editing is no longer available. Please contact support for any modifications."
            }
          /> */}

          {/* Additional Details Card */}
          <View style={styles.additionalDetailsCard}>
            <Text style={styles.additionalDetailsTitle}>Flight Information</Text>
            <View style={styles.additionalDetailsContent}>
              <Text style={styles.additionalDetailsText}>From: {booking.departurePoint}</Text>
              <Text style={styles.additionalDetailsText}>To: {booking.destination}</Text>
              <Text style={styles.additionalDetailsText}>Aircraft Type: {booking.aircraftType}</Text>
              {booking.passengerWeights && (
                <Text style={styles.additionalDetailsText}>Passenger Weights: {booking.passengerWeights}</Text>
              )}
              {booking.luggageWeight && (
                <Text style={styles.additionalDetailsText}>Luggage Weight: {booking.luggageWeight} kg</Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton, !canEdit && styles.disabledButton]}
                onPress={() => navigation.navigate("BookingEdit", { booking, userId })}
                disabled={!canEdit}
              >
                <Ionicons name="create-outline" size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancelBooking}>
                <Ionicons name="close-circle-outline" size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Solid light background
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.iconBackground, // Lighter background for button, but more visible
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.textPrimary, // Darker text for contrast
  },
  boardingPassCard: {
    backgroundColor: colors.cardBackground, // Solid white background
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000", // Add subtle shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5, // For Android
  },
  premiumSection: {
    marginBottom: 24,
  },
  premiumText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary, // Muted text, but more visible
    letterSpacing: 1,
    marginBottom: 8,
  },
  underline: {
    height: 1,
    backgroundColor: colors.border, // More visible border
    width: "100%",
  },
  barcodeSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  barcodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    marginBottom: 12,
  },
  barcodeLine: {
    height: "100%",
    backgroundColor: colors.textPrimary, // Darker lines for barcode
  },
  barcodeNumber: {
    fontSize: 12,
    color: colors.textSecondary, // Muted text, but more visible
    letterSpacing: 0.5,
  },
  dottedLineContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 24,
    paddingHorizontal: 10,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border, // More visible dots
  },
  airportSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  airportCode: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.textPrimary, // Darker text
    letterSpacing: 2,
  },
  arrow: {
    marginHorizontal: 20,
  },
  detailsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailColumn: {
    flex: 1,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary, // Muted text, but more visible
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary, // Darker text
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    shadowColor: "#000", // Add subtle shadow for depth
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2, // For Android
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.iconBackground, // More visible background for icon
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: "600",
    fontSize: 16,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  additionalDetailsCard: {
    backgroundColor: colors.cardBackground, // Solid white background
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000", // Add subtle shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5, // For Android
  },
  additionalDetailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary, // Darker text
    marginBottom: 12,
  },
  additionalDetailsContent: {
    gap: 4,
  },
  additionalDetailsText: {
    fontSize: 14,
    color: colors.textSecondary, // Muted text, but more visible
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: colors.accentBlue, // Solid accent blue
  },
  cancelButton: {
    backgroundColor: colors.error, // Solid error red
  },
  disabledButton: {
    backgroundColor: colors.border, // Lighter disabled button, but more visible
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white, // White text on colored buttons
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background, // Light background for error
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.textPrimary, // Dark text for error
    textAlign: "center",
  },
  scrollContainer: {
    paddingBottom: 40,
    paddingHorizontal: 0, // Removed horizontal padding from here as it's in safeArea
  },
})

export default BookingDetails
