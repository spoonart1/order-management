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
  buttonClassName = 'w-6 h-6 rounded-[2px] items-center justify-center bg-[#FAF8F5] border border-[#DDD6C8]',
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
          top: y + height + 4,
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
              <EllipsisVertical size={13} color="#70787C" />
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
                minWidth: 150,
                backgroundColor: '#FFFFFF',
                borderColor: '#E3DDCF',
                borderWidth: 1,
                borderStyle: 'solid',
                borderRadius: 3,
                elevation: 8,
              }}
              className="py-1 shadow-md"
            >
              {items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  onPress={(e: any) => {
                    e?.stopPropagation?.();
                    setVisible(false);
                    item.onPress();
                  }}
                  className={`px-3 py-2 ${
                    idx > 0 ? 'border-t border-[#F0EBE1]' : ''
                  } hover:bg-[#FAF8F5]`}
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
                          color: item.destructive ? '#9E2A2B' : '#1B2225',
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
