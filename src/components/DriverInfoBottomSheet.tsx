"use client"

import { useEffect, useState } from "react"
import { StyleSheet, Pressable, View, Text, Image, ScrollView, TouchableOpacity, Dimensions } from "react-native"
import { BlurView } from "expo-blur"
import { Icon } from "react-native-elements"
import { useSelector } from "react-redux"
import { api } from "../../api"

const { width, height } = Dimensions.get("window")

const DriverInfoBlurView = ({ route, navigation }) => {
  const { tripAccepted } = route.params || {}
  const tripData = useSelector((state) => state.trip.tripData)

  const [driverDetails, setDriverDetails] = useState(null)
  const [carDetails, setCarDetails] = useState(null)
  const [driverImage, setDriverImage] = useState(null)
  const [carImage, setCarImage] = useState(null)
  const [isFemale, setIsFemale] = useState(false)
  const [activeTab, setActiveTab] = useState("driver")

  useEffect(() => {
    if (tripData && tripData.carData && tripData.carData.carData) {
      const driver = {
        name: tripData.carData.carData.driverName,
        location: tripData.tripData.dropOffCoordinates.address,
        rating: tripData.carData.carData.driver_ratings || "No ratings yet",
        gender: tripData.carData.carData.driverGender,
        profileImage: tripData.carData.carData.driverPhoto,
      }


      const car = {
        carMake: tripData.carData.carData.carMake || "Unknown Car",
        carModel: tripData.carData.carData.carModel || "Unknown Car",
        carColour: tripData.carData.carData.carColour || "Unknown Car",
        classType: tripData.carData.classType || "Unknown Class",
        licensePlate: tripData.carData.carData.licensePlate || "Unknown Plate",
        price: tripData.amount || 0,
        seats: tripData.carData.carData.numberOfSeats || 0,
        carDescription: tripData.carData.carData.description || "Nthome Car",
        image: tripData.carData.carData.carImage,
      }
      // console.log("Trip Data:", tripData.carData.carData.carImage);

      // Set image URLs
      const carImageUri = car.image
      const driverImageUri = driver.profileImage
        ? driver.profileImage
        : require("../../assets/placeholder.jpg")

      setCarImage(carImageUri)
      setDriverImage(driverImageUri)
      setDriverDetails(driver)
      setCarDetails(car)
      setIsFemale(driver.gender === "Female")
    } else {
      // Set default data for testing
      setDriverDetails({
        name: "John Doe",
        location: "123 Main St",
        rating: "4.8",
        gender: "Male",
      })
      setCarDetails({
        carMake: "Toyota",
        carModel: "Camry",
        carColour: "Black",
        classType: 1,
        licensePlate: "ABC123",
        price: 150,
        seats: 4,
        carDescription: "Comfortable sedan",
      })
      setDriverImage(api + "public/customerProfiles/placeholder.png")
      setCarImage(api + "public/carImages/placeholder.png")
    }
  }, [tripData])
  console.log("Driver Data:", driver);

  const renderStars = (rating) => {
    if (!rating || rating === "No ratings yet") return "No ratings yet"

    const numRating = Number.parseFloat(rating)
    if (isNaN(numRating)) return "N/A"

    return (
      <View style={styles.starsContainer}>
        <Icon name="star" type="material-community" size={16} color="#FFD700" />
        <Text style={styles.ratingText}>{numRating.toFixed(1)}</Text>
      </View>
    )
  }

  const getCarTypeName = (classType) => {
    switch (classType) {
      case 1:
        return "nthome_black"
      case 2:
        return "nthome_x"
      default:
        return classType || "N/A"
    }
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={styles.overlay} />

      <BlurView intensity={90} tint="light" style={[styles.blurView, isFemale && styles.femaleBlurView]}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Trip Details</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Icon name="close" type="material-community" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "driver" && styles.activeTab]}
            onPress={() => setActiveTab("driver")}
          >
            <Icon
              name="account"
              type="material-community"
              size={20}
              color={activeTab === "driver" ? "#0DCAF0" : "#64748B"}
            />
            <Text style={[styles.tabText, activeTab === "driver" && styles.activeTabText]}>Driver</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "car" && styles.activeTab]}
            onPress={() => setActiveTab("car")}
          >
            <Icon name="car" type="material-community" size={20} color={activeTab === "car" ? "#0DCAF0" : "#64748B"} />
            <Text style={[styles.tabText, activeTab === "car" && styles.activeTabText]}>Vehicle</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer} bounces={false}>
          {activeTab === "driver" ? (
            <View style={styles.driverContainer}>
              <View style={styles.driverProfileContainer}>
                <View style={styles.driverImageWrapper}>
                  {driverImage && <Image source={{ uri: driverImage }} style={styles.driverImage} resizeMode="cover" />}
                  <View style={styles.statusIndicator} />
                </View>

                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driverDetails?.name || "N/A"}</Text>
                  <View style={styles.ratingContainer}>{renderStars(driverDetails?.rating)}</View>
                  <View style={styles.genderContainer}>
                    <Icon
                      name={driverDetails?.gender === "Female" ? "gender-female" : "gender-male"}
                      type="material-community"
                      size={16}
                      color={driverDetails?.gender === "Female" ? "#E83E8C" : "#0DCAF0"}
                    />
                    <Text style={styles.genderText}>{driverDetails?.gender || "N/A"}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.locationContainer}>
                <View style={styles.locationHeader}>
                  <Icon name="map-marker" type="material-community" size={20} color="#0DCAF0" />
                  <Text style={styles.locationTitle}>Pickup Location</Text>
                </View>
                <Text style={styles.locationText}>{driverDetails?.location || "N/A"}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.disabledButton]}
                  disabled={true}
                >
                  <Icon name="phone" type="material-community" size={20} color="#AAAAAA" />
                  <Text style={styles.disabledButtonText}>Call Driver</Text>
                </TouchableOpacity>


                <TouchableOpacity style={[styles.actionButton, styles.messageButton]}>
                  <Icon name="message-text" type="material-community" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Message</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.safetyTips}>
                <View style={styles.safetyHeader}>
                  <Icon name="shield-check" type="material-community" size={20} color="#0DCAF0" />
                  <Text style={styles.safetyTitle}>Safety Tips</Text>
                </View>
                <Text style={styles.safetyText}>• Verify driver's identity and license plate before entering</Text>
                <Text style={styles.safetyText}>• Share your trip details with a trusted contact</Text>
                <Text style={styles.safetyText}>• Always wear your seatbelt during the ride</Text>
              </View>
            </View>
          ) : (
            <View style={styles.carContainer}>
              <View style={styles.carImageContainer}>
                {carImage && <Image source={{ uri: carImage }} style={styles.carImage} resizeMode="cover" />}
              </View>

              <View style={styles.carInfoContainer}>
                <View style={styles.carInfoHeader}>
                  <View>
                    <Text style={styles.carMakeModel}>
                      {carDetails?.carMake} {carDetails?.carModel}
                    </Text>
                    <Text style={styles.carClass}>{getCarTypeName(carDetails?.classType)}</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Price</Text>
                    <Text style={styles.priceValue}>R{carDetails?.price}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.carDetailsGrid}>
                  <View style={styles.carDetailItem}>
                    <Icon name="palette" type="material-community" size={20} color="#0DCAF0" />
                    <Text style={styles.carDetailLabel}>Color</Text>
                    <Text style={styles.carDetailValue}>{carDetails?.carColour}</Text>
                  </View>

                  <View style={styles.carDetailItem}>
                    <Icon name="car-seat" type="material-community" size={20} color="#0DCAF0" />
                    <Text style={styles.carDetailLabel}>Seats</Text>
                    <Text style={styles.carDetailValue}>{carDetails?.seats}</Text>
                  </View>

                  <View style={styles.carDetailItem}>
                    <Icon name="card-text" type="material-community" size={20} color="#0DCAF0" />
                    <Text style={styles.carDetailLabel}>License</Text>
                    <Text style={styles.carDetailValue}>{carDetails?.licensePlate}</Text>
                  </View>

                  <View style={styles.carDetailItem}>
                    <Icon name="information" type="material-community" size={20} color="#0DCAF0" />
                    <Text style={styles.carDetailLabel}>Type</Text>
                    <Text style={styles.carDetailValue}>{carDetails?.carDescription}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* <View style={styles.featuresContainer}>
                  <Text style={styles.featuresTitle}>Features</Text>
                  <View style={styles.featuresGrid}>
                    <View style={styles.featureItem}>
                      <Icon name="air-conditioner" type="material-community" size={20} color="#0DCAF0" />
                      <Text style={styles.featureText}>AC</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Icon name="music" type="material-community" size={20} color="#0DCAF0" />
                      <Text style={styles.featureText}>Music</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Icon name="usb-port" type="material-community" size={20} color="#0DCAF0" />
                      <Text style={styles.featureText}>USB</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Icon name="seatbelt" type="material-community" size={20} color="#0DCAF0" />
                      <Text style={styles.featureText}>Safety</Text>
                    </View>
                  </View>
                </View> */}
              </View>
            </View>
          )}
        </ScrollView>
      </BlurView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlay: {
    flex: 1,
  },
  blurView: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    paddingTop: 20,
    paddingBottom: 30,
    height: height * 0.65,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  femaleBlurView: {
    backgroundColor: "rgba(255, 235, 240, 0.95)",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  activeTab: {
    backgroundColor: "#E0F7FA",
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  activeTabText: {
    color: "#0DCAF0",
    fontWeight: "600",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  driverContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  driverProfileContainer: {
    flexDirection: "row",
    padding: 16,
  },
  driverImageWrapper: {
    position: "relative",
    marginRight: 16,
  },
  driverImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#0DCAF0",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  driverInfo: {
    flex: 1,
    justifyContent: "center",
  },
  driverName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#64748B",
  },
  genderContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  genderText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#64748B",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
  },
  locationContainer: {
    padding: 16,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationTitle: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  locationText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 26,
  },
  actionButtons: {
    flexDirection: "row",
    padding: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0DCAF0",
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#ccc', // Gray out background
    opacity: 0.6,            // Slight transparency
  },

  disabledButtonText: {
    color: '#888',           // Gray out text
  },
  messageButton: {
    backgroundColor: "#3B82F6",
    marginRight: 0,
    marginLeft: 8,
    shadowColor: "#3B82F6",
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  safetyTips: {
    padding: 16,
    backgroundColor: "#F0FBFF",
  },
  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  safetyTitle: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  safetyText: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
    marginLeft: 26,
  },
  carContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  carImageContainer: {
    width: "100%",
    height: 180,
    backgroundColor: "#F1F5F9",
  },
  carImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  carInfoContainer: {
    padding: 16,
  },
  carInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  carMakeModel: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  carClass: {
    fontSize: 14,
    color: "#64748B",
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0DCAF0",
  },
  carDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    marginBottom: 16,
  },
  carDetailItem: {
    width: "50%",
    paddingVertical: 8,
    paddingRight: 8,
  },
  carDetailLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  carDetailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
  },
  featuresContainer: {
    marginTop: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  featureItem: {
    width: "25%",
    alignItems: "center",
    marginBottom: 16,
  },
  featureText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
})

export default DriverInfoBlurView
