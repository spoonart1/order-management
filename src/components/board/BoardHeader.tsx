import React from "react";
import { View, Text, Pressable } from "react-native";
import { Chip } from "@/components/ui/Chip";

export type BoardType = 'marketing' | 'production' | 'general';

const BOARD_TABS: { type: BoardType; label: string; icon: string; color: string }[] = [
    { type: 'marketing', label: 'Marketing', icon: '📈', color: '#2563EB' },
    { type: 'production', label: 'Produksi', icon: '🔨', color: '#7C3AED' },
    { type: 'general', label: 'General', icon: '📋', color: '#059669' },
];

interface BoardHeaderProps {
    title?: string;
    description?: string | null;
    activeBoardType: BoardType;
    onSelectBoardType: (type: BoardType) => void;
    onRefresh: () => void;
}

export function BoardHeader({
    title,
    description,
    activeBoardType,
    onSelectBoardType,
    onRefresh,
}: BoardHeaderProps) {
    return (
        <View className="px-6 py-4 bg-slate-900 border-b border-slate-800">
            <View className="flex-row items-center justify-between flex-wrap gap-3">
                <View className="flex-1 min-w-[200px]">
                    <Text className="text-white text-xl font-bold">{title || 'Kanban Board'}</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">
                        {description || 'Drag kartu untuk pindah alur (Web) atau klik kartu untuk edit detail'}
                    </Text>
                </View>

                {/* Multi-Board Switcher Tabs & Tombol Refresh */}
                <View className="flex-row items-center flex-wrap">
                    {BOARD_TABS.map((tab) => (
                        <Chip
                            key={tab.type}
                            label={tab.label}
                            icon={tab.icon}
                            selected={activeBoardType === tab.type}
                            onPress={() => onSelectBoardType(tab.type)}
                            color={tab.color}
                            activeBorderColor="#FFFFFF"
                            inactiveBgColor="#020617"
                            inactiveBorderColor="#334155"
                        />
                    ))}

                    <Pressable
                        onPress={onRefresh}
                        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                        className="bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 rounded-lg border border-slate-700 mb-2 ml-1"
                    >
                        <Text className="text-white text-xs font-semibold">🔄 Refresh</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
