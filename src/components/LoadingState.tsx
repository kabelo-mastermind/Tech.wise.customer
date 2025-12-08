import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Image, StyleSheet, Dimensions, Pressable } from "react-native";

const { width, height } = Dimensions.get("window");

const LoadingState = ({
  message = "Loading please wait...",
  slogan = "Nthome ka petjana!",
  buttonText = "Login",
  onButtonPress = () => {},
}) => {
  const [showButton, setShowButton] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(true);

  useEffect(() => {
    // Show button after 10 seconds
    const timer = setTimeout(() => {
      setShowButton(true);

      // After 2 seconds, stop button loading
      setTimeout(() => {
        setButtonLoading(false);
      }, 2000);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.logoWrapper}>
        {!showButton && (
          <ActivityIndicator size={100} color="#0DCAF0" style={styles.spinnerBehind} />
        )}
        <Image source={require("../../assets/nthomeLogo.png")} style={styles.logo} />
      </View>

      <Text style={styles.loadingText_slogan}>{slogan}</Text>
      <Text style={styles.loadingText}>{message}</Text>

      {showButton && (
        <Pressable
          style={[
            styles.button,
            buttonLoading && { backgroundColor: "#7DD3FC" }, // faded bg when loading
          ]}
          disabled={buttonLoading}
          onPress={onButtonPress}
        >
          {buttonLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{buttonText}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
};

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
    zIndex: 999,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
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
  button: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 25,
    backgroundColor: "#0DCAF0",
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
