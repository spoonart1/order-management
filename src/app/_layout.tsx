import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Provider } from "react-redux";
import "../../global.css";
import { AuthProvider } from "../context/AuthContext";
import { store } from "../store";
import { useAppSelector } from "../store/hooks";

function InitialLayout() {
  const { session, profile, isLoading } = useAppSelector((state) => state.auth);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inBackofficeGroup = segments[0] === "(backoffice)";
    const inClientGroup = segments[0] === "(client)";

    // no session at all, redirect to login
    if (!session) {
      if (!inAuthGroup) {
        router.replace("/(auth)/login-admin");
      }
      return;
    }

    // has logged in session and profile, redirect based on role
    if (session && profile) {
      const isInternalStaff = ["superadmin", "marketing", "production", "finance"].includes(profile.role);

      // Jika berada di form login ATAU belum berada di backoffice/client (misal di root index)
      if (inAuthGroup || (!inBackofficeGroup && !inClientGroup)) {
        if (isInternalStaff) {
          router.replace("/(backoffice)/dashboard");
        } else {
          router.replace("/(client)/tracking");
        }
        return;
      }

      if (profile.role === "client" && inBackofficeGroup) {
        router.replace("/(client)/tracking");
      }

      if (isInternalStaff && inClientGroup) {
        router.replace("/(backoffice)/dashboard");
      }
    }
  }, [session, profile, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
      }}>
        <ActivityIndicator size="large" color="#B91C1C" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <InitialLayout />
      </AuthProvider>
    </Provider>
  );
}
