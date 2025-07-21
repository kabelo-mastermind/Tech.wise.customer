"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { View, Text, StyleSheet, ImageBackground, Animated, Dimensions, StatusBar, Image } from "react-native" // Import Image
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from "react-native-safe-area-context"

const { width, height } = Dimensions.get("window")

interface OnboardingScreenProps {
  navigation: any
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const loadingOpacity = useRef(new Animated.Value(0)).current
  const loadingRotation = useRef(new Animated.Value(0)).current
  const loadingScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Start the animation sequence
    startAnimationSequence()
  }, [])

  const startAnimationSequence = () => {
    // Logo animation - fade in and scale up
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Text animation - fade in after logo
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        // Loading animation - fade in and start rotating
        Animated.timing(loadingOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          // Start loading animations
          startLoadingAnimations()
          // Navigate after 5 seconds
          setTimeout(() => {
            navigation.replace("BookingList") // Replace with your target screen
          }, 5000)
        })
      })
    })
  }

  const startLoadingAnimations = () => {
    // Continuous rotation
    const rotationAnimation = Animated.loop(
      Animated.timing(loadingRotation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    )
    // Pulsing scale effect
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingScale, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(loadingScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    )
    rotationAnimation.start()
    pulseAnimation.start()
  }

  const rotateInterpolation = loadingRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* Background Image */}
      <ImageBackground
        source={require('../../assets/nthomeAir_images/flight.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={["rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.6)", "rgba(0, 0, 0, 0.8)"]}
          style={styles.overlay}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.content}>
              {/* Logo Section */}
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    opacity: logoOpacity,
                    transform: [{ scale: logoScale }],
                  },
                ]}
              >
                <View style={styles.logoWrapper}>
                  {/* New Logo Image */}
                  <Image
                    source={require("../../assets/logoNthome.png")} // Placeholder logo image
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.logoText}>nthomeAir</Text>
                  <View style={styles.logoAccent} />
                </View>
              </Animated.View>
              {/* Main Text Section */}
              <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
                <Text style={styles.welcomeText}>Welcome to</Text>
                <Text style={styles.brandText}>Premium Aviation</Text>
                <Text style={styles.subtitleText}>Experience luxury flight booking at your fingertips</Text>
              </Animated.View>
              {/* Loading Animation */}
              <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
                <Animated.View
                  style={[
                    styles.loadingSpinner,
                    {
                      transform: [{ rotate: rotateInterpolation }, { scale: loadingScale }],
                    },
                  ]}
                >
                  <View style={styles.spinnerRing} />
                  <View style={styles.spinnerDot} />
                </Animated.View>
                <Text style={styles.loadingText}>Preparing your journey...</Text>
              </Animated.View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 60,
  },
  logoWrapper: {
    alignItems: "center",
    position: "relative",
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
    tintColor: 'white', // 👈 This tints the image white
  },

  logoText: {
    fontSize: 42,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: 3,
    textAlign: "center",
    fontFamily: "System", // You can replace with a custom font
  },
  logoAccent: {
    width: 80,
    height: 2,
    backgroundColor: "#00B8D9",
    marginTop: 8,
    borderRadius: 1,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 80,
  },
  welcomeText: {
    fontSize: 18,
    color: "#CCCCCC",
    marginBottom: 8,
    letterSpacing: 1,
  },
  brandText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 1,
  },
  subtitleText: {
    fontSize: 16,
    color: "#AAAAAA",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: "center",
    position: "absolute",
    bottom: 100,
  },
  loadingSpinner: {
    width: 50,
    height: 50,
    marginBottom: 20,
    position: "relative",
  },
  spinnerRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "rgba(0, 184, 217, 0.3)",
    borderTopColor: "#00B8D9",
    position: "absolute",
  },
  spinnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00B8D9",
    position: "absolute",
    top: -4,
    left: 21,
  },
  loadingText: {
    fontSize: 14,
    color: "#CCCCCC",
    letterSpacing: 0.5,
  },
})

export default OnboardingScreen
