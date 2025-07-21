import type React from "react"
import { useEffect } from "react"
import { View, Text, StyleSheet, Dimensions } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated"

const { width } = Dimensions.get("window")

interface ServiceCardProps {
  title: string
  description: string
  isComingSoon: boolean
}

const ServiceCard: React.FC<ServiceCardProps> = ({ title, description, isComingSoon }) => {
  const translateY = useSharedValue(0)

  useEffect(() => {
    if (isComingSoon) {
      translateY.value = withRepeat(withTiming(5, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true)
    }
  }, [isComingSoon])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    }
  })

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
      {isComingSoon && (
        <Animated.View style={[styles.comingSoonContainer, animatedStyle]}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255, 255, 255, 10)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    width: width - 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  cardDescription: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
  comingSoonContainer: {
    backgroundColor: "black",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
  },
  comingSoonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
})

export default ServiceCard

