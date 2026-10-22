import React from "react";
import { View, Text, Pressable } from "react-native";

interface BoardHeaderProps {
    title?: string;
    description?: string | null;
    onRefresh: () => void;
}

export function BoardHeader({ title, description, onRefresh }: BoardHeaderProps) {
    return (
        <View className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex-row items-center justify-between">
            <View>
                <Text className="text-white text-xl font-bold">{title || 'Kanban Board'}</Text>
                <Text className="text-slate-400 text-xs mt-0.5">
                    {description || 'Drag kartu untuk pindah alur (Web) atau klik kartu untuk edit detail'}
                </Text>
            </View>
            <Pressable
                onPress={onRefresh}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700"
            >
                <Text className="text-white text-xs font-semibold">🔄 Refresh</Text>
            </Pressable>
        </View>
    );
}
