import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EllipsisVertical } from 'lucide-react-native';

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  disabled?: boolean;
  buttonClassName?: string;
}

/**
 * Komponen Menu Titik Tiga (⋮) Lintas Platform (Web, iOS, Android)
 * Menggunakan Modal transparan + full-screen backdrop Pressable sehingga:
 * 1. Touch / klik di area mana pun di luar menu pasti menutup menu (iOS, Android, Web)
 * 2. Tidak terpotong oleh ScrollView atau tertimpa z-index kartu/kolom lain di Android/iOS
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  items,
  disabled = false,
  buttonClassName = 'w-7 h-7 rounded-lg items-center justify-center bg-slate-900',
}) => {
  const triggerRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number }>({
    top: 0,
    right: 16,
  });

  const handleOpen = (e?: any) => {
    e?.stopPropagation?.();
    if (disabled) return;

    const screenWidth = Dimensions.get('window').width;
    const node = triggerRef.current as any;

    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x: number, y: number, width: number, height: number) => {
        const calculatedRight = Math.max(8, screenWidth - (x + width));
        setPosition({
          top: y + height + 6,
          right: calculatedRight,
        });
        setVisible(true);
      });
    } else {
      setVisible(true);
    }
  };

  const handleClose = (e?: any) => {
    e?.stopPropagation?.();
    setVisible(false);
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          disabled={disabled}
          onPress={handleOpen}
          hitSlop={8}
          className={buttonClassName}
        >
          {({ pressed }) => (
            <View style={{ opacity: pressed ? 0.6 : 1 }}>
              <EllipsisVertical size={15} color="#94A3B8" />
            </View>
          )}
        </Pressable>
      </View>

      {visible && (
        <Modal
          visible={visible}
          transparent
          animationType="none"
          onRequestClose={handleClose}
        >
          {/* Backdrop layar penuh: sentuh/klik di titik mana pun akan menutup menu */}
          <Pressable
            onPress={handleClose}
            style={[StyleSheet.absoluteFill, { cursor: 'default' } as any]}
          >
            <View
              style={{
                position: 'absolute',
                top: position.top,
                right: position.right,
                minWidth: 145,
                backgroundColor: '#0F172A',
                borderColor: '#334155',
                borderWidth: 1,
                borderStyle: 'solid',
                borderRadius: 10,
                elevation: 12,
              }}
              className="py-1 shadow-2xl"
            >
              {items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  onPress={(e: any) => {
                    e?.stopPropagation?.();
                    setVisible(false);
                    item.onPress();
                  }}
                  className={`px-3 py-2.5 ${
                    idx > 0 ? 'border-t border-slate-800/80' : ''
                  }`}
                >
                  {({ pressed }) => (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        opacity: pressed ? 0.7 : 1,
                      }}
                    >
                      {item.icon ? <View style={{ marginRight: 8 }}>{item.icon}</View> : null}
                      <Text
                        style={{
                          color: item.destructive ? '#F87171' : '#E2E8F0',
                          fontSize: 12,
                          fontWeight: '600',
                        }}
                      >
                        {item.label}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
};
