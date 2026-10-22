import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { boardService, MoveCardPayload, UpdateCardPayload } from "@/services/boardService";
import { cardAttachmentService } from "@/services/cardAttachmentService";

export interface Profile {
    id: string;
    full_name: string;
}

export interface AttachmentItem {
    id: string;
    card_id: string;
    file_name: string;
    file_url: string;
    file_type?: string;
    file_size?: number;
    created_at: string;
}

export interface CardItem {
    id: string;
    board_id: string;
    column_id: string;
    title: string;
    client_name: string | null;
    estimated_value: number;
    assigned_to: string | null;
    position: number;
    notes?: string | null;
    profiles?: Profile | null;
    card_attachments?: AttachmentItem[];
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
    currentBoard: BoardData | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: BoardState = {
    currentBoard: null,
    isLoading: false,
    error: null,
};

// Async Thunk: Mengambil data board beserta kolom, kartu, dan lampiran dari Supabase via boardService
export const fetchBoardByType = createAsyncThunk<BoardData, string, { rejectValue: string }>(
    'board/fetchBoardByType',
    async (boardType: string, { rejectWithValue }) => {
        try {
            return await boardService.getBoardByType(boardType);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal memuat data board';
            return rejectWithValue(msg);
        }
    }
);

// 1. Thunk untuk memindahkan posisi/kolom kartu
export const moveCard = createAsyncThunk<
    void,
    MoveCardPayload,
    { rejectValue: string }
>(
    'board/moveCard',
    async (payload, { rejectWithValue }) => {
        try {
            await boardService.moveCard(payload);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal memindahkan kartu';
            return rejectWithValue(msg);
        }
    }
);

// 2. Thunk untuk mengedit detail kartu (Nama, Klien, Nilai, PIC, Notes, Kolom)
export const updateCardDetails = createAsyncThunk<
    void,
    UpdateCardPayload,
    { rejectValue: string }
>(
    'board/updateCardDetails',
    async (payload, { rejectWithValue }) => {
        try {
            await boardService.updateCardDetails(payload);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal menyimpan detail kartu';
            return rejectWithValue(msg);
        }
    }
);

// 3. Thunk untuk menghapus lampiran/foto
export const deleteAttachment = createAsyncThunk<
    string,
    { attachmentId: string; filePath: string },
    { rejectValue: string }
>(
    'board/deleteAttachment',
    async ({ attachmentId, filePath }, { rejectWithValue }) => {
        try {
            await cardAttachmentService.deleteAttachmentById(attachmentId, filePath);
            return attachmentId;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal menghapus lampiran';
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
        },
    },
    extraReducers: (builder) => {
        builder
            // fetchBoardByType
            .addCase(fetchBoardByType.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchBoardByType.fulfilled, (state, action) => {
                state.currentBoard = action.payload;
                state.isLoading = false;
                state.error = null;
            })
            .addCase(fetchBoardByType.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? "Gagal memuat board";
            })
            // moveCard Error
            .addCase(moveCard.rejected, (state, action) => {
                state.error = action.payload ?? "Gagal memindahkan kartu";
            })
            // updateCardDetails Error
            .addCase(updateCardDetails.rejected, (state, action) => {
                state.error = action.payload ?? "Gagal menyimpan detail kartu";
            });
    },
});

export const { clearBoardState } = boardSlice.actions;
export default boardSlice.reducer;
