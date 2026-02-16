import AsyncStorage from '@react-native-async-storage/async-storage';

export const USER_KEY = 'user';

export const getStoredUser = async (): Promise<Record<string, any> | null> => {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('getStoredUser error', e);
    return null;
  }
};

export const saveStoredUser = async (user: Record<string, any> | null) => {
  try {
    if (user === null) {
      await AsyncStorage.removeItem(USER_KEY);
      return;
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('saveStoredUser error', e);
  }
};

export const removeStoredUser = async () => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('removeStoredUser error', e);
  }
};

export default { getStoredUser, saveStoredUser, removeStoredUser };

// Pending updates queue (array of { id, type, payload, createdAt })
const PENDING_UPDATES_KEY = 'pending_updates';

export const getPendingUpdates = async (): Promise<any[]> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_UPDATES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('getPendingUpdates error', e);
    return [];
  }
};

export const addPendingUpdate = async (update: any) => {
  try {
    const list = await getPendingUpdates();
    const createdAt = Date.now();
    const item = { ...update, createdAt, attempts: 0, maxAttempts: update.maxAttempts || 5 };
    list.push(item);
    await AsyncStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(list));
    return createdAt;
  } catch (e) {
    console.warn('addPendingUpdate error', e);
  }
};

export const updatePendingItem = async (createdAt: number, patch: any) => {
  try {
    const list = await getPendingUpdates();
    const idx = list.findIndex((u) => u.createdAt === createdAt);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...patch };
    await AsyncStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.warn('updatePendingItem error', e);
    return false;
  }
};

export const removePendingUpdate = async (createdAt: number) => {
  try {
    const list = await getPendingUpdates();
    const filtered = list.filter((u) => u.createdAt !== createdAt);
    await AsyncStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('removePendingUpdate error', e);
  }
};

export { saveStoredUser, saveStoredUser as setStoredUser };

// Car listings cache
const CAR_LISTINGS_KEY = 'car_listings_last';

export const saveCachedCarListings = async (list: any[]) => {
  try {
    await AsyncStorage.setItem(CAR_LISTINGS_KEY, JSON.stringify({ list, savedAt: Date.now() }));
  } catch (e) {
    console.warn('saveCachedCarListings error', e);
  }
};

export const getCachedCarListings = async (): Promise<{ list: any[]; savedAt?: number } | null> => {
  try {
    const raw = await AsyncStorage.getItem(CAR_LISTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('getCachedCarListings error', e);
    return null;
  }
};

export const removeCachedCarListings = async () => {
  try {
    await AsyncStorage.removeItem(CAR_LISTINGS_KEY);
  } catch (e) {
    console.warn('removeCachedCarListings error', e);
  }
};

// Driver locations cache
const DRIVER_LOCATIONS_KEY = 'driver_locations_last';

export const saveCachedDriverLocations = async (locations: any) => {
  try {
    await AsyncStorage.setItem(DRIVER_LOCATIONS_KEY, JSON.stringify({ locations, savedAt: Date.now() }));
  } catch (e) {
    console.warn('saveCachedDriverLocations error', e);
  }
};

export const getCachedDriverLocations = async (): Promise<any> => {
  try {
    const raw = await AsyncStorage.getItem(DRIVER_LOCATIONS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.locations || null;
  } catch (e) {
    console.warn('getCachedDriverLocations error', e);
    return null;
  }
};

export const removeCachedDriverLocations = async () => {
  try {
    await AsyncStorage.removeItem(DRIVER_LOCATIONS_KEY);
  } catch (e) {
    console.warn('removeCachedDriverLocations error', e);
  }
};

// Customer rating cache per user
const CUSTOMER_RATING_KEY_PREFIX = 'customer_rating_';

export const saveCachedCustomerRating = async (userId: string, rating: number | null) => {
  try {
    if (!userId) return;
    await AsyncStorage.setItem(CUSTOMER_RATING_KEY_PREFIX + userId, JSON.stringify({ rating, savedAt: Date.now() }));
  } catch (e) {
    console.warn('saveCachedCustomerRating error', e);
  }
};

export const getCachedCustomerRating = async (userId: string) => {
  try {
    if (!userId) return null;
    const raw = await AsyncStorage.getItem(CUSTOMER_RATING_KEY_PREFIX + userId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('getCachedCustomerRating error', e);
    return null;
  }
};

// Customer cards cache per user
const CUSTOMER_CARDS_KEY_PREFIX = 'customer_cards_';

export const saveCachedCustomerCards = async (userId: string, cards: any[]) => {
  try {
    if (!userId) return;
    await AsyncStorage.setItem(
      CUSTOMER_CARDS_KEY_PREFIX + userId,
      JSON.stringify({ list: cards || [], savedAt: Date.now() })
    );
  } catch (e) {
    console.warn('saveCachedCustomerCards error', e);
  }
};

export const getCachedCustomerCards = async (userId: string): Promise<{ list: any[]; savedAt?: number } | null> => {
  try {
    if (!userId) return null;
    const raw = await AsyncStorage.getItem(CUSTOMER_CARDS_KEY_PREFIX + userId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('getCachedCustomerCards error', e);
    return null;
  }
};

// Driver rating cache per driver id
const DRIVER_RATING_KEY_PREFIX = 'driver_rating_';

export const saveCachedDriverRating = async (driverId: string, rating: number | null) => {
  try {
    if (!driverId) return;
    await AsyncStorage.setItem(DRIVER_RATING_KEY_PREFIX + driverId, JSON.stringify({ rating, savedAt: Date.now() }));
  } catch (e) {
    console.warn('saveCachedDriverRating error', e);
  }
};

export const getCachedDriverRating = async (driverId: string) => {
  try {
    if (!driverId) return null;
    const raw = await AsyncStorage.getItem(DRIVER_RATING_KEY_PREFIX + driverId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('getCachedDriverRating error', e);
    return null;
  }
};

// Recent destinations (simple MRU list)
const RECENT_DESTINATIONS_KEY = 'recent_destinations';

export const getRecentDestinations = async (limit = 10) => {
  try {
    const raw = await AsyncStorage.getItem(RECENT_DESTINATIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, limit) : [];
  } catch (e) {
    console.warn('getRecentDestinations error', e);
    return [];
  }
};

// Adds a destination to the front of the MRU list; dedupes by lat/lng or address
export const addRecentDestination = async (dest: { latitude: number; longitude: number; address?: string; name?: string }, limit = 10) => {
  try {
    if (!dest) return;
    const raw = await AsyncStorage.getItem(RECENT_DESTINATIONS_KEY);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    // Check if this destination is already the most recent (at index 0)
    const isSameAsLatest = list.length > 0 && list[0] && (
      (list[0].latitude && list[0].longitude && dest.latitude && dest.longitude &&
        Math.abs(list[0].latitude - dest.latitude) < 0.00001 && 
        Math.abs(list[0].longitude - dest.longitude) < 0.00001) ||
      (list[0].address && dest.address && list[0].address === dest.address)
    );

    // If it's already the latest, don't add it again
    if (isSameAsLatest) return;

    // dedupe by lat/lng or address
    list = list.filter(item => {
      if (item.latitude && item.longitude && dest.latitude && dest.longitude) {
        return !(Math.abs(item.latitude - dest.latitude) < 0.00001 && Math.abs(item.longitude - dest.longitude) < 0.00001);
      }
      if (item.address && dest.address) return item.address !== dest.address;
      return true;
    });

    list.unshift({ ...dest, savedAt: Date.now() });
    list = list.slice(0, limit);
    await AsyncStorage.setItem(RECENT_DESTINATIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('addRecentDestination error', e);
  }
};

export const clearRecentDestinations = async () => {
  try {
    await AsyncStorage.removeItem(RECENT_DESTINATIONS_KEY);
  } catch (e) {
    console.warn('clearRecentDestinations error', e);
  }
};

// Recent service (single last-used service id)
const RECENT_SERVICE_KEY = 'recent_service';

export const getRecentService = async () => {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SERVICE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('getRecentService error', e);
    return null;
  }
};

export const setRecentService = async (service) => {
  try {
    if (!service) return;
    await AsyncStorage.setItem(RECENT_SERVICE_KEY, JSON.stringify(service));
  } catch (e) {
    console.warn('setRecentService error', e);
  }
};

export const clearRecentService = async () => {
  try {
    await AsyncStorage.removeItem(RECENT_SERVICE_KEY);
  } catch (e) {
    console.warn('clearRecentService error', e);
  }
};
