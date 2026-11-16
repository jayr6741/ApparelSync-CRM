import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type ApiState = "idle" | "checking" | "connected" | "error";

const modules = [
  { title: "Point of Sale", detail: "Billing and checkout", symbol: "▣" },
  { title: "Inventory", detail: "Products, sizes and colours", symbol: "▤" },
  { title: "Barcode Scanner", detail: "Scan product barcodes", symbol: "▥" },
  { title: "Orders", detail: "Track customer orders", symbol: "≡" },
  { title: "Customers", detail: "Customer profiles and history", symbol: "♙" },
  { title: "Reports", detail: "Sales and stock insights", symbol: "▥" },
];

export default function App() {
  const [apiState, setApiState] = useState<ApiState>("idle");

  const checkApi = useCallback(async () => {
    setApiState("checking");
    try {
      const response = await fetch(`${API_URL.replace(/\/$/, "")}/api/health`);
      if (!response.ok) throw new Error("API health check failed");
      setApiState("connected");
    } catch {
      setApiState("error");
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>GARMENTOS MOBILE</Text>
            <Text style={styles.heading}>Your store,{"\n"}at a glance.</Text>
          </View>
          <View style={styles.logo}><Text style={styles.logoText}>G</Text></View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Backend connection</Text>
            <Text style={styles.statusText}>
              {apiState === "connected" ? "API is reachable" :
                apiState === "error" ? "Could not reach the API" :
                apiState === "checking" ? "Checking connection…" :
                "Check your GARMENTOS server"}
            </Text>
          </View>
          {apiState === "checking" ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Pressable style={styles.checkButton} onPress={checkApi}>
              <Text style={styles.checkButtonText}>
                {apiState === "connected" ? "Check again" : "Test API"}
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>Store tools</Text>
        <Text style={styles.sectionSubtitle}>
          Mobile modules planned for the shared GARMENTOS account and database.
        </Text>
        <View style={styles.grid}>
          {modules.map((module) => (
            <View key={module.title} style={styles.moduleCard}>
              <Text style={styles.moduleSymbol}>{module.symbol}</Text>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleDetail}>{module.detail}</Text>
              <Text style={styles.comingSoon}>COMING IN DEVELOPMENT</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>
          Android and iOS app foundation · Shared server API · PostgreSQL
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  container: { padding: 22, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 26 },
  eyebrow: { color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  heading: { color: "#111827", fontSize: 34, lineHeight: 39, fontWeight: "800", marginTop: 10 },
  logo: { width: 54, height: 54, borderRadius: 17, backgroundColor: "#172554", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#ffffff", fontSize: 28, fontWeight: "900" },
  statusCard: { backgroundColor: "#172554", borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  statusCopy: { flex: 1, paddingRight: 10 },
  statusTitle: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  statusText: { color: "#cbd5e1", fontSize: 12, marginTop: 5 },
  checkButton: { backgroundColor: "#ffffff", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  checkButtonText: { color: "#172554", fontSize: 12, fontWeight: "800" },
  sectionTitle: { color: "#111827", fontSize: 21, fontWeight: "800" },
  sectionSubtitle: { color: "#64748b", fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  moduleCard: { width: "48%", flexGrow: 1, minHeight: 150, backgroundColor: "#ffffff", borderRadius: 16, padding: 15, borderWidth: 1, borderColor: "#e5e7eb" },
  moduleSymbol: { color: "#1d4ed8", fontSize: 23, fontWeight: "800", marginBottom: 12 },
  moduleTitle: { color: "#111827", fontSize: 14, fontWeight: "800" },
  moduleDetail: { color: "#64748b", fontSize: 11, marginTop: 5 },
  comingSoon: { color: "#94a3b8", fontSize: 8, fontWeight: "800", letterSpacing: 0.7, marginTop: 13 },
  footer: { color: "#94a3b8", fontSize: 11, textAlign: "center", marginTop: 25, lineHeight: 17 },
});
