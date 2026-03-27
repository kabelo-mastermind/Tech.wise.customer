import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon } from "react-native-elements";
import { getIdToken } from "firebase/auth";
import { auth } from "../../FirebaseConfig";
import { api } from "../../api";

type EmergencyContact = {
  id: number;
  user_id: string;
  name: string;
  phone: string;
  country_code: string | null;
  email: string | null;
  relationship: string | null;
  is_primary: boolean;
  priority_order: number;
  preferred_contact_method: string | null;
  share_live_location: boolean;
};

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const CONTACT_METHOD_OPTIONS = ["sms", "call", "email", "whatsapp"] as const;

const normalizePreferredMethod = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return CONTACT_METHOD_OPTIONS.includes(normalized as (typeof CONTACT_METHOD_OPTIONS)[number])
    ? normalized
    : null;
};

type EmergencyContactsResponse = {
  contacts?: EmergencyContact[];
  maxContacts?: number;
};

type EmergencyContactsError = Error & {
  maxContacts?: number;
};

const buildAuthHeaders = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const token = await getIdToken(currentUser, true);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const requestEmergencyContacts = async (path: string, options: RequestInit = {}) => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (error) {
    data = raw ? { error: raw } : null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || "Request failed") as EmergencyContactsError;
    if (typeof data?.maxContacts === "number") {
      error.maxContacts = data.maxContacts;
    }
    throw error;
  }

  return data;
};

const EmergencyContactsScreen = ({ navigation }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [maxContacts, setMaxContacts] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showMethodOptions, setShowMethodOptions] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    countryCode: "",
    email: "",
    relationship: "",
    preferredContactMethod: "",
    priorityOrder: "1",
    isPrimary: false,
  });

  const isEditing = useMemo(() => Boolean(editingContact), [editingContact]);
  const hasReachedLimit = useMemo(
    () => maxContacts !== null && contacts.length >= maxContacts,
    [contacts.length, maxContacts]
  );

  const loadContacts = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }

      const data = (await requestEmergencyContacts("emergency-contacts")) as EmergencyContactsResponse | EmergencyContact[];
      if (Array.isArray(data)) {
        setContacts(data);
      } else {
        setContacts(Array.isArray(data?.contacts) ? data.contacts : []);
        setMaxContacts(typeof data?.maxContacts === "number" ? data.maxContacts : null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load contacts";
      Alert.alert("Emergency Contacts", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const closeModal = useCallback(() => {
    if (saving) return;
    setModalVisible(false);
    setShowMethodOptions(false);
    setEditingContact(null);
    setForm({
      name: "",
      phone: "",
      countryCode: "",
      email: "",
      relationship: "",
      preferredContactMethod: "",
      priorityOrder: "1",
      isPrimary: false,
    });
  }, [saving]);

  const openCreateModal = useCallback(() => {
    if (hasReachedLimit) {
      Alert.alert(
        "Contact Limit Reached",
        `You can only save up to ${maxContacts ?? "the allowed number of"} emergency contacts.`
      );
      return;
    }

    setShowMethodOptions(false);
    setEditingContact(null);
    setForm({
      name: "",
      phone: "",
      countryCode: "",
      email: "",
      relationship: "",
      preferredContactMethod: "",
      priorityOrder: "1",
      isPrimary: false,
    });
    setModalVisible(true);
  }, [hasReachedLimit, maxContacts]);

  const openEditModal = useCallback((contact: EmergencyContact) => {
    setShowMethodOptions(false);
    setEditingContact(contact);
    setForm({
      name: contact.name || "",
      phone: contact.phone || "",
      countryCode: contact.country_code || "",
      email: contact.email || "",
      relationship: contact.relationship || "",
      preferredContactMethod: contact.preferred_contact_method || "",
      priorityOrder: String(contact.priority_order || 1),
      isPrimary: Boolean(contact.is_primary),
    });
    setModalVisible(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts(false);
  }, [loadContacts]);

  const handleSave = useCallback(async () => {
    const normalizedPreferredMethod = normalizePreferredMethod(form.preferredContactMethod);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      countryCode: form.countryCode.trim() || null,
      email: form.email.trim().toLowerCase() || null,
      relationship: form.relationship.trim() || null,
      preferredContactMethod: normalizedPreferredMethod,
      priorityOrder: Number.parseInt(form.priorityOrder, 10) || 1,
      isPrimary: form.isPrimary,
      shareLiveLocation: true,
    };

    if (!payload.name || !payload.phone) {
      Alert.alert("Missing Details", "Name and phone number are required.");
      return;
    }

    if (!editingContact && !normalizedPreferredMethod) {
      Alert.alert("Missing Details", "Select a preferred contact method.");
      return;
    }

    if (payload.email && !EMAIL_REGEX.test(payload.email)) {
      Alert.alert("Invalid Email", "Enter a valid email address or leave it blank.");
      return;
    }

    if (payload.priorityOrder < 1) {
      Alert.alert("Invalid Priority", "Priority order must be 1 or greater.");
      return;
    }

    if (!editingContact && hasReachedLimit) {
      Alert.alert(
        "Contact Limit Reached",
        `You can only save up to ${maxContacts ?? "the allowed number of"} emergency contacts.`
      );
      return;
    }

    try {
      setSaving(true);

      if (editingContact) {
        await requestEmergencyContacts(`emergency-contacts/${editingContact.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await requestEmergencyContacts("emergency-contacts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeModal();
      await loadContacts(false);
    } catch (error) {
      const typedError = error as EmergencyContactsError;
      if (typeof typedError?.maxContacts === "number") {
        setMaxContacts(typedError.maxContacts);
      }
      const message = error instanceof Error ? error.message : "Failed to save contact";
      Alert.alert("Emergency Contacts", message);
    } finally {
      setSaving(false);
    }
  }, [closeModal, editingContact, form, hasReachedLimit, loadContacts, maxContacts]);

  const handleDelete = useCallback((contact: EmergencyContact) => {
    Alert.alert(
      "Delete Contact",
      `Remove ${contact.name} from your emergency contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await requestEmergencyContacts(`emergency-contacts/${contact.id}`, {
                method: "DELETE",
              });
              await loadContacts(false);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Failed to delete contact";
              Alert.alert("Emergency Contacts", message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }, [loadContacts]);

  const renderContact = ({ item }: { item: EmergencyContact }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactAvatar}>
        <Text style={styles.contactAvatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.contactContent}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
        <Text style={styles.contactRelationship}>{item.relationship || "Trusted contact"}</Text>
        <Text style={styles.contactMeta}>
          {`Priority ${item.priority_order || 1} • ${item.preferred_contact_method || "call"}`}
        </Text>
        {!!item.email && <Text style={styles.contactMeta}>{item.email}</Text>}
        {item.is_primary ? <Text style={styles.primaryBadge}>Primary</Text> : null}
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity style={styles.iconButton} onPress={() => openEditModal(item)}>
          <Icon name="edit" type="material" size={18} color="#0DCAF0" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => handleDelete(item)}>
          <Icon name="delete-outline" type="material" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0DCAF0" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            if (typeof navigation.toggleDrawer === "function") {
              navigation.toggleDrawer();
            }
          }}
        >
          <Icon
            name={navigation.canGoBack() ? "arrow-back" : "menu"}
            type="material"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <TouchableOpacity
          style={[styles.headerButton, hasReachedLimit && styles.headerButtonDisabled]}
          onPress={openCreateModal}
          disabled={hasReachedLimit}
        >
          <Icon name="person-add-alt-1" type="material" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Build Your Emergency List</Text>
        <Text style={styles.heroText}>
          Add the people you trust most so your SOS flow has verified contact details ready for later alert delivery.
        </Text>
        <Text style={styles.heroMeta}>
          {maxContacts !== null ? `${contacts.length}/${maxContacts} contacts used` : `${contacts.length} contacts saved`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#0DCAF0" />
          <Text style={styles.centerText}>Loading emergency contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderContact}
          contentContainerStyle={contacts.length ? styles.listContent : styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0DCAF0"]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="shield-account" type="material-community" size={54} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Contacts Saved</Text>
              <Text style={styles.emptyText}>
                {maxContacts !== null
                  ? `Add up to ${maxContacts} emergency contacts so you are ready for Phase 2 alert actions.`
                  : "Add emergency contacts so you are ready for Phase 2 alert actions."}
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={openCreateModal}>
                <Text style={styles.primaryButtonText}>Add Emergency Contact</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{isEditing ? "Edit Contact" : "New Contact"}</Text>

            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Country code (optional, e.g. +234)"
              value={form.countryCode}
              onChangeText={(value) => setForm((prev) => ({ ...prev, countryCode: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Email (optional)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Relationship (optional)"
              value={form.relationship}
              onChangeText={(value) => setForm((prev) => ({ ...prev, relationship: value }))}
            />
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowMethodOptions((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.selectInputText,
                  !form.preferredContactMethod && styles.selectInputPlaceholder,
                ]}
              >
                {form.preferredContactMethod
                  ? form.preferredContactMethod.toUpperCase()
                  : "Preferred method (optional)"}
              </Text>
              <Icon
                name={showMethodOptions ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                type="material"
                size={20}
                color="#475569"
              />
            </TouchableOpacity>
            {showMethodOptions ? (
              <View style={styles.methodOptionsWrap}>
                {CONTACT_METHOD_OPTIONS.map((method) => {
                  const selected = form.preferredContactMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[styles.methodOptionChip, selected && styles.methodOptionChipActive]}
                      onPress={() => {
                        setForm((prev) => ({ ...prev, preferredContactMethod: method }));
                        setShowMethodOptions(false);
                      }}
                    >
                      <Text style={[styles.methodOptionText, selected && styles.methodOptionTextActive]}>
                        {method.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {isEditing ? (
                  <TouchableOpacity
                    style={styles.methodClearButton}
                    onPress={() => {
                      setForm((prev) => ({ ...prev, preferredContactMethod: "" }));
                      setShowMethodOptions(false);
                    }}
                  >
                    <Text style={styles.methodClearText}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Priority order (1 = first)"
              keyboardType="number-pad"
              value={form.priorityOrder}
              onChangeText={(value) => setForm((prev) => ({ ...prev, priorityOrder: value }))}
            />
            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.switchTitle}>Set as primary contact</Text>
                <Text style={styles.switchHint}>Only one contact should be primary.</Text>
              </View>
              <Switch
                value={form.isPrimary}
                onValueChange={(value) => setForm((prev) => ({ ...prev, isPrimary: value }))}
                trackColor={{ false: "#CBD5E1", true: "#7DD3FC" }}
                thumbColor={form.isPrimary ? "#0DCAF0" : "#F8FAFC"}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={closeModal} disabled={saving}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButtonSmall,
                  !isEditing && !normalizePreferredMethod(form.preferredContactMethod) && styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={saving || (!isEditing && !normalizePreferredMethod(form.preferredContactMethod))}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#0DCAF0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  headerButtonDisabled: {
    opacity: 0.45,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  heroCard: {
    margin: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#E0F7FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
  },
  heroMeta: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#0369A1",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  centerText: {
    fontSize: 15,
    color: "#475569",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  contactAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0DCAF0",
  },
  contactAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  contactContent: {
    flex: 1,
    marginLeft: 14,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  contactPhone: {
    marginTop: 4,
    fontSize: 14,
    color: "#334155",
  },
  contactRelationship: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748B",
  },
  contactMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#475569",
  },
  primaryBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
    color: "#0369A1",
    fontSize: 11,
    fontWeight: "700",
  },
  contactActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    backgroundColor: "#F8FAFC",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  emptyTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 18,
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#0DCAF0",
  },
  primaryButtonSmall: {
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#0DCAF0",
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  selectInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectInputText: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
  },
  selectInputPlaceholder: {
    color: "#94A3B8",
    fontWeight: "400",
  },
  methodOptionsWrap: {
    marginTop: -4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  methodOptionChipActive: {
    borderColor: "#0DCAF0",
    backgroundColor: "#E0F7FF",
  },
  methodOptionText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  methodOptionTextActive: {
    color: "#0369A1",
  },
  methodClearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  methodClearText: {
    color: "#3730A3",
    fontSize: 12,
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  switchTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
  switchHint: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default EmergencyContactsScreen;
