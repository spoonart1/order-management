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
  inactiveBgColor = '#FAF8F5',
  activeBorderColor,
  inactiveBorderColor = '#DDD6C8',
  activeTextColor = '#FFFFFF',
  inactiveTextColor = '#4D555A',
  icon,
  className = '',
  style,
  textStyle,
  disabled = false,
}) => {
  const bg = selected ? (activeBgColor || color || '#1B2225') : inactiveBgColor;
  const border = selected ? (activeBorderColor || color || '#1B2225') : inactiveBorderColor;
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
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 3,
              backgroundColor: bg,
              borderColor: border,
              borderWidth: 1,
              borderStyle: 'solid',
              opacity: pressed ? 0.8 : 1,
            },
            style,
          ]}
        >
          {icon ? (
            <View style={{ marginRight: 5 }}>
              {typeof icon === 'string' ? (
                <Text style={{ fontSize: 11 }}>{icon}</Text>
              ) : (
                icon
              )}
            </View>
          ) : null}
          <Text
            style={[
              { color: textCol, fontSize: 11, fontWeight: selected ? '700' : '500' },
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
