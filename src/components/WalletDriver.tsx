import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
import { FontAwesome5, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DriverWallet() {
  const quickActions = [
    { icon: "history", label: "History" },
    { icon: "car", label: "Trips" },
    { icon: "wallet", label: "Earnings" },
    { icon: "chart-line", label: "Stats" },
  ];

  const performanceMetrics = [
    { value: "12", label: "Trips", icon: "car" },
    { value: "8h", label: "Online", icon: "clock" },
    { value: "R180", label: "Earned", icon: "dollar-sign" },
  ];

//   const bottomNavItems = [
//     { icon: "home", label: "Home" },
//     { icon: "store", label: "Store" },
//     { icon: "settings", label: "Settings" },
//   ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image
          source={{
            uri: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Capture.PNG-SQMaOr7UC1cYV3bbrUfwsk41PXzknf.png",
          }}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.name}>Driver Name</Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceText}>My Balance</Text>
          <Text style={styles.balanceAmount}>R2,042</Text>
        </View>
        <TouchableOpacity style={styles.withdrawButton}>
          <Text style={styles.withdrawButtonText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {quickActions.map((item, index) => (
          <TouchableOpacity key={index} style={styles.quickAction}>
            <FontAwesome5 name={item.icon} size={24} color="#FFF" />
            <Text style={styles.quickActionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Performance Metrics */}
      <Text style={styles.sectionTitle}>Today's Performance</Text>
      <View style={styles.metrics}>
        {performanceMetrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <Feather name={metric.icon} size={24} color="#FFF" />
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      {/* Promotions */}
      <View style={styles.promotions}>
        <View style={styles.promotionsHeader}>
          <Text style={styles.sectionTitle}>Special Offers</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.promotionCard}>
          <View style={styles.promotionIcon}>
            <FontAwesome5 name="car" size={24} color="#FFF" />
          </View>
          <View style={styles.promotionContent}>
            <Text style={styles.promotionTitle}>Complete 20 Trips</Text>
            <Text style={styles.promotionSubtitle}>Earn R50 bonus this weekend</Text>
          </View>
        </View>
      </View>

      {/* Bottom Navigation */}
      {/* <View style={styles.bottomNav}>
        {bottomNavItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.navItem}>
            <Feather name={item.icon} size={24} color="#FFF" />
            <Text style={styles.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    top: 50,
    // backgroundColor: "lightgrey",
    padding: 16,
  },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  greeting: {
    color: "#333",
    fontSize: 14,
  },
  name: {
    color: "#333",
    fontSize: 18,
    fontWeight: "bold",
  },
  balanceCard: {
    backgroundColor: "lightgrey",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  balanceText: {
    color: "#333",
    fontSize: 14,
  },
  balanceAmount: {
    color: "#333",
    fontSize: 24,
    fontWeight: "bold",
  },
  withdrawButton: {
    backgroundColor: "#0DCAF0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  withdrawButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: "lightgrey",
    padding: 16,
    borderRadius: 12,
  },
  quickActionLabel: {
    color: "#333",
    fontSize: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#333",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  metrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  metricCard: {
    alignItems: "center",
    backgroundColor: "lightgrey",
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  metricValue: {
    color: "#333",
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 8,
  },
  metricLabel: {
    color: "#333",
    fontSize: 12,
  },
  promotions: {
    marginBottom: 24,
  },
  promotionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAll: {
    color: "#0DCAF0",
  },
  promotionCard: {
    flexDirection: "row",
    backgroundColor: "lightgrey",
    padding: 16,
    borderRadius: 12,
  },
  promotionIcon: {
    backgroundColor: "#0DCAF0",
    padding: 16,
    borderRadius: 8,
    marginRight: 16,
  },
  promotionContent: {
    flex: 1,
  },
  promotionTitle: {
    color: "#333",
    fontWeight: "bold",
    marginBottom: 8,
  },
  promotionSubtitle: {
    color: "#333",
    fontSize: 12,
  },
  navItem: {
    alignItems: "center",
  },
  navLabel: {
    color: "#333",
    fontSize: 12,
    marginTop: 8,
  },
});
