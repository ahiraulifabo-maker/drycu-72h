import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router, usePathname } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const NAV_ITEMS = [
  { name: "index",     label: "Dashboard", icon: "home-outline"      as const, activeIcon: "home"      as const, path: "/"          },
  { name: "customers", label: "Customers",  icon: "people-outline"    as const, activeIcon: "people"    as const, path: "/customers"  },
  { name: "orders",    label: "Orders",     icon: "receipt-outline"   as const, activeIcon: "receipt"   as const, path: "/orders"     },
  { name: "reports",   label: "Reports",    icon: "bar-chart-outline" as const, activeIcon: "bar-chart" as const, path: "/reports"    },
];

function SidebarNav({ colors }: { colors: ReturnType<typeof useColors> }) {
  const pathname = usePathname();
  return (
    <View style={[ss.sidebar, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
      {/* Brand */}
      <View style={ss.brand}>
        <Text style={[ss.brandName, { color: colors.primary }]}>DRYCU-72H</Text>
        <Text style={[ss.brandSub,  { color: colors.mutedForeground }]}>Laundry & Dry Cleaning POS</Text>
      </View>

      {/* Nav links */}
      <View style={ss.nav}>
        {NAV_ITEMS.map(item => {
          const isActive =
            item.name === "index"
              ? pathname === "/" || pathname === ""
              : pathname.startsWith(`/${item.name}`);
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                ss.navItem,
                isActive && { backgroundColor: colors.primary + "18", borderRadius: 10 },
              ]}
              onPress={() => router.push(item.path as any)}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={20}
                color={isActive ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  ss.navLabel,
                  {
                    color: isActive ? colors.primary : colors.mutedForeground,
                    fontFamily: isActive ? "Inter_700Bold" : "Inter_500Medium",
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Settings link */}
      <TouchableOpacity
        style={[ss.settingsLink, { borderColor: colors.border }]}
        onPress={() => router.push("/settings/admin")}
      >
        <Ionicons name="settings-outline" size={16} color={colors.mutedForeground} />
        <Text style={[ss.settingsLinkText, { color: colors.mutedForeground }]}>Admin / God Edit</Text>
      </TouchableOpacity>

      {/* Quick action */}
      <TouchableOpacity onPress={() => router.push("/order/new")}>
        <View style={[ss.newOrderBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={ss.newOrderText}>New Order</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="customers">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Customers</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Orders</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reports">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Reports</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const tabs = (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: isWide
          ? { display: "none" }
          : {
              position: "absolute",
              backgroundColor: isIOS ? "transparent" : colors.card,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              elevation: 0,
              ...(isWeb ? { height: 84 } : {}),
            },
        tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
        tabBarBackground: () =>
          !isWide && isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : !isWide && isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={24} /> : <Ionicons name="home-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Customers",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.2" tintColor={color} size={24} /> : <Ionicons name="people-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="doc.text" tintColor={color} size={24} /> : <Ionicons name="receipt-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="chart.bar" tintColor={color} size={24} /> : <Ionicons name="bar-chart-outline" size={22} color={color} />,
        }}
      />
    </Tabs>
  );

  if (isWide) {
    return (
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.background }}>
        <SidebarNav colors={colors} />
        <View style={{ flex: 1 }}>{tabs}</View>
      </View>
    );
  }

  return tabs;
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  // On wide screens always use the sidebar layout regardless of Liquid Glass availability.
  // NativeTabs has no sidebar support, so we fall back to ClassicTabLayout which has it.
  if (!isWide && isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}

const ss = StyleSheet.create({
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    paddingTop: 28,
    paddingHorizontal: 14,
    paddingBottom: 24,
    flexDirection: "column",
  },
  brand: { marginBottom: 28, paddingHorizontal: 4 },
  brandName: { fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  brandSub:  { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 14 },
  nav: { flex: 1, gap: 4 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  navLabel: { fontSize: 14 },
  settingsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  settingsLinkText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  newOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  newOrderText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
