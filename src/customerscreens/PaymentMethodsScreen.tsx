"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { View, Text, TouchableOpacity, Image, StyleSheet, FlatList, Alert, Dimensions, StatusBar, ActivityIndicator, Animated, Easing, Modal, LayoutAnimation, Platform, UIManager } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Icon } from "react-native-elements"
import { LinearGradient } from "expo-linear-gradient"
import { useDispatch, useSelector } from "react-redux"
import axios from "axios"
import { api } from "../../api"
import { setCard } from "../redux/actions/cardsAction"
import WebView from "react-native-webview"
import CustomDrawer from "../components/CustomDrawer"
import NetInfo from '@react-native-community/netinfo'
import { getCachedCustomerCards, saveCachedCustomerCards } from '../utils/storage'

const { width } = Dimensions.get("window")

const PaymentMethodsScreen = ({ navigation }) => {
  const user = useSelector((state) => state.auth.user)
  const user_id = user?.user_id
  const [cardsDetails, setCardsDetails] = useState([])
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPaystackWebView, setShowPaystackWebView] = useState(false)
  const [authorizationUrl, setAuthorizationUrl] = useState("")
  const [updatingCardId, setUpdatingCardId] = useState(null)
  const [isConnected, setIsConnected] = useState(true)
  const [webviewLoading, setWebviewLoading] = useState(false)

  // Snackbar / optimistic action refs & state
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")
  const [snackbarActionLabel, setSnackbarActionLabel] = useState("")
  const snackbarActionRef = useRef(null)
  const snackbarTimerRef = useRef<number | null>(null)
  const snackbarAnim = useRef(new Animated.Value(0)).current

  const pendingDeleteRef = useRef(null)
  const pendingPrimaryRef = useRef(null)
  const prevCardsRef = useRef([])

  const showSnackbar = (message, actionLabel = null, action = null, duration = 5000) => {
    // clear existing timer
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current as any)
      snackbarTimerRef.current = null
    }
    setSnackbarMessage(message)
    setSnackbarActionLabel(actionLabel || "")
    snackbarActionRef.current = action
    setSnackbarVisible(true)
    Animated.timing(snackbarAnim, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }).start()
    snackbarTimerRef.current = setTimeout(() => {
      hideSnackbar()
      // If there's a pending delete/primary and it wasn't undone, finalize now
      if (pendingDeleteRef.current && pendingDeleteRef.current.cardId) {
        performDelete(pendingDeleteRef.current.cardId)
        pendingDeleteRef.current = null
      }
      if (pendingPrimaryRef.current && pendingPrimaryRef.current.cardId) {
        performSetPrimary(pendingPrimaryRef.current.cardId)
        pendingPrimaryRef.current = null
      }
    }, duration) as any
  }

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true)
    }
  }, [])

  const hideSnackbar = () => {
    if (snackbarTimerRef.current) { clearTimeout(snackbarTimerRef.current as any); snackbarTimerRef.current = null }
    Animated.timing(snackbarAnim, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(() => {
      setSnackbarVisible(false)
      setSnackbarMessage("")
      setSnackbarActionLabel("")
      snackbarActionRef.current = null
    })
  }

  const onSnackbarAction = () => {
    if (snackbarActionRef.current) snackbarActionRef.current()
    hideSnackbar()
  }

  const mastercardIcon = require("../../assets/mastercard.png")
  const visaIcon = require("../../assets/visa-credit-card.png")
  const dispatch = useDispatch()
  const [sortMode, setSortMode] = useState('primary') // 'primary' or 'recent'

  const applySort = (cards) => {
    if (!Array.isArray(cards)) return cards || []
    if (sortMode === 'primary') {
      // Put primary/selected cards first, preserve order otherwise
      const primary = cards.filter(c => c.is_default === 1 || c.is_selected === 1)
      const others = cards.filter(c => !(c.is_default === 1 || c.is_selected === 1))
      return [...primary, ...others]
    }
    // recent: sort by created_at (fallback to id) descending
    return [...cards].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : (a.id || 0)
      const tb = b.created_at ? new Date(b.created_at).getTime() : (b.id || 0)
      return tb - ta
    })
  }

  // Fetch user cards from backend
  useEffect(() => {
    if (!user_id) return
    fetchCustomerCards()
  }, [user_id])

  useEffect(() => {
    let unsubscribe = () => {}
    if (NetInfo && typeof NetInfo.addEventListener === 'function') {
      unsubscribe = NetInfo.addEventListener(state => {
        const connected = !!state.isConnected
        setIsConnected(connected)
        if (connected && user_id) fetchCustomerCards()
      })
    }
    return () => { try { unsubscribe(); } catch (e) {} }
  }, [user_id])

  const fetchCustomerCards = async () => {
    setIsLoading(true)
    try {
      let connected = true
      if (NetInfo && typeof NetInfo.fetch === 'function') {
        try {
          const state = await NetInfo.fetch()
          connected = !!state.isConnected
        } catch (e) {
          connected = true
        }
      }

      if (!connected) {
        const cached = await getCachedCustomerCards(String(user_id))
          const cards = applySort(cached?.list || [])
        setCardsDetails(cards)
        const selectedCard = cards.find((card) => card.is_selected === 1 || card.is_default === 1)
        setSelectedCardId(selectedCard ? selectedCard.id : cards[0]?.id || null)
        return cards
      }

      const res = await axios.get(api + `customer-cards/${user_id}`)
      console.log("Customer Cards--------------:", res.data)

      const cards = res.data
        setCardsDetails(applySort(cards))
      saveCachedCustomerCards(String(user_id), cards).catch(() => {})

      // Find the currently selected card
      const selectedCard = cards.find((card) => card.is_selected === 1 || card.is_default === 1)
      setSelectedCardId(selectedCard ? selectedCard.id : cards[0]?.id || null)
      return cards

    } catch (err) {
      console.error("Error fetching customer Cards:", err)
      const cached = await getCachedCustomerCards(String(user_id))
        const cards = applySort(cached?.list || [])
      setCardsDetails(cards)
      const selectedCard = cards.find((card) => card.is_selected === 1 || card.is_default === 1)
      setSelectedCardId(selectedCard ? selectedCard.id : cards[0]?.id || null)
      return cards
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize Paystack transaction and get authorization URL
  const initializePaystackTransaction = async () => {
    try {
      if (!isConnected) {
        Alert.alert("Offline", "You are offline. Please connect to the internet to add a new card.")
        return
      }
      setIsLoading(true);

      const response = await axios.post(`${api}initialize-card-registration`, {
        user_id,
        email: user?.email,
      });

      const authorization_url = response.data?.data?.authorization_url;

      if (authorization_url) {
        setAuthorizationUrl(authorization_url);
        // capture current list so we can detect the newly added card after return
        prevCardsRef.current = cardsDetails || []
        setShowPaystackWebView(true);
      } else {
        Alert.alert("Error", "Failed to initialize card registration.");
      } 
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to initialize card registration.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessfulTransaction = async (reference) => {
    try {
      if (!isConnected) {
        Alert.alert("Offline", "You are offline. Please connect to the internet to verify the transaction.")
        return
      }
      const verificationResponse = await axios.get(`${api}verify-card-registration/${reference}`);

      if (verificationResponse.data.status === "success") {
        // Refresh cards and try to detect the newly added card
        const cards = await fetchCustomerCards()
        const prev = prevCardsRef.current || []
        const newCard = (cards || []).find(c => !prev.some(p => String(p.id) === String(c.id)) || (c.reference && c.reference === reference))
        if (newCard) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
          setSelectedCardId(newCard.id)
          dispatch(setCard({ cardsDetails: cards }))
          showSnackbar('Card added and selected', null, null, 2500)
        } else {
          showSnackbar('Card added', null, null, 2500)
        }
        prevCardsRef.current = []
      } else {
        Alert.alert("Failed", "Transaction verification failed. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying transaction:", error);
      Alert.alert("Error", "Failed to verify transaction. Please try again.");
    }
  };

  const handleDeleteCard = (cardId) => {
    if (!isConnected) {
      Alert.alert("Offline", "You are offline. Please connect to the internet to delete a card.")
      return
    }

    // Confirm then perform optimistic delete with undo window
    Alert.alert(
      "Delete Card",
      "Are you sure you want to delete this card?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: () => {
            const card = cardsDetails.find(c => c.id === cardId)
            if (!card) return

            // Optimistically remove from UI
            const updatedCards = cardsDetails.filter((card) => card.id !== cardId)
            setCardsDetails(updatedCards)

            // If deleted card was selected, select another locally
            const previousSelected = selectedCardId
            if (selectedCardId === cardId) {
              const newSelected = updatedCards[0]?.id || null
              setSelectedCardId(newSelected)
              // do not call handleCardSelect now; we will finalize later
            }

            // store pending delete and show undo snackbar
            pendingDeleteRef.current = { cardId, card, previousSelected }
            showSnackbar('Card deleted', 'Undo', () => {
              // Undo: restore card locally and cancel pending
              if (pendingDeleteRef.current && pendingDeleteRef.current.card) {
                setCardsDetails(prev => [pendingDeleteRef.current.card, ...prev])
                setSelectedCardId(pendingDeleteRef.current.previousSelected)
                pendingDeleteRef.current = null
              }
            }, 5000)
          },
        },
      ],
      { cancelable: false },
    )
  }

  const performDelete = async (cardId) => {
    try {
      setIsLoading(true)
      await axios.delete(`${api}customer-card/${cardId}`)
      // success: ensure cache updated
      saveCachedCustomerCards(String(user_id), cardsDetails).catch(() => {})
      showSnackbar('Card deleted successfully', null, null, 2500)
    } catch (err) {
      console.error('Failed to finalize delete:', err)
      // restore card on error
      const pending = pendingDeleteRef.current
      if (pending && pending.card) {
        setCardsDetails(prev => [pending.card, ...prev])
        setSelectedCardId(pending.previousSelected)
      }
      showSnackbar('Delete failed. Retry', 'Retry', () => performDelete(cardId), 5000)
    } finally {
      setIsLoading(false)
      pendingDeleteRef.current = null
    }
  }

  const handleCardSelect = async (cardId) => {
    if (selectedCardId === cardId) return

    if (!isConnected) {
      setSelectedCardId(cardId)
      const updatedCards = cardsDetails.map((card) => ({
        ...card,
        is_selected: card.id === cardId ? 1 : 0,
        is_default: card.id === cardId ? 1 : 0,
      }))
      setCardsDetails(updatedCards)
      dispatch(setCard({ cardsDetails: updatedCards }))
      saveCachedCustomerCards(String(user_id), updatedCards).catch(() => {})
      Alert.alert("Offline", "Primary card updated locally. It will sync when you are online.")
      return
    }

    // Optimistic set-primary with undo window
    const previousSelected = selectedCardId
    // update UI immediately
    setSelectedCardId(cardId)
    const updatedCards = cardsDetails.map((card) => ({
      ...card,
      is_selected: card.id === cardId ? 1 : 0,
      is_default: card.id === cardId ? 1 : 0,
    }))
    setCardsDetails(updatedCards)
    dispatch(setCard({ cardsDetails: updatedCards }))

    // store pending primary change and show undo
    pendingPrimaryRef.current = { cardId, previousSelected }
    showSnackbar('Primary card set', 'Undo', () => {
      // Undo: restore previous selection locally
      if (pendingPrimaryRef.current) {
        setSelectedCardId(pendingPrimaryRef.current.previousSelected)
        const restored = cardsDetails.map((card) => ({
          ...card,
          is_selected: card.id === pendingPrimaryRef.current.previousSelected ? 1 : 0,
          is_default: card.id === pendingPrimaryRef.current.previousSelected ? 1 : 0,
        }))
        setCardsDetails(restored)
        dispatch(setCard({ cardsDetails: restored }))
        pendingPrimaryRef.current = null
      }
    }, 5000)
  }

  const performSetPrimary = async (cardId) => {
    setUpdatingCardId(cardId)
    try {
      const response = await axios.put(`${api}user/${user_id}/card/${cardId}/set-primary`)
      if (response.status === 200) {
        showSnackbar('Primary card saved', null, null, 2500)
      }
    } catch (err) {
      console.error('Failed to set primary:', err)
      showSnackbar('Set primary failed. Retry', 'Retry', () => performSetPrimary(cardId), 5000)
      // revert to previous if available
      if (pendingPrimaryRef.current) {
        setSelectedCardId(pendingPrimaryRef.current.previousSelected)
        const restored = cardsDetails.map((card) => ({
          ...card,
          is_selected: card.id === pendingPrimaryRef.current.previousSelected ? 1 : 0,
          is_default: card.id === pendingPrimaryRef.current.previousSelected ? 1 : 0,
        }))
        setCardsDetails(restored)
        dispatch(setCard({ cardsDetails: restored }))
      }
    } finally {
      setUpdatingCardId(null)
      pendingPrimaryRef.current = null
    }
  }

  // Render card item with loading state
  const renderCardItem = ({ item }) => {
    const isSelected = item.id === selectedCardId
    const isUpdating = updatingCardId === item.id
    const cardLogo = item.card_type?.toLowerCase() === "visa" ? visaIcon : mastercardIcon

    const togglePreferred = () => {
      const updated = cardsDetails.map(c => c.id === item.id ? { ...c, preferred: !c.preferred } : c)
      setCardsDetails(applySort(updated))
      saveCachedCustomerCards(String(user_id), updated).catch(() => {})
      showSnackbar(updated.find(c => c.id === item.id).preferred ? 'Marked preferred' : 'Preference removed', null, null, 2500)
    }

    return (
      <View style={styles.cardItemContainer}>
        <TouchableOpacity
          style={[styles.cardItem, isSelected && styles.selectedCardItem]}
          onPress={() => handleCardSelect(item.id)}
          disabled={isLoading || isUpdating}
        >
          <View style={styles.cardItemContent}>
            <Image source={cardLogo} style={styles.cardLogo} />
            <View style={styles.cardDetails}>
              <Text style={styles.cardType}>{item.bank_code}</Text>
              <Text style={styles.cardNumberText}>•••• •••• •••• {item.last_four_digits}</Text>
              {(item.is_default === 1 || item.is_selected === 1) && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.selectionContainer}>
            {isUpdating ? (
              <ActivityIndicator size="small" color="#0DCAF0" />
            ) : (
              <View style={[styles.checkCircle, isSelected && styles.selectedCheckCircle]}>
                {isSelected && <Icon name="check" type="material" size={16} color="#FFFFFF" />}
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePreferred} style={[styles.prefButton, item.preferred && styles.prefButtonActive]}>
          <Icon name={item.preferred ? 'bookmark' : 'bookmark-outline'} type="material-community" size={20} color={item.preferred ? '#F59E0B' : '#94A3B8'} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.deleteButton, (isLoading || isUpdating) && styles.deleteButtonDisabled]} 
          onPress={() => handleDeleteCard(item.id)} 
          disabled={isLoading || isUpdating}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Icon name="delete-outline" type="material" size={24} color="#FF3B30" />
          )}
        </TouchableOpacity>
      </View>
    )
  }

  const selectedPrimaryCard = cardsDetails.find((card) => card.id === selectedCardId)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), [])

  // WebView will be rendered as a modal inside the main screen return

  // Snackbar UI
  const snackbarTranslate = snackbarAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] })


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FBFD" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
            <Icon type="material-community" name="menu" color="#0DCAF0" size={28} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Primary Card Section */}
        <View style={styles.primaryCardSection}>
          <Text style={styles.sectionLabel}>Primary Card</Text>
          {selectedPrimaryCard ? (
            <View style={styles.primaryCardContainer}>
              <LinearGradient
                colors={["#0DCAF0", "#0AA8CD"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryCard}
              >
                <View style={styles.cardChip}>
                  <Icon name="credit-card-chip" type="material-community" size={32} color="#FFD700" />
                </View>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardLabel}>{selectedPrimaryCard.bank_code}</Text>
                    <Text style={styles.cardNumber}>•••• •••• •••• {selectedPrimaryCard.last_four_digits}</Text>
                  </View>
                  <Image
                    source={selectedPrimaryCard.card_type?.toLowerCase() === "visa" ? visaIcon : mastercardIcon}
                    style={styles.cardBrandLogo}
                  />
                </View>
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.cardHolderLabel}>CARD HOLDER</Text>
                    <Text style={styles.cardHolderName}>{user?.name}</Text>
                  </View>
                  <View style={styles.primaryIndicator}>
                    <Icon name="star" type="material" size={16} color="#FFD700" />
                    <Text style={styles.primaryIndicatorText}>Primary</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.noCardContainer}>
              <Icon name="credit-card-off" type="material-community" size={64} color="#CBD5E1" />
              <Text style={styles.noCardText}>No primary card selected</Text>
              <Text style={styles.noCardSubtext}>Add a card to manage your payments</Text>
            </View>
          )}
        </View>

        {/* Available Cards List */}
        <View style={styles.cardsListSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Payment Cards</Text>
            <View style={styles.sortControlRow}>
              <TouchableOpacity onPress={() => setSortMode('primary')} style={[styles.sortButton, sortMode === 'primary' && styles.sortButtonActive]}>
                <Text style={[styles.sortButtonText, sortMode === 'primary' && styles.sortButtonTextActive]}>Primary</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSortMode('recent')} style={[styles.sortButton, sortMode === 'recent' && styles.sortButtonActive]}>
                <Text style={[styles.sortButtonText, sortMode === 'recent' && styles.sortButtonTextActive]}>Most recent</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {cardsDetails.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Icon name="credit-card-multiple" type="material-community" size={56} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No payment cards found</Text>
              <Text style={styles.emptyStateSubtext}>Add your first card to get started</Text>
            </View>
          ) : (
            <FlatList
              data={cardsDetails}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderCardItem}
              style={styles.cardList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.cardListContent}
            />
          )}
        </View>

        {/* Add New Card Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.addCardButton, (isLoading || !isConnected) && styles.addCardButtonDisabled]}
            onPress={initializePaystackTransaction}
            disabled={isLoading || !isConnected}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="add" type="material" size={22} color="#FFFFFF" />
            )}
            <Text style={styles.addCardButtonText}>
              {isLoading
                ? "Processing..."
                : isConnected
                  ? "Add New Card with Paystack"
                  : "Offline - connect to add card"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {drawerOpen && <CustomDrawer isOpen={drawerOpen} toggleDrawer={toggleDrawer} navigation={navigation} />}
      <ModalWebView
        visible={showPaystackWebView}
        url={authorizationUrl}
        loading={webviewLoading}
        onClose={() => { setShowPaystackWebView(false); setAuthorizationUrl(""); }}
        onShouldStartLoadWithRequest={(request) => {
          const url = request?.url || ''
          console.log('ModalWebView request:', url)

          // If the server callback URL is hit, it will include 'paystack-callback' and reference
          if (url.includes('paystack-callback')) {
            const m = url.match(/[?&]reference=([^&]+)/)
            const reference = m ? decodeURIComponent(m[1]) : null
            if (reference) handleSuccessfulTransaction(reference)
            setShowPaystackWebView(false)
            setAuthorizationUrl("")
            return false
          }

          // Also handle direct app deep-link callbacks if they appear
          if (url && url.startsWith('nthome://AddPaymentMethodScreen')) {
            const m = url.match(/[?&]reference=([^&]+)/)
            const reference = m ? decodeURIComponent(m[1]) : null
            if (reference) handleSuccessfulTransaction(reference)
            setShowPaystackWebView(false)
            setAuthorizationUrl("")
            return false
          }

          return true
        }}
        onLoadStart={() => setWebviewLoading(true)}
        onLoadEnd={() => setWebviewLoading(false)}
      />
    </SafeAreaView>
  )
}

// Render modal WebView for Paystack inside the same screen so we keep context
const ModalWebView = ({ visible, url, loading, onClose, onShouldStartLoadWithRequest, onLoadStart, onLoadEnd }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { height: '80%' }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.webViewHeader}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Icon name="close" type="material" size={20} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.webViewHeaderTitle}>Add Card</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={{ flex: 1 }}>
              {loading && <ActivityIndicator style={styles.modalSpinner} size="large" color="#0DCAF0" />}
              {url ? (
                <WebView
                  source={{ uri: url }}
                  style={{ flex: 1, width: '100%', height: '100%' }}
                  startInLoadingState={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
                  onLoadStart={onLoadStart}
                  onLoadEnd={onLoadEnd}
                />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                  <Text style={{ color: '#64748B' }}>Unable to load payment page.</Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  )
}

// Snackbar component rendered at bottom of screen
const Snackbar = ({ visible, message, actionLabel, onAction, animValue }) => {
  if (!visible) return null
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.snackbar, { transform: [{ translateY: animValue }], opacity: animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}
    >
      <View style={styles.snackbarInner}>
        <Text style={styles.snackbarText}>{message}</Text>
        {actionLabel ? (
          <TouchableOpacity onPress={onAction} style={styles.snackbarAction}>
            <Text style={styles.snackbarActionText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FBFD",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingTop: 8,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 44,
  },
  primaryCardSection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  primaryCardContainer: {
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryCard: {
    padding: 24,
    borderRadius: 20,
    minHeight: 200,
    position: "relative",
    overflow: "hidden",
  },
  cardChip: {
    position: "absolute",
    top: 24,
    left: 24,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 52,
    marginBottom: 44,
  },
  cardLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 6,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  cardNumber: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 2.5,
  },
  cardBrandLogo: {
    width: 56,
    height: 34,
    resizeMode: "contain",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardHolderLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    opacity: 0.8,
    marginBottom: 4,
    fontWeight: "500",
    letterSpacing: 1,
  },
  cardHolderName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  primaryIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryIndicatorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  noCardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    borderStyle: "dashed",
  },
  noCardText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  noCardSubtext: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  cardsListSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  cardCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  cardList: {
    flex: 1,
  },
  cardListContent: {
    paddingBottom: 8,
  },
  cardItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1.5,
    borderColor: "#F8FAFC",
    minHeight: 80,
  },
  selectedCardItem: {
    borderColor: "#0DCAF0",
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardLogo: {
    width: 44,
    height: 28,
    resizeMode: "contain",
    marginRight: 16,
  },
  cardDetails: {
    flex: 1,
  },
  cardType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardNumberText: {
    fontSize: 14,
    color: "#64748B",
    letterSpacing: 0.5,
  },
  primaryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0DCAF0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  selectionContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  selectedCheckCircle: {
    backgroundColor: "#0DCAF0",
    borderColor: "#0DCAF0",
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  footer: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0DCAF0",
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#0DCAF0",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  addCardButtonDisabled: {
    opacity: 0.7,
  },
  addCardButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  webViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F8FBFD",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  webViewHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  webView: {
    flex: 1,
  },
  snackbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    zIndex: 2000,
  },
  snackbarInner: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  snackbarText: {
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  snackbarAction: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  snackbarActionText: {
    color: '#0DCAF0',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSpinner: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  sortControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
    marginLeft: 8,
  },
  sortButtonActive: {
    backgroundColor: '#E6F6F8',
  },
  sortButtonText: {
    color: '#64748B',
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: '#0DCAF0',
  },
  prefButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: 'transparent',
  },
  prefButtonActive: {
    backgroundColor: 'rgba(245,158,11,0.08)'
  }
})

export default PaymentMethodsScreen

// Exported snackbar container so it can be used by the screen component
export { Snackbar }