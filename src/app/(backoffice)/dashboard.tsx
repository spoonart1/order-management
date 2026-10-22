import { Pressable, Text, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signOut } from '../../store/slices/authSlice';

export default function Dashboard() {
    const dispatch = useAppDispatch();
    const { profile, isLoading } = useAppSelector((state) => state.auth);

    const handleSignOut = () => {
        dispatch(signOut());
    };

    return (
        <View className="flex-1 justify-center items-center bg-slate-900">
            <Text className="text-white text-lg mb-4">
                Selamat datang, {profile?.full_name || 'Staff'}!
            </Text>
            <Pressable
                onPress={handleSignOut}
                disabled={isLoading}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="bg-red-600 hover:bg-red-700 p-4 rounded-lg"
            >
                <Text className="text-white font-bold">
                    {isLoading ? 'Memproses...' : 'Keluar'}
                </Text>
            </Pressable>
        </View>
    );
}
