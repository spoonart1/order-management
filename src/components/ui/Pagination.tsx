import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Helper untuk generate deret nomor halaman dengan elipsis jika banyak
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    const showLeftEllipsis = currentPage > 4;
    const showRightEllipsis = currentPage < totalPages - 3;

    pages.push(1);

    if (showLeftEllipsis) {
      pages.push('...');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    if (showRightEllipsis) {
      pages.push('...');
    }

    if (!pages.includes(totalPages)) {
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalItems === 0) return null;

  return (
    <View
      className={`flex-col md:flex-row items-center justify-between gap-3 pt-4 pb-2 border-t border-slate-800 ${className}`}
    >
      {/* Teks Informasi Data */}
      <Text className="text-slate-400 text-xs">
        Menampilkan <Text className="text-slate-200 font-semibold">{startItem}–{endItem}</Text> dari{' '}
        <Text className="text-slate-200 font-semibold">{totalItems}</Text> data
      </Text>

      {/* Navigasi Tombol Pagination */}
      <View className="flex-row items-center space-x-1.5">
        {/* Tombol Sebelumnya */}
        <Pressable
          onPress={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          className={`flex-row items-center px-2.5 py-1.5 rounded-lg border mr-1 ${currentPage <= 1
              ? 'bg-slate-900/50 border-slate-800/50 opacity-40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
        >
          <ChevronLeft size={14} color={currentPage <= 1 ? '#64748B' : '#CBD5E1'} />
          <Text
            className={`text-xs ml-1 font-medium ${currentPage <= 1 ? 'text-slate-600' : 'text-slate-300'
              }`}
          >
            Prev
          </Text>
        </Pressable>

        {/* Nomor-nomor Halaman */}
        <View className="flex-row items-center space-x-1">
          {pageNumbers.map((page, idx) => {
            if (typeof page === 'string') {
              return (
                <View key={`ellipsis-${idx}`} className="w-7 h-7 items-center justify-center">
                  <Text className="text-slate-500 text-xs">...</Text>
                </View>
              );
            }

            const isActive = page === currentPage;
            return (
              <Pressable
                key={`page-${page}`}
                onPress={() => onPageChange(page)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className={`w-7 h-7 rounded-lg items-center justify-center border mx-0.5 ${isActive
                    ? 'bg-sky-600 border-sky-500'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
              >
                <Text
                  className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-400'
                    }`}
                >
                  {page}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tombol Selanjutnya */}
        <Pressable
          onPress={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          className={`flex-row items-center px-2.5 py-1.5 rounded-lg border ml-1 ${currentPage >= totalPages
              ? 'bg-slate-900/50 border-slate-800/50 opacity-40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
        >
          <Text
            className={`text-xs mr-1 font-medium ${currentPage >= totalPages ? 'text-slate-600' : 'text-slate-300'
              }`}
          >
            Next
          </Text>
          <ChevronRight size={14} color={currentPage >= totalPages ? '#64748B' : '#CBD5E1'} />
        </Pressable>
      </View>
    </View>
  );
}
