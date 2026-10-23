import { checkIsOnline } from '@/lib/network';
import { supabase } from '@/lib/supabase';
import { boardCacheService } from '@/services/boardCacheService';
import { quotationCacheService } from '@/services/quotationCacheService';
import { quotationService } from '@/services/quotationService';
import { CardItem, ColumnItem } from '@/store/slices/boardSlice';

export interface UrgentOrderProductionCard {
  id: string;
  title: string;
  client_name: string | null;
  client_phone?: string | null;
  estimated_value: number;
  column_title: string;
  column_color: string;
  due_date: string;
  diff_days: number;
  is_overdue: boolean;
  is_near_due: boolean;
}

export interface ProductionDueStats {
  totalUrgentCount: number;
  nearDueCount: number;
  overdueCount: number;
  safeCount: number;
  totalActiveCount: number;
  urgentOrders: UrgentOrderProductionCard[];
}

export const orderWorkflowService = {
  /**
   * Menghitung tanggal deadline N hari dari hari ini (default: 20 hari).
   * Format: YYYY-MM-DD
   */
  calculateDeadline(daysOffset: number = 20): string {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  /**
   * Mengambil due date dari kartu (kolom due_date langsung atau tag [DEADLINE: YYYY-MM-DD] di notes)
   */
  getCardDueDate(card: {
    due_date?: string | null;
    notes?: string | null;
    created_at?: string;
  }): string | null {
    if (card.due_date) {
      return card.due_date.split('T')[0];
    }
    if (card.notes) {
      const match = card.notes.match(/\[DEADLINE:\s*(\d{4}-\d{2}-\d{2})\]/i);
      if (match && match[1]) {
        return match[1];
      }
    }
    // Fallback opsional jika kartu dibuat di board produksi tanpa deadline explisit
    if (card.created_at) {
      try {
        const d = new Date(card.created_at);
        d.setDate(d.getDate() + 20);
        return d.toISOString().split('T')[0];
      } catch {
        return null;
      }
    }
    return null;
  },

  /**
   * Menghitung selisih hari dari hari ini ke tanggal deadline (dalam hari bulat)
   * Positif = sisa hari menuju deadline
   * Nol / Negatif = terlambat / overdue
   */
  getDaysRemaining(dueDateStr: string): number {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const target = new Date(dueDateStr);
      target.setHours(0, 0, 0, 0);

      const diffTime = target.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 999;
    }
  },

  /**
   * Deteksi apakah kartu di Board Marketing masuk ke tahap "DP (Deal Payment)".
   * Jika ya, otomatis copy kartu ke "Board Produksi" > "Order Masuk" dengan deadline 20 hari.
   */
  async handleMarketingDpTransition(
    cardId: string,
    targetColumnId: string
  ): Promise<{ copied: boolean; message?: string }> {
    try {
      console.log(`[orderWorkflow] Memeriksa transisi kartu ${cardId} ke kolom ${targetColumnId}`);

      // 1. Ambil data Board Marketing untuk verifikasi apakah targetColumnId adalah DP
      const marketingBoard = await boardCacheService.getBoardCache('marketing');
      let targetColumn: ColumnItem | undefined = marketingBoard?.board_columns?.find(
        (c) => c.id === targetColumnId
      );

      // Jika tidak di cache, coba cari dari Supabase jika online
      if (!targetColumn) {
        const { data: colData } = await supabase
          .from('board_columns')
          .select('id, title, position, board_id, boards!inner(type)')
          .eq('id', targetColumnId)
          .single();

        if (colData) {
          targetColumn = {
            id: colData.id,
            board_id: colData.board_id,
            title: colData.title,
            position: colData.position,
            color_hex: '',
            board_cards: [],
          };
        }
      }

      if (!targetColumn) {
        return { copied: false, message: 'Target kolom tidak ditemukan' };
      }

      const colTitleLower = targetColumn.title.toLowerCase();
      const isDpStage =
        colTitleLower.includes('dp') ||
        colTitleLower.includes('deal payment') ||
        colTitleLower.includes('down payment');

      if (!isDpStage) {
        return { copied: false, message: 'Bukan kolom DP' };
      }

      // 2. Ambil data kartu asal (dari marketing cache atau query Supabase)
      let sourceCard: CardItem | null = null;
      if (marketingBoard) {
        for (const col of marketingBoard.board_columns) {
          const found = col.board_cards?.find((c) => c.id === cardId);
          if (found) {
            sourceCard = found;
            break;
          }
        }
      }

      if (!sourceCard) {
        const { data: cardRow } = await supabase
          .from('board_cards')
          .select('*, card_attachments(*)')
          .eq('id', cardId)
          .single();
        if (cardRow) {
          sourceCard = cardRow as unknown as CardItem;
        }
      }

      if (!sourceCard) {
        return { copied: false, message: 'Kartu asal tidak ditemukan' };
      }

      // 3. Ambil Board Produksi beserta kolomnya
      let prodBoard = await boardCacheService.getBoardCache('production');
      if (!prodBoard) {
        const { data: pbData, error: pbErr } = await supabase
          .from('boards')
          .select('id, name, type, board_columns(id, title, position, color_hex, board_cards(*))')
          .eq('type', 'production')
          .single();

        if (pbErr || !pbData) {
          console.error('[orderWorkflow] Gagal mengambil Board Produksi:', pbErr);
          return { copied: false, message: 'Board Produksi tidak ditemukan' };
        }
        prodBoard = pbData as any;
      }

      if (!prodBoard || !prodBoard.board_columns) {
        return { copied: false, message: 'Kolom Board Produksi kosong' };
      }

      // 4. Cari kolom "Order Masuk" (position 1 atau title 'order masuk')
      const orderMasukCol =
        prodBoard.board_columns.find(
          (c) => c.title.toLowerCase().includes('order masuk')
        ) ||
        prodBoard.board_columns.sort((a, b) => a.position - b.position)[0];

      if (!orderMasukCol) {
        return { copied: false, message: 'Kolom Order Masuk tidak ditemukan' };
      }

      // 5. Cek apakah kartu ini SUDAH PERNAH dicopy ke Board Produksi (Idempotensi)
      const existingInProduction = orderMasukCol.board_cards?.some(
        (c) =>
          c.source_card_id === cardId ||
          c.notes?.includes(`[SRC:${cardId}]`) ||
          (c.title === sourceCard!.title && c.client_name === sourceCard!.client_name)
      );

      if (existingInProduction) {
        console.log(`[orderWorkflow] Kartu ${cardId} sudah pernah dicopy ke Order Masuk Produksi. Melewati.`);
        return { copied: false, message: 'Sudah pernah disalin sebelumnya' };
      }

      // Cek juga di database online jika online
      const isOnline = await checkIsOnline();
      if (isOnline) {
        const { data: dupCheck } = await supabase
          .from('board_cards')
          .select('id')
          .eq('board_id', prodBoard.id)
          .or(`notes.ilike.%[SRC:${cardId}]%,title.eq.${sourceCard.title}`);

        if (dupCheck && dupCheck.length > 0) {
          console.log(`[orderWorkflow] Ditemukan kartu serupa di database online. Melewati duplikasi.`);
          return { copied: false, message: 'Kartu serupa sudah ada di database' };
        }
      }

      // 6. Ambil durasi pengerjaan dari Surat Penawaran (durasi pengerjaan (hari kerja))
      let durationDays = 20; // Default fallback jika belum ada penawaran dibuat
      try {
        let linkedQuotation = await quotationService.getQuotationByCardId(cardId);
        if (!linkedQuotation) {
          const cachedQuotations = await quotationCacheService.getQuotationsCache();
          linkedQuotation =
            cachedQuotations?.find(
              (q) =>
                q.card_id === cardId ||
                (q.client_name === sourceCard!.client_name &&
                  q.project_title === sourceCard!.title)
            ) || null;
        }

        if (
          linkedQuotation?.work_duration_days &&
          Number(linkedQuotation.work_duration_days) > 0
        ) {
          durationDays = Number(linkedQuotation.work_duration_days);
          console.log(
            `[orderWorkflow] Menggunakan durasi pengerjaan dari Surat Penawaran: ${durationDays} hari kerja`
          );
        }
      } catch (qErr) {
        console.warn(
          '[orderWorkflow] Gagal mengambil durasi penawaran, menggunakan default 20 hari:',
          qErr
        );
      }

      // Hitung deadline: tanggal hari ini + durasi pengerjaan (hari kerja) dari penawaran
      const deadline = this.calculateDeadline(durationDays);
      const newPosition = (orderMasukCol.board_cards?.length || 0) + 1;

      // Sisipkan metadata [SRC:...] dan [DEADLINE:...] agar tahan banting jika kolom database belum dimigrasi
      const notesClean = (sourceCard.notes || '').replace(/\[SRC:[^\]]+\]/g, '').replace(/\[DEADLINE:[^\]]+\]/g, '').trim();
      const notesWithMetadata = `[Order Masuk dari Marketing] [SRC:${cardId}] [DEADLINE:${deadline}] ${notesClean}`.trim();

      const newCardPayload = {
        board_id: prodBoard.id,
        column_id: orderMasukCol.id,
        title: sourceCard.title,
        client_name: sourceCard.client_name || null,
        client_phone: sourceCard.client_phone || null,
        estimated_value: sourceCard.estimated_value || 0,
        assigned_to: sourceCard.assigned_to || null,
        notes: notesWithMetadata,
        position: newPosition,
      };

      console.log(`[orderWorkflow] Mengcopy kartu "${sourceCard.title}" ke Board Produksi > Order Masuk dengan deadline ${deadline}`);

      let createdCardId: string | null = null;

      if (isOnline) {
        // Coba insert dengan kolom due_date dan source_card_id
        try {
          const { data: inserted, error: insertErr } = await supabase
            .from('board_cards')
            .insert({
              ...newCardPayload,
              due_date: deadline,
              source_card_id: cardId,
            })
            .select('id')
            .single();

          if (insertErr) {
            // Jika kolom due_date belum dibuat di supabase (error 42703), fallback ke payload tanpa kolom tersebut
            if (insertErr.code === '42703') {
              console.warn('[orderWorkflow] Kolom due_date belum ada di database, fallback insert via notes metadata:', insertErr.message);
              const { data: fbInserted, error: fbErr } = await supabase
                .from('board_cards')
                .insert(newCardPayload)
                .select('id')
                .single();

              if (fbErr) throw fbErr;
              createdCardId = fbInserted?.id || null;
            } else {
              throw insertErr;
            }
          } else {
            createdCardId = inserted?.id || null;
          }
        } catch (dbErr) {
          console.error('[orderWorkflow] Gagal insert kartu produksi ke Supabase:', dbErr);
        }
      }

      // 7. Perbarui cache lokal Board Produksi
      const localNewCard: CardItem = {
        id: createdCardId || `local_prod_${Date.now()}`,
        board_id: prodBoard.id,
        column_id: orderMasukCol.id,
        title: sourceCard.title,
        client_name: sourceCard.client_name,
        client_phone: sourceCard.client_phone,
        estimated_value: sourceCard.estimated_value,
        assigned_to: sourceCard.assigned_to,
        notes: notesWithMetadata,
        position: newPosition,
        due_date: deadline,
        source_card_id: cardId,
      };

      // Tambahkan ke cache lokal Board Produksi
      orderMasukCol.board_cards = [...(orderMasukCol.board_cards || []), localNewCard];
      await boardCacheService.saveBoardCache('production', prodBoard);

      console.log(`[orderWorkflow] Sukses mencopy kartu ke Board Produksi (ID: ${localNewCard.id})`);
      return { copied: true, message: 'Berhasil dicopy ke Board Produksi' };
    } catch (err: any) {
      console.error('[orderWorkflow] Terjadi error pada handleMarketingDpTransition:', err);
      return { copied: false, message: err?.message || 'Error auto-copy' };
    }
  },

  /**
   * Menghitung statistik pesanan masuk & produksi yang mendekati tenggat deadline
   * Threshold default: 10 hari sebelum masa tenggat
   */
  async getProductionDueStatistics(
    thresholdDays: number = 10
  ): Promise<ProductionDueStats> {
    try {
      // 1. Ambil data Board Produksi (cache lokal atau server)
      let prodBoard = await boardCacheService.getBoardCache('production');

      const isOnline = await checkIsOnline();
      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from('boards')
            .select(`
              id,
              name,
              type,
              board_columns (
                id,
                title,
                position,
                color_hex,
                board_cards (*)
              )
            `)
            .eq('type', 'production')
            .single();

          if (!error && data) {
            prodBoard = data as any;
            await boardCacheService.saveBoardCache('production', prodBoard!);
          }
        } catch (e) {
          console.warn('[orderWorkflow] Menggunakan fallback cache board produksi untuk statistik deadline');
        }
      }

      if (!prodBoard || !prodBoard.board_columns) {
        return {
          totalUrgentCount: 0,
          nearDueCount: 0,
          overdueCount: 0,
          safeCount: 0,
          totalActiveCount: 0,
          urgentOrders: [],
        };
      }

      const urgentOrders: UrgentOrderProductionCard[] = [];
      let totalActiveCount = 0;
      let safeCount = 0;
      let nearDueCount = 0;
      let overdueCount = 0;

      prodBoard.board_columns.forEach((col) => {
        const colTitleLower = col.title.toLowerCase();
        // Lewati tahapan selesai atau batal
        const isDoneOrCancelled =
          colTitleLower.includes('done') ||
          colTitleLower.includes('selesai') ||
          colTitleLower.includes('cancel') ||
          colTitleLower.includes('batal');

        if (isDoneOrCancelled) return;

        (col.board_cards || []).forEach((card) => {
          totalActiveCount++;
          const dueDate = this.getCardDueDate(card);

          if (dueDate) {
            const diffDays = this.getDaysRemaining(dueDate);
            const isOverdue = diffDays <= 0;
            const isNearDue = diffDays > 0 && diffDays <= thresholdDays;

            if (isOverdue) {
              overdueCount++;
            } else if (isNearDue) {
              nearDueCount++;
            } else {
              safeCount++;
            }

            // Masukkan ke daftar urgent jika memenuhi treshold (diffDays <= thresholdDays)
            if (diffDays <= thresholdDays) {
              urgentOrders.push({
                id: card.id,
                title: card.title,
                client_name: card.client_name,
                client_phone: card.client_phone,
                estimated_value: card.estimated_value,
                column_title: col.title,
                column_color: col.color_hex || '#968363',
                due_date: dueDate,
                diff_days: diffDays,
                is_overdue: isOverdue,
                is_near_due: isNearDue,
              });
            }
          } else {
            safeCount++;
          }
        });
      });

      // Urutkan pesanan paling mendesak di urutan teratas (diff_days terendah / negatif dulu)
      urgentOrders.sort((a, b) => a.diff_days - b.diff_days);

      return {
        totalUrgentCount: nearDueCount + overdueCount,
        nearDueCount,
        overdueCount,
        safeCount,
        totalActiveCount,
        urgentOrders,
      };
    } catch (err) {
      console.error('[orderWorkflow] Error kalkulasi statistik produksi:', err);
      return {
        totalUrgentCount: 0,
        nearDueCount: 0,
        overdueCount: 0,
        safeCount: 0,
        totalActiveCount: 0,
        urgentOrders: [],
      };
    }
  },
};
