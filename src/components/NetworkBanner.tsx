import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import NetInfo from "@react-native-community/netinfo";

const NETWORK_BANNER_HEIGHT = 44;

const NetworkBanner = () => {
  const [isConnected, setIsConnected] = useState(true);
  const heightAnim = useRef(new Animated.Value(0)).current; // height in layout
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let unsubscribe = () => {}
    if (NetInfo && typeof NetInfo.addEventListener === 'function') {
      unsubscribe = NetInfo.addEventListener((state) => {
        setIsConnected(state.isConnected ?? false);
      });
    }

    return () => { try { unsubscribe(); } catch (e) {} };
  }, []);

  useEffect(() => {
    if (isConnected) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heightAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(heightAnim, {
          toValue: NETWORK_BANNER_HEIGHT,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isConnected, heightAnim, opacityAnim]);

  return (
    <Animated.View style={[styles.banner, { height: heightAnim }]}> 
      <Animated.View style={{ flex: 1, opacity: opacityAnim, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={styles.text}>{isConnected ? "" : "No Internet Connection"}</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    backgroundColor: 'red',
    overflow: 'hidden',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default NetworkBanner;
