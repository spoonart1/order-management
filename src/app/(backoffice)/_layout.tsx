import { Drawer } from 'expo-router/drawer';
import { Image, Platform, View } from 'react-native';
import { useAppSelector } from '../../store/hooks';

export default function BackofficeLayout() {
    const { user, profile } = useAppSelector((state) => state.auth);

    return (
        <Drawer
            screenOptions={{
                headerShown: true,
                drawerItemStyle: {
                    marginVertical: 4,
                    marginHorizontal: 8,
                    borderRadius: 4,
                },
                drawerActiveTintColor: '#FFFFFF',
                drawerActiveBackgroundColor: '#968363',
                drawerInactiveTintColor: '#A8B2B7',
                drawerStyle: {
                    backgroundColor: '#1B2225',
                    width: Platform.OS !== 'web' ? '65%' : undefined,
                },
                headerStyle: {
                    backgroundColor: '#1B2225',
                    borderBottomColor: '#2C3539',
                    borderBottomWidth: 1,
                },
                headerTintColor: '#F8F6F1',
                headerRight: () => (
                    <View style={{ marginRight: 16 }}>
                        <View
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 4,
                                backgroundColor: '#FFFFFF',
                                padding: 2,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: '#3A454B',
                            }}
                        >
                            <Image
                                source={require('../../../assets/images/logo.png')}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="contain"
                            />
                        </View>
                    </View>
                ),
            }}
        >
            {/* Rute ke dashboard.tsx */}
            <Drawer.Screen
                name="dashboard"
                options={{
                    drawerLabel: "Dashboard",
                    title: "ALORA STUDIO - Dashboard",
                }}
            />

            <Drawer.Screen
                name="boards"
                options={{
                    drawerLabel: "Boards",
                    title: "ALORA STUDIO - Order Boards",
                }}
            />

            <Drawer.Screen
                name="quotations"
                options={{
                    drawerLabel: "Surat Penawaran",
                    title: "ALORA STUDIO - Surat Penawaran",
                }}
            />

            <Drawer.Screen
                name="invoices"
                options={{
                    drawerLabel: "Invoice & Tagihan",
                    title: "ALORA STUDIO - Invoice & Tagihan",
                }}
            />
        </Drawer>
    );
}