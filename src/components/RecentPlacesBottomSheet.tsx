import { BlurView } from 'expo-blur';
import React, { useState, useContext } from 'react';
import { Pressable, StyleSheet, FlatList } from 'react-native';
import { View, Text } from 'react-native-animatable';
import { rideData } from '../global/data';
import { Icon } from 'react-native-elements';
import { DestinationContext } from '../contexts/contexts';
import { SafeAreaView } from 'react-native-safe-area-context';

const RecentPlacesBottomSheet = ({ navigation }) => {
  const { dispatchDestination } = useContext(DestinationContext); // Extract dispatch from context

  // Handle item selection and update context
  const handleItemPress = (item) => {
    const { latitude, longitude } = item.destination;
    // Update user destination in context
    dispatchDestination({ type: 'ADD_DESTINATION', payload: { latitude, longitude } });

    // Log the pressed item
    console.log('recent pressed', item);

    // Navigate back or handle additional logic as needed
    navigation.navigate('CarListingBottomSheet');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Pressable onPress={() => navigation.goBack()} style={{ flex: 1 }}>
        {/* This can be left empty for dismissing the sheet */}
      </Pressable>
      <BlurView
        experimentalBlurMethod="dimezisBlurView"
        intensity={90}
        tint="default"
        style={[styles.blurView, { backgroundColor: 'rgba(255, 255, 255, 0.8)' }]} // Set background color to white with some transparency
      >
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Recent Places</Text>
        </View>
        {/* FlatList for rendering the ride data */}
        <FlatList
          data={rideData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => handleItemPress(item)} style={styles.itemContainer}>
              <Icon
                name="location-on"
                type="material"
                color="#007aff"
                size={24}
                style={styles.icon}
              />
              <View style={styles.placeInfo}>
                <Text style={styles.streetText}>{item.street}</Text>
                <Text style={styles.areaText}>{item.area}</Text>
              </View>
            </Pressable>
          )}
          contentContainerStyle={styles.flatListContainer} // Ensure content has some padding
        />
      </BlurView>
    </SafeAreaView>
  );
};

export default RecentPlacesBottomSheet;

const styles = StyleSheet.create({
  blurView: {
    flex: 1, // Take up full available height
    width: '100%',
    position: 'absolute',
    bottom: 0,
    padding: 16,
    height: '30%', // Set the bottom sheet to occupy 50% of the screen height
    // borderTopLeftRadius: 50,
  },
  cancelText: {
    color: '#007aff',
    fontSize: 17,
  },
  headerContainer: {
    paddingTop: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  icon: {
    marginRight: 10,
  },
  placeInfo: {
    flex: 1,
  },
  streetText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  areaText: {
    fontSize: 14,
    color: 'gray',
  },
  flatListContainer: {
    paddingBottom: 100, // Extra space to avoid clipping at the bottom
  },
});
