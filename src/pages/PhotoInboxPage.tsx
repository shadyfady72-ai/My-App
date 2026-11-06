import { useMemo, useState } from 'react';
import { Trash2, Upload, ImageIcon, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button, Card, EmptyState, PageTitle, ProgressBar, Thumb, useToast, inputClass } from '@/components/ui';
import { analyze, makeThumb } from '@/lib/image';
import { autoReview } from '@/lib/autoReview';
import { blobs, keys } from '@/lib/db';
import { useStore } from '@/store';
import type { Photo } from '@/types';

const today = () => new Date().toISOString().slice(0, 10);

export default function PhotoInboxPage() {
  const { state, dispatch, actions } = useStore();
  const toast = useToast();
  const [nurseryId, setNurseryId] = useState('');
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const nursery = state.nurseries.find((n) => n.id === nurseryId) ?? state.nurseries[0];

  const batches = useMemo(() => {
    const counts = new Map<string, number>();
    state.photos
      .filter((p) => p.nurseryId === nursery?.id)
      .forEach((p) => counts.set(p.batchDate, (counts.get(p.batchDate) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [state.photos, nursery?.id]);

  const batchPhotos = state.photos
    .filter((p) => p.nurseryId === nursery?.id && p.batchDate === date)
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt));

  async function importFiles(list: File[]) {
    if (!nursery) return;
    const images = list.filter((f) => f.type.startsWith('image/'));
    const added: Photo[] = [];
    let failed = list.length - images.length;
    for (const [i, file] of images.entries()) {
      setBusy(`جاري تجهيز ${i + 1} من ${images.length}`);
      setProgress(Math.round(((i) / images.length) * 100));
      try {
        const bmp = await createImageBitmap(file);
        const id = crypto.randomUUID();
        const stats = analyze(bmp);
        const thumb = await makeThumb(bmp);
        await Promise.all([blobs.put(keys.original(id), file), blobs.put(keys.thumb(id), thumb)]);
        bmp.close();
        added.push({
          id,
          nurseryId: nursery.id,
          batchDate: date,
          fileName: file.name,
          ...stats,
          status: 'unreviewed',
          addedAt: new Date().toISOString(),
        });
      } catch {
        failed++;
      }
    }
    const batch = [...state.photos.filter((p) => p.nurseryId === nursery.id && p.batchDate === date), ...added];
    const decisions = autoReview(batch);
    const newIds = new Set(added.map((p) => p.id));
    const reviewed = added.map((p): Photo => ({ ...p, status: decisions.get(p.id) ?? 'selected' }));
    if (reviewed.length) dispatch({ type: 'photos/add', photos: reviewed });
    for (const status of ['selected', 'rejected'] as const) {
      const ids = batch
        .filter((p) => !newIds.has(p.id) && p.status === 'unreviewed' && decisions.get(p.id) === status)
        .map((p) => p.id);
      if (ids.length) dispatch({ type: 'photos/status', ids, status });
    }
    const rejectedCount = reviewed.filter((p) => p.status === 'rejected').length;
    setBusy(null);
    setProgress(100);
    toast(
      'success',
      `تمت إضافة ${added.length} صورة: ${added.length - rejectedCount} مختارة و${rejectedCount} مرفوضة تلقائياً${failed ? `، وتعذر قراءة ${failed} ملف` : ''}.`,
    );
    setTimeout(() => setProgress(0), 500);
  }

  if (state.nurseries.length === 0) {
    return (
      <div>
        <PageTitle title="صندوق الصور" desc="ارفع صور كل حضانة حسب التاريخ. يمكنك اختيار عدة صور معاً أو سحبها هنا." />
        <EmptyState icon={ImageIcon} title="لا توجد حضانات بعد" desc="أضف حضانة أولاً من صفحة الحضانات لبدء رفع الصور." />
      </div>
    );
  }

  return (
    <div>
      <PageTitle title="صندوق الصور" desc="ارفع صور كل حضانة حسب التاريخ. يمكنك اختيار عدة صور معاً أو سحبها هنا." />

      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <select className={inputClass} value={nursery?.id} onChange={(e) => setNurseryId(e.target.value)}>
            {state.nurseries.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void importFiles(Array.from(e.dataTransfer.files));
          }}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 ${
            dragOver
              ? 'border-accent-500 bg-accent-50 scale-[1.01]'
              : 'border-surface-border bg-surface-muted hover:border-accent-300 hover:bg-accent-50/30'
          }`}
        >
          <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-200 ${dragOver ? 'bg-accent-100 text-accent-600 scale-110' : 'bg-accent-50 text-accent-500'}`}>
            <Upload size={26} />
          </div>
          <span className="font-semibold text-content">{dragOver ? 'أفلت الصور هنا' : 'اسحب الصور هنا أو اضغط للاختيار'}</span>
          <span className="mt-1.5 text-sm text-content-faint">JPG أو PNG، ويمكن اختيار عدة صور معاً</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void importFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </label>

        {busy && (
          <div className="mt-4 animate-slide-up">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-accent-700">{busy}</span>
              <span className="tabular-nums text-content-faint">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        )}
      </Card>

      {batches.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {batches.map(([d, count]) => (
            <button
              key={d}
              type="button"
              onClick={() => setDate(d)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                d === date
                  ? 'bg-accent-600 text-white shadow-sm'
                  : 'bg-surface-card text-content-muted ring-1 ring-surface-border hover:bg-surface-hover hover:ring-surface-border'
              }`}
            >
              {d} <span className="opacity-70">({count})</span>
            </button>
          ))}
        </div>
      )}

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-content">صور دفعة {date} <span className="text-content-faint">({batchPhotos.length})</span></h2>
          {batchPhotos.length > 0 && (
            <Button variant="ghost" onClick={() => window.confirm('حذف كل صور هذه الدفعة من القائمة؟') && actions.removePhotos(batchPhotos.map((p) => p.id))}>
              <Trash2 size={16} />حذف الكل
            </Button>
          )}
        </div>

        {batchPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-content-faint">
              <ImageIcon size={26} />
            </div>
            <p className="text-sm text-content-faint">لا توجد صور في هذه الدفعة بعد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {batchPhotos.map((p, i) => (
              <div
                key={p.id}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-surface-border transition-all duration-200 hover:ring-accent-300 hover:shadow-md"
                style={{ animation: `scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) ${i * 30}ms both` }}
              >
                <Thumb blobKey={keys.thumb(p.id)} className="h-full w-full" />
                {p.status === 'rejected' && (
                  <div className="absolute inset-0 bg-navy-950/40 flex items-center justify-center">
                    <XCircle size={20} className="text-white" />
                  </div>
                )}
                {p.status === 'selected' && (
                  <div className="absolute bottom-1.5 start-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                    <CheckCircle2 size={12} />
                  </div>
                )}
                <button
                  type="button"
                  aria-label="إزالة الصورة"
                  onClick={() => actions.removePhotos([p.id])}
                  className="absolute end-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white opacity-100 transition-all duration-200 hover:bg-rose-500 md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
