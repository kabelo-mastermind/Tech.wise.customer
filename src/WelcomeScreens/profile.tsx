import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

const TripHistory = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('completed');

  const completedTripsDetails = [
    {
      name: "John Doe",
      pickupLocation: "123 Main St",
      dropoffLocation: "456 Elm St",
      cost: 75,
      minutes: 25,
      date: "2025-01-15",
      time: "10:00 AM",
    },
    {
      name: "Jane Smith",
      pickupLocation: "789 Oak Ave",
      dropoffLocation: "101 Pine Rd",
      cost: 50,
      minutes: 18,
      date: "2025-01-14",
      time: "2:30 PM",
    },
  ];

  const cancelledTripsDetails = [
    {
      name: "Mark Johnson",
      pickupLocation: "123 Maple Dr",
      dropoffLocation: "789 Birch Ln",
      cost: 0,
      minutes: 0,
      date: "2025-01-10",
      time: "9:00 AM",
    },
  ];

  const navigateToDetails = (trip) => {
    navigation.navigate('TripDetails', { trip }); // Pass the selected trip as a parameter
  };

  const trips = activeTab === 'completed' ? completedTripsDetails : cancelledTripsDetails;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Tabs for Completed and Cancelled Trips */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          onPress={() => setActiveTab('completed')}
          style={[styles.tabButton, activeTab === 'completed' && styles.activeTab]}
        >
          <Text style={styles.tabText}>Completed Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('cancelled')}
          style={[styles.tabButton, activeTab === 'cancelled' && styles.activeTab]}
        >
          <Text style={styles.tabText}>Cancelled Trips</Text>
        </TouchableOpacity>
      </View>

      {/* List of trips */}
      <View style={styles.tripsContainer}>
        {trips.map((trip, index) => (
          <TouchableOpacity
            key={index}
            style={styles.tripButton}
            onPress={() => navigateToDetails(trip)}
          >
            <Text style={styles.tripButtonText}>
              {trip.pickupLocation} to {trip.dropoffLocation}, R{trip.cost.toFixed(2)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  tabHeader: {
    backgroundColor: '#000',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 15,
  },
  tabButton: {
    padding: 10,
    borderRadius: 5,
    borderColor: '#ddd',
    marginHorizontal: 10,
  },
  activeTab: {
    backgroundColor: '#444',
  },
  tabText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  tripsContainer: { padding: 20 },
  tripButton: {
    padding: 15,
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 10,
  },
  tripButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default TripHistory;
