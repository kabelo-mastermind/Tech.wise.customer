import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { getPendingUpdates, removePendingUpdate } from '../utils/storage';
import { syncPendingUpdates, syncPendingItem } from '../utils/syncPending';

export default function PendingRequestsScreen({ navigation }) {
  const [items, setItems] = useState([]);

  const load = async () => {
    const list = await getPendingUpdates();
    // show all pending items to assist debugging
    setItems(list);
  };

  useEffect(() => {
    load();
  }, []);

  const cancelItem = async (createdAt) => {
    Alert.alert('Cancel queued request', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: async () => { await removePendingUpdate(createdAt); load(); } }
    ])
  }

  const cancelAll = async () => {
    const list = await getPendingUpdates();
    const tripRequests = list.filter(i => i.type === 'trip_request');
    if (!tripRequests || tripRequests.length === 0) {
      Alert.alert('No queued trips', 'There are no queued trip requests to cancel.');
      return;
    }

    Alert.alert(
      'Cancel all queued requests',
      `Are you sure you want to cancel ${tripRequests.length} queued request(s)?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              for (const it of tripRequests) {
                await removePendingUpdate(it.createdAt);
              }
              await load();
              Alert.alert('Cancelled', `${tripRequests.length} queued trips cancelled locally.`);
            } catch (e) {
              console.error('Failed to cancel all pending trips', e);
              Alert.alert('Error', 'Failed to cancel queued trips.');
            }
          }
        }
      ]
    )
  }

  const retryItem = async () => {
    // run sync once
    await syncPendingUpdates();
    await load();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Requests</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.createdAt)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>{item.type}</Text>
              <Text style={styles.muted}>{item.payload?.tripData?.pickUpLocation || JSON.stringify(item.payload || {}).slice(0, 80)}</Text>
              <Text style={styles.muted}>{new Date(item.createdAt).toLocaleString()}</Text>
              <Text style={styles.muted}>Attempts: {item.attempts || 0}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => cancelItem(item.createdAt)}>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { marginTop: 8, backgroundColor: '#0DCAF0' }]} onPress={async () => { try { await syncPendingItem(item.createdAt); await load(); } catch (e) { console.error(e); Alert.alert('Retry failed', 'Could not retry this item.'); } }}>
                <Text style={styles.actionText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.footerRow}>
        <TouchableOpacity style={[styles.cancelAllBtn, styles.footerBtn]} onPress={cancelAll}><Text style={styles.cancelAllText}>Cancel All</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.retryBtn, styles.footerBtn]} onPress={retryItem}><Text style={styles.retryText}>Retry All</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.retryBtn, styles.footerBtn, { backgroundColor: '#6B7280' }]} onPress={load}><Text style={styles.retryText}>Refresh</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  item: { flexDirection: 'row', padding: 12, borderRadius: 8, backgroundColor: '#f7f7f7', marginBottom: 8 },
  itemText: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 12, color: '#666' },
  actions: { justifyContent: 'center' },
  actionBtn: { backgroundColor: '#FF6B6B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionText: { color: '#fff', fontWeight: '700' },
  footer: { padding: 12 },
  retryBtn: { backgroundColor: '#0DCAF0', padding: 12, borderRadius: 8, alignItems: 'center' },
  retryText: { color: '#fff', fontWeight: '700' },
  footerRow: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cancelAllBtn: { backgroundColor: '#EF4444', padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelAllText: { color: '#fff', fontWeight: '700' },
  footerBtn: { marginHorizontal: 8, minWidth: 100 },
});
