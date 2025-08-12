import React from "react"
import { View, Text, ActivityIndicator, Image, StyleSheet } from "react-native"

const LoadingState = () => (
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
        <Text style={styles.loadingText_slogan}>{"Nthome ka petjana!"}</Text>
        <Text style={styles.loadingText}>{"Loading stats..."}</Text>
    </View>
)

export default LoadingState

const styles = StyleSheet.create({
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
    }
})
