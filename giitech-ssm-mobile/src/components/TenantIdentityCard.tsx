import { Image, Text, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";

export function TenantIdentityCard() {
  const { tenantName, tenantCode, tenantLogoUrl, role } = useAuth();
  return <View className="mb-4 flex-row items-center rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">{tenantLogoUrl && <View className="mr-3 h-12 w-12 overflow-hidden rounded-xl bg-white"><Image source={{ uri: tenantLogoUrl }} className="h-full w-full" resizeMode="contain" /></View>}<View className="flex-1">
    <Text className="text-xs font-bold uppercase tracking-widest text-blue-700">School workspace</Text>
    <Text className="mt-1 text-base font-extrabold text-slate-900">{tenantName || "School workspace"}</Text>
    <Text className="mt-1 text-xs text-slate-600">{tenantCode || "Tenant"} · {role || "User"}</Text>
  </View></View>;
}
