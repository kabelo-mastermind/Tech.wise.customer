import React, { useRef } from 'react';
import { StyleSheet, Pressable, View, Text, TouchableOpacity } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Icon } from 'react-native-elements';

const DriverCommunicationBottomSheet = ({ navigation }) => {
  const sheetRef = useRef(null);
  const snapPoints = ['20%']; // Example snap points, adjust as needed

  const handleChatPress = () => {
    navigation.navigate('CustomerChat'); // Navigate to DriverChat screen
  };

  return (
    <View style={styles.container}>
      {/* Overlay to close Bottom Sheet */}
      <Pressable onPress={() => navigation.goBack()} style={styles.overlay} />
      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0} // Initial snap point
        enablePanDownToClose={false}
        onClose={() => navigation.goBack()}
        style={styles.bottomSheet}
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Driver Communication</Text>
        </View>

        {/* Icons for Chat, Call, and Safety */}
        <View style={styles.iconContainer}>
          {/* Chat Icon */}
          <TouchableOpacity style={styles.iconCircle} onPress={handleChatPress}>
            <Icon name="chat" type="material" size={30} color="#fff" />
          </TouchableOpacity>

          {/* Call Icon */}
          <TouchableOpacity style={styles.iconCircle}>
            <Icon name="call" type="material" size={30} color="#fff" />
          </TouchableOpacity>

          {/* Safety Icon */}
          <TouchableOpacity style={styles.iconCircle}>
            <Icon name="shield" type="material" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent overlay
  },
  overlay: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007aff', // Custom color for icons
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DriverCommunicationBottomSheet;

