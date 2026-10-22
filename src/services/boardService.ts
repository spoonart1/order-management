import { supabase } from '@/lib/supabase';
import { BoardData, ColumnItem } from '@/store/slices/boardSlice';

export interface UpdateCardPayload {
  cardId: string;
  title: string;
  client_name: string;
  estimated_value: number;
  column_id: string;
  assigned_to: string | null;
  notes: string;
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
  estimated_value: number;
  assigned_to: string | null;
  notes: string;
  position: number;
}

/**
 * Service / Data Layer untuk Board & Kartu Kanban
 * Menangani query dan mutasi data ke Supabase
 */
export const boardService = {
  /**
   * Mengambil board lengkap berdasarkan tipe (misal: 'marketing', 'production')
   * beserta relasi kolom, kartu, PIC profile, dan lampiran file
   */
  async getBoardByType(boardType: string): Promise<BoardData> {
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
            id,
            board_id,
            column_id,
            title,
            client_name,
            estimated_value,
            assigned_to,
            position,
            notes,
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

    if (error) {
      console.error('Error fetching board by type:', error);
      throw error;
    }

    // Urutkan kolom berdasarkan position (1, 2, 3...)
    const sortedColumns = (data.board_columns as unknown as ColumnItem[]).sort(
      (a, b) => a.position - b.position
    );

    // Urutkan kartu di setiap kolom berdasarkan position
    sortedColumns.forEach((col) => {
      col.board_cards.sort((a, b) => a.position - b.position);
    });

    return { ...data, board_columns: sortedColumns } as unknown as BoardData;
  },

  /**
   * Memindahkan posisi dan/atau kolom kartu kanban
   */
  async moveCard({ cardId, targetColumnId, newPosition }: MoveCardPayload): Promise<void> {
    const { error } = await supabase
      .from('board_cards')
      .update({
        column_id: targetColumnId,
        position: newPosition,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId);

    if (error) {
      console.error('Error moving card:', error);
      throw error;
    }
  },

  /**
   * Mengubah data detail kartu (title, client, value, PIC, notes, kolom)
   */
  async updateCardDetails(payload: UpdateCardPayload): Promise<void> {
    const { error } = await supabase
      .from('board_cards')
      .update({
        title: payload.title,
        client_name: payload.client_name,
        estimated_value: payload.estimated_value,
        column_id: payload.column_id,
        assigned_to: payload.assigned_to,
        notes: payload.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.cardId);

    if (error) {
      console.error('Error updating card details:', error);
      throw error;
    }
  },

  /**
   * Membuat kartu baru di kolom tertentu
   */
  async createCard(payload: CreateCardPayload): Promise<void> {
    const { error } = await supabase.from('board_cards').insert({
      board_id: payload.board_id,
      column_id: payload.column_id,
      title: payload.title,
      client_name: payload.client_name || null,
      estimated_value: payload.estimated_value,
      assigned_to: payload.assigned_to,
      notes: payload.notes || null,
      position: payload.position,
    });

    if (error) {
      console.error('Error creating card:', error);
      throw error;
    }
  },

  /**
   * Menghapus kartu beserta seluruh lampiran (file di Storage + row card_attachments)
   */
  async deleteCard(cardId: string): Promise<void> {
    // 1. Ambil daftar lampiran untuk dibersihkan dari Storage
    const { data: attachments, error: fetchError } = await supabase
      .from('card_attachments')
      .select('id, file_url')
      .eq('card_id', cardId);

    if (fetchError) {
      console.error('Error fetching card attachments:', fetchError);
      throw fetchError;
    }

    const storagePaths = (attachments || [])
      .map((a) => a.file_url.split('/attachments/')[1])
      .filter((p): p is string => !!p);

    if (storagePaths.length > 0) {
      await supabase.storage.from('attachments').remove(storagePaths);
    }

    // 2. Hapus row lampiran, lalu kartunya
    const { error: attError } = await supabase
      .from('card_attachments')
      .delete()
      .eq('card_id', cardId);
    if (attError) throw attError;

    const { error } = await supabase.from('board_cards').delete().eq('id', cardId);
    if (error) {
      console.error('Error deleting card:', error);
      throw error;
    }
  },
};
