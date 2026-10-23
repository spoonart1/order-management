import { checkIsOnline } from '@/lib/network';
import { supabase } from '@/lib/supabase';
import { boardCacheService } from '@/services/boardCacheService';
import { offlineQueueService } from '@/services/offlineQueueService';
import { orderWorkflowService } from '@/services/orderWorkflowService';
import { BoardData, ColumnItem } from '@/store/slices/boardSlice';

export interface UpdateCardPayload {
  cardId: string;
  title: string;
  client_name: string;
  client_phone: string;
  estimated_value: number;
  column_id: string;
  assigned_to: string | null;
  notes: string;
  due_date?: string | null;
}

export interface MoveCardPayload {
  cardId: string;
  targetColumnId: string;
  newPosition: number;
}

export interface CreateCardPayload {
  board_id: string;
  column_id: string;
  title: string;
  client_name: string;
  client_phone: string;
  estimated_value: number;
  assigned_to: string | null;
  notes: string;
  position: number;
  due_date?: string | null;
}

export interface CreateColumnPayload {
  board_id: string;
  title: string;
  color_hex: string;
  position: number;
}

export interface UpdateColumnPayload {
  columnId: string;
  title: string;
  color_hex: string;
}

/**
 * Service / Data Layer untuk Board & Kartu Kanban
 * Menangani query dan mutasi data ke Supabase
 */
export const boardService = {
  /**
   * Mengambil board lengkap berdasarkan tipe (misal: 'marketing', 'production')
   * beserta relasi kolom, kartu, PIC profile, dan lampiran file.
   * Mendukung Offline-First: memuat dari cache lokal saat offline atau saat koneksi gagal.
   */
  async getBoardByType(boardType: string): Promise<BoardData> {
    const isOnline = await checkIsOnline();

    // 1. Jika terdeteksi offline, langsung kembalikan cache lokal tanpa menunggu timeout
    if (!isOnline) {
      console.log(`[boardService] Offline mode: mengambil board '${boardType}' dari local cache`);
      const cached = await boardCacheService.getBoardCache(boardType);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase
        .from('boards')
        .select(`
          id,
          name,
          type,
          description,
          board_columns (
            id,
            board_id,
            title,
            position,
            color_hex,
            board_cards (
              *,
              profiles (
                id,
                full_name
              ),
              card_attachments (
                id,
                card_id,
                file_name,
                file_url,
                file_type,
                created_at
              )
            )
          )
        `)
        .eq('type', boardType)
        .single();

      if (error) throw error;

      // Urutkan kolom berdasarkan position (1, 2, 3...)
      const sortedColumns = (data.board_columns as unknown as ColumnItem[]).sort(
        (a, b) => a.position - b.position
      );

      // Urutkan kartu di setiap kolom berdasarkan position & hidrasi due_date jika ada di notes
      sortedColumns.forEach((col) => {
        col.board_cards.forEach((card) => {
          if (!card.due_date) {
            card.due_date = orderWorkflowService.getCardDueDate(card);
          }
        });
        col.board_cards.sort((a, b) => a.position - b.position);
      });

      const boardResult = { ...data, board_columns: sortedColumns } as unknown as BoardData;

      // 2. Simpan snapshot data terbaru ke local cache secara background
      await boardCacheService.saveBoardCache(boardType, boardResult);

      return boardResult;
    } catch (error) {
      console.warn(
        `[boardService] Fetch board '${boardType}' gagal, mencoba fallback ke local cache:`,
        error
      );
      const cached = await boardCacheService.getBoardCache(boardType);
      if (cached) {
        return cached;
      }
      throw error;
    }
  },

  /**
   * Memindahkan posisi dan/atau kolom kartu kanban (Offline-First Resilient)
   */
  async moveCard(payload: MoveCardPayload): Promise<void> {
    const isOnline = await checkIsOnline();

    if (!isOnline) {
      console.log(`[boardService] Offline: Menyimpan MOVE_CARD kartu ${payload.cardId} ke offline queue`);
      await offlineQueueService.enqueue('MOVE_CARD', payload);
      // Evaluasi otomasi alur DP -> Order Masuk Produksi secara lokal
      orderWorkflowService.handleMarketingDpTransition(payload.cardId, payload.targetColumnId).catch(console.error);
      return;
    }

    try {
      const { error } = await supabase
        .from('board_cards')
        .update({
          column_id: payload.targetColumnId,
          position: payload.newPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.cardId);

      if (error) throw error;

      // Evaluasi otomasi alur DP -> Order Masuk Produksi
      orderWorkflowService.handleMarketingDpTransition(payload.cardId, payload.targetColumnId).catch(console.error);
    } catch (error) {
      console.warn('[boardService] Gagal memindahkan kartu secara online, simpan ke antrean offline:', error);
      await offlineQueueService.enqueue('MOVE_CARD', payload);
      orderWorkflowService.handleMarketingDpTransition(payload.cardId, payload.targetColumnId).catch(console.error);
    }
  },

  /**
   * Mengubah data detail kartu (Offline-First Resilient)
   */
  async updateCardDetails(payload: UpdateCardPayload): Promise<void> {
    const isOnline = await checkIsOnline();

    if (!isOnline) {
      console.log(`[boardService] Offline: Menyimpan UPDATE_CARD kartu ${payload.cardId} ke offline queue`);
      await offlineQueueService.enqueue('UPDATE_CARD', payload);
      orderWorkflowService.handleMarketingDpTransition(payload.cardId, payload.column_id).catch(console.error);
      return;
    }

    try {
      const updatePayload: Record<string, any> = {
        title: payload.title,
        client_name: payload.client_name,
        client_phone: payload.client_phone,
        estimated_value: payload.estimated_value,
        column_id: payload.column_id,
        assigned_to: payload.assigned_to,
        notes: payload.notes,
        updated_at: new Date().toISOString(),
      };

      if (payload.due_date !== undefined) {
        updatePayload.due_date = payload.due_date;
      }

      const { error } = await supabase
        .from('board_cards')
        .update(updatePayload)
        .eq('id', payload.cardId);

      if (error) {
        // Jika kolom due_date belum dibuat di schema database, retry tanpa kolom due_date
        if (error.code === '42703' && updatePayload.due_date !== undefined) {
          delete updatePayload.due_date;
          const { error: retryErr } = await supabase
            .from('board_cards')
            .update(updatePayload)
            .eq('id', payload.cardId);
          if (retryErr) throw retryErr;
        } else {
          throw error;
        }
      }

      // Evaluasi otomasi alur DP -> Order Masuk Produksi
      orderWorkflowService.handleMarketingDpTransition(payload.cardId, payload.column_id).catch(console.error);
    } catch (error) {
      console.warn('[boardService] Gagal update detail kartu secara online, simpan ke antrean offline:', error);
      await offlineQueueService.enqueue('UPDATE_CARD', payload);
      orderWorkflowService.handleMarketingDpTransition(payload.cardId, payload.column_id).catch(console.error);
    }
  },

  /**
   * Membuat kartu baru di kolom tertentu
   */
  async createCard(payload: CreateCardPayload): Promise<void> {
    const insertPayload: Record<string, any> = {
      board_id: payload.board_id,
      column_id: payload.column_id,
      title: payload.title,
      client_name: payload.client_name || null,
      client_phone: payload.client_phone || null,
      estimated_value: payload.estimated_value,
      assigned_to: payload.assigned_to,
      notes: payload.notes || null,
      position: payload.position,
    };

    if (payload.due_date) {
      insertPayload.due_date = payload.due_date;
    }

    const { data: inserted, error } = await supabase
      .from('board_cards')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      if (error.code === '42703' && insertPayload.due_date) {
        delete insertPayload.due_date;
        const { data: retryInserted, error: retryErr } = await supabase
          .from('board_cards')
          .insert(insertPayload)
          .select('id')
          .single();
        if (retryErr) {
          console.error('Error creating card on retry:', retryErr);
          throw retryErr;
        }
        if (retryInserted?.id) {
          orderWorkflowService.handleMarketingDpTransition(retryInserted.id, payload.column_id).catch(console.error);
        }
      } else {
        console.error('Error creating card:', error);
        throw error;
      }
    } else if (inserted?.id) {
      orderWorkflowService.handleMarketingDpTransition(inserted.id, payload.column_id).catch(console.error);
    }
  },

  /**
   * Menghapus kartu (Offline-First Resilient)
   */
  async deleteCard(cardId: string): Promise<void> {
    const isOnline = await checkIsOnline();

    if (!isOnline) {
      console.log(`[boardService] Offline: Menyimpan DELETE_CARD kartu ${cardId} ke offline queue`);
      await offlineQueueService.enqueue('DELETE_CARD', { cardId });
      return;
    }

    try {
      // 1. Ambil daftar lampiran untuk dibersihkan dari Storage
      const { data: attachments } = await supabase
        .from('card_attachments')
        .select('id, file_url')
        .eq('card_id', cardId);

      const storagePaths = (attachments || [])
        .map((a) => a.file_url.split('/attachments/')[1])
        .filter((p): p is string => !!p);

      if (storagePaths.length > 0) {
        await supabase.storage.from('attachments').remove(storagePaths);
      }

      // 2. Hapus row lampiran, lalu kartunya
      await supabase.from('card_attachments').delete().eq('card_id', cardId);
      const { error } = await supabase.from('board_cards').delete().eq('id', cardId);
      if (error) throw error;
    } catch (error) {
      console.warn('[boardService] Gagal delete kartu secara online, simpan ke antrean offline:', error);
      await offlineQueueService.enqueue('DELETE_CARD', { cardId });
    }
  },

  /**
   * Membuat kolom tahapan baru di dalam board
   */
  async createColumn(payload: CreateColumnPayload): Promise<void> {
    const { error } = await supabase.from('board_columns').insert({
      board_id: payload.board_id,
      title: payload.title,
      color_hex: payload.color_hex,
      position: payload.position,
    });

    if (error) {
      console.error('Error creating column:', error);
      throw error;
    }
  },

  /**
   * Mengubah judul dan/atau warna kolom
   */
  async updateColumn({ columnId, title, color_hex }: UpdateColumnPayload): Promise<void> {
    const { error } = await supabase
      .from('board_columns')
      .update({
        title,
        color_hex,
      })
      .eq('id', columnId);

    if (error) {
      console.error('Error updating column:', error);
      throw error;
    }
  },

  /**
   * Menghapus kolom beserta kartu-kartu di dalamnya
   */
  async deleteColumn(columnId: string): Promise<void> {
    // Ambil kartu di dalam kolom ini untuk menghapus lampiran & kartunya terlebih dahulu
    const { data: cards } = await supabase
      .from('board_cards')
      .select('id')
      .eq('column_id', columnId);

    if (cards && cards.length > 0) {
      for (const card of cards) {
        await this.deleteCard(card.id);
      }
    }

    const { error } = await supabase.from('board_columns').delete().eq('id', columnId);
    if (error) {
      console.error('Error deleting column:', error);
      throw error;
    }
  },
};
