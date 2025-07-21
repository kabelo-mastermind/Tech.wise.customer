import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Make sure to install expo/vector-icons if not already installed

const { width } = Dimensions.get('window');

const TripCancellationModal = ({ isVisible, onClose, onCancel }) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState("");

  const cancellationReasons = [
    "Driver is taking too long",
    "I no longer need a ride",
    "Plans have changed",
    "Booked another ride elsewhere",
    "Other",
  ];


  const handleCancel = () => {
    if (selectedReason) {
      // If "Other" is selected and there's a custom reason, use it
      const reasonToSend = selectedReason === "Other" ? customReason : selectedReason;

      if (reasonToSend) {
        onCancel(reasonToSend); // Pass the reason to the parent
        onClose(); // Close the modal after cancellation
      } else {
        alert("Please provide a reason for cancellation.");
      }
    } else {
      alert("Please select a reason for cancellation.");
    }
  };

  const renderReasonItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.reasonItem,
        selectedReason === item && styles.selectedReasonItem
      ]}
      onPress={() => {
        setSelectedReason(item);
        if (item !== "Other") {
          setCustomReason(""); // Clear custom reason if a predefined option is selected
        }
      }}
    >
      <View style={styles.reasonContent}>
        <Text style={[
          styles.reasonText,
          selectedReason === item && styles.selectedReasonText
        ]}>
          {item}
        </Text>
        {selectedReason === item && (
          <Ionicons name="checkmark-circle" size={24} color="#0DCAF0" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal transparent={true} visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.headerBar}>
            <View style={styles.headerHandle} />
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.title}>Why are you cancelling the trip?</Text>
            <Text style={styles.subtitle}>Please select a reason below</Text>

            <FlatList
              data={cancellationReasons}
              renderItem={renderReasonItem}
              keyExtractor={(item, index) => index.toString()}
              style={styles.reasonsList}
              showsVerticalScrollIndicator={false}
            />

            {/* Show custom input if "Other" is selected */}
            {selectedReason === "Other" && (
              <View style={styles.customReasonContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Please specify your reason"
                  placeholderTextColor="#94A3B8"
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Keep Trip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedReason && styles.disabledButton
                ]}
                onPress={handleCancel}
                disabled={!selectedReason}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>Cancel Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  headerBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
  },
  contentContainer: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
  },
  reasonsList: {
    marginBottom: 16,
  },
  reasonItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  selectedReasonItem: {
    borderColor: '#0DCAF0',
    backgroundColor: 'rgba(13, 202, 240, 0.08)',
  },
  reasonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  selectedReasonText: {
    color: '#0DCAF0',
    fontWeight: '600',
  },
  customReasonContainer: {
    marginBottom: 24,
  },
  input: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    fontSize: 16,
    color: '#334155',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#0DCAF0',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#0DCAF0',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0DCAF0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0DCAF0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TripCancellationModal;