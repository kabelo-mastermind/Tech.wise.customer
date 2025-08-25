import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BaseToastProps } from "react-native-toast-message";

export const toastConfig = {
  success: ({ text1, text2 }: BaseToastProps) => (
    <View style={[styles.toast, { borderLeftColor: "#4CAF50" }]}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.message}>{text2}</Text> : null}
    </View>
  ),
  error: ({ text1, text2 }: BaseToastProps) => (
    <View style={[styles.toast, { borderLeftColor: "#F44336" }]}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.message}>{text2}</Text> : null}
    </View>
  ),
  info: ({ text1, text2 }: BaseToastProps) => (
    <View style={[styles.toast, { borderLeftColor: "#2196F3" }]}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.message}>{text2}</Text> : null}
    </View>
  ),
};

const styles = StyleSheet.create({
  toast: {
    height: 70,
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    marginTop: 10,
    borderLeftWidth: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5, // for Android shadow
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
  },
  message: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
