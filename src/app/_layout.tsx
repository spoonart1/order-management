import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";

function InitialLayout() {
  const { session, profile, isLoading } = useAuth();
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
        router.replace("/(auth)/login-client");
      }
      return;
    }

    // has logged in session but no profile, redirect to profile creation
    if (session && profile) {
      const isInternalStaff = ["superadmin", "marketing", "production", "finance"].includes(profile.role);

      if (inAuthGroup) {
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
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}
