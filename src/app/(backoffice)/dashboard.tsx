import { useAuth } from '../../context/AuthContext';
import { View, Text, TouchableOpacity } from 'react-native';

const { signOut, profile } = useAuth();


export default function Dashboard() {
    return (
        <View className="flex-1 justify-center items-center bg-slate-900">
            <Text className="text-white text-lg mb-4">Selamat datang, {profile?.full_name}!</Text>
            <TouchableOpacity
                onPress={signOut}
                className="bg-red-600 p-4 rounded-lg"
            >
                <Text className="text-white font-bold">Keluar</Text>
            </TouchableOpacity>
        </View>
    );
}