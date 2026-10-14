import { useState } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginAdmin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                Alert.alert('Login Error', error.message);
            } else {
                Alert.alert('Login Successful', `Welcome back, ${data.user.email}!`);
            }
        } catch {
            Alert.alert('Unexpected Error', 'An unexpected error occurred. Please try again.');
        }
        setLoading(false);
    };

    return (
        <View className="flex-1 justify-center px-6 bg-slate-900">
            <Text className="text-2xl font-bold text-white text-center mb-6">
                Alora Backoffice
            </Text>
            <Text className="text-lg text-white text-center mb-6">
                Login untuk tim internal Alora Studio
            </Text>

            <TextInput
                placeholder="Email staff"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-slate-800 p-3 text-white rounded-lg mb-3"
            />

            <TextInput
                placeholder="Email staff"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                className="bg-slate-800 p-3 text-white rounded-lg mb-6"
            />

            <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className="bg-blue-600 p-4 rounded-lg items-center"
            >
                <Text className="text-white font-bold">
                    {loading ? 'Memproses' : 'Masuk ke Backoffice'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}