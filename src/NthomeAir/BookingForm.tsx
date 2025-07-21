"use client"
import React, { useState, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native"
import { Ionicons, MaterialCommunityIcons, FontAwesome5, FontAwesome } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import axios from "axios"
import { api } from "../../api"
import { useSelector } from "react-redux"
import { SafeAreaView } from "react-native-safe-area-context"
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete"
import { GOOGLE_MAPS_APIKEY } from "@env"

const colors = {
  primary: "#00B8D9", // Professional blue
  primaryDark: "#0086A8", // Darker blue
  primaryLight: "#E0F7FA", // Light blue
  white: "#FFFFFF",
  textPrimary: "#1F2937", // Dark gray
  textSecondary: "#6B7280", // Medium gray
  textPlaceholder: "#9CA3AF", // Light gray
  border: "#E5E7EB", // Very light gray
  background: "#FFFFFF", // Pure white
  error: "#DC2626", // Red
  success: "#059669", // Green
  warning: "#D97706", // Orange
  cardBackground: "#FFFFFF",
  inputBackground: "#F9FAFB",
  shadowColor: "#000000",
}

// Default locations - moved outside component
const defaultLocations = [
  { id: 1, name: "Hangar 21 Rand Airport", address: "Rand Airport, Germiston, Johannesburg, South Africa" },
  { id: 2, name: "OR Tambo International Airport", address: "O.R. Tambo Airport Rd, Kempton Park, 1627, South Africa" },
  { id: 3, name: "Cape Town International Airport", address: "Matroosfontein, Cape Town, 7490, South Africa" },
  { id: 4, name: "King Shaka International Airport", address: "King Shaka Dr, La Mercy, 4405, South Africa" },
  { id: 5, name: "Lanseria International Airport", address: "Pelindaba Rd, Lanseria, 1748, South Africa" },
  { id: 6, name: "Port Elizabeth Airport", address: "Allister Miller Dr, Walmer, Gqeberha, 6070, South Africa" },
]

// Static query object to prevent recreation
const GOOGLE_PLACES_QUERY = {
  key: GOOGLE_MAPS_APIKEY,
  language: "en",
}

// Autocomplete styles - moved outside component
const autoCompleteStyles = {
  container: {
    flex: 1,
  },
  textInput: {
    height: 40,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 0,
    margin: 0,
  },
  listView: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginTop: 5,
    elevation: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    maxHeight: 200,
    position: "absolute",
    top: 45,
    left: 0,
    right: 0,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  description: {
    color: colors.textPrimary,
    fontSize: 14,
  },
}

// Memoized InfoCard component
const InfoCard = React.memo(({ icon, title, description }) => (
  <View style={styles.infoCard}>
    <View style={styles.infoIcon}>{icon}</View>
    <View style={styles.infoContent}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoDescription}>{description}</Text>
    </View>
  </View>
))

// Memoized LocationModal component
const LocationModal = React.memo(({ visible, onClose, onSelect, title }) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={defaultLocations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.locationOption}
              onPress={() => {
                onSelect(item)
                onClose()
              }}
            >
              <View style={styles.locationIconContainer}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{item.name}</Text>
                <Text style={styles.locationAddress}>{item.address}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  </Modal>
))

// Separate memoized component for GooglePlacesAutocomplete to prevent re-renders
const MemoizedGooglePlacesAutocomplete = React.memo(({ refProp, placeholder, onPress, value, onChangeText }) => {
  // Memoize textInputProps to prevent recreation
  const textInputProps = React.useMemo(
    () => ({
      placeholderTextColor: colors.textPlaceholder,
      value: value,
      onChangeText: onChangeText,
    }),
    [value, onChangeText],
  )
  return (
    <GooglePlacesAutocomplete
      ref={refProp}
      placeholder={placeholder}
      listViewDisplayed="auto"
      debounce={400}
      minLength={2}
      enablePoweredByContainer={false}
      fetchDetails={true}
      onPress={onPress}
      query={GOOGLE_PLACES_QUERY}
      styles={autoCompleteStyles}
      nearbyPlacesAPI="GooglePlacesSearch"
      textInputProps={textInputProps}
    />
  )
})

// Separate FormContent component to prevent re-renders
const FormContent = React.memo(
  ({
    form,
    focused,
    getInputStyle,
    handleChange,
    handleFocus,
    handleBlur,
    setShowDatePicker,
    setShowLocationModal,
    clearDeparture,
    clearDestination,
    handleSubmit,
    fadeAnim,
    departureRef,
    destinationRef,
    showDatePicker,
    handleDateChange,
    onDeparturePress,
    onDestinationPress,
    onDepartureTextChange,
    onDestinationTextChange,
  }) => (
    <View style={styles.formContentContainer}>
      <View style={styles.introCard}>
        <View style={styles.introHeader}>
          <FontAwesome5 name="paper-plane" size={24} color={colors.primary} />
          <Text style={styles.introTitle}>Flight Charter Request</Text>
        </View>
        <Text style={styles.introDescription}>
          Enter your flight details below and we'll send you a personalized quote within 24 hours.
        </Text>
      </View>
      <InfoCard
        icon={<Ionicons name="time-outline" size={24} color={colors.success} />}
        title="Quick Response Time"
        description="We guarantee a response within 24 hours. Please arrive at the airport 2 hours before departure."
      />
      <InfoCard
        icon={<Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />}
        title="Safety First"
        description="Passenger and luggage weights help us ensure your safety and select the right aircraft."
      />
      <InfoCard
        icon={<MaterialCommunityIcons name="calendar-clock" size={24} color={colors.warning} />}
        title="Flexible Scheduling"
        description="Have flexible dates? Let us know in the notes section for more booking options."
      />
      <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
        <View style={styles.formHeader}>
          <FontAwesome5 name="plane" size={20} color={colors.primary} />
          <Text style={styles.formHeading}>Flight Details</Text>
        </View>
        {/* Aircraft Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Aircraft Type *</Text>
          <View style={styles.aircraftTypeContainer}>
            <TouchableOpacity
              style={[styles.aircraftTypeOption, form.aircraftType === "aircraft" && styles.aircraftTypeSelected]}
              onPress={() => handleChange("aircraftType", "aircraft")}
            >
              <FontAwesome5
                name="plane"
                size={18}
                color={form.aircraftType === "aircraft" ? colors.white : colors.primary}
              />
              <Text
                style={[styles.aircraftTypeText, form.aircraftType === "aircraft" && styles.aircraftTypeTextSelected]}
              >
                Aircraft
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aircraftTypeOption, form.aircraftType === "helicopter" && styles.aircraftTypeSelected]}
              onPress={() => handleChange("aircraftType", "helicopter")}
            >
              <MaterialCommunityIcons
                name="helicopter"
                size={18}
                color={form.aircraftType === "helicopter" ? colors.white : colors.primary}
              />
              <Text
                style={[styles.aircraftTypeText, form.aircraftType === "helicopter" && styles.aircraftTypeTextSelected]}
              >
                Helicopter
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Select your preferred aircraft type for this journey.</Text>
        </View>
        {/* Transport Option for Helicopter */}
        {form.aircraftType && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Ground Transport</Text>
            <TouchableOpacity
              style={[styles.transportOption, form.needsTransport && styles.transportOptionSelected]}
              onPress={() => handleChange("needsTransport", !form.needsTransport)}
            >
              <View style={[styles.checkbox, form.needsTransport && styles.checkboxSelected]}>
                {form.needsTransport && <Ionicons name="checkmark" size={16} color={colors.white} />}
              </View>
              <View style={styles.transportInfo}>
                <Text style={styles.transportTitle}>I need transport to/from the airport</Text>
                <Text style={styles.transportDescription}>
                  We'll arrange ground transportation for you since aircraft must land at designated airports
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Optional: Ground transport service to your final destination since aircraft land at airports.
            </Text>
          </View>
        )}
        {/* Lounge Services Option */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Lounge Services</Text>
          <TouchableOpacity
            style={[styles.transportOption, form.requiresLounge && styles.transportOptionSelected]}
            onPress={() => handleChange("requiresLounge", !form.requiresLounge)}
          >
            <View style={[styles.checkbox, form.requiresLounge && styles.checkboxSelected]}>
              {form.requiresLounge && <Ionicons name="checkmark" size={16} color={colors.white} />}
            </View>
            <View style={styles.transportInfo}>
              <Text style={styles.transportTitle}>Yes, I'd love lounge access!</Text>
              <Text style={styles.transportDescription}>
                Relax and enjoy premium amenities like comfortable seating, Wi-Fi, and refreshments while you wait for
                your flight to take off.
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Optional: Enhance your pre-flight experience with access to our exclusive airport lounge.
          </Text>
        </View>
        {/* Trip Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Trip Information</Text>
          <TouchableOpacity style={styles.inputGroup} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
            <FontAwesome name="calendar" size={16} color={colors.textSecondary} style={styles.inputIcon} />
            <Text style={[styles.input, form.flightDate ? styles.inputFilled : { color: colors.textPlaceholder }]}>
              {form.flightDate ? form.flightDate : "Select Flight Date *"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
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
          <Text style={styles.helperText}>Choose your preferred departure date.</Text>
          <View style={styles.inputGroup}>
            <Ionicons name="people" size={16} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Number of Passengers *"
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="numeric"
              style={getInputStyle("numberOfPassengers")}
              value={form.numberOfPassengers}
              onChangeText={(text) => handleChange("numberOfPassengers", text)}
              onFocus={() => handleFocus("numberOfPassengers")}
              onBlur={handleBlur}
              accessibilityLabel="Number of Passengers"
            />
          </View>
          <Text style={styles.helperText}>Maximum 6 passengers per flight.</Text>
        </View>
        {/* Weights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Weight Information</Text>
          <View style={styles.inputGroup}>
            <MaterialCommunityIcons name="weight" size={16} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Passenger Weights (e.g., 80, 75, 90)"
              placeholderTextColor={colors.textPlaceholder}
              style={getInputStyle("passengerWeights")}
              value={form.passengerWeights}
              onChangeText={(text) => handleChange("passengerWeights", text)}
              onFocus={() => handleFocus("passengerWeights")}
              onBlur={handleBlur}
              accessibilityLabel="Passenger Weights"
            />
          </View>
          <Text style={styles.helperText}>Enter weights separated by commas (in kg).</Text>
          <View style={styles.inputGroup}>
            <MaterialCommunityIcons
              name="bag-checked"
              size={16}
              color={colors.textSecondary}
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
            />
          </View>
          <Text style={styles.helperText}>Provide an estimate if exact weight is unknown.</Text>
        </View>
        {/* Route Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Flight Route</Text>
          {/* Departure Point */}
          <View style={[styles.autocompleteContainer, { zIndex: 1000 }]}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationLabel}>Departure Point *</Text>
              <TouchableOpacity
                style={styles.defaultLocationButton}
                onPress={() =>
                  setShowLocationModal({
                    visible: true,
                    type: "departure",
                    title: "Select Departure Airport",
                  })
                }
              >
                <Ionicons name="list" size={14} color={colors.primary} />
                <Text style={styles.defaultLocationText}>Quick Select</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.autocompleteInputContainer}>
              <Ionicons name="location" size={16} color={colors.textSecondary} style={styles.inputIcon} />
              <View style={styles.autocompleteWrapper}>
                <MemoizedGooglePlacesAutocomplete
                  refProp={departureRef}
                  placeholder="Enter departure location"
                  onPress={onDeparturePress}
                  value={form.departurePoint}
                  onChangeText={onDepartureTextChange}
                />
              </View>
              {form.departurePoint ? (
                <TouchableOpacity onPress={clearDeparture} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <Text style={styles.helperText}>Enter city, landmark, or airport name.</Text>
          {/* Destination */}
          <View style={[styles.autocompleteContainer, { zIndex: 999 }]}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationLabel}>Destination *</Text>
              <TouchableOpacity
                style={styles.defaultLocationButton}
                onPress={() =>
                  setShowLocationModal({
                    visible: true,
                    type: "destination",
                    title: "Select Destination Airport",
                  })
                }
              >
                <Ionicons name="list" size={14} color={colors.primary} />
                <Text style={styles.defaultLocationText}>Quick Select</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.autocompleteInputContainer}>
              <Ionicons name="flag" size={16} color={colors.textSecondary} style={styles.inputIcon} />
              <View style={styles.autocompleteWrapper}>
                <MemoizedGooglePlacesAutocomplete
                  refProp={destinationRef}
                  placeholder="Enter destination"
                  onPress={onDestinationPress}
                  value={form.destination}
                  onChangeText={onDestinationTextChange}
                />
              </View>
              {form.destination ? (
                <TouchableOpacity onPress={clearDestination} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <Text style={styles.helperText}>Where would you like to fly to?</Text>
        </View>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          accessibilityLabel="Submit flight booking request"
        >
          <FontAwesome5 name="paper-plane" size={16} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.submitText}>Request Quote</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  ),
)

const BookingForm = ({ navigation }) => {
  const userId = useSelector((state) => state.auth.user?.user_id)
  const [form, setForm] = useState({
    flightDate: "",
    numberOfPassengers: "",
    passengerWeights: "",
    luggageWeight: "",
    departurePoint: "",
    destination: "",
    aircraftType: "",
    needsTransport: false,
    requiresLounge: false, // New state for lounge services
    isReturnFlight: "",
    waitingTime: "",
  })
  const [focused, setFocused] = useState(null)
  const [showLocationModal, setShowLocationModal] = useState({ visible: false, type: "", title: "" })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const departureRef = useRef(null)
  const destinationRef = useRef(null)

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start()
  }, [fadeAnim])

  const handleChange = React.useCallback((name, value) => {
    setForm((prevForm) => ({ ...prevForm, [name]: value }))
  }, [])

  const handleFocus = React.useCallback((inputName) => {
    setFocused(inputName)
  }, [])

  const handleBlur = React.useCallback(() => {
    setFocused(null)
  }, [])

  const handleDateChange = React.useCallback((event, selectedDate) => {
    setShowDatePicker(false)
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split("T")[0]
      setForm((prevForm) => ({ ...prevForm, flightDate: dateString }))
    }
  }, [])

  const onDeparturePress = React.useCallback((data, details = null) => {
    if (details) {
      setForm((prevForm) => ({ ...prevForm, departurePoint: details.formatted_address }))
    }
  }, [])

  const onDestinationPress = React.useCallback((data, details = null) => {
    if (details) {
      setForm((prevForm) => ({ ...prevForm, destination: details.formatted_address }))
    }
  }, [])

  const onDepartureTextChange = React.useCallback((text) => {
    setForm((prevForm) => ({ ...prevForm, departurePoint: text }))
  }, [])

  const onDestinationTextChange = React.useCallback((text) => {
    setForm((prevForm) => ({ ...prevForm, destination: text }))
  }, [])

  const handleLocationSelect = React.useCallback((location, type) => {
    if (type === "departure") {
      setForm((prevForm) => ({ ...prevForm, departurePoint: location.address }))
      if (departureRef.current) {
        departureRef.current.setAddressText(location.address)
      }
    } else {
      setForm((prevForm) => ({ ...prevForm, destination: location.address }))
      if (destinationRef.current) {
        destinationRef.current.setAddressText(location.address)
      }
    }
  }, [])

  const clearDeparture = React.useCallback(() => {
    setForm((prevForm) => ({ ...prevForm, departurePoint: "" }))
    if (departureRef.current) {
      departureRef.current.setAddressText("")
    }
  }, [])

  const clearDestination = React.useCallback(() => {
    setForm((prevForm) => ({ ...prevForm, destination: "" }))
    if (destinationRef.current) {
      destinationRef.current.setAddressText("")
    }
  }, [])

  const handleSubmit = React.useCallback(async () => {
    const requiredFields = ["flightDate", "numberOfPassengers", "departurePoint", "destination", "aircraftType"]
    const missingFields = requiredFields.filter((field) => !form[field])

    if (missingFields.length > 0) {
      Alert.alert("Missing Information", "Please fill in all required fields.")
      return
    }

    try {
      await axios.post(api + "helicopter_quotes", { user_id: userId, ...form })
      Alert.alert(
        "Quote Request Submitted",
        "Thank you! We will reply within 24 hours with your personalized quote. Please be at the airport 2 hours before your scheduled departure time.",
      )
      // Reset form
      setForm({
        flightDate: "",
        numberOfPassengers: "",
        passengerWeights: "",
        luggageWeight: "",
        departurePoint: "",
        destination: "",
        aircraftType: "",
        needsTransport: false,
        requiresLounge: false, // Reset lounge service
        isReturnFlight: "",
        waitingTime: "",
      })
      // Clear autocomplete inputs
      if (departureRef.current) {
        departureRef.current.setAddressText("")
      }
      if (destinationRef.current) {
        destinationRef.current.setAddressText("")
      }
      navigation.navigate("BookingList", { userId })
    } catch (error) {
      Alert.alert("Error", "Failed to submit quote. Please try again.")
    }
  }, [form, userId, navigation])

  const getInputStyle = React.useCallback(
    (inputName) => [styles.input, focused === inputName && styles.inputFocused, form[inputName] && styles.inputFilled],
    [focused, form],
  )

  const renderFormItem = React.useCallback(
    () => (
      <FormContent
        form={form}
        focused={focused}
        getInputStyle={getInputStyle}
        handleChange={handleChange}
        handleFocus={handleFocus}
        handleBlur={handleBlur}
        setShowDatePicker={setShowDatePicker}
        setShowLocationModal={setShowLocationModal}
        clearDeparture={clearDeparture}
        clearDestination={clearDestination}
        handleSubmit={handleSubmit}
        fadeAnim={fadeAnim}
        departureRef={departureRef}
        destinationRef={destinationRef}
        showDatePicker={showDatePicker}
        handleDateChange={handleDateChange}
        onDeparturePress={onDeparturePress}
        onDestinationPress={onDestinationPress}
        onDepartureTextChange={onDepartureTextChange}
        onDestinationTextChange={onDestinationTextChange}
      />
    ),
    [
      form,
      focused,
      getInputStyle,
      handleChange,
      handleFocus,
      handleBlur,
      clearDeparture,
      clearDestination,
      handleSubmit,
      fadeAnim,
      showDatePicker,
      handleDateChange,
      onDeparturePress,
      onDestinationPress,
      onDepartureTextChange,
      onDestinationTextChange,
    ],
  )

  const flatListData = React.useMemo(() => [{ key: "form" }], [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundButton}>
            <Ionicons name="arrow-back" color={colors.textPrimary} size={28} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Your Flight</Text>
          <View style={{ width: 50 }} />
        </View>
        <FlatList
          data={flatListData}
          renderItem={renderFormItem}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
        <LocationModal
          visible={showLocationModal.visible}
          onClose={() => setShowLocationModal({ visible: false, type: "", title: "" })}
          onSelect={(location) => handleLocationSelect(location, showLocationModal.type)}
          title={showLocationModal.title}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  formContentContainer: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 2,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  roundButton: {
    backgroundColor: colors.white,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  introCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginLeft: 12,
  },
  introDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: "600",
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: 4,
  },
  infoDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  formHeading: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: "700",
    marginLeft: 12,
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontWeight: "600",
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  // Aircraft Type Selection Styles
  aircraftTypeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  aircraftTypeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  aircraftTypeSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  aircraftTypeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  aircraftTypeTextSelected: {
    color: colors.white,
  },
  // Transport Option Styles
  transportOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    marginBottom: 12,
  },
  transportOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  transportInfo: {
    flex: 1,
  },
  transportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  transportDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Location Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
  },
  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Location Header Styles
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  defaultLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  defaultLocationText: {
    marginLeft: 6,
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 52,
  },
  autocompleteContainer: {
    marginBottom: 12,
    zIndex: 1,
  },
  autocompleteInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 52,
  },
  autocompleteWrapper: {
    flex: 1,
    position: "relative",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  inputFilled: {
    color: colors.textPrimary,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  submitText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  clearButton: {
    padding: 8,
    marginLeft: 8,
  },
})
export default BookingForm;
