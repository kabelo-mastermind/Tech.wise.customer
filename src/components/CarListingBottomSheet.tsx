import { BlurView } from 'expo-blur';
import React, { useContext, useEffect, useState } from 'react';
import { Pressable, StyleSheet, SectionList, Image, Dimensions } from 'react-native';
import { View, Text } from 'react-native-animatable';
import { Icon } from 'react-native-elements';
import { DestinationContext } from '../contexts/contexts';
import { useSelector } from 'react-redux'; // Import useSelector
import axios from 'axios'; // Import axios for API calls
import { api } from '../../api';
import { useFocusEffect } from '@react-navigation/native';

const { height } = Dimensions.get("window");

const CarListingBottomSheet = ({ navigation, route }) => {
  const { dispatchDestination } = useContext(DestinationContext);
  const nthome_black = require('../../assets/uberGo.png');
  const nthome_x = require('../../assets/uberX.png');

  // Accessing distance and duration from the Redux store
  const distance = useSelector(state => state.location.distance);
  const duration = useSelector(state => state.location.duration);
  console.log("disstanceeeeeeeeeeeeeee:", distance, "durationssssssssssss:", duration);
  const driverId = route?.params?.driverId || null;
  // const driverId = useSelector((state) => state.trip.tripData?.driver_id || "");
  // console.log("Driver IDoooooooooooooo:", driverId);


  // State to store car data
  const [carData, setCarData] = useState([]);
  const [isBlurViewVisible, setIsBlurViewVisible] = useState(true); // State to control BlurView visibility
  // This effect manages the BlurView visibility when navigating back to RequestScreen
  useFocusEffect(
    React.useCallback(() => {
      // Ensure BlurView is shown only if not triggered to be closed earlier
      return () => {
        setIsBlurViewVisible(false); // Close BlurView when navigating away
      };
    }, [])
  );
  useEffect(() => {
    // Fetching the required data from the backend
    const fetchCarData = async () => {
      try {
        const response = await axios.get(api + 'api/car-listings');
        const fullCarData = response.data;

        setCarData(fullCarData);

        console.log("Fetched Car Data:", fullCarData);
      } catch (error) {
        console.log("Error fetching data:", error);
      }
    };

    fetchCarData();
  }, []);

  useEffect(() => {
    // Logging the distance and duration whenever they change
    if (distance !== null && duration !== null) {
      // console.log('Distance:', distance, 'km');
      // console.log('Duration:', duration, 'mins');
    }
  }, [distance, duration]);

  // Disable car selection if driverId is present
  const isCarSelectable = !driverId;
  console.log("carDatatttttttttttttttttttttttttttttttttttttttttttttttt:", carData);

  const handleItemPress = (item) => {
    if (!driverId || driverId !== item.driverId) {  // Allow selection if no driverId or if the driverId doesn't match
      navigation.goBack();
      navigation.navigate('DriverDetailsBottomSheet', {
        id: item.driverId,
        driverName: item.driverName,
        driverRating: item.driverRating,
        price: Math.round(item.costPerKm * distance),
        ETA: duration,
        driverPhoto: item.driverPhoto,
        classType: item.class,
        driverState: item.driverState || [],
        driverStatus: item.driverStatus || [],
        carData: item
      });
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={styles.overlay} />
      {isBlurViewVisible && ( // Conditionally render BlurView based on state
        <BlurView intensity={70} tint="light" style={[styles.blurView, { backgroundColor: 'white' }]}>
          {/* <Pressable onPress={() => navigation.goBack()} style={styles.cancelContainer}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable> */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>Choose Your Ride</Text>
          </View>
          <SectionList
            sections={[{ title: 'Available Cars', data: carData }]}
            keyExtractor={(item) => item.driverId.toString()}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleItemPress(item)}
                style={[
                  styles.itemContainer,
                  { opacity: driverId === item.driverId ? 0.5 : 1 } // Reduce opacity only for the matching car
                ]}
                disabled={driverId === item.driverId} // Disable only the matching car
              >
                <Image
                  source={item.driverGender === 'female'
                    ? require('../../assets/uberGo.png')
                    : require('../../assets/uberX.png')
                  }
                  style={styles.carImage}
                />

                <View style={styles.carInfo}>
                  <Text style={styles.carName}>
                    {item.class === 1 ? "nthome_black" : item.class === 2 ? "nthome_x" : "Unknown Type"}
                  </Text>
                  <Text style={styles.carNote}>{item.description}</Text>
                  <View style={styles.promotionContainer}>
                    <View style={styles.iconTextRow}>
                      <Icon
                        name="account"
                        type="material-community"
                        size={16}
                        color="gray"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={styles.promotionText}>{item.numberOfSeats}</Text>
                    </View>
                    <Text style={styles.carPrice}>R{Math.round(item.costPerKm * distance)}</Text>
                  </View>
                </View>
              </Pressable>
            )}
          />
        </BlurView>
      )}
    </View>
  );
};

export default CarListingBottomSheet;



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)', // Semi-transparent background for overlay
  },
  overlay: {
    flex: 1,
    height: '60%', // Adjust the height of the transparent area (adjust as needed)
  },
  blurView: {
    height: '40%', // Set the bottom sheet to occupy 40% of the screen height
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    padding: 20,
  },
  cancelContainer: {
    alignSelf: 'flex-end',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  headerContainer: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
    marginTop: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  carImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#f8f8f8',
    resizeMode: 'contain',
  },
  carInfo: {
    flex: 1,
  },
  carName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  carNote: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  promotionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promotionText: {
    fontSize: 14,
    color: '#ff0000',
    marginRight: 10,
  },
  carPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007BFF',
  },
});
