import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import boardReducer from './slices/boardSlice';
import quotationReducer from './slices/quotationSlice';
import invoiceReducer from './slices/invoiceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    board: boardReducer,
    quotation: quotationReducer,
    invoice: invoiceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
