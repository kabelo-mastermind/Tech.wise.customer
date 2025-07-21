"use client"

import { useState, useRef, useCallback } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import axios from "axios"
import { api } from "../../api"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Ionicons, MaterialCommunityIcons, FontAwesome5, FontAwesome } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useFocusEffect } from "@react-navigation/native"

const colors = {
  brandCyan: "#00B8D9",
  brandCyanDark: "#0086A8",
  white: "#fff",
  textPrimary: "#222",
  textSecondary: "#888",
  textPlaceholder: "#B0B0B0",
  border: "#E0E0E0",
  background: "#F7FAFC",
  error: "#E53935",
  iconMuted: "#B6D7E5",
  warning: "#FFC107", // Added for warning messages
}

const InfoCard = ({ icon, title, description }) => (
  <View style={styles.infoCard}>
    <View style={styles.infoIcon}>{icon}</View>
    <View>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoDescription}>{description}</Text>
    </View>
  </View>
)

const formatDate = (dateStr) => {
  if (!dateStr) return ""
  const dateObj = new Date(dateStr)
  return dateObj.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const BookingEdit = ({ route, navigation }) => {
  const booking = route?.params?.booking || null
  const userId = route?.params?.userId || null

  const [form, setForm] = useState({ ...booking })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [focused, setFocused] = useState(null) // State for input focus
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  // Calculate if the booking is editable (within 2 hours of creation)
  const isBookingEditable = useCallback(() => {
    if (!booking?.createdAt) return false // If no creation date, assume not editable or handle as error
    const bookingCreationTime = new Date(booking.createdAt).getTime()
    const twoHoursInMs = 2 * 60 * 60 * 1000 // 2 hours in milliseconds
    return Date.now() - bookingCreationTime < twoHoursInMs
  }, [booking?.createdAt])

  const [canEdit, setCanEdit] = useState(isBookingEditable())

  useFocusEffect(
    useCallback(() => {
      // Re-initialize animation
      fadeAnim.setValue(0)
      slideAnim.setValue(30)

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]).start()

      // Reset form with new data if available
      setForm({ ...route?.params?.booking })
      setCanEdit(isBookingEditable()) // Re-evaluate editability on focus
    }, [route?.params?.booking, isBookingEditable]),
  )

  const handleChange = (name, value) => setForm({ ...form, [name]: value })
  const handleFocus = (inputName) => setFocused(inputName)
  const handleBlur = () => setFocused(null)

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false)
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split("T")[0] // Format to YYYY-MM-DD
      setForm({ ...form, flightDate: dateString })
    }
  }

  const handleUpdate = async () => {
    if (!canEdit) {
      Alert.alert("Editing Not Allowed", "You can only edit your booking within 2 hours of creation.")
      return
    }

    const requiredFields = ["flightDate", "numberOfPassengers", "departurePoint", "destination"]
    const missingFields = requiredFields.filter((field) => !form[field])
    if (missingFields.length > 0) {
      Alert.alert("Missing Information", "Please fill in all required fields.")
      return
    }

    try {
      await axios.put(api + `helicopter_quotes/${booking.id}`, { ...form, user_id: userId })
      Alert.alert("Success", "Booking updated!")
      navigation.navigate("BookingDetail", { booking: { ...booking, ...form }, userId }) // Pass updated booking data
    } catch {
      Alert.alert("Error", "Could not update booking.")
    }
  }

  const getInputStyle = (inputName) => [
    styles.input,
    focused === inputName && styles.inputFocused,
    form[inputName] && styles.inputFilled,
  ]

  if (!booking || !userId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Booking details or User ID not provided.</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundButton}>
            <Ionicons name="arrow-back" size={30} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Booking</Text>
          <View style={{ width: 50 }} /> {/* Placeholder for alignment */}
        </View>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>Modify Your Flight</Text>
            <Text style={styles.introDescription}>Update the details of your existing flight booking below.</Text>
          </View>
          <InfoCard
            icon={<Ionicons name="information-circle-outline" size={22} color={colors.brandCyan} />}
            title="Review Carefully"
            description="Ensure all changes are accurate before saving to avoid discrepancies."
          />
          <InfoCard
            icon={<MaterialCommunityIcons name="clock-alert-outline" size={22} color={colors.warning} />}
            title="Limited Editing Window"
            description="You can only edit your booking within 2 hours of its creation. After this period, please contact support for any changes."
          />
          <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.formHeader}>
              <FontAwesome5 name="plane" size={22} color={colors.brandCyanDark} style={{ marginRight: 10 }} />
              <Text style={styles.formHeading}>Flight Details</Text>
            </View>
            {/* Trip Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Trip Information</Text>
              <TouchableOpacity
                style={styles.inputGroupFlat}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
                disabled={!canEdit} // Disable date picker if not editable
              >
                <FontAwesome name="calendar" size={16} color={colors.iconMuted} style={styles.inputIcon} />
                <Text style={[styles.input, form.flightDate ? styles.inputFilled : { color: colors.textPlaceholder }]}>
                  {form.flightDate ? formatDate(form.flightDate) : "Flight Date"}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={form.flightDate ? new Date(form.flightDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
              <Text style={styles.helperText}>Tap to select your preferred departure date.</Text>
              <View style={styles.inputGroupFlat}>
                <Ionicons name="people" size={16} color={colors.iconMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Number of Passengers *"
                  placeholderTextColor={colors.textPlaceholder}
                  keyboardType="numeric"
                  style={getInputStyle("numberOfPassengers")}
                  value={form.numberOfPassengers?.toString()}
                  onChangeText={(text) => handleChange("numberOfPassengers", text)}
                  onFocus={() => handleFocus("numberOfPassengers")}
                  onBlur={handleBlur}
                  accessibilityLabel="Number of Passengers"
                  editable={canEdit} // Disable input if not editable
                />
              </View>
              <Text style={styles.helperText}>Maximum: 6 per flight.</Text>
            </View>
            {/* Weights Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Weight Information</Text>
              <View style={styles.inputGroupFlat}>
                <MaterialCommunityIcons name="weight" size={16} color={colors.iconMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Passenger Weights (comma separated)"
                  placeholderTextColor={colors.textPlaceholder}
                  style={getInputStyle("passengerWeights")}
                  value={form.passengerWeights}
                  onChangeText={(text) => handleChange("passengerWeights", text)}
                  onFocus={() => handleFocus("passengerWeights")}
                  onBlur={handleBlur}
                  accessibilityLabel="Passenger Weights"
                  editable={canEdit} // Disable input if not editable
                />
              </View>
              <Text style={styles.helperText}>E.g., 80, 75, 90</Text>
              <View style={styles.inputGroupFlat}>
                <MaterialCommunityIcons
                  name="bag-checked"
                  size={16}
                  color={colors.iconMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Total Luggage Weight (kg)"
                  placeholderTextColor={colors.textPlaceholder}
                  keyboardType="numeric"
                  style={getInputStyle("luggageWeight")}
                  value={form.luggageWeight}
                  onChangeText={(text) => handleChange("luggageWeight", text)}
                  onFocus={() => handleFocus("luggageWeight")}
                  onBlur={handleBlur}
                  accessibilityLabel="Total Luggage Weight"
                  editable={canEdit} // Disable input if not editable
                />
              </View>
              <Text style={styles.helperText}>Estimate if unsure.</Text>
            </View>
            {/* Route Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Route</Text>
              <View style={styles.inputGroupFlat}>
                <Ionicons name="location" size={16} color={colors.iconMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Departure Point *"
                  placeholderTextColor={colors.textPlaceholder}
                  style={getInputStyle("departurePoint")}
                  value={form.departurePoint}
                  onChangeText={(text) => handleChange("departurePoint", text)}
                  onFocus={() => handleFocus("departurePoint")}
                  onBlur={handleBlur}
                  accessibilityLabel="Departure Point"
                  editable={canEdit} // Disable input if not editable
                />
              </View>
              <Text style={styles.helperText}>City, landmark, or airport location.</Text>
              <View style={styles.inputGroupFlat}>
                <Ionicons name="flag" size={16} color={colors.iconMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Destination *"
                  placeholderTextColor={colors.textPlaceholder}
                  style={getInputStyle("destination")}
                  value={form.destination}
                  onChangeText={(text) => handleChange("destination", text)}
                  onFocus={() => handleFocus("destination")}
                  onBlur={handleBlur}
                  accessibilityLabel="Destination"
                  editable={canEdit} // Disable input if not editable
                />
              </View>
              <Text style={styles.helperText}>Where would you like to go?</Text>
            </View>
            <TouchableOpacity
              style={[styles.submitButton, !canEdit && styles.submitButtonDisabled]}
              onPress={handleUpdate}
              accessibilityLabel="Save flight booking changes"
              disabled={!canEdit} // Disable button if not editable
            >
              <Text style={styles.submitText}>Save Changes</Text>
            </TouchableOpacity>
            {!canEdit && (
              <Text style={styles.editDisabledMessage}>
                Editing is disabled as more than 2 hours have passed since booking creation. Please contact support for
                assistance.
              </Text>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.brandCyanDark,
    letterSpacing: 0.2,
  },
  roundButton: {
    backgroundColor: "#fff",
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  introCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  introDescription: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F2F8FA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoTitle: {
    fontWeight: "600",
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 2,
  },
  infoDescription: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 18,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: "#00B8D9",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  formHeading: {
    fontSize: 18,
    color: colors.brandCyanDark,
    fontWeight: "bold",
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontWeight: "600",
    fontSize: 15,
    color: colors.brandCyanDark,
    marginBottom: 8,
    marginTop: 8,
  },
  inputGroupFlat: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inputIcon: {
    marginRight: 7,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  inputFocused: {
    backgroundColor: "#E3F7FA",
  },
  inputFilled: {
    color: colors.brandCyanDark,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: colors.brandCyan,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    marginTop: 10,
    shadowColor: "#00B8D9",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: "#B0B0B0", // Grey out when disabled
    shadowColor: "transparent",
    elevation: 0,
  },
  submitText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  editDisabledMessage: {
    fontSize: 13,
    color: colors.error,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "500",
  },
})

export default BookingEdit
