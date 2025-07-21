import React from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet } from 'react-native';

const PrivacySettings = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.title}>Privacy Settings</Text>

        <View style={styles.settingItem}>
          <Text style={styles.settingText}>- Manage your data preferences</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>- Review your data sharing agreements</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>- Configure app permissions</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>- Delete your account</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  settingItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2, // For Android shadow
  },
  settingText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
});

export default PrivacySettings;
