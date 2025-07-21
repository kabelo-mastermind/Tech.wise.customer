import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CommunicationPreferences = () => {
  const [preferences, setPreferences] = useState({
    email: true,
    sms: false,
    pushNotifications: true,
  });

  const togglePreference = (type) => {
    setPreferences((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Communication Preferences</Text>

        {Object.entries(preferences).map(([key, value]) => (
          <TouchableOpacity
            key={key}
            onPress={() => togglePreference(key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fff',
              padding: 15,
              marginBottom: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#ddd',
            }}
          >
            <Text style={{ fontSize: 18, color: '#333', textTransform: 'capitalize' }}>{key}</Text>
            <Icon
              name={value ? 'check-box' : 'check-box-outline-blank'}
              size={24}
              color={value ? '#008B8B' : '#757575'}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CommunicationPreferences;
