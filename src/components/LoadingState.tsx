import React from "react";
import { View, Text, ActivityIndicator, Image, StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const LoadingState = ({ message = "Loading please wait...", slogan = "Nthome ka petjana!" }) => (
  <View style={styles.loadingContainer}>
    <View style={styles.logoWrapper}>
      <ActivityIndicator
        size={100}
        color="#0DCAF0"
        style={styles.spinnerBehind}
      />
      <Image
        source={require('../../assets/nthomeLogo.png')}
        style={styles.logo}
      />
    </View>
    <Text style={styles.loadingText_slogan}>{slogan}</Text>
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

export default LoadingState;

const styles = StyleSheet.create({
  loadingContainer: {
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 999, // ensures it overlays content
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4B5563",
  },
  loadingText_slogan: {
    marginTop: 12,
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
});
