import axios from 'axios';
import { api } from '../../api';
import { getPendingUpdates, removePendingUpdate, updatePendingItem } from './storage';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REVERSE_GEOCODE_RESULT_PREFIX = 'reverse_geocode_result_';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Sync pending updates stored in AsyncStorage.
 * Supports types: 'reverse_geocode', 'trip_request', 'trip_status_update'
 */
export const syncPendingUpdates = async () => {
  try {
    const list = await getPendingUpdates();
    if (!Array.isArray(list) || list.length === 0) return;
    const results: Array<{ createdAt: number; serverTripId?: string; tripData?: any }> = [];

    for (const item of list) {
      // respect maxAttempts
      if (typeof item.attempts === 'number' && typeof item.maxAttempts === 'number' && item.attempts >= item.maxAttempts) {
        console.warn('syncPendingUpdates: max attempts reached for', item.createdAt);
        continue;
      }

      try {
        // exponential backoff based on attempts
        const backoffMs = Math.min(30000, Math.pow(2, item.attempts || 0) * 1000);
        if (backoffMs > 0) await sleep(backoffMs);

        if (item.type === 'trip_request') {
          const payload = item.payload || {};
          const { tripData, paymentData } = payload;
          // Attempt to create trip
          const tripResp = await axios.post(`${api}trips`, tripData, { timeout: 60000 });
          const serverTripId = tripResp?.data?.tripId;

          // Attempt to post payment (if provided)
          if (paymentData) {
            await axios.post(api + 'payment', { ...paymentData, tripId: serverTripId });
          }

          // success: remove pending
          await removePendingUpdate(item.createdAt);
          results.push({ createdAt: item.createdAt, serverTripId, tripData: { ...tripData, tripId: serverTripId } });

        } else if (item.type === 'trip_status_update') {
          const payload = item.payload || {};
          const { tripId: tid, status, cancellation_reason, cancel_by } = payload;
          if (!tid) {
            // malformed, remove
            await removePendingUpdate(item.createdAt);
            continue;
          }

          // send status update to server
          await axios.put(`${api}trips/${tid}/status`, {
            status,
            cancellation_reason: cancellation_reason || null,
            cancel_by: cancel_by || null,
          }, { timeout: 30000 });

          // success: remove pending
          await removePendingUpdate(item.createdAt);
          results.push({ createdAt: item.createdAt, tripData: { tripId: tid } });

        } else if (item.type === 'reverse_geocode') {
          // Payload expected to have { coordinate: { latitude, longitude } }
          const payload = item.payload || {}
          const coord = payload.coordinate
          if (coord && coord.latitude && coord.longitude) {
            try {
              const arr = await Location.reverseGeocodeAsync({ latitude: coord.latitude, longitude: coord.longitude })
              const address = (Array.isArray(arr) && arr[0]) ? arr[0] : null
              // store result for later inspection / UI hydration
              try {
                await AsyncStorage.setItem(REVERSE_GEOCODE_RESULT_PREFIX + String(item.createdAt), JSON.stringify({ createdAt: item.createdAt, coordinate: coord, address, savedAt: Date.now() }))
              } catch (e) {}
              // success: remove pending
              try { await removePendingUpdate(item.createdAt) } catch (e) {}
              results.push({ createdAt: item.createdAt })
            } catch (e) {
              // Transient reverse geocode failure (Google Play / service disconnects etc.)
              console.warn('syncPendingUpdates: reverseGeocode failed, will retry later for', item.createdAt, e?.message || e)
              // increment attempts so exponential backoff applies
              try { await updatePendingItem(item.createdAt, { attempts: (item.attempts || 0) + 1 }) } catch (ee) {}
              // do not remove pending; continue to next item
              continue
            }
          } else {
            // malformed payload; remove it
            try { await removePendingUpdate(item.createdAt) } catch (e) {}
          }
        } else {
          // unknown type: skip and increment attempts to avoid tight loop
          console.warn('syncPendingUpdates: unknown pending type', item.type);
          await updatePendingItem(item.createdAt, { attempts: (item.attempts || 0) + 1 });
        }

      } catch (err) {
        console.warn('syncPendingUpdates: item failed, incrementing attempts', item.createdAt, err?.message || err);
        // increment attempts
        try {
          await updatePendingItem(item.createdAt, { attempts: (item.attempts || 0) + 1 });
        } catch (e) {}
      }
    }

    return results;
  } catch (e) {
    console.error('syncPendingUpdates error', e);
  }
};

export default syncPendingUpdates;

/**
 * Sync a single pending item by createdAt.
 * Returns the same result shape as the batch worker or null if not found.
 */
export const syncPendingItem = async (createdAt: number) => {
  try {
    const list = await getPendingUpdates();
    const item = list.find(i => i.createdAt === createdAt);
    if (!item) return null;

    // respect maxAttempts
    if (typeof item.attempts === 'number' && typeof item.maxAttempts === 'number' && item.attempts >= item.maxAttempts) {
      console.warn('syncPendingItem: max attempts reached for', item.createdAt);
      return null;
    }

    try {
      const backoffMs = Math.min(30000, Math.pow(2, item.attempts || 0) * 1000);
      if (backoffMs > 0) await sleep(backoffMs);

      if (item.type === 'trip_request') {
        const payload = item.payload || {};
        const { tripData, paymentData } = payload;
        const tripResp = await axios.post(`${api}trips`, tripData, { timeout: 60000 });
        const serverTripId = tripResp?.data?.tripId;
        if (paymentData) {
          await axios.post(api + 'payment', { ...paymentData, tripId: serverTripId });
        }
        await removePendingUpdate(item.createdAt);
        return { createdAt: item.createdAt, serverTripId, tripData: { ...tripData, tripId: serverTripId } };

      } else if (item.type === 'trip_status_update') {
        const payload = item.payload || {};
        const { tripId: tid, status, cancellation_reason, cancel_by } = payload;
        if (!tid) { await removePendingUpdate(item.createdAt); return null; }
        await axios.put(`${api}trips/${tid}/status`, { status, cancellation_reason: cancellation_reason || null, cancel_by: cancel_by || null }, { timeout: 30000 });
        await removePendingUpdate(item.createdAt);
        return { createdAt: item.createdAt, tripData: { tripId: tid } };

      } else if (item.type === 'reverse_geocode') {
        const payload = item.payload || {};
        const coord = payload.coordinate;
        if (coord && coord.latitude && coord.longitude) {
          const arr = await Location.reverseGeocodeAsync({ latitude: coord.latitude, longitude: coord.longitude });
          try { await AsyncStorage.setItem(REVERSE_GEOCODE_RESULT_PREFIX + String(item.createdAt), JSON.stringify({ createdAt: item.createdAt, coordinate: coord, address: (Array.isArray(arr) && arr[0]) ? arr[0] : null, savedAt: Date.now() })) } catch (e) {}
        }
        await removePendingUpdate(item.createdAt);
        return { createdAt: item.createdAt };

      } else {
        console.warn('syncPendingItem: unknown type', item.type);
        await updatePendingItem(item.createdAt, { attempts: (item.attempts || 0) + 1 });
        return null;
      }

    } catch (err) {
      try { await updatePendingItem(item.createdAt, { attempts: (item.attempts || 0) + 1 }); } catch (e) {}
      throw err;
    }
  } catch (e) {
    console.error('syncPendingItem error', e);
    return null;
  }
}
