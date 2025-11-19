import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

const PaymentSuccess = ({ route, navigation }) => {
  const { success, message, reference } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{success ? "Card Saved!" : "Oops!"}</Text>
      <Text style={styles.message}>{message}</Text>
      {reference && <Text style={styles.ref}>Reference: {reference}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("PaymentMethodsScreen")} // Navigate to cards list
      >
        <Text style={styles.buttonText}>Go to My Cards</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10, color: "#28a745" },
  message: { fontSize: 16, marginBottom: 20, textAlign: "center" },
  ref: { fontSize: 14, marginBottom: 30, color: "#555" },
  button: { backgroundColor: "#28a745", padding: 15, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default PaymentSuccess;
