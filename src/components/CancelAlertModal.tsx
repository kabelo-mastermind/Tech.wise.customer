"use client"

import { useEffect, useRef } from "react"
import { Modal, View, Text, StyleSheet, Animated, Dimensions } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const { width } = Dimensions.get("window")

const CancelAlertModal = ({ visible, message, onClose }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current
    const fadeOpacity = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;


    useEffect(() => {
        if (visible) {
            // Animate in
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 300,
                    friction: 20,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true, // ✅ opacity is valid
                }),
                Animated.timing(progressAnim, {
                    toValue: 1,
                    duration: 3000, // Fill bar over 3 seconds
                    useNativeDriver: false, // ❗️width requires JS driver
                }),
            ]).start();


            // Auto-close after 3 seconds
            const timer = setTimeout(() => {
                handleClose()
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [visible])

    const handleClose = () => {
        // Animate out
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 0,
                tension: 300,
                friction: 20,
                useNativeDriver: true,
            }),
            Animated.timing(fadeOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });

    }

    return (
        <Modal transparent visible={visible} animationType="none">
            <Animated.View style={[styles.overlay, { opacity: fadeOpacity }]}>
                <Animated.View
                    style={[
                        styles.modalBox,
                        {
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name="close-circle" size={48} color="#F44336" />
                    </View>

                    <Text style={styles.title}>Trip Cancelled</Text>

                    <Text style={styles.message}>{message || "Your trip has been cancelled successfully."}</Text>

                    <View style={styles.progressBar}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ["0%", "100%"],
                                    }),
                                },
                            ]}
                        />
                    </View>

                    <Text style={styles.autoCloseText}>This message will close automatically</Text>
                </Animated.View>
            </Animated.View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    modalBox: {
        backgroundColor: "#FFFFFF",
        paddingVertical: 32,
        paddingHorizontal: 24,
        borderRadius: 20,
        maxWidth: width * 0.85,
        width: "100%",
        alignItems: "center",
        elevation: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 15,
    },
    iconContainer: {
        marginBottom: 16,
        padding: 8,
        borderRadius: 50,
        backgroundColor: "rgba(244, 67, 54, 0.1)",
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#0A2240",
        marginBottom: 12,
        textAlign: "center",
    },
    message: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 24,
    },
    progressBar: {
        width: "100%",
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        marginBottom: 12,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#0DCAF0",
        borderRadius: 2,
    },
    autoCloseText: {
        fontSize: 12,
        color: "#9CA3AF",
        textAlign: "center",
        fontStyle: "italic",
    },
})

export default CancelAlertModal
