import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { quotationCacheService } from '@/services/quotationCacheService';
import {
  Quotation,
  SaveQuotationPayload,
  quotationService,
} from '@/services/quotationService';

export interface QuotationState {
  quotations: Quotation[];
  currentQuotation: Quotation | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  filterStatus: 'all' | 'draft' | 'sent' | 'approved' | 'rejected';
  searchQuery: string;
}

const initialState: QuotationState = {
  quotations: [],
  currentQuotation: null,
  isLoading: false,
  isSaving: false,
  error: null,
  filterStatus: 'all',
  searchQuery: '',
};

// Async Thunks (Stale-While-Revalidate: Offline Cache First)
export const fetchQuotations = createAsyncThunk<Quotation[], void, { rejectValue: string }>(
  'quotation/fetchQuotations',
  async (_, { dispatch, rejectWithValue }) => {
    // 1. Muat data offline terlebih dahulu secara instan jika ada di cache lokal (0ms render)
    const cached = await quotationCacheService.getQuotationsCache();
    if (cached && cached.length > 0) {
      dispatch(quotationSlice.actions.setQuotationsFromCache(cached));
    }

    // 2. Ambil data terbaru dari network di background
    try {
      return await quotationService.getQuotations();
    } catch (err: any) {
      if (cached && cached.length > 0) return cached;
      return rejectWithValue(err.message || 'Gagal memuat daftar surat penawaran');
    }
  }
);

export const fetchQuotationById = createAsyncThunk<Quotation | null, string, { rejectValue: string }>(
  'quotation/fetchQuotationById',
  async (id, { rejectWithValue }) => {
    try {
      return await quotationService.getQuotationById(id);
    } catch (err: any) {
      return rejectWithValue(err.message || 'Gagal memuat surat penawaran');
    }
  }
);

export const createQuotation = createAsyncThunk<Quotation, SaveQuotationPayload, { rejectValue: string }>(
  'quotation/createQuotation',
  async (payload, { rejectWithValue }) => {
    try {
      return await quotationService.createQuotation(payload);
    } catch (err: any) {
      return rejectWithValue(err.message || 'Gagal membuat surat penawaran');
    }
  }
);

export const updateQuotation = createAsyncThunk<
  Quotation,
  { id: string; payload: SaveQuotationPayload },
  { rejectValue: string }
>('quotation/updateQuotation', async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await quotationService.updateQuotation(id, payload);
  } catch (err: any) {
    return rejectWithValue(err.message || 'Gagal memperbarui surat penawaran');
  }
});

export const updateQuotationStatus = createAsyncThunk<
  { id: string; status: 'draft' | 'sent' | 'approved' | 'rejected' },
  { id: string; status: 'draft' | 'sent' | 'approved' | 'rejected' },
  { rejectValue: string }
>('quotation/updateQuotationStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    await quotationService.updateStatus(id, status);
    return { id, status };
  } catch (err: any) {
    return rejectWithValue(err.message || 'Gagal mengubah status penawaran');
  }
});

export const deleteQuotation = createAsyncThunk<string, string, { rejectValue: string }>(
  'quotation/deleteQuotation',
  async (id, { rejectWithValue }) => {
    try {
      await quotationService.deleteQuotation(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Gagal menghapus surat penawaran');
    }
  }
);

const quotationSlice = createSlice({
  name: 'quotation',
  initialState,
  reducers: {
    setCurrentQuotation(state, action: PayloadAction<Quotation | null>) {
      state.currentQuotation = action.payload;
    },
    setFilterStatus(state, action: PayloadAction<'all' | 'draft' | 'sent' | 'approved' | 'rejected'>) {
      state.filterStatus = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    clearQuotationError(state) {
      state.error = null;
    },
    setQuotationsFromCache(state, action: PayloadAction<Quotation[]>) {
      if (state.quotations.length === 0) {
        state.quotations = action.payload;
        state.isLoading = false;
        state.error = null;
      }
    },
    // Optimistic Reducers (0ms UI Response)
    optimisticUpdateStatus(
      state,
      action: PayloadAction<{ id: string; status: 'draft' | 'sent' | 'approved' | 'rejected' }>
    ) {
      const q = state.quotations.find((item) => item.id === action.payload.id);
      if (q) {
        q.status = action.payload.status;
      }
      if (state.currentQuotation?.id === action.payload.id) {
        state.currentQuotation.status = action.payload.status;
      }
    },
    optimisticDeleteQuotation(state, action: PayloadAction<string>) {
      state.quotations = state.quotations.filter((q) => q.id !== action.payload);
      if (state.currentQuotation?.id === action.payload) {
        state.currentQuotation = null;
      }
    },
    optimisticAddQuotation(state, action: PayloadAction<Quotation>) {
      const exists = state.quotations.some((q) => q.id === action.payload.id);
      if (!exists) {
        state.quotations.unshift(action.payload);
      }
    },
    optimisticUpdateQuotation(state, action: PayloadAction<Quotation>) {
      const index = state.quotations.findIndex((q) => q.id === action.payload.id);
      if (index !== -1) {
        state.quotations[index] = action.payload;
      }
      if (state.currentQuotation?.id === action.payload.id) {
        state.currentQuotation = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // fetchQuotations (Resilient & Silent Background Fetch)
    builder.addCase(fetchQuotations.pending, (state) => {
      // Hanya tampilkan loading spinner jika belum ada data penawaran sama sekali di layar
      if (state.quotations.length === 0) {
        state.isLoading = true;
      }
      state.error = null;
    });
    builder.addCase(fetchQuotations.fulfilled, (state, action) => {
      state.isLoading = false;
      state.quotations = action.payload;
    });
    builder.addCase(fetchQuotations.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Gagal memuat penawaran';
    });

    // fetchQuotationById
    builder.addCase(fetchQuotationById.fulfilled, (state, action) => {
      state.currentQuotation = action.payload;
    });

    // createQuotation
    builder.addCase(createQuotation.pending, (state) => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(createQuotation.fulfilled, (state, action) => {
      state.isSaving = false;
      state.quotations.unshift(action.payload);
      state.currentQuotation = action.payload;
    });
    builder.addCase(createQuotation.rejected, (state, action) => {
      state.isSaving = false;
      state.error = action.payload || 'Gagal membuat penawaran';
    });

    // updateQuotation
    builder.addCase(updateQuotation.pending, (state) => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(updateQuotation.fulfilled, (state, action) => {
      state.isSaving = false;
      const index = state.quotations.findIndex((q) => q.id === action.payload.id);
      if (index !== -1) {
        state.quotations[index] = action.payload;
      }
      state.currentQuotation = action.payload;
    });
    builder.addCase(updateQuotation.rejected, (state, action) => {
      state.isSaving = false;
      state.error = action.payload || 'Gagal memperbarui penawaran';
    });

    // updateQuotationStatus
    builder.addCase(updateQuotationStatus.fulfilled, (state, action) => {
      const q = state.quotations.find((item) => item.id === action.payload.id);
      if (q) {
        q.status = action.payload.status;
      }
      if (state.currentQuotation?.id === action.payload.id) {
        state.currentQuotation.status = action.payload.status;
      }
    });

    // deleteQuotation
    builder.addCase(deleteQuotation.fulfilled, (state, action) => {
      state.quotations = state.quotations.filter((q) => q.id !== action.payload);
      if (state.currentQuotation?.id === action.payload) {
        state.currentQuotation = null;
      }
    });
  },
});

export const {
  setCurrentQuotation,
  setFilterStatus,
  setSearchQuery,
  clearQuotationError,
  setQuotationsFromCache,
  optimisticUpdateStatus,
  optimisticDeleteQuotation,
  optimisticAddQuotation,
  optimisticUpdateQuotation,
} = quotationSlice.actions;

export default quotationSlice.reducer;
