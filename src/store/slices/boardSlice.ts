import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { boardCacheService } from "@/services/boardCacheService";
import {
    boardService,
    CreateCardPayload,
    CreateColumnPayload,
    MoveCardPayload,
    UpdateCardPayload,
    UpdateColumnPayload,
} from "@/services/boardService";
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
    client_phone?: string | null;
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

// Async Thunk: Mengambil data board beserta kolom, kartu, dan lampiran dari Supabase via boardService (Stale-While-Revalidate)
export const fetchBoardByType = createAsyncThunk<BoardData, string, { rejectValue: string }>(
    'board/fetchBoardByType',
    async (boardType: string, { dispatch, rejectWithValue }) => {
        // 1. Muat data offline terlebih dahulu secara instan jika ada di cache lokal (0ms render)
        const cached = await boardCacheService.getBoardCache(boardType);
        if (cached) {
            dispatch(boardSlice.actions.setBoardFromCache(cached));
        }

        try {
            return await boardService.getBoardByType(boardType);
        } catch (err: unknown) {
            if (cached) return cached;
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

// 3. Thunk untuk membuat kartu baru
export const createCard = createAsyncThunk<
    void,
    CreateCardPayload,
    { rejectValue: string }
>(
    'board/createCard',
    async (payload, { rejectWithValue }) => {
        try {
            await boardService.createCard(payload);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal membuat kartu';
            return rejectWithValue(msg);
        }
    }
);

// 4. Thunk untuk menghapus kartu
export const deleteCard = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>(
    'board/deleteCard',
    async (cardId, { rejectWithValue }) => {
        try {
            await boardService.deleteCard(cardId);
            return cardId;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal menghapus kartu';
            return rejectWithValue(msg);
        }
    }
);

// 5. Thunk untuk menambah kolom baru
export const createColumn = createAsyncThunk<
    void,
    CreateColumnPayload,
    { rejectValue: string }
>(
    'board/createColumn',
    async (payload, { rejectWithValue }) => {
        try {
            await boardService.createColumn(payload);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal membuat kolom';
            return rejectWithValue(msg);
        }
    }
);

// 6. Thunk untuk mengubah nama / warna kolom
export const updateColumn = createAsyncThunk<
    UpdateColumnPayload,
    UpdateColumnPayload,
    { rejectValue: string }
>(
    'board/updateColumn',
    async (payload, { rejectWithValue }) => {
        try {
            await boardService.updateColumn(payload);
            return payload;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal mengubah kolom';
            return rejectWithValue(msg);
        }
    }
);

// 7. Thunk untuk menghapus kolom
export const deleteColumn = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>(
    'board/deleteColumn',
    async (columnId, { rejectWithValue }) => {
        try {
            await boardService.deleteColumn(columnId);
            return columnId;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal menghapus kolom';
            return rejectWithValue(msg);
        }
    }
);

// 8. Thunk untuk menghapus lampiran/foto
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
        setBoardFromCache: (state, action: PayloadAction<BoardData>) => {
            state.currentBoard = action.payload;
            state.isLoading = false;
            state.error = null;
        },
        optimisticMoveCard: (state, action: PayloadAction<MoveCardPayload>) => {
            if (!state.currentBoard) return;
            const { cardId, targetColumnId, newPosition } = action.payload;

            let movedCard: CardItem | null = null;

            // 1. Temukan dan hapus kartu dari kolom asal
            state.currentBoard.board_columns.forEach((col) => {
                const idx = col.board_cards.findIndex((c) => c.id === cardId);
                if (idx !== -1) {
                    movedCard = { ...col.board_cards[idx] };
                    col.board_cards.splice(idx, 1);
                }
            });

            // 2. Masukkan kartu ke kolom tujuan dengan posisi baru
            if (movedCard) {
                const targetCol = state.currentBoard.board_columns.find((c) => c.id === targetColumnId);
                if (targetCol) {
                    (movedCard as CardItem).column_id = targetColumnId;
                    (movedCard as CardItem).position = newPosition;
                    targetCol.board_cards.push(movedCard);
                    targetCol.board_cards.sort((a, b) => a.position - b.position);
                }
            }
        },
        optimisticUpdateCard: (state, action: PayloadAction<UpdateCardPayload>) => {
            if (!state.currentBoard) return;
            const payload = action.payload;

            let updatedCard: CardItem | null = null;
            let currentColumnId: string | null = null;

            state.currentBoard.board_columns.forEach((col) => {
                const card = col.board_cards.find((c) => c.id === payload.cardId);
                if (card) {
                    currentColumnId = col.id;
                    Object.assign(card, {
                        title: payload.title,
                        client_name: payload.client_name,
                        client_phone: payload.client_phone,
                        estimated_value: payload.estimated_value,
                        assigned_to: payload.assigned_to,
                        notes: payload.notes,
                        column_id: payload.column_id,
                    });
                    updatedCard = { ...card };
                }
            });

            // Jika kolom berubah, pindahkan ke kolom tujuan
            if (updatedCard && currentColumnId && currentColumnId !== payload.column_id) {
                const oldCol = state.currentBoard.board_columns.find((c) => c.id === currentColumnId);
                const newCol = state.currentBoard.board_columns.find((c) => c.id === payload.column_id);
                if (oldCol && newCol) {
                    oldCol.board_cards = oldCol.board_cards.filter((c) => c.id !== payload.cardId);
                    newCol.board_cards.push(updatedCard);
                    newCol.board_cards.sort((a, b) => a.position - b.position);
                }
            }
        },
        optimisticDeleteCard: (state, action: PayloadAction<string>) => {
            if (!state.currentBoard) return;
            state.currentBoard.board_columns.forEach((col) => {
                col.board_cards = col.board_cards.filter((c) => c.id !== action.payload);
            });
        },
    },
    extraReducers: (builder) => {
        builder
            // fetchBoardByType: Silent background refresh jika board sudah ada agar tidak memicu flicker/reload
            .addCase(fetchBoardByType.pending, (state, action) => {
                const requestedType = action.meta.arg;
                if (!state.currentBoard || state.currentBoard.type !== requestedType) {
                    state.isLoading = true;
                }
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
            })
            // deleteCard: buang kartu dari state lokal tanpa perlu refetch
            .addCase(deleteCard.fulfilled, (state, action) => {
                state.currentBoard?.board_columns.forEach((col) => {
                    col.board_cards = col.board_cards.filter((c) => c.id !== action.payload);
                });
            })
            .addCase(deleteCard.rejected, (state, action) => {
                state.error = action.payload ?? "Gagal menghapus kartu";
            })
            // updateColumn: perbarui judul & warna kolom secara lokal
            .addCase(updateColumn.fulfilled, (state, action) => {
                const col = state.currentBoard?.board_columns.find(
                    (c) => c.id === action.payload.columnId
                );
                if (col) {
                    col.title = action.payload.title;
                    col.color_hex = action.payload.color_hex;
                }
            })
            // deleteColumn: buang kolom dari state lokal
            .addCase(deleteColumn.fulfilled, (state, action) => {
                if (state.currentBoard) {
                    state.currentBoard.board_columns = state.currentBoard.board_columns.filter(
                        (c) => c.id !== action.payload
                    );
                }
            });
    },
});

export const {
    clearBoardState,
    setBoardFromCache,
    optimisticMoveCard,
    optimisticUpdateCard,
    optimisticDeleteCard,
} = boardSlice.actions;
export default boardSlice.reducer;
