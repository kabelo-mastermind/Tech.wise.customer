"use client"
import { useEffect, useState, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Image, ActivityIndicator } from "react-native"
import { ArrowLeft, HelpCircle, Receipt, User } from "lucide-react-native"
import MapComponent from "../components/MapComponent"
import { api } from "../../api"
import axios from "axios"
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
// Firebase imports
import { storage } from '../../firebase'; // Firebase Storage Import - Keeping your original path
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage'; // Added deleteObject



export default function TripDetails({ navigation, route }) {
  const { tripId } = route.params
  console.log("Trip ID from params:", tripId)

  // Create mapRef for the MapComponent
  const mapRef = useRef(null)


  const [trip, setTrip] = useState(null)
  const [userDriver, setUserDriver] = useState(null)
  const [userCustomer, setUserCustomer] = useState(null);
  const [payment, setPayment] = useState(null)
  const [loadingData, setLoadingData] = useState(true)
  console.log("user driver:", userDriver);

  // Function to upload receipt to Firebase Storage
  const uploadReceiptToStorage = async (uri, fileName, userId) => {
    const fileData = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Add userId to the path
    const storageRef = ref(storage, `receipts/${userId}/${fileName}`);

    const blob = new Blob([Uint8Array.from(atob(fileData), c => c.charCodeAt(0))], {
      type: 'application/pdf',
    });

    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    return url;
  };


  // Format date to readable format
  const formatDate = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  // Function to round numbers to two decimal places
  const roundToTwo = (value) => {
    if (!value && value !== 0) return "N/A";
    return parseFloat(value).toFixed(2);
  };

  const isWithin24Hours = (pickupTime) => {
    if (!pickupTime) return false;
    const pickupDate = new Date(pickupTime);
    const now = new Date();
    const diffInMs = now - pickupDate;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours <= 24;
  };


  // Function to generate receipt as PDF and share it
  const generateReceipt = async () => {
    if (!trip || !payment) return;

    const htmlContent = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f9fdfc;
            padding: 30px;
            color: #222;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .app-name {
            font-size: 38px;
            font-weight: bold;
            color: #04a782;
            letter-spacing: 1px;
            margin-bottom: 5px;
          }
          .slogan {
            font-size: 18px;
            color: #388e8e;
            font-style: italic;
            margin-bottom: 18px;
          }
          .gratitude-bar {
            background: linear-gradient(90deg, #41d8e5 0, #04a782 100%);
            color: #fff;
            border-radius: 12px;
            text-align: center;
            padding: 14px 0;
            font-size: 20px;
            font-weight: 500;
            margin-bottom: 24px;
          }
          .section {
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 2px 7px rgba(44, 193, 212, 0.04);
            padding: 20px 18px 14px 18px;
            margin-bottom: 22px;
          }
          .label {
            font-weight: 600;
            color: #159c8a;
            margin-right: 3px;
          }
          .divider {
            border-top: 1.5px dashed #d6f1e7;
            margin: 20px 0;
          }
          .greeting {
            font-size: 19px;
            text-align: left;
            margin-bottom: 4px;
            color: #222;
          }
          .thanks-message {
            color: #159c8a;
            text-align: center;
            font-size: 15px;
            font-weight: 500;
            margin-top: 26px;
            margin-bottom: 10px;
          }
          .footer-note {
            text-align: center;
            font-size: 12px;
            color: #9ea6a5;
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="app-name">Nthome</div>
          <div class="slogan">nthome ka petjana</div>
        </div>

        <div class="gratitude-bar">
          We sincerely appreciate you choosing Nthome!
        </div>

        <div class="section">
          <div class="greeting">Hi, ${userCustomer?.name || "Valued Rider"}! Here are your trip details:</div>
          <p><span class="label">Date:</span> ${formatDate(trip?.pickupTime)}</p>
          <p><span class="label">From:</span> ${trip?.pickUpLocation}</p>
          <p><span class="label">To:</span> ${trip?.dropOffLocation}</p>
          <p><span class="label">Distance:</span> ${roundToTwo(trip?.distance_traveled)} km</p>
          <p><span class="label">Duration:</span> ${roundToTwo(trip?.duration_minutes)} min</p>
        </div>

        <div class="divider"></div>

        <div class="section">
          <h3 style="color:#04a782;">Payment</h3>
          <p><span class="label">Total Paid:</span> R${payment.amount}</p>
          <p><span class="label">Method:</span> ${payment.paymentType}</p>
          <p><span class="label">Status:</span> ${payment.payment_status}</p>
          <p><span class="label">Reference:</span> ${payment.payment_reference}</p>
          <p><span class="label">Currency:</span> ${payment.currency}</p>
          <p><span class="label">Date:</span> ${formatDate(payment.paymentDate)}</p>
        </div>

        <div class="divider"></div>

        <div class="section">
          <h3 style="color:#04a782;">Driver Info</h3>
          <p><span class="label">Name:</span> ${userDriver?.name || "N/A"}</p>
        </div>

        <div class="divider"></div>

        <div class="section">
          <h3 style="color:#04a782;">Customer Info</h3>
          <p><span class="label">Name:</span> ${userCustomer?.name || "N/A"}</p>
          <p><span class="label">Email:</span> ${userCustomer?.email || "N/A"}</p>
          <p><span class="label">Phone:</span> ${userCustomer?.phoneNumber || "N/A"}</p>
        </div>

        <div class="thanks-message">
          🚗 Thank you for being part of the Nthome family!<br>
          We hope your journey was delightful.<br>
          <span style="font-size:13px; color:#438c8c;">We look forward to driving you again soon!</span>
        </div>
        <p class="footer-note">Nthome &mdash; Making every ride special for you.</p>
      </body>
    </html>
  `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const fileName = `receipt_${tripId}.pdf`;
      const userId = userDriver?.id;

      if (!userId || !userDriver?.email) {
        console.log("❌ Missing userId or customer email.");
        return;
      }

      // Upload to Firebase Storage
      const downloadURL = await uploadReceiptToStorage(uri, fileName, userId);
      console.log("✅ Uploaded to Firebase:", downloadURL);

      // Send to backend for email dispatch
      await axios.post(`${api}send-receipt`, {
        email: userDriver.email,
        name: userDriver.name,
        tripId,
        receiptUrl: downloadURL,
      });
      console.log("✅ Receipt email request sent to backend.");

      // Optionally share the PDF on device
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Nthome Trip Receipt ${tripId}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        alert("Sharing not available on this device.");
      }

    } catch (error) {
      console.error("❌ Error generating receipt:", error);
    }
  };




  // Fetch trip and related data when component mounts
  // This will fetch trip details, driver details, customer details, and payment details
  useEffect(() => {
    const fetchTripAndRelatedData = async () => {
      setLoadingData(true)
      try {
        // 1. Fetch trip details using tripId
        const tripRes = await axios.get(`${api}trip/${tripId}`)
        const fetchedTrip = tripRes.data
        setTrip(fetchedTrip)
        console.log("Fetched Trip Data:", fetchedTrip)

        // 2. Fetch payment details using tripId
        const paymentRes = await fetchPaymentById(tripId)
        setPayment(paymentRes)
        console.log("Fetched Payment Data:", paymentRes)

        // 3. Fetch driver details using driverId from the fetched trip
        if (fetchedTrip?.driverId) {
          const driverData = await fetchUserById(fetchedTrip.driverId)
          setUserDriver(driverData)
          console.log("Fetched Driver Data:", driverData)
        }
        // 4. Fetch customer details using customerId from the fetched trip
        if (fetchedTrip?.customerId) {
          const customerData = await fetchCustomerByQueryId(fetchedTrip.customerId);
          setUserCustomer(customerData); // assuming you define this state
          console.log("Fetched Customer Data (via query):", customerData);
        }

      } catch (err) {
        console.error("Error fetching trip or related data:", err)
      } finally {
        setLoadingData(false)
      }
    }

    fetchTripAndRelatedData()
  }, [tripId])

  // Function to fetch driver user data from backend
  async function fetchUserById(userId) {
    try {
      const response = await fetch(api + `customer/${userId}`)
      if (!response.ok) {
        throw new Error(`Error fetching driver: ${response.status}`)
      }
      const driverData = await response.json()
      return driverData
    } catch (error) {
      console.error("Fetch driver error:", error)
      return null
    }
  }

  // Function to fetch customer using query parameter (?id=...)
  async function fetchCustomerByQueryId(customerId) {
    try {
      const response = await fetch(`${api}customer?id=${customerId}`);
      if (!response.ok) {
        throw new Error(`Error fetching customer by query: ${response.status}`);
      }
      const customerData = await response.json();
      return customerData;
    } catch (error) {
      console.error("Fetch customer by query error:", error);
      return null;
    }
  }

  // Function to fetch payment data from backend
  async function fetchPaymentById(tripId) {
    try {
      const response = await fetch(api + `payment/${tripId}`)
      if (!response.ok) {
        throw new Error(`Error fetching payment: ${response.status}`)
      }
      const paymentData = await response.json()
      return paymentData
    } catch (error) {
      console.error("Fetch payment error:", error)
      return null
    }
  }

  // Extract coordinates for origin and destination with validation
  const origin =
    trip?.pickUpLatitude && trip?.pickUpLongitude
      ? {
        latitude: Number.parseFloat(trip.pickUpLatitude),
        longitude: Number.parseFloat(trip.pickUpLongitude),
      }
      : null

  const destination =
    trip?.dropOffLatitude && trip?.dropOffLongitude
      ? {
        latitude: Number.parseFloat(trip.dropOffLatitude),
        longitude: Number.parseFloat(trip.dropOffLongitude),
      }
      : null

  // Create a mock driver location if not available (for display purposes)
  const driverLocation =
    trip?.driverLocation || (origin ? { latitude: origin.latitude + 0.001, longitude: origin.longitude + 0.001 } : null)

  if (loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <View style={styles.logoWrapper}>
            <ActivityIndicator
              size={100} // bigger spinner
              color="#0DCAF0"
              style={styles.spinnerBehind}
            />
            <Image
              source={require('../../assets/logoNthome.png')}
              style={styles.logo}
            />
          </View>
          <Text style={styles.loadingText_slogan}>{"Nthome ka petjana!"}</Text>
          <Text style={styles.loadingText}>{"Loading details..."}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Trip details not found.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{userDriver?.name ? `Ride with ${userCustomer?.name}` : "Ride Details"}</Text>
          <Text style={styles.headerDate}>{formatDate(trip?.requestDate)}</Text>
          {userDriver?.carMake && (
            <Text style={styles.headerDate}>
              {userDriver.carMake} {userDriver.carModel} ({userDriver.licensePlate})
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("DriverProfile")}>
          <View style={styles.profileIcon}>
            {userDriver?.profile_picture ? (
              <Image source={{ uri: userDriver.profile_picture }} style={styles.profileImage} />
            ) : (
              <User size={24} color="#666" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Map */}
        <View style={styles.mapContainer}>
          {origin || destination ? (
            <MapComponent mapRef={mapRef} userOrigin={origin} userDestination={destination} hideNavigation={true} />
          ) : (
            <View style={styles.noMapContainer}>
              <Text style={styles.noMapText}>Map data not available</Text>
            </View>
          )}
          <View style={styles.tripInfo}>
            <Text style={styles.tripInfoText}>
              {`${roundToTwo(trip?.distance_traveled)} km, ${roundToTwo(trip?.duration_minutes)} min`}
            </Text>
          </View>

        </View>

        {/* Trip Details */}
        <View style={styles.content}>
          <View style={styles.locations}>
            {/* Start Location */}
            <View style={styles.locationItem}>
              <View style={styles.locationIndicator}>
                <View style={[styles.dot, styles.dotGreen]} />
                <View style={styles.line} />
              </View>
              <View style={styles.locationText}>
                <Text style={styles.locationTitle}>{trip?.pickUpLocation || "N/A"}</Text>
                <Text style={styles.locationTime}>{formatDate(trip?.pickupTime) || "_ _ : _ _"}</Text>
              </View>
            </View>

            {/* End Location */}
            <View style={styles.locationItem}>
              <View style={styles.locationIndicator}>
                <View style={[styles.dot, styles.dotBlue]} />
              </View>
              <View style={styles.locationText}>
                <Text style={styles.locationTitle}>{trip?.dropOffLocation || "N/A"}</Text>
                <Text style={styles.locationTime}>{formatDate(trip?.dropOffTime) || "N/A"}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Additional ride details</Text>
          <Text style={styles.additionalInfo}>Status: {trip?.statuses || "N/A"}</Text>
          <Text style={styles.additionalInfo}>Created At: {formatDate(trip?.requestDate) || "N/A"}</Text>
          <Text style={styles.additionalInfo}>Customer Ratings: {trip?.driver_ratings || "N/A"}</Text>
          <Text style={styles.additionalInfo}>Driver Name: {userDriver?.name || "N/A"}</Text>

          {/* {trip?.vehicle_type && (
            <Text style={styles.additionalInfo}>
              Vehicle Type:{" "}
              {trip.vehicle_type === "1" ? "nthome black" : trip.vehicle_type === "2" ? "nthome x" : trip.vehicle_type}
            </Text>
          )} */}

          {trip?.driver_feedback && <Text style={styles.additionalInfo}>Driver Feedback: {trip.driver_feedback}</Text>}
          {trip?.cancellation_reason && (
            <Text style={styles.additionalInfo}>Cancellation Reason: {trip.cancellation_reason}</Text>
          )}
          {trip?.notes && <Text style={styles.additionalInfo}>Notes: {trip.notes}</Text>}

          {/* Driver Contact Info */}
          {userDriver && isWithin24Hours(trip?.pickupTime) && (
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Customer Contact</Text>
              <Text style={styles.additionalInfo}>Email: {userDriver.email || "N/A"}</Text>
              <Text style={styles.additionalInfo}>Phone: {userDriver.phoneNumber || "N/A"}</Text>
              <Text style={styles.additionalInfo}>Gender: {userDriver.gender || "N/A"}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Support")}>
            <HelpCircle size={20} color="#000" />
            <Text style={styles.buttonText}>Get help with ride</Text>
          </TouchableOpacity>

          {/* Payment Details */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.paymentDetails}>
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentLabel, styles.discountText]}>Discount</Text>
                <Text style={[styles.paymentAmount, styles.discountText]}>
                  {trip?.discount ? `-${trip.discount}` : "No discount"}
                </Text>
              </View>
              {/* <View style={[styles.paymentRow, styles.totalRow]}>
                <Text style={styles.totalText}>Payment Details</Text>
                {/* <Text style={styles.totalAmount}>{trip?.total || "N/A"}</Text> 
              </View> */}

              {payment?.id && <Text style={styles.additionalInfo}>Total: {payment.amount}</Text>}
              {payment?.payment_status && (
                <Text style={styles.additionalInfo}>Payment Status: {payment.payment_status}</Text>
              )}
              {payment?.paymentType && <Text style={styles.additionalInfo}>Payment Method: {payment.paymentType}</Text>}
              {payment?.payment_reference && (
                <Text style={styles.additionalInfo}>Reference: {payment.payment_reference}</Text>
              )}
              {payment?.currency && <Text style={styles.additionalInfo}>Currency: {payment.currency}</Text>}
              {payment?.paymentDate && (
                <Text style={styles.additionalInfo}>
                  Payment Date: {new Date(payment.paymentDate).toLocaleString()}
                </Text>
              )}

              <View style={styles.paymentMethod}>
                <View style={styles.cashIndicator}>
                  <View style={styles.cashIcon}>
                    <Text style={styles.cashIconText}>R</Text>
                  </View>
                  <Text style={styles.paymentMethodText}>Cash</Text>
                </View>
                <Text style={styles.paymentAmount}>{trip?.total}</Text>
              </View>
            </View>
          </View>

          {/* Receipt Button */}
          {/* <TouchableOpacity style={styles.button} onPress={generateReceipt}>
            <Receipt size={20} color="#000" />
            <Text style={styles.buttonText}>Get receipt</Text>
          </TouchableOpacity> */}
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    zIndex: 1,
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  headerDate: {
    fontSize: 14,
    color: "#666",
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  mapContainer: {
    height: 200,
    position: "relative",
  },
  noMapContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  noMapText: {
    fontSize: 16,
    color: "#666",
  },
  map: {
    flex: 1,
  },
  tripInfo: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripInfoText: {
    fontSize: 14,
  },
  content: {
    padding: 16,
  },
  locations: {
    marginBottom: 24,
  },
  locationItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  locationIndicator: {
    alignItems: "center",
    marginRight: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotGreen: {
    backgroundColor: "#22c55e",
  },
  dotBlue: {
    backgroundColor: "#3b82f6",
  },
  line: {
    width: 2,
    height: 40,
    backgroundColor: "#eee",
    marginVertical: 4,
  },
  locationText: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  locationTime: {
    fontSize: 14,
    color: "#666",
  },
  additionalInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
  },
  paymentSection: {
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  paymentDetails: {
    gap: 12,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  paymentLabel: {
    color: "#666",
  },
  paymentAmount: {
    fontWeight: "500",
  },
  discountText: {
    color: "#3b82f6",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
    marginTop: 8,
  },
  totalText: {
    fontWeight: "600",
  },
  totalAmount: {
    fontWeight: "600",
  },
  paymentMethod: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  cashIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  cashIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  cashIconText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  paymentMethodText: {
    fontSize: 16,
  },
  // loadingContainer: {
  //   flex: 1,
  //   justifyContent: "center",
  //   alignItems: "center",
  //   padding: 20,
  // },
  // loadingText: {
  //   fontSize: 16,
  //   color: "#666",
  // },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },

  loadingText: {
    // marginTop: 16,
    top: -30,
    fontSize: 16,
    color: "#4B5563",
  },
  loadingText_slogan: {
    // marginTop: 12,
    top: -40,
    fontSize: 16,
    fontStyle: "italic",
    color: "#4B5563",
  },
  spinnerBehind: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  logo: {
    width: 70,
    height: 70,
    resizeMode: "contain",
  },
  logoWrapper: {
    position: "relative",
    width: 120,
    height: 120,
    marginBottom: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#e53935",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#0DCAF0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: "cover",
  },
})
