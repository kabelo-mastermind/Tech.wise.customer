"use client"

import { useMemo, useState, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ImageBackground,
  Dimensions,
  Alert,
  Image, // Import Image for the logo
} from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { Icon } from "react-native-elements"
import axios from "axios"
import { api } from "../../api"
import { useSelector } from "react-redux"
import { useFocusEffect } from "@react-navigation/native"
import CustomDrawer from "../components/CustomDrawer"
import { LinearGradient } from "expo-linear-gradient"

const { width, height } = Dimensions.get("window")

const colors = {
  brandCyan: "#00B8D9",
  brandCyanDark: "#0086A8",
  brandCyanLight: "#E0F7FA",
  white: "#FFFFFF",
  textPrimary: "#212529", // Made darker
  textSecondary: "#495057", // Made darker
  textTertiary: "#6C757D", // Made darker
  textPlaceholder: "#ADB5BD", // Adjusted for better visibility
  border: "#E2E8F0",
  background: "#F7FAFC",
  cardBackground: "#FFFFFF",
  darkGray: "#343A40", // Made darker for filter buttons
  mediumGray: "#718096",
  lightGray: "#EDF2F7",
  error: "#E53E3E",
  success: "#38A169",
  warning: "#D69E2E",
  statusPending: "#ED8936",
  statusConfirmed: "#48BB78",
  statusCancelled: "#F56565",
  shadowColor: "#000000",
}

const InfoCard = ({ icon, title, description }) => (
  <View style={styles.infoCard}>
    <View style={styles.infoIconContainer}>{icon}</View>
    <View style={styles.infoContent}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoDescription}>{description}</Text>
    </View>
  </View>
)

const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()

const isSameWeek = (date, now) => {
  const monday = new Date(now)
  const day = monday.getDay()
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return date >= monday && date <= sunday
}

const isSameMonth = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()

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

const BookingList = ({ navigation, route }) => {
  const userIdGlobal = useSelector((state) => state.auth.user?.user_id)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all") // New state for status filter
  const [showStatusDropdown, setShowStatusDropdown] = useState(false) // New state for status dropdown visibility

  const toggleDrawer = () => setDrawerOpen(!drawerOpen)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      axios
        .get(api + "helicopter_quotes/" + userIdGlobal)
        .then((res) => setBookings(Array.isArray(res.data) ? res.data : []))
        .catch(() => Alert.alert("Error", "Error loading bookings"))
        .finally(() => setLoading(false))
    }, [userIdGlobal]),
  )

  const now = new Date()
  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return bookings.filter((booking) => {
      if (!booking.created_at) return false
      const createdAt = new Date(booking.created_at)
      let dateMatch = true
      switch (filter) {
        case "daily":
          dateMatch = isSameDay(createdAt, now)
          break
        case "weekly":
          dateMatch = isSameWeek(createdAt, now)
          break
        case "monthly":
          dateMatch = isSameMonth(createdAt, now)
          break
        default:
          dateMatch = true
      }
      const departure = booking.departurePoint?.toLowerCase() || ""
      const destination = booking.destination?.toLowerCase() || ""
      const searchMatch = query === "" || departure.includes(query) || destination.includes(query)

      // New status filter logic
      let statusMatch = true
      if (selectedStatusFilter !== "all") {
        statusMatch = booking.statuses === selectedStatusFilter
      }

      return dateMatch && searchMatch && statusMatch
    })
  }, [bookings, filter, searchQuery, selectedStatusFilter]) // Add selectedStatusFilter to dependencies

  const formatDate = (dateStr) => {
    const dateObj = new Date(dateStr)
    return dateObj.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return colors.statusPending
      case "Confirmed":
        return colors.statusConfirmed
      case "Cancelled":
        return colors.statusCancelled
      default:
        return colors.textSecondary
    }
  }

  const getStatusBackgroundColor = (status) => {
    switch (status) {
      case "Pending":
        return "#FED7CC"
      case "Confirmed":
        return "#C6F6D5"
      case "Cancelled":
        return "#FED7D7"
      default:
        return colors.lightGray
    }
  }

  const ListHeader = useMemo(
    () => (
      <View style={styles.listHeaderContainer}>
        <View style={styles.bottomSheetHeader}>
          <View style={styles.dragHandle} />
          <Text style={styles.bottomSheetTitle}>My Flight Bookings</Text>
          <Text style={styles.bottomSheetSubtitle}>Manage and track your aviation journeys</Text>
        </View>
        <InfoCard
          icon={<MaterialCommunityIcons name="airplane" size={24} color={colors.brandCyan} />}
          title="Booking Management"
          description="View, edit, or cancel your flight bookings. Tap any booking card to see detailed information and available actions."
        />
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search destinations or departure points"
            placeholderTextColor={colors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterContainer}>
          {["all", "daily", "weekly", "monthly"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => {
                setFilter(f)
                setShowStatusDropdown(false) // Close status dropdown when date filter changes
              }}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          {/* New Status Filter Button */}
          <TouchableOpacity
            style={[styles.filterButton, showStatusDropdown && styles.filterButtonActive]}
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <Ionicons
              name="filter"
              size={16}
              color={showStatusDropdown ? colors.white : colors.darkGray}
              style={styles.filterIcon}
            />
            <Text style={[styles.filterText, showStatusDropdown && styles.filterTextActive]}>Status</Text>
            <Ionicons
              name={showStatusDropdown ? "chevron-up" : "chevron-down"}
              size={16}
              color={showStatusDropdown ? colors.white : colors.darkGray}
              style={styles.filterIconRight}
            />
          </TouchableOpacity>
        </View>
        {/* Status Dropdown */}
        {showStatusDropdown && (
          <View style={styles.statusDropdownContainer}>
            {["Pending", "Confirmed", "Cancelled"].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusDropdownItem,
                  selectedStatusFilter === status && styles.statusDropdownItemActive,
                ]}
                onPress={() => {
                  setSelectedStatusFilter(status)
                  setShowStatusDropdown(false) // Close dropdown after selection
                }}
              >
                <Text
                  style={[
                    styles.statusDropdownText,
                    selectedStatusFilter === status && styles.statusDropdownTextActive,
                  ]}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.statusDropdownItem,
                selectedStatusFilter === "all" && styles.statusDropdownItemActive,
              ]}
              onPress={() => {
                setSelectedStatusFilter("all")
                setShowStatusDropdown(false)
              }}
            >
              <Text
                style={[
                  styles.statusDropdownText,
                  selectedStatusFilter === "all" && styles.statusDropdownTextActive,
                ]}
              >
                All Statuses
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
    [filter, searchQuery, selectedStatusFilter, showStatusDropdown], // Add new dependencies
  )

  const ListFooter = () => (
    <TouchableOpacity
      style={styles.addButton}
      onPress={() => navigation.navigate("BookingForm", { userId: userIdGlobal })}
      accessibilityLabel="Create new booking"
    >
      <LinearGradient colors={[colors.brandCyan, colors.brandCyanDark]} style={styles.addButtonGradient}>
        <Ionicons name="add" size={24} color={colors.white} style={styles.addButtonIcon} />
        <Text style={styles.addButtonText}>Book New Flight</Text>
      </LinearGradient>
    </TouchableOpacity>
  )

  const renderBookingCard = ({ item }) => (
    <TouchableOpacity
      style={styles.modernCard}
      onPress={() => navigation.navigate("BookingDetails", { booking: item, userId: userIdGlobal })}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.routeContainer}>
            <View style={styles.airportContainer}>
              <Ionicons name="airplane-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.departurePoint?.split(",")[0] || "Unknown"}
              </Text>
            </View>
            <View style={styles.routeArrow}>
              <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.airportContainer}>
              <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.destination?.split(",")[0] || "Unknown"}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBackgroundColor(item.statuses) }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.statuses) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.statuses) }]}>{item.statuses}</Text>
          </View>
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>Flight Date: {formatDate(item.flightDate)}</Text>
          </View>
          {item.created_at && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>Booked: {formatDateTime(item.created_at)}</Text>
            </View>
          )}
          {item.numberOfPassengers && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {item.numberOfPassengers} Passenger{item.numberOfPassengers > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.tapHint}>Tap for details</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Background Image Section */}
      <ImageBackground source={require("../../assets/nthomeAir_images/helicopter.jpg")} style={styles.backgroundImage}>
        <LinearGradient colors={["rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.6)"]} style={styles.backgroundOverlay}>
          <SafeAreaView style={styles.headerSection}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={toggleDrawer} style={styles.headerButton}>
                <Icon type="material-community" name="menu" color={colors.white} size={28} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Flight Bookings</Text>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.navigate("BookingForm", { userId: userIdGlobal })}
              >
                <Ionicons name="add" size={28} color={colors.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>

      {/* Bottom Sheet Container */}
      <View style={styles.bottomSheetContainer}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.brandCyan} size="large" />
              <Text style={styles.loadingText}>Loading your bookings...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredBookings}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderBookingCard}
              ListHeaderComponent={ListHeader}
              // ListFooterComponent={ListFooter} // Uncomment if you want the footer
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="airplane-outline" size={64} color={colors.textTertiary} />
                  <Text style={styles.emptyTitle}>No bookings found</Text>
                  <Text style={styles.emptySubtitle}>Start your journey by booking your first flight</Text>
                </View>
              }
              contentContainerStyle={styles.flatListContentContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </KeyboardAvoidingView>
      </View>
      <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundImage: {
    height: height * 0.25, // 25% of screen height
    width: "100%",
  },
  backgroundOverlay: {
    flex: 1,
  },
  headerSection: {
    flex: 1,
    justifyContent: "space-between", // Distribute space between logo and header bar
    paddingBottom: 10, // Add some padding at the bottom
  },
  logoContainer: {
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 30 : 0, // Adjust for Android status bar
    marginBottom: 10, // Space between logo and header bar
  },
  logo: {
    width: 150, // Adjust as needed
    height: 50, // Adjust as needed
    tintColor: colors.white, // Example: if your logo is a monochrome SVG or you want to color it
  },
  logoText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.white,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10, // Removed as logoContainer handles top padding
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    // backdropFilter: "blur(10px)", // React Native doesn't support backdropFilter directly
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.5,
  },
  bottomSheetContainer: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  flatListContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  listHeaderContainer: {
    paddingTop: 8,
    marginBottom: 20,
  },
  bottomSheetHeader: {
    alignItems: "center",
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textTertiary,
    borderRadius: 2,
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  bottomSheetSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.lightGray,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 56,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: colors.textPrimary,
    paddingHorizontal: 0,
    paddingVertical: 0,
    margin: 0,
    borderWidth: 0,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
    flexWrap: "wrap", // Allow filters to wrap to next line
  },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    minWidth: "23%", // Adjust to fit 4 items per row
  },
  filterButtonActive: {
    backgroundColor: colors.darkGray,
    borderColor: colors.darkGray,
  },
  filterIcon: {
    marginRight: 4,
  },
  filterIconRight: {
    marginLeft: 4,
  },
  filterText: {
    color: colors.darkGray,
    fontWeight: "600",
    fontSize: 12,
  },
  filterTextActive: {
    color: colors.white,
  },
  statusDropdownContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    marginBottom: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusDropdownItemActive: {
    backgroundColor: colors.lightGray,
  },
  statusDropdownText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  statusDropdownTextActive: {
    fontWeight: "600",
    color: colors.brandCyanDark,
  },
  modernCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    marginBottom: 16,
  },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  airportContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  routeText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary, // Applied darker textPrimary
    marginLeft: 8,
  },
  routeArrow: {
    paddingHorizontal: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary, // Applied darker textSecondary
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.lightGray,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  tapHint: {
    fontSize: 12,
    color: colors.textSecondary, // Applied darker textSecondary
    fontWeight: "500",
  },
  addButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.brandCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary, // Applied darker textSecondary
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary, // Applied darker textPrimary
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary, // Applied darker textSecondary
    textAlign: "center",
  },
})

export default BookingList