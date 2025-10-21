"use client"

import { useState, useEffect, useCallback, memo } from "react"
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Icon } from "react-native-elements"
import * as ImagePicker from "expo-image-picker"
import { api } from "../../api"
import axios from "axios"
import { useSelector } from "react-redux"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { storage } from "../../firebase"
import CustomDrawer from "../components/CustomDrawer"
import LoadingState from "../components/LoadingState"
import { showToast } from "../constants/showToast"

// Memoized components to prevent unnecessary re-renders
const ProfileHeader = memo(({ customerData, uploadingImage, pickImage, formData, isProfileComplete }) => (
  <View style={styles.profileHeader}>
    <View style={styles.profileImageContainer}>
      {uploadingImage ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      ) : (
        <Image
          source={
            customerData?.profile_picture
              ? { uri: customerData.profile_picture }
              : require("../../assets/placeholder.jpg")
          }
          style={styles.profileImage}
        />
      )}

      <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
        <Icon name="camera-alt" type="material" size={18} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Active</Text>
      </View>
    </View>

    <Text style={styles.profileName}>
      {customerData?.name} {customerData?.lastName}
    </Text>

    <View style={styles.contactInfo}>
      <View style={styles.contactItem}>
        <Icon name="email" type="material" size={18} color="#FFFFFF" style={styles.contactIcon} />
        <Text style={styles.contactText}>{customerData?.email}</Text>
      </View>
      <View style={styles.contactItem}>
        <Icon name="phone" type="material" size={18} color="#FFFFFF" style={styles.contactIcon} />
        <Text style={styles.contactText}>{customerData?.phoneNumber || "Not provided"}</Text>
      </View>
    </View>

    <View style={styles.completenessContainer}>
      <Text style={styles.completenessTitle}>Profile Completeness</Text>
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${isProfileComplete().complete
                ? 100
                : Math.max(
                  25,
                  Object.values({
                    name: formData.name,
                    lastName: formData.lastName,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                  }).filter(Boolean).length * 25,
                )
                }%`,
            },
          ]}
        />
      </View>
      {!isProfileComplete().complete && (
        <Text style={styles.completenessWarning}>
          Please complete your personal information to enable payment processing
        </Text>
      )}
    </View>
  </View>
))

const InfoRow = memo(({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value || "Not provided"}</Text>
  </View>
))

const FormGroup = memo(({ label, value, onChangeText, placeholder, keyboardType, multiline, autoCapitalize }) => (
  <View style={styles.formGroup}>
    <Text style={styles.formLabel}>{label}</Text>
    <TextInput
      style={[styles.formInput, multiline && { minHeight: 80 }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      multiline={multiline}
      autoCapitalize={autoCapitalize}
    />
  </View>
))

const GenderSelector = memo(({ selectedGender, onSelect }) => (
  <View style={styles.genderOptions}>
    {["Male", "Female", "Other"].map((gender) => (
      <TouchableOpacity
        key={gender}
        style={[styles.genderOption, selectedGender === gender && styles.selectedGenderOption]}
        onPress={() => onSelect(gender)}
      >
        <Text style={[styles.genderOptionText, selectedGender === gender && styles.selectedGenderOptionText]}>
          {gender}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
))

const CardButton = memo(({ title, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.cardButton, disabled && styles.disabledButton]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.cardButtonText}>{title}</Text>
    <Icon name="chevron-right" type="material" size={16} color="#FFFFFF" />
  </TouchableOpacity>
))

const CustomerProfile = ({ navigation }) => {
  const [customerData, setCustomerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [totalCompletedTrips, setTotalCompletedTrips] = useState(0)
  const [customerCode, setCustomerCode] = useState(null)

  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), [])
  const user = useSelector((state) => state.auth?.user)
  const user_id = user?.user_id
  const username = user?.name

  // Form fields for editing
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    current_address: "",
    gender: "",
  })
// Add timeout to prevent infinite loading
useEffect(() => {
  const loadingTimer = setTimeout(() => {
    if (loading) {
      console.log('Loading timeout reached - forcing stop')
      setLoading(false)
      setError('Loading timeout - please check your connection')
    }
  }, 10000) // 10 second timeout

  return () => clearTimeout(loadingTimer)
}, [loading])

  // Fetch user data from db
  useEffect(() => {
    if (!user_id) return;

    const fetchCustomer = async () => {
      setLoading(true);
      try {
        const res = await axios.get(api + `customer/${user_id}`);
        setCustomerData(res.data);

        // Check if customer code exists
        if (res.data.customer_code) {
          setCustomerCode(res.data.customer_code);
        }

        // Initialize form data with fetched data
        setFormData({
          name: res.data.name || "",
          lastName: res.data.lastName || "",
          email: res.data.email || "",
          phoneNumber: res.data.phoneNumber || "",
          address: res.data.address || "",
          current_address: res.data.current_address || "",
          gender: res.data.gender || "",
        });
      } catch (err) {
        // console.error("Error fetching customer:", err);
        showToast("error", "Fetch failed", "Failed to fetch customer details.");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [user_id]);

  // Fetch total trip history
  useEffect(() => {
    if (!user_id) return;

    const fetchTrips = async () => {
      try {
        const res = await axios.get(api + `tripHistory/${user_id}`, {
          params: { status: "completed" },
        });
        setTotalCompletedTrips(res.data.length);
      } catch (err) {
        console.error("Error fetching trips:", err);
        showToast(
          "error",
          "Fetch Failed",
          "We couldn't load your trip history. Please try again later."
        );
      }
    };

    fetchTrips();
  }, [user_id]);


  // Handle image picking
  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        showToast("info", "Permission Denied", "Camera roll access is required to change your profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      // console.error("Error picking image:", error);
      showToast("error", "Image Error", "Failed to pick image. Please try again.");
    }
  }, [user_id, username]);

  // Upload profile image
  const uploadProfileImage = useCallback(
    async (imageUri) => {
      try {
        setUploadingImage(true);

        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1] : "jpg";

        const folderPath = `profile_pictures/${username}_${user_id}`;
        const storageRef = ref(storage, `${folderPath}/${filename}`);

        const response = await fetch(imageUri);
        const blob = await response.blob();

        const uploadTask = uploadBytesResumable(storageRef, blob);

        uploadTask.on(
          "state_changed",
          null,
          (error) => {
            // console.error("Upload error:", error);
            showToast("error", "Upload Failed", "Failed to upload profile picture.");
            setUploadingImage(false);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            const res = await axios.post(`${api}update-profile-picture`, {
              profile_picture: downloadURL,
              user_id,
            });

            if (res.status === 200) {
              setCustomerData((prev) => ({
                ...prev,
                profile_picture: downloadURL,
              }));
              showToast("success", "Profile Updated", "Profile picture updated successfully!");
            } else {
              showToast("error", "Update Failed", "Failed to update profile picture in database.");
            }

            setUploadingImage(false);
          },
        );
      } catch (error) {
        // console.error("Upload error:", error);
        showToast("error", "Error", "Something went wrong while uploading the image.");
        setUploadingImage(false);
      }
    },
    [user_id, username],
  );

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    if (editMode) {
      // If exiting edit mode without saving, reset form data to original values
      setFormData({
        name: customerData?.name || "",
        lastName: customerData?.lastName || "",
        email: customerData?.email || "",
        phoneNumber: customerData?.phoneNumber || "",
        address: customerData?.address || "",
        current_address: customerData?.current_address || "",
        gender: customerData?.gender || "",
      })
    }
    setEditMode(!editMode)
  }, [editMode, customerData])

  // Function to check if profile is complete
  const isProfileComplete = useCallback(() => {
    const requiredFields = {
      "First Name": formData.name,
      "Last Name": formData.lastName,
      Email: formData.email,
      "Phone Number": formData.phoneNumber,
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || value.trim() === "")
      .map(([key]) => key)

    return { complete: missingFields.length === 0, missingFields }
  }, [formData])

  // Function to handle customer creation in Paystack
  const handleCustomerCreation = useCallback(async () => {
    if (!formData.email || !formData.name || !formData.lastName || !formData.phoneNumber) {
      showToast("error", "Incomplete Form", "Please complete the form before creating the customer.");
      return null;
    }

    const payload = {
      email: formData.email,
      first_name: formData.name,
      last_name: formData.lastName,
      phone: formData.phoneNumber,
      user_id: user_id,
    };

    try {
      const response = await axios.post(api + "create-customer", payload);

      if (response.status === 200) {
        const customerData = response.data.data;
        showToast("success", "Customer Created", "Payment profile created successfully!");
        return customerData?.customer_code;
      } else {
        // console.error("Error creating customer:", response.data);
        showToast("error", "Creation Failed", "Failed to create customer.");
        return null;
      }
    } catch (error) {
      // console.error("Error creating customer:", error.response?.data || error);
      showToast("error", "Error", "Something went wrong while creating the customer.");
      return null;
    }
  }, [formData, user_id]);

  // Save all profile changes
  const saveAllChanges = useCallback(async () => {
    const requiredFields = {
      "First Name": formData.name,
      "Last Name": formData.lastName,
      Email: formData.email,
      "Phone Number": formData.phoneNumber,
      Address: formData.address,
      "Current Address": formData.current_address,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || value.trim() === "")
      .map(([key]) => key);

    if (missingFields.length > 0) {
      showToast(
        "info",
        "Incomplete Information",
        `Please fill the following fields:\n${missingFields.join(", ")}`
      );
      return;
    }

    setIsSaving(true);
    try {
      const newCustomerCode = await handleCustomerCreation();

      if (!newCustomerCode) {
        showToast("error", "Profile Update Failed", "Failed to create payment profile. Please try again.");
        setIsSaving(false);
        return;
      }

      const response = await axios.put(api + "update-customer", {
        ...formData,
        user_id,
        customer_code: newCustomerCode,
      });

      if (response.status === 200) {
        setCustomerData((prev) => ({
          ...prev,
          ...formData,
          customer_code: newCustomerCode,
        }));
        showToast("success", "Profile Updated", "Profile updated successfully!");
        setEditMode(false);
      } else {
        showToast("error", "Update Failed", "Failed to update profile.");
      }
    } catch (error) {
      // console.error("Error updating profile:", error);
      showToast("error", "Update Failed", "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [formData, user_id, handleCustomerCreation]);

  // Handle form input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="error-outline" type="material" size={60} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.roundButton}>
          <Icon type="material-community" name="menu" color="#0DCAF0" size={30} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={toggleEditMode} style={styles.editButton}>
          <Icon name={editMode ? "check" : "edit"} type="material" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      >
        {/* Profile Header */}
        <ProfileHeader
          customerData={customerData}
          uploadingImage={uploadingImage}
          pickImage={pickImage}
          formData={formData}
          isProfileComplete={isProfileComplete}
        />

        {/* Personal Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="person-outline" type="material" size={24} color="#0DCAF0" />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>

          <View style={styles.cardContent}>
            {editMode ? (
              // Edit mode form
              <>
                <FormGroup
                  label="First Name"
                  value={formData.name}
                  onChangeText={(text) => handleInputChange("name", text)}
                  placeholder="Enter your first name"
                />

                <FormGroup
                  label="Last Name"
                  value={formData.lastName}
                  onChangeText={(text) => handleInputChange("lastName", text)}
                  placeholder="Enter your last name"
                />

                <FormGroup
                  label="Email"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange("email", text)}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <FormGroup
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChangeText={(text) => handleInputChange("phoneNumber", text)}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Gender</Text>
                  <GenderSelector
                    selectedGender={formData.gender}
                    onSelect={(gender) => handleInputChange("gender", gender)}
                  />
                </View>
              </>
            ) : (
              // View mode
              <>
                <InfoRow label="First Name" value={customerData?.name} />
                <InfoRow label="Last Name" value={customerData?.lastName} />
                <InfoRow label="Email" value={customerData?.email} />
                <InfoRow label="Phone" value={customerData?.phoneNumber} />
                <InfoRow label="Gender" value={customerData?.gender} />
              </>
            )}
          </View>



          {/* Address Information */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="location-on" type="material" size={24} color="#0DCAF0" />
              <Text style={styles.cardTitle}>Address Information</Text>
            </View>

            <View style={styles.cardContent}>
              {editMode ? (
                <>
                  <FormGroup
                    label="Permanent Address"
                    value={formData.address}
                    onChangeText={(text) => handleInputChange("address", text)}
                    placeholder="Enter your permanent address"
                    multiline={true}
                  />

                  <FormGroup
                    label="Current Address"
                    value={formData.current_address}
                    onChangeText={(text) => handleInputChange("current_address", text)}
                    placeholder="Enter your current address"
                    multiline={true}
                  />
                </>
              ) : (
                <>
                  <InfoRow label="Permanent" value={customerData?.address} />
                  <InfoRow label="Current" value={customerData?.current_address} />
                </>
              )}
            </View>
          </View>
          {editMode && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveAllChanges}
              disabled={isSaving || isCreatingCustomer}
            >
              {isSaving || isCreatingCustomer ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="save" type="material" size={18} color="#FFFFFF" style={styles.saveIcon} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        {/* Payment Methods */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="credit-card" type="material" size={24} color="#0DCAF0" />
            <Text style={styles.cardTitle}>Payment Methods</Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardDescription}>Manage your payment methods for rides.</Text>
          </View>

          <CardButton
            title="View Payment Methods"
            onPress={() => {
              if (!isProfileComplete().complete) {
                Alert.alert(
                  "Complete Profile Required",
                  "Please fill in all required fields (First Name, Last Name, Email, Phone Number) before accessing payment methods.",
                  [{ text: "OK" }],
                )
                return
              }
              navigation.navigate("PaymentMethodsScreen")
            }}
            disabled={!isProfileComplete().complete}
          />
        </View>

        {/* Trip History */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="history" type="material" size={24} color="#0DCAF0" />
            <Text style={styles.cardTitle}>Trip History</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalCompletedTrips || 0}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </View>
          </View>

          <CardButton title="View Trip History" onPress={() => navigation.navigate("TripHistory")} />
        </View>

        {/* Language Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="language" type="material" size={24} color="#0DCAF0" />
            <Text style={styles.cardTitle}>Language Settings</Text>
          </View>

          <View style={styles.cardContent}>
            <InfoRow label="Language" value="English" />
          </View>

          <CardButton title="Change Language" onPress={() => navigation.navigate("LanguageSettings")} />
        </View>

        {/* Logout Section */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate("LogoutPage")}>
          <Icon name="logout" type="material" size={20} color="#FFFFFF" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {drawerOpen && <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  // loadingContainer: {
  //   flex: 1,
  //   justifyContent: "center",
  //   alignItems: "center",
  //   backgroundColor: "#F8FAFC",
  // },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#0DCAF0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  roundButton: {
    backgroundColor: "#fff",
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: "#0DCAF0",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    elevation: 4,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  uploadingContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#0AA8CD",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  statusBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    backgroundColor: "#4ADE80",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  contactInfo: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactIcon: {
    marginRight: 8,
  },
  contactText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 12,
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  statItem: {
    alignItems: "center",
    backgroundColor: "rgba(13, 202, 240, 0.08)",
    borderRadius: 12,
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0DCAF0",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoLabel: {
    fontSize: 14,
    color: "#64748B",
    width: "30%",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
    flex: 1,
  },
  cardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0DCAF0",
    paddingVertical: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  cardButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
    backgroundColor: "#F8FAFC",
  },
  genderOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  selectedGenderOption: {
    borderColor: "#0DCAF0",
    backgroundColor: "rgba(13, 202, 240, 0.08)",
  },
  genderOptionText: {
    fontSize: 14,
    color: "#64748B",
  },
  selectedGenderOptionText: {
    color: "#0DCAF0",
    fontWeight: "600",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0DCAF0",
    paddingVertical: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  completenessContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  completenessTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4ADE80",
    borderRadius: 4,
  },
  completenessWarning: {
    fontSize: 12,
    color: "#FFFFFF",
    marginTop: 8,
    fontStyle: "italic",
  },
  disabledButton: {
    backgroundColor: "#94A3B8",
  },
})

export default CustomerProfile
