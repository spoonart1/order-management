import { useState } from 'react';
import { Text, TextInput, Pressable, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signInWithEmail } from '../../store/slices/authSlice';

export default function LoginAdmin() {
    const dispatch = useAppDispatch();
    const { isLoading: authLoading } = useAppSelector((state) => state.auth);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const toast = (msg: string, isError: boolean = false) => {
        setMessage(msg);
        setTimeout(() => {
            setMessage(null);
        }, 3000);
    };

    const handleLogin = async () => {
        setMessage(null);

        // 1. Validasi form kosong
        if (!email.trim() && !password.trim()) {
            toast('Email dan password wajib diisi.', true);
            return;
        }
        if (!email.trim()) {
            toast('Email staff tidak boleh kosong.', true);
            return;
        }
        if (!password.trim()) {
            toast('Password tidak boleh kosong.', true);
            return;
        }

        setLoading(true);
        console.log('Attempting login with email:', email);
        try {
            const resultAction = await dispatch(signInWithEmail({ email, password }));
            if (resultAction.meta.requestStatus === 'rejected') {
                toast(resultAction.payload as string, true);
            } else {
                toast('Successful');
            }
        } catch {
            toast('An unexpected error occurred. Please try again.', true);
        } finally {
            setLoading(false);
        }
    };

    const isSubmitting = loading || authLoading;

    return (
        // Container utama (full screen, center vertical & horizontal)
        <View className="flex-1 justify-center items-center px-4 bg-slate-950">

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

                {/* Pesan Error / Sukses */}
                {Boolean(message) && (
                    <View
                        style={{
                            backgroundColor: message?.includes('Successful') ? '#064e3b' : '#450a0a',
                            borderColor: message?.includes('Successful') ? '#10b981' : '#ef4444',
                            borderWidth: 1,
                        }}
                        className="mb-4 p-3 rounded-xl flex-row items-center justify-between"
                    >
                        <Text
                            style={{
                                color: message?.includes('Successful') ? '#6ee7b7' : '#fca5a5',
                            }}
                            className="text-xs font-semibold flex-1 pr-2"
                        >
                            {message?.includes('Successful') ? '✅ ' : '⚠️ '}
                            {message}
                        </Text>
                        <Pressable onPress={() => setMessage(null)} className="px-1">
                            <Text className="text-slate-400 text-xs font-bold">✕</Text>
                        </Pressable>
                    </View>
                )}

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
                    <Pressable
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                        className="flex-row items-center self-start mt-2.5"
                    >
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
                    </Pressable>
                </View>

                {/* Tombol Login */}
                <Pressable
                    onPress={handleLogin}
                    disabled={isSubmitting}
                    style={({ pressed }) => [{ opacity: pressed || isSubmitting ? 0.8 : 1 }]}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-3.5 rounded-xl items-center shadow-lg shadow-blue-500/20"
                >
                    <Text className="text-white font-bold text-base">
                        {isSubmitting ? 'Memproses...' : 'Masuk ke Backoffice'}
                    </Text>
                </Pressable>
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
