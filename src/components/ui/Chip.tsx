import React from 'react';
import {
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string; // Warna latar aksen saat chip terpilih
  activeBgColor?: string;
  inactiveBgColor?: string;
  activeBorderColor?: string;
  inactiveBorderColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
  icon?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

/**
 * Reusable Chip / Pill Component
 * Digunakan untuk filter, pemilih kolom, pemilihan PIC, status badge interaktif, dll.
 */
export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  color,
  activeBgColor,
  inactiveBgColor = '#0F172A',
  activeBorderColor = '#FFFFFF',
  inactiveBorderColor = '#334155',
  activeTextColor = '#FFFFFF',
  inactiveTextColor = '#94A3B8',
  icon,
  className = '',
  style,
  textStyle,
  disabled = false,
}) => {
  const bg = selected ? (activeBgColor || color || '#2563EB') : inactiveBgColor;
  const border = selected ? (activeBorderColor || '#FFFFFF') : inactiveBorderColor;
  const textCol = selected ? activeTextColor : inactiveTextColor;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`mr-2 mb-2 ${className}`}
    >
      {({ pressed }) => (
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: bg,
              borderColor: border,
              borderWidth: 1.5,
              borderStyle: 'solid',
              opacity: pressed ? 0.8 : 1,
            },
            style,
          ]}
        >
          {icon ? (
            <View style={{ marginRight: 6 }}>
              {typeof icon === 'string' ? (
                <Text style={{ fontSize: 12 }}>{icon}</Text>
              ) : (
                icon
              )}
            </View>
          ) : null}
          <Text
            style={[
              { color: textCol, fontSize: 12, fontWeight: selected ? '700' : '600' },
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
};
