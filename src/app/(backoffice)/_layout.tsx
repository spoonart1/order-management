import { Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
    // Panggil hook di dalam komponen
    const { signOut, profile } = useAuth();

    return (
        <View className="flex-1 justify-center items-center bg-slate-900 p-6">
            <Text className="text-2xl font-bold text-white mb-2">
                Alora Studio Backoffice
            </Text>
            <Text className="text-slate-400 text-base mb-6">
                Selamat datang, <Text className="text-emerald-400 font-semibold">{profile?.full_name || 'Admin'}</Text>! (Role: {profile?.role})
            </Text>

            <TouchableOpacity
                onPress={signOut}
                className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl shadow-lg"
            >
                <Text className="text-white font-bold">Keluar / Logout</Text>
            </TouchableOpacity>
        </View>
    );
}