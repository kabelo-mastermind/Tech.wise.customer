"use client"

import { useEffect, useState, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Animated, StatusBar, SafeAreaView } from "react-native"
import { Icon } from "react-native-elements"
import axios from "axios"
import { useNavigation, useRoute } from "@react-navigation/native"
import { api } from "../../api"
import { LinearGradient } from "expo-linear-gradient"
import { useSelector } from "react-redux"

const PaymentSuccess = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const [status, setStatus] = useState("verifying") // 'verifying' | 'success' | 'failed'

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const spinAnim = useRef(new Animated.Value(0)).current
  const tripData = useSelector((state) => state.trip?.tripData)

  // Spin animation for loading indicator
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ).start();
  
    const verifyPayment = async () => {
      const reference = route.params?.reference;
      const tripId = route.params?.tripId;
      const userId = route.params?.userId; // <-- Ensure userId is passed via params
  
      if (!reference || !tripId || !userId) {
        setStatus("failed");
        return;
      }
  
      try {
        const res = await axios.get(
          `${api}/verify-payment/${reference}?tripId=${tripId}`
        );
  
        if (res.data.status === "success") {
          setStatus("success");
          const data = res.data.data;
          const auth = data.authorization;
          const customer = data.customer;
  
          // Save payment details
          const paymentRes = await axios.post(`${api}/save-payment`, {
            tripId,
            paymentType: "Credit Card",
            amount: data.amount / 100,
            paymentDate: data.paid_at,
            payment_reference: data.reference,
            payment_status: data.status,
            currency: data.currency,
            paymentId: tripData.payment_id,
          });
          
          const paymentId = paymentRes.data.payment_id;
          
  
          // Save card details
          await axios.post(`${api}/customer-payment`, {
            card_number: auth.last4,
            card_type: auth.card_type,
            bank_code: auth.bank,
            country_code: auth.country_code,
            user_id: userId,
            customer_code: customer.customer_code,
            is_selected: true,
            is_default: true,
            payment_id: paymentId,
            created_at: data.created_at,
            authorization_code: auth.authorization_code
          });
          
  
          console.log("Payment & Card details saved successfully", auth.authorization_code); 
  
          setTimeout(() => {
            navigation.navigate("DestinationScreen", {
              paymentStatus: "success",
              paymentReference: reference,
            });
          }, 3000);
        } else {
          setStatus("failed");
        }
      } catch (err) {
        console.error("Verification error:", err);
        setStatus("failed");
      }
    };
  
    verifyPayment();
  }, []);
  
  const handleContinue = () => {
    navigation.navigate("DestinationScreen", {
      paymentStatus: status === "success" ? "success" : "failed",
      paymentReference: route.params?.reference,
    })
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />
      <LinearGradient colors={["#0DCAF0", "#0AA8CD"]} style={styles.background}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {status === "verifying" ? (
            <View style={styles.contentContainer}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Icon name="refresh" type="material" size={60} color="#0DCAF0" />
              </Animated.View>
              <Text style={styles.title}>Verifying Payment</Text>
              <Text style={styles.subtitle}>Please wait while we confirm your transaction...</Text>
            </View>
          ) : status === "success" ? (
            <View style={styles.contentContainer}>
              <View style={styles.iconCircle}>
                <Icon name="check" type="material" size={50} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>Payment Successful!</Text>
              <Text style={styles.subtitle}>Your transaction has been completed successfully.</Text>
              <Text style={styles.redirectText}>Redirecting to your trip...</Text>
              <TouchableOpacity style={styles.button} onPress={handleContinue}>
                <Text style={styles.buttonText}>Continue to Trip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contentContainer}>
              <View style={[styles.iconCircle, styles.errorCircle]}>
                <Icon name="close" type="material" size={50} color="#FFFFFF" />
              </View>
              <Text style={[styles.title, styles.errorTitle]}>Payment Failed</Text>
              <Text style={styles.subtitle}>We couldn't process your payment. Please try again.</Text>
              <TouchableOpacity style={[styles.button, styles.errorButton]} onPress={handleContinue}>
                <Text style={styles.buttonText}>Return to Trip</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#0DCAF0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorCircle: {
    backgroundColor: "#EF4444",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  errorTitle: {
    color: "#EF4444",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  redirectText: {
    fontSize: 14,
    color: "#0DCAF0",
    fontStyle: "italic",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginTop: 10,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  errorButton: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default PaymentSuccess
