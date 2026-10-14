import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginAdmin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const toast = (msg: string, isError: boolean = false) => {
        setMessage(msg);
        setTimeout(() => {
            setMessage(null);
        }, 3000); // Clear message after 5 seconds  
    };

    const handleLogin = async () => {
        setLoading(true);
        setMessage(null);

        // 1. Validasi form kosong
        if (!email.trim() && !password.trim()) {
            setLoading(false);
            toast('Email dan password wajib diisi.', true);
            return;
        }
        if (!email.trim()) {
            setLoading(false);
            toast('Email staff tidak boleh kosong.', true);
            return;
        }
        if (!password.trim()) {
            setLoading(false);
            toast('Password tidak boleh kosong.', true);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error("❌ ERROR DARI SUPABASE:", error.message, error.status);
                toast(error.message, true);
            } else {
                console.log("✅ LOGIN BERHASIL! DATA USER:", data.user);
                toast('Login Successful');
            }
        } catch {
            toast('An unexpected error occurred. Please try again.', true);
        }
        setLoading(false);
    };

    return (
        // Container utama (full screen, center vertical & horizontal)
        <View className="flex-1 justify-center items-center px-4 bg-slate-950">

            {/* Pesan Error / Sukses */}
            {message && (
                <View className={`mb-4 p-3 rounded-lg ${message.includes('Successful') ? 'bg-green-600' : 'bg-red-600'}`}>
                    <Text className="text-white text-sm text-center">
                        {message}
                    </Text>
                </View>
            )}

            {/* Box Form Card (Maksimal lebar 440px / max-w-md agar proporsional di Web Desktop & HP) */}
            <View className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">

                {/* Header Logo / Judul */}
                <View className="items-center mb-8">
                    <Text className="text-red-600 font-extrabold tracking-widest text-base uppercase mb-1">
                        Alora Studio
                    </Text>
                    <Text className="text-2xl font-bold text-white text-center">
                        Backoffice Portal
                    </Text>
                    <Text className="text-slate-400 text-sm text-center mt-1">
                        Sistem Manajemen Desain & Produksi Furniture
                    </Text>
                </View>

                {/* Input Email */}
                <View className="mb-4">
                    <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">
                        Email
                    </Text>
                    <TextInput
                        placeholder="admin.marketing@alorastudio.id"
                        placeholderTextColor="#64748B"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        className="w-full bg-slate-950 border border-slate-700 p-3.5 text-white rounded-xl text-sm"
                    />
                </View>
                {/* Input Password */}
                <View className="mb-6">
                    <Text className="text-slate-300 text-xs font-semibold mb-1.5 ml-1">
                        Kata sandi
                    </Text>
                    <TextInput
                        placeholder="••••••••••••"
                        placeholderTextColor="#64748B"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!isPasswordVisible}
                        className="w-full bg-slate-950 border border-slate-700 p-3.5 text-white rounded-xl text-sm"
                    />
                    <TouchableOpacity
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        activeOpacity={0.7}
                        className="flex-row items-center self-start mt-2.5">

                        {/* Checkbox */}
                        <View className={`w-4 h-4 border rounded items-center justify-center mr-2 
                            ${isPasswordVisible
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-slate-700'}`}>
                            {isPasswordVisible && (
                                <Text className="text-white text-xs font-bold">✓</Text>
                            )}
                        </View>
                        {/* Label Checkbox */}
                        <Text className="text-slate-400 text-xs select-none">
                            Tampilkan kata sandi
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tombol Login */}
                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-3.5 rounded-xl items-center shadow-lg shadow-blue-500/20"
                >
                    <Text className="text-white font-bold text-base">
                        {loading ? 'Memproses...' : 'Masuk ke Backoffice'}
                    </Text>
                </TouchableOpacity>
                {/* Footer info keamanan */}
                <View className="mt-8 pt-4 border-t border-slate-800/80 items-center">
                    <Text className="text-slate-500 text-xs">
                        🔒 Encrypted
                    </Text>
                </View>
            </View>
        </View>
    );
}