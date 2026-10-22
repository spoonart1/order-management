import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export interface Profile {
    id: string;
    full_name: string;
}

export interface CardItem {
    id: string;
    board_id: string;
    column_id: string;
    title: string;
    client_name: string;
    estimated_value: number;
    assigned_to: string;
    position: number;
    notes?: string | null;
    profiles?: Profile | null;
}

export interface ColumnItem {
    id: string;
    board_id: string;
    title: string;
    position: number;
    color_hex: string;
    board_cards: CardItem[];
}

export interface BoardData {
    id: string;
    name: string;
    type: string;
    description?: string | null;
    board_columns: ColumnItem[];
}

interface BoardState {
    currentBoard: BoardData | null,
    isLoading: boolean,
    error: string | null
}

const initialState: BoardState = {
    currentBoard: null,
    isLoading: false,
    error: null
}


// Async Thunk: Mengambil data board beserta kolom dan kartunya dari Supabase
export const fetchBoardByType = createAsyncThunk<BoardData, string, { rejectValue: string }>(
    'board/fetchBoardByType',
    async (boardType: string, { rejectWithValue }) => {
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
                            )
                        )
                    )
                `)
                .eq('type', boardType)
                .single();

            if (error) {
                return rejectWithValue(error.message);
            }

            // Urutkan kolom berdasarkan position (1, 2, 3...)
            const sortedColumns = (data.board_columns as unknown as ColumnItem[]).sort(
                (a, b) => a.position - b.position
            );

            // Urutkan kartu di setiap kolom
            sortedColumns.forEach((col) => {
                col.board_cards.sort((a, b) => a.position - b.position);
            });
            return { ...data, board_columns: sortedColumns } as BoardData;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal memuat data board';
            return rejectWithValue(msg);
        }
    }
);

// 1. Thunk untuk memindahkan posisi/kolom kartu
export const moveCard = createAsyncThunk<
    void,
    { cardId: string; targetColumnId: string; newPosition: number },
    { rejectValue: string }
>(
    'board/moveCard',
    async ({ cardId, targetColumnId, newPosition }, { rejectWithValue }) => {
        try {
            const { error } = await supabase
                .from('board_cards')
                .update({
                    column_id: targetColumnId,
                    position: newPosition,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', cardId);

            if (error) throw error;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal memindahkan kartu';
            return rejectWithValue(msg);
        }
    }
);

// 2. Thunk untuk mengedit detail kartu (Nama, Klien, Nilai, PIC, Notes, Kolom)
export const updateCardDetails = createAsyncThunk<
    void,
    {
        cardId: string;
        title: string;
        client_name: string;
        estimated_value: number;
        column_id: string;
        assigned_to: string | null;
        notes: string;
    },
    { rejectValue: string }
>(
    'board/updateCardDetails',
    async (payload, { rejectWithValue }) => {
        try {
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

            if (error) throw error;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal menyimpan detail kartu';
            return rejectWithValue(msg);
        }
    }
);

export const boardSlice = createSlice({
    name: 'board',
    initialState,
    reducers: {
        clearBoardState: (state) => {
            state.currentBoard = null;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBoardByType.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchBoardByType.fulfilled, (state, action) => {
                state.currentBoard = action.payload;
                state.isLoading = false;
                state.error = null

            })
            .addCase(fetchBoardByType.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? "Gagal memuat board"
            })
    }
});

export const { clearBoardState } = boardSlice.actions;
export default boardSlice.reducer;