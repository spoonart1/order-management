import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { formatIndonesianDate } from '@/utils/terbilang';

interface DatePickerFieldProps {
  label?: string;
  value: string; // Format: YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  allowClear?: boolean;
  showPresets?: boolean;
  minDate?: string; // Format: YYYY-MM-DD
  maxDate?: string; // Format: YYYY-MM-DD
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Pilih tanggal...',
  required = false,
  allowClear = false,
  showPresets = true,
  minDate,
  maxDate,
}: DatePickerFieldProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // Parse initial view year and month
  const initialDate = useMemo(() => {
    if (value && value.includes('-')) {
      const parts = value.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return new Date(parts[0], parts[1] - 1, parts[2] || 1);
      }
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Buka modal dan reset tampilan bulan ke tanggal nilai saat ini
  const handleOpenModal = () => {
    const d = value && value.includes('-')
      ? new Date(Number(value.split('-')[0]), Number(value.split('-')[1]) - 1, Number(value.split('-')[2]) || 1)
      : new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setModalVisible(true);
  };

  // Navigasi Bulan
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Kalkulasi Grid Tanggal
  const daysGrid = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const grid: {
      day: number;
      monthType: 'prev' | 'current' | 'next';
      dateStr: string;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }[] = [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const checkDisabled = (dateStr: string) => {
      if (minDate && dateStr < minDate) return true;
      if (maxDate && dateStr > maxDate) return true;
      return false;
    };

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      grid.push({
        day,
        monthType: 'prev',
        dateStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled: checkDisabled(dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        day: d,
        monthType: 'current',
        dateStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled: checkDisabled(dateStr),
      });
    }

    // Next month padding (make total rows 5 or 6, 35 or 42 cells)
    const totalCells = grid.length <= 35 ? 35 : 42;
    const remaining = totalCells - grid.length;
    for (let n = 1; n <= remaining; n++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      grid.push({
        day: n,
        monthType: 'next',
        dateStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled: checkDisabled(dateStr),
      });
    }

    return grid;
  }, [viewYear, viewMonth, value, minDate, maxDate]);

  // Handler Pilih Tanggal
  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setModalVisible(false);
  };

  // Quick Preset Helper
  const handleApplyPreset = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    onChange(dateStr);
    setModalVisible(false);
  };

  // Formatted Display Text
  const displayText = useMemo(() => {
    if (!value) return '';
    try {
      return formatIndonesianDate(value);
    } catch {
      return value;
    }
  }, [value]);

  return (
    <View className="w-full">
      {label ? (
        <Text className="text-[#70787C] text-xs font-semibold mb-1">
          {label} {required && <Text className="text-rose-500">*</Text>}
        </Text>
      ) : null}

      <View className="relative">
        <Pressable
          onPress={handleOpenModal}
          className="bg-[#FAF8F5] border border-[#DDD6C8] p-2.5 rounded-[3px] flex-row items-center justify-between hover:border-[#968363] active:bg-[#F2ECE1]"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <CalendarIcon size={14} color="#968363" />
            <Text
              className={`text-xs ml-2 ${
                value ? 'text-[#1B2225] font-medium' : 'text-[#8A9296]'
              }`}
            >
              {value ? displayText : placeholder}
            </Text>
          </View>
        </Pressable>

        {allowClear && value ? (
          <Pressable
            onPress={() => onChange('')}
            className="absolute right-2 top-2 p-1 rounded-[2px] bg-white border border-[#DDD6C8] hover:bg-[#FAF8F5]"
          >
            <X size={12} color="#70787C" />
          </Pressable>
        ) : null}
      </View>

      {/* CALENDAR PICKER MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-[#F8F6F1] border border-[#DDD6C8] w-full max-w-sm rounded-[4px] p-4 shadow-2xl">
            {/* Modal Header: Month & Year Selector */}
            <View className="flex-row items-center justify-between pb-3 border-b border-[#E3DDCF] mb-3 bg-white px-3 py-2 rounded-[3px]">
              <Pressable
                onPress={handlePrevMonth}
                className="w-7 h-7 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] items-center justify-center hover:bg-[#F2ECE1] active:bg-[#F2ECE1]"
              >
                <ChevronLeft size={15} color="#70787C" />
              </Pressable>

              <Text className="text-[#1B2225] font-bold text-sm tracking-wide font-mono">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>

              <Pressable
                onPress={handleNextMonth}
                className="w-7 h-7 rounded-[3px] bg-[#FAF8F5] border border-[#DDD6C8] items-center justify-center hover:bg-[#F2ECE1] active:bg-[#F2ECE1]"
              >
                <ChevronRight size={15} color="#70787C" />
              </Pressable>
            </View>

            {/* Day of Week Labels */}
            <View className="flex-row justify-between mb-1 px-1">
              {DAY_LABELS.map((d, idx) => (
                <Text
                  key={idx}
                  className={`w-9 text-center text-[10px] font-mono font-bold uppercase tracking-wider ${
                    idx === 0 ? 'text-[#9E2A2B]' : 'text-[#70787C]'
                  }`}
                >
                  {d}
                </Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View className="flex-row flex-wrap justify-between bg-white border border-[#E3DDCF] p-1.5 rounded-[3px]">
              {daysGrid.map((item, idx) => {
                const isCurrentMonth = item.monthType === 'current';

                return (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      if (!item.isDisabled) {
                        handleSelectDate(item.dateStr);
                      }
                    }}
                    disabled={item.isDisabled}
                    className={`w-9 h-8 items-center justify-center rounded-[2px] mb-1 ${
                      item.isSelected
                        ? 'bg-[#1B2225]'
                        : item.isDisabled
                        ? 'opacity-20'
                        : item.isToday
                        ? 'border border-[#968363] bg-[#FAF8F5]'
                        : isCurrentMonth
                        ? 'hover:bg-[#FAF8F5] active:bg-[#F2ECE1]'
                        : 'opacity-30'
                    }`}
                  >
                    <Text
                      className={`text-xs font-mono ${
                        item.isSelected
                          ? 'text-white font-bold'
                          : item.isDisabled
                          ? 'text-[#8A9296] line-through'
                          : item.isToday
                          ? 'text-[#968363] font-bold'
                          : isCurrentMonth
                          ? 'text-[#1B2225] font-medium'
                          : 'text-[#8A9296]'
                      }`}
                    >
                      {item.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Presets Cepat (Hari Ini, +7 Hari, +14 Hari, +30 Hari) */}
            {showPresets && (
              <View className="mt-3 pt-2.5 border-t border-[#E3DDCF] flex-row flex-wrap gap-1.5 justify-center">
                <Pressable
                  onPress={() => handleApplyPreset(0)}
                  className="px-2.5 py-1 bg-white hover:bg-[#FAF8F5] rounded-[3px] border border-[#DDD6C8]"
                >
                  <Text className="text-[#70787C] text-[10px] font-semibold font-mono">Hari Ini</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleApplyPreset(7)}
                  className="px-2.5 py-1 bg-white hover:bg-[#FAF8F5] rounded-[3px] border border-[#DDD6C8]"
                >
                  <Text className="text-[#70787C] text-[10px] font-semibold font-mono">+7 Hari</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleApplyPreset(14)}
                  className="px-2.5 py-1 bg-white hover:bg-[#FAF8F5] rounded-[3px] border border-[#DDD6C8]"
                >
                  <Text className="text-[#70787C] text-[10px] font-semibold font-mono">+14 Hari</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleApplyPreset(30)}
                  className="px-2.5 py-1 bg-white hover:bg-[#FAF8F5] rounded-[3px] border border-[#DDD6C8]"
                >
                  <Text className="text-[#70787C] text-[10px] font-semibold font-mono">+30 Hari</Text>
                </Pressable>
              </View>
            )}

            {/* Modal Footer */}
            <View className="mt-3 pt-2.5 border-t border-[#E3DDCF] flex-row justify-end">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="px-3.5 py-1.5 rounded-[3px] bg-white border border-[#DDD6C8] hover:bg-[#FAF8F5]"
              >
                <Text className="text-[#70787C] text-xs font-semibold">Tutup</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
