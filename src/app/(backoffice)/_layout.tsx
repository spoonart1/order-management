import { Drawer } from 'expo-router/drawer';
import { useAppSelector } from '../../store/hooks';

export default function BackofficeLayout() {
    const { user, profile } = useAppSelector((state) => state.auth);

    return (
        <Drawer
            screenOptions={{
                headerShown: true,
                drawerItemStyle: {
                    marginVertical: 5,
                    marginHorizontal: 0,
                    width: '100%',
                    borderRadius: 0,
                },
                drawerActiveTintColor: '#fff',
                drawerActiveBackgroundColor: '#1E293B',
                drawerInactiveTintColor: '#38BDF8',
                drawerStyle: {
                    backgroundColor: '#0F172A',
                },
                headerStyle: {
                    backgroundColor: '#0F172A',
                },
                headerTintColor: '#F8FAFC',
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
        </Drawer>
    );
}