import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Invoice,
  PaymentReceipt,
  RecordPaymentPayload,
  SaveInvoicePayload,
  invoiceService,
} from '@/services/invoiceService';
import { Quotation } from '@/services/quotationService';

export interface InvoiceState {
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  filterStatus: 'all' | 'unpaid' | 'partial' | 'paid' | 'cancelled';
  searchQuery: string;
}

const initialState: InvoiceState = {
  invoices: [],
  currentInvoice: null,
  isLoading: false,
  isSaving: false,
  error: null,
  filterStatus: 'all',
  searchQuery: '',
};

// Async Thunks
export const fetchInvoices = createAsyncThunk<Invoice[], void, { rejectValue: string }>(
  'invoice/fetchInvoices',
  async (_, { rejectWithValue }) => {
    try {
      return await invoiceService.getInvoices();
    } catch (err: any) {
      return rejectWithValue(err.message || 'Gagal memuat daftar invoice');
    }
  }
);

export const fetchInvoiceById = createAsyncThunk<Invoice | null, string, { rejectValue: string }>(
  'invoice/fetchInvoiceById',
  async (id, { rejectWithValue }) => {
    try {
      return await invoiceService.getInvoiceById(id);
    } catch (err: any) {
      return rejectWithValue(err.message || 'Gagal memuat detail invoice');
    }
  }
);

export const createInvoice = createAsyncThunk<Invoice, SaveInvoicePayload, { rejectValue: string }>(
  'invoice/createInvoice',
  async (payload, { rejectWithValue }) => {
    try {
      return await invoiceService.createInvoice(payload);
    } catch (err: any) {
      return rejectWithValue(err.message || 'Gagal membuat invoice baru');
    }
  }
);

export const updateInvoice = createAsyncThunk<
  Invoice,
  { id: string; payload: SaveInvoicePayload },
  { rejectValue: string }
>('invoice/updateInvoice', async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await invoiceService.updateInvoice(id, payload);
  } catch (err: any) {
    return rejectWithValue(err.message || 'Gagal memperbarui invoice');
  }
});

export const updateInvoiceStatus = createAsyncThunk<
  { id: string; status: Invoice['status'] },
  { id: string; status: Invoice['status'] },
  { rejectValue: string }
>('invoice/updateInvoiceStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    await invoiceService.updateStatus(id, status);
    return { id, status };
  } catch (err: any) {
    return rejectWithValue(err.message || 'Gagal mengubah status invoice');
  }
});

export const deleteInvoice = createAsyncThunk<string, string, { rejectValue: string }>(
  'invoice/deleteInvoice',
  async (id, { rejectWithValue }) => {
    try {
      await invoiceService.deleteInvoice(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Gagal menghapus invoice');
    }
  }
);

export const recordPayment = createAsyncThunk<
  { invoice: Invoice; payment: PaymentReceipt },
  RecordPaymentPayload,
  { rejectValue: string }
>('invoice/recordPayment', async (payload, { rejectWithValue }) => {
  try {
    const payment = await invoiceService.recordPayment(payload);
    const invoice = (await invoiceService.getInvoiceById(payload.invoice_id)) as Invoice;
    return { invoice, payment };
  } catch (err: any) {
    return rejectWithValue(err.message || 'Gagal mencatat pembayaran');
  }
});

export const deletePayment = createAsyncThunk<
  { invoiceId: string; paymentId: string; updatedInvoice: Invoice },
  { paymentId: string; invoiceId: string },
  { rejectValue: string }
>('invoice/deletePayment', async ({ paymentId, invoiceId }, { rejectWithValue }) => {
  try {
    await invoiceService.deletePayment(paymentId, invoiceId);
    const updatedInvoice = (await invoiceService.getInvoiceById(invoiceId)) as Invoice;
    return { invoiceId, paymentId, updatedInvoice };
  } catch (err: any) {
    return rejectWithValue(err.message || 'Gagal menghapus catatan pembayaran');
  }
});

export const createInvoiceFromQuotation = createAsyncThunk<
  Invoice,
  Quotation,
  { rejectValue: string }
>('invoice/createInvoiceFromQuotation', async (quotation, { rejectWithValue }) => {
  try {
    return await invoiceService.createInvoiceFromQuotation(quotation);
  } catch (err: any) {
    return rejectWithValue(err.message || 'Gagal membuat invoice dari surat penawaran');
  }
});

const invoiceSlice = createSlice({
  name: 'invoice',
  initialState,
  reducers: {
    setFilterStatus: (
      state,
      action: PayloadAction<'all' | 'unpaid' | 'partial' | 'paid' | 'cancelled'>
    ) => {
      state.filterStatus = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setCurrentInvoice: (state, action: PayloadAction<Invoice | null>) => {
      state.currentInvoice = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchInvoices
    builder.addCase(fetchInvoices.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchInvoices.fulfilled, (state, action) => {
      state.isLoading = false;
      state.invoices = action.payload;
    });
    builder.addCase(fetchInvoices.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Terjadi kesalahan';
    });

    // fetchInvoiceById
    builder.addCase(fetchInvoiceById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchInvoiceById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentInvoice = action.payload;
    });
    builder.addCase(fetchInvoiceById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Terjadi kesalahan';
    });

    // createInvoice
    builder.addCase(createInvoice.pending, (state) => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(createInvoice.fulfilled, (state, action) => {
      state.isSaving = false;
      state.invoices.unshift(action.payload);
      state.currentInvoice = action.payload;
    });
    builder.addCase(createInvoice.rejected, (state, action) => {
      state.isSaving = false;
      state.error = action.payload || 'Terjadi kesalahan';
    });

    // updateInvoice
    builder.addCase(updateInvoice.pending, (state) => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(updateInvoice.fulfilled, (state, action) => {
      state.isSaving = false;
      const index = state.invoices.findIndex((inv) => inv.id === action.payload.id);
      if (index !== -1) {
        state.invoices[index] = action.payload;
      }
      state.currentInvoice = action.payload;
    });
    builder.addCase(updateInvoice.rejected, (state, action) => {
      state.isSaving = false;
      state.error = action.payload || 'Terjadi kesalahan';
    });

    // updateInvoiceStatus
    builder.addCase(updateInvoiceStatus.fulfilled, (state, action) => {
      const inv = state.invoices.find((i) => i.id === action.payload.id);
      if (inv) inv.status = action.payload.status;
      if (state.currentInvoice?.id === action.payload.id) {
        state.currentInvoice.status = action.payload.status;
      }
    });

    // deleteInvoice
    builder.addCase(deleteInvoice.fulfilled, (state, action) => {
      state.invoices = state.invoices.filter((inv) => inv.id !== action.payload);
      if (state.currentInvoice?.id === action.payload) {
        state.currentInvoice = null;
      }
    });

    // recordPayment
    builder.addCase(recordPayment.pending, (state) => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(recordPayment.fulfilled, (state, action) => {
      state.isSaving = false;
      const updated = action.payload.invoice;
      const index = state.invoices.findIndex((inv) => inv.id === updated.id);
      if (index !== -1) {
        state.invoices[index] = updated;
      }
      if (state.currentInvoice?.id === updated.id) {
        state.currentInvoice = updated;
      }
    });
    builder.addCase(recordPayment.rejected, (state, action) => {
      state.isSaving = false;
      state.error = action.payload || 'Terjadi kesalahan';
    });

    // deletePayment
    builder.addCase(deletePayment.fulfilled, (state, action) => {
      const updated = action.payload.updatedInvoice;
      const index = state.invoices.findIndex((inv) => inv.id === updated.id);
      if (index !== -1) {
        state.invoices[index] = updated;
      }
      if (state.currentInvoice?.id === updated.id) {
        state.currentInvoice = updated;
      }
    });

    // createInvoiceFromQuotation
    builder.addCase(createInvoiceFromQuotation.pending, (state) => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(createInvoiceFromQuotation.fulfilled, (state, action) => {
      state.isSaving = false;
      state.invoices.unshift(action.payload);
      state.currentInvoice = action.payload;
    });
    builder.addCase(createInvoiceFromQuotation.rejected, (state, action) => {
      state.isSaving = false;
      state.error = action.payload || 'Terjadi kesalahan';
    });
  },
});

export const { setFilterStatus, setSearchQuery, setCurrentInvoice, clearError } =
  invoiceSlice.actions;

export default invoiceSlice.reducer;
