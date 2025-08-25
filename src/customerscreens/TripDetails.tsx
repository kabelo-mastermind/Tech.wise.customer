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
import { showToast } from "../constants/showToast"



export default function TripDetails({ navigation, route }) {
  const { tripId } = route.params
  // console.log("Trip ID from params:", tripId)

  // Create mapRef for the MapComponent
  const mapRef = useRef(null)


  const [trip, setTrip] = useState(null)
  const [userDriver, setUserDriver] = useState(null)
  const [userCustomer, setUserCustomer] = useState(null);
  const [payment, setPayment] = useState(null)
  const [loadingData, setLoadingData] = useState(true)
  const [generatingReceipt, setGeneratingReceipt] = useState(false)
  // console.log("user driver:", userDriver);

  // Function to upload receipt to Firebase Storage
  const uploadReceiptToStorage = async (uri, fileName, userId) => {
    try {
      // Fetch the file and convert to blob
      const response = await fetch(uri);        // ✅ SAFELY fetch the file
      const blob = await response.blob();       // ✅ Convert to proper blob

      const storageRef = ref(storage, `receipts/${userId}/${fileName}`);
      await uploadBytes(storageRef, blob);      // ✅ Upload the blob
      const downloadURL = await getDownloadURL(storageRef);

      showToast("success", "Upload complete", "Your receipt has been uploaded successfully!");
      return downloadURL;
    } catch (error) {
      // console.error("❌ Error uploading to Firebase:", error);
      showToast(
        "error",
        "Upload failed",
        "We couldn't upload your receipt. Please try again."
      );
      throw error;
    }
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
    setGeneratingReceipt(true);
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
    .main-container {
      max-width: 630px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 28px rgba(44, 193, 212, 0.09);
      border: 1.5px solid #d6f1e7;
    }
    .top-bar {
      background: linear-gradient(90deg, #41d8e5 0, #04a782 100%);
      color: #fff;
      padding: 36px 32px 18px 32px;
      text-align: left;
    }
    .app-logo {
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 3px;
      margin-bottom: 2px;
      color: #fff;
    }
    .slogan {
      font-size: 15px;
      font-style: italic;
      color: #e0f7f7;
      margin-bottom: 8px;
    }
    .receipt-title {
      font-size: 28px;
      font-weight: 700;
      margin: 18px 0 5px 0;
      letter-spacing: 2px;
      color: #fff;
    }
    .receipt-meta {
      font-size: 15px;
      color: #caf6f6;
      margin-bottom: 2px;
      margin-top: 2px;
    }
    .summary-section {
      background: #f4fcfa;
      padding: 18px 32px;
      border-radius: 0 0 16px 16px;
    }
    .summary-table {
      width: 100%;
      margin: 8px 0 0 0;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 8px 6px;
      vertical-align: top;
      font-size: 16px;
    }
    .summary-table .label {
      color: #04a782;
      font-weight: 500;
      width: 120px;
    }
    .divider {
      border-top: 1.5px dashed #d6f1e7;
      margin: 24px 0;
    }
    .section {
      padding: 24px 32px 14px 32px;
      background: #fff;
    }
    .section-title {
      color: #04a782;
      font-weight: 700;
      font-size: 18px;
      margin-bottom: 8px;
    }
    .info-row {
      margin-bottom: 5px;
    }
    .info-label {
      font-weight: 600;
      color: #159c8a;
      margin-right: 3px;
      font-size: 15px;
    }
    .payment-summary {
      background: linear-gradient(90deg, #04a782 0, #41d8e5 100%);
      color: #fff;
      text-align: right;
      font-size: 22px;
      padding: 20px 32px;
      border-radius: 0 0 16px 16px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 16px;
    }
    .footer {
      text-align: center;
      color: #9ea6a5;
      font-size: 14px;
      margin-top: 22px;
      margin-bottom: 12px;
    }
    .thanks {
      display: block;
      color: #159c8a;
      font-weight: 600;
      margin-top: 16px;
      text-align: center;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="main-container">
    <div class="top-bar">
      <div class="app-logo">Nthome</div>
      <div class="slogan">nthome ka petjana</div>
      <div class="receipt-title">RECEIPT</div>
      <div class="receipt-meta">Receipt #${payment?.payment_reference || '---'}<br>
        ${formatDate(payment?.paymentDate)}
      </div>
    </div>

    <div class="summary-section">
      <table class="summary-table">
        <tr>
          <td class="label">Trip Date:</td>
          <td>${formatDate(trip?.pickupTime)}</td>
        </tr>
        <tr>
          <td class="label">From:</td>
          <td>${trip?.pickUpLocation}</td>
        </tr>
        <tr>
          <td class="label">To:</td>
          <td>${trip?.dropOffLocation}</td>
        </tr>
        <tr>
          <td class="label">Distance:</td>
          <td>${roundToTwo(trip?.distance_traveled)} km</td>
        </tr>
        <tr>
          <td class="label">Duration:</td>
          <td>${roundToTwo(trip?.duration_minutes)} min</td>
        </tr>
      </table>
    </div>
    
    <div class="divider"></div>

    <div class="section">
      <div class="section-title">Payment</div>
      <div class="info-row"><span class="info-label">Total Paid:</span> R${payment.amount}</div>
      <div class="info-row"><span class="info-label">Method:</span> ${payment.paymentType}</div>
      <div class="info-row"><span class="info-label">Status:</span> ${payment.payment_status}</div>
      <div class="info-row"><span class="info-label">Currency:</span> ${payment.currency}</div>
    </div>

    <div class="divider"></div>
    <div class="section">
      <div class="section-title">Driver Info</div>
      <div class="info-row"><span class="info-label">Name:</span> ${userDriver?.name || "N/A"}</div>
    </div>
    <div class="divider"></div>
    <div class="section">
      <div class="section-title">Customer Info</div>
      <div class="info-row"><span class="info-label">Name:</span> ${userCustomer?.name || "N/A"}</div>
    </div>
    <div class="payment-summary">
      Total Paid: R${payment.amount}
    </div>
    <span class="thanks">
     Thank you for riding with Nthome!<br>
      We hope your journey was delightful.<br>
      <span style="color:#438c8c; font-size:13px;">We look forward to seeing you again soon!</span>
    </span>
    <div class="footer">Nthome — Making every ride special for you.</div>
  </div>
</body>
</html>

  `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const fileName = `receipt_${tripId}.pdf`;
      const userId = userDriver?.id;

      if (!userId || !userDriver?.email) {
        // console.log("❌ Missing userId or customer email.");
        showToast(
          "error",
          "Receipt Error",
          "Cannot generate receipt because user information is incomplete."
        );
        return;
      }

      // Upload to Firebase Storage
      const downloadURL = await uploadReceiptToStorage(uri, fileName, userId);
      // console.log("✅ Uploaded to Firebase:", downloadURL);

      // Send to backend for email dispatch
      await axios.post(`${api}send-receipt`, {
        email: userDriver.email,
        name: userDriver.name,
        tripId,
        receiptUrl: downloadURL,
      });
      // console.log("✅ Receipt email request sent to backend.");

      // Success toast
      showToast(
        "success",
        "Receipt Sent 🎉",
        "Receipt generated and sent to your email successfully!"
      );

    } catch (error) {
      // console.error("❌ Error generating receipt:", error);
      showToast(
        "error",
        "Receipt Failed",
        "Failed to generate or send the receipt. Please try again."
      );
    } finally {
      setGeneratingReceipt(false);
    }

  };

  // Fetch trip and related data when component mounts
  // This will fetch trip details, driver details, customer details, and payment details
  useEffect(() => {
    const fetchTripAndRelatedData = async () => {
      setLoadingData(true);
      try {
        // 1. Fetch trip details using tripId
        const tripRes = await axios.get(`${api}trip/${tripId}`);
        const fetchedTrip = tripRes.data;
        setTrip(fetchedTrip);
        // console.log("Fetched Trip Data:", fetchedTrip);

        // 2. Fetch payment details using tripId
        const paymentRes = await fetchPaymentById(tripId);
        setPayment(paymentRes);
        // console.log("Fetched Payment Data:", paymentRes);

        // 3. Fetch driver details
        if (fetchedTrip?.driverId) {
          const driverData = await fetchUserById(fetchedTrip.driverId);
          setUserDriver(driverData);
          // console.log("Fetched Driver Data:", driverData);
          if (!driverData) {
            showToast("error", "Driver Not Found", "Failed to fetch driver details.");
          }
        }

        // 4. Fetch customer details
        if (fetchedTrip?.customerId) {
          const customerData = await fetchCustomerByQueryId(fetchedTrip.customerId);
          setUserCustomer(customerData);
          // console.log("Fetched Customer Data:", customerData);
          if (!customerData) {
            showToast("error", "Customer Not Found", "Failed to fetch customer details.");
          }
        }

        if (!fetchedTrip) {
          showToast("error", "Trip Not Found", "Failed to fetch trip details.");
        }
      } catch (err) {
        // console.error("Error fetching trip or related data:", err);
        showToast(
          "error",
          "Data Fetch Error",
          "Something went wrong while fetching trip details. Please try again."
        );
      } finally {
        setLoadingData(false);
      }
    };

    fetchTripAndRelatedData();
  }, [tripId]);

  // Function to fetch driver user data
  async function fetchUserById(userId) {
    try {
      const response = await fetch(api + `customer/${userId}`);
      if (!response.ok) throw new Error(`Error fetching driver: ${response.status}`);
      return await response.json();
    } catch (error) {
      // console.error("Fetch driver error:", error);
      showToast("error", "Driver Fetch Error", "Failed to fetch driver data.");
      return null;
    }
  }
  // Function to fetch customer using query parameter (?id=...)
  async function fetchCustomerByQueryId(customerId) {
    try {
      const response = await fetch(`${api}customer?id=${customerId}`);
      if (!response.ok) throw new Error(`Error fetching customer by query: ${response.status}`);
      return await response.json();
    } catch (error) {
      // console.error("Fetch customer by query error:", error);
      showToast("error", "Customer Fetch Error", "Failed to fetch customer data.");
      return null;
    }
  }


  // Function to fetch payment data
  async function fetchPaymentById(tripId) {
    try {
      const response = await fetch(api + `payment/${tripId}`);
      if (!response.ok) throw new Error(`Error fetching payment: ${response.status}`);
      return await response.json();
    } catch (error) {
      // console.error("Fetch payment error:", error);
      showToast("error", "Payment Fetch Error", "Failed to fetch payment details.");
      return null;
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
          <Text style={styles.headerTitle}>{userCustomer?.name ? `Ride with ${userCustomer?.name}` : "Ride Details"}</Text>
          <Text style={styles.headerDate}>{formatDate(trip?.requestDate)}</Text>
          {userCustomer?.carMake && (
            <Text style={styles.headerDate}>
              {userCustomer.carMake} {userCustomer.carModel} ({userCustomer.licensePlate})
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("DriverProfile")}>
          <View style={styles.profileIcon}>
            {userCustomer?.profile_picture ? (
              <Image source={{ uri: userCustomer.profile_picture }} style={styles.profileImage} />
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
          <Text style={styles.additionalInfo}>Driver Ratings: {trip?.customer_rating || "N/A"}</Text>
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
              {/* {payment?.paymentType && <Text style={styles.additionalInfo}>Payment Method: {payment.paymentType}</Text>} */}
              {payment?.payment_reference && (
                <Text style={styles.additionalInfo}>Reference: {payment.payment_reference}</Text>
              )}
              {payment?.currency && <Text style={styles.additionalInfo}>Currency: {payment.currency}</Text>}
              {payment?.paymentDate && (
                <Text style={styles.additionalInfo}>
                  Payment Date: {formatDate(payment?.paymentDate) || "N/A"}
                </Text>
              )}

              <View style={styles.paymentMethod}>
                <View style={styles.cashIndicator}>
                  <View style={styles.cashIcon}>
                    <Text style={styles.cashIconText}>R</Text>
                  </View>
                  <Text style={styles.paymentMethodText}>{payment.paymentType}</Text>
                </View>
                <Text style={styles.paymentAmount}>{trip?.total}</Text>
              </View>
            </View>
          </View>

          {/* Receipt Button */}
          <TouchableOpacity style={styles.button} onPress={generateReceipt}>
            {generatingReceipt ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0DCAF0" />
                {/* <Text style={styles.loadingText}>Generating receipt...</Text> */}
              </View>
            ) : (
              <>
                <Receipt size={20} color="#000" />
                <Text style={styles.buttonText}>Get receipt</Text>
              </>
            )}
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
