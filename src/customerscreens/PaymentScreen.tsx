"use client"

import { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native"
import { Icon } from "react-native-elements"
import { WebView } from "react-native-webview"
import axios from "axios"
import { PAYSTACK_PUBLIC_KEY } from "@env"
import { api } from "../../api"
import { LinearGradient } from "expo-linear-gradient"

const PaymentScreen = ({ navigation, route }) => {
  const {
    customerCode,
    tripAmount,
    userEmail,
    tripId,
    userId,
    driverName,
    tripDistance,
    tripDuration,
  } = route.params || {}

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Validate required data
    if (!customerCode || !tripAmount || tripAmount <= 0) {
      setError("Invalid payment information. Please try again.")
      setIsLoading(false)
    } else {
      // Short timeout to show loading state
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [customerCode, tripAmount])

  const handlePaymentSuccess = async (res) => {
    console.log("Payment successful", res)

    try {
      await axios.post(`${api}trips/${tripId}/payment`, {
        payment_reference: res.reference,
        amount: tripAmount / 100,
        status: "success",
        user_id: userId,
      })

      // Navigate back to destination screen with success status
      navigation.navigate("DestinationScreen", {
        paymentStatus: "success",
        paymentReference: res.reference
      })
    } catch (error) {
      console.error("Error recording payment:", error)
      // Still navigate back but with error status
      navigation.navigate("DestinationScreen", {
        paymentStatus: "error",
        paymentError: "Failed to record payment"
      })
    }
  }

  const handlePaymentCancel = (e) => {
    console.log("Payment cancelled", e)
    // Navigate back to destination screen with cancelled status
    navigation.navigate("DestinationScreen", { paymentStatus: "cancelled" })
  }

  const handleGoBack = () => {
    navigation.navigate("DestinationScreen", { paymentStatus: "cancelled" })
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />
        <LinearGradient colors={["#0DCAF0", "#0AA8CD"]} style={styles.header}>
          <Text style={styles.headerTitle}>Payment</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0DCAF0" />
          <Text style={styles.loadingText}>Preparing payment...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />
        <LinearGradient colors={["#0DCAF0", "#0AA8CD"]} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-back" type="material" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.placeholder} />
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" type="material" size={60} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleGoBack}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />

      <LinearGradient colors={["#0DCAF0", "#0AA8CD"]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Icon name="arrow-back" type="material" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <View style={styles.paymentDetailsContainer}>
        <Text style={styles.paymentTitle}>Trip Payment</Text>

        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Amount:</Text>
          <Text style={styles.amountValue}>₦{tripAmount / 100}</Text>
        </View>

        {tripDistance && (
          <View style={styles.detailRow}>
            <Icon name="straighten" type="material" size={20} color="#0DCAF0" />
            <Text style={styles.detailLabel}>Distance:</Text>
            <Text style={styles.detailValue}>{tripDistance}</Text>
          </View>
        )}

        {tripDuration && (
          <View style={styles.detailRow}>
            <Icon name="access-time" type="material" size={20} color="#0DCAF0" />
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>{tripDuration}</Text>
          </View>
        )}

        {driverName && (
          <View style={styles.detailRow}>
            <Icon name="person" type="material" size={20} color="#0DCAF0" />
            <Text style={styles.detailLabel}>Driver:</Text>
            <Text style={styles.detailValue}>{driverName}</Text>
          </View>
        )}
      </View>

      <View style={styles.paystackContainer}>
        <WebView
          source={{
            uri: `https://paystack.com/pay/YOUR_CUSTOM_PAYMENT_PAGE`, // or generate via backend
          }}
          onNavigationStateChange={(navState) => {
            if (navState.url.includes("payment/success")) {
              handlePaymentSuccess({ reference: "from-url-or-query" })
            } else if (navState.url.includes("payment/cancel")) {
              handlePaymentCancel()
            }
          }}
          startInLoadingState
          javaScriptEnabled
          style={{ flex: 1 }}
        />


      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  paymentDetailsContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
    textAlign: "center",
  },
  amountContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  amountLabel: {
    fontSize: 18,
    color: "#64748B",
    marginRight: 8,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0DCAF0",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 8,
    width: 70,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
    flex: 1,
  },
  paystackContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
})

export default PaymentScreen
