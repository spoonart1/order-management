import React from "react";
import { View, Text, Pressable } from "react-native";
import { RefreshCw } from "lucide-react-native";
import { Chip } from "@/components/ui/Chip";

export type BoardType = 'marketing' | 'production' | 'general';

const BOARD_TABS: { type: BoardType; label: string; icon: string; color: string }[] = [
    { type: 'marketing', label: 'Marketing', icon: '📈', color: '#1B2225' },
    { type: 'production', label: 'Produksi', icon: '🔨', color: '#968363' },
    { type: 'general', label: 'General', icon: '📋', color: '#3A4D53' },
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
        <View className="px-4 md:px-5 py-3 bg-white border-b border-[#E3DDCF]">
            <View className="flex-row items-center justify-between flex-wrap gap-2.5">
                <View className="flex-1 min-w-[200px]">
                    <Text className="text-[#1B2225] text-base md:text-lg font-bold font-mono">
                        {title || 'Kanban Board'}
                    </Text>
                    <Text className="text-[#70787C] text-xs mt-0.5">
                        {description || 'Drag kartu untuk pindah alur alur proyek interior & custom furniture'}
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
                            activeBorderColor={tab.color}
                            inactiveBgColor="#FAF8F5"
                            inactiveBorderColor="#DDD6C8"
                            inactiveTextColor="#4D555A"
                        />
                    ))}

                    <Pressable
                        onPress={onRefresh}
                        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                        className="flex-row items-center bg-[#1B2225] hover:bg-[#2C373C] px-3 py-1.5 rounded-[3px] border border-[#1B2225] mb-2 ml-1 shadow-xs"
                    >
                        <RefreshCw size={12} color="#FFFFFF" />
                        <Text className="text-white text-xs font-semibold ml-1.5">Refresh</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
