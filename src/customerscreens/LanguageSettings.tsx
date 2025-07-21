"use client"

import { useState } from "react"
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Dimensions } from "react-native"
import { Icon } from "react-native-elements"
import { LinearGradient } from "expo-linear-gradient"

const { width } = Dimensions.get("window")

const LanguageSettings = ({ navigation }) => {
  const [selectedLanguage, setSelectedLanguage] = useState("English")

  const languages = [
    {
      name: "English",
      code: "en",
      icon: "language",
      iconType: "material",
      nativeName: "English",
      iconColor: "#0DCAF0",
    },
    {
      name: "French",
      code: "fr",
      icon: "language",
      iconType: "material",
      nativeName: "Français",
      iconColor: "#3F51B5",
    },
    {
      name: "Spanish",
      code: "es",
      icon: "language",
      iconType: "material",
      nativeName: "Español",
      iconColor: "#FF9800",
    },
    {
      name: "German",
      code: "de",
      icon: "language",
      iconType: "material",
      nativeName: "Deutsch",
      iconColor: "#4CAF50",
    },
    {
      name: "Chinese",
      code: "zh",
      icon: "language",
      iconType: "material",
      nativeName: "中文",
      iconColor: "#F44336",
    },
  ]

  const selectLanguage = (language) => {
    setSelectedLanguage(language)
    console.log(`Selected language: ${language}`)
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FBFD" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <Icon name="arrow-back" type="material" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Icon name="translate" type="material" size={24} color="#0DCAF0" />
          <Text style={styles.infoText}>
            Select your preferred language. This will change the language throughout the app.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Select Language</Text>

        <View style={styles.languageList}>
          {languages.map((language) => (
            <TouchableOpacity
              key={language.code}
              onPress={() => selectLanguage(language.name)}
              style={[styles.languageCard, selectedLanguage === language.name && styles.selectedLanguageCard]}
              activeOpacity={0.7}
            >
              <View style={styles.languageInfo}>
                <View style={[styles.flagIconContainer, { backgroundColor: language.iconColor + "15" }]}>
                  <Icon name={language.icon} type={language.iconType} size={20} color={language.iconColor} />
                </View>
                <View style={styles.languageTextContainer}>
                  <Text style={styles.languageName}>{language.name}</Text>
                  <Text style={styles.nativeName}>{language.nativeName}</Text>
                </View>
              </View>

              <View style={[styles.radioButton, selectedLanguage === language.name && styles.selectedRadioButton]}>
                {selectedLanguage === language.name && <View style={styles.radioButtonInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.applyButton}>
          <LinearGradient
            colors={["#0DCAF0", "#0AA8CD"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.applyButtonText}>Apply Changes</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FBFD",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F7FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#0F172A",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 16,
  },
  languageList: {
    marginBottom: 24,
  },
  languageCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedLanguageCard: {
    borderWidth: 2,
    borderColor: "#0DCAF0",
    shadowColor: "#0DCAF0",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  languageInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  flagIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0F172A",
  },
  nativeName: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedRadioButton: {
    borderColor: "#0DCAF0",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0DCAF0",
  },
  applyButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default LanguageSettings
