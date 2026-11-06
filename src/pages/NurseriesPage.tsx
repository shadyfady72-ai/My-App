import { useState, type FormEvent } from 'react';
import { Baby, Pencil, Plus, Trash2, Frame, ImageIcon, AlertCircle } from 'lucide-react';
import { Button, Card, EmptyState, Modal, PageTitle, inputClass, useBlobUrl, useObjectUrl, useToast } from '@/components/ui';
import { keys } from '@/lib/db';
import { useStore } from '@/store';
import type { Nursery } from '@/types';

export default function NurseriesPage() {
  const { state, actions } = useStore();
  const [editing, setEditing] = useState<Nursery | 'new' | null>(null);

  return (
    <div>
      <PageTitle
        title="الحضانات"
        desc="أضف اسم كل حضانة وصورتها وإطارها الشفاف، وسيُستخدم تلقائياً في المعالجة."
        actions={<Button onClick={() => setEditing('new')}><Plus size={18} />إضافة حضانة</Button>}
      />

      {state.nurseries.length === 0 ? (
        <EmptyState icon={Baby} title="لا توجد حضانات بعد" desc="أضف أول حضانة لبدء رفع الصور ومعالجتها." />
      ) : (
        <div className="grid gap-4 stagger md:grid-cols-2 xl:grid-cols-3">
          {state.nurseries.map((n) => (
            <Card key={n.id} interactive>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar nurseryId={n.id} name={n.name} hasAvatar={n.hasAvatar} />
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-content">{n.name}</h3>
                    <p className="mt-0.5 text-xs text-content-faint">حضانة نشطة</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label="تعديل"
                    onClick={() => setEditing(n)}
                    className="tooltip rounded-lg p-2 text-content-faint transition-all hover:bg-surface-hover hover:text-content"
                    data-tip="تعديل"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="حذف"
                    onClick={() => window.confirm(`حذف ${n.name} وكل صورها؟`) && actions.deleteNursery(n.id)}
                    className="tooltip rounded-lg p-2 text-content-faint transition-all hover:bg-rose-50 hover:text-rose-600"
                    data-tip="حذف"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 ${
                  n.hasFrame ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/40' : 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/40'
                }`}>
                  <Frame size={12} />
                  {n.hasFrame ? 'الإطار جاهز' : 'بدون إطار'}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 ${
                  n.hasAvatar ? 'bg-accent-50 text-accent-700 ring-accent-100 dark:bg-accent-900/30 dark:text-accent-300 dark:ring-accent-800/40' : 'bg-surface-hover text-content-muted ring-surface-border'
                }`}>
                  <ImageIcon size={12} />
                  {n.hasAvatar ? 'صورة موجودة' : 'بدون صورة'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <NurseryForm
          key={editing === 'new' ? 'new' : editing.id}
          nursery={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Avatar({ nurseryId, name, hasAvatar }: { nurseryId: string; name: string; hasAvatar: boolean }) {
  const url = useBlobUrl(hasAvatar ? keys.avatar(nurseryId) : null);
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent-50 to-accent-100 text-lg font-bold text-accent-700 ring-1 ring-accent-100">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : name.charAt(0)}
    </div>
  );
}

function NurseryForm({ nursery, onClose }: { nursery: Nursery | null; onClose: () => void }) {
  const { actions } = useStore();
  const toast = useToast();
  const [d, setD] = useState<Nursery>(nursery ?? { id: crypto.randomUUID(), name: '', hasAvatar: false, hasFrame: false });
  const [avatar, setAvatar] = useState<Blob | null | undefined>(undefined);
  const [frame, setFrame] = useState<Blob | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const newAvatarUrl = useObjectUrl(avatar ?? null);
  const savedAvatarUrl = useBlobUrl(nursery?.hasAvatar && avatar === undefined ? keys.avatar(nursery.id) : null);
  const newFrameUrl = useObjectUrl(frame ?? null);
  const savedFrameUrl = useBlobUrl(nursery?.hasFrame && frame === undefined ? keys.frame(nursery.id) : null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!d.name.trim()) return setError('اكتب اسم الحضانة أولاً.');
    setSaving(true);
    try {
      await actions.saveNursery({ ...d, name: d.name.trim() }, avatar, frame);
      toast('success', nursery ? 'تم تحديث الحضانة بنجاح' : 'تمت إضافة الحضانة بنجاح');
      onClose();
    } catch {
      setError('تعذر حفظ البيانات، حاول مرة أخرى.');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={nursery ? 'تعديل الحضانة' : 'إضافة حضانة'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" form="nursery-form" disabled={saving}>{saving ? 'جاري الحفظ…' : 'حفظ'}</Button>
        </>
      }
    >
      <form id="nursery-form" onSubmit={save} className="grid gap-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-content-muted">اسم الحضانة</label>
          <input className={inputClass} placeholder="اكتب اسم الحضانة" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100 ring-1 ring-accent-100 dark:from-accent-900/40 dark:to-accent-800/40 dark:ring-accent-800/40">
            {(newAvatarUrl ?? savedAvatarUrl) ? (
              <img src={(newAvatarUrl ?? savedAvatarUrl) as string} alt="معاينة الصورة" className="h-full w-full object-cover" />
            ) : (
              <Baby className="text-accent-400" size={28} />
            )}
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-content-muted">
              صورة الحضانة
              <input type="file" accept="image/*" className="mt-1 block w-full text-sm text-content-faint file:mr-3 file:rounded-lg file:border-0 file:bg-accent-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-700 hover:file:bg-accent-100 dark:file:bg-accent-900/40 dark:file:text-accent-300" onChange={(e) => setAvatar(e.target.files?.[0] ?? undefined)} />
            </label>
            {avatar === undefined && nursery?.hasAvatar && <button type="button" onClick={() => setAvatar(null)} className="mt-2 text-xs text-rose-600 hover:underline">إزالة الصورة</button>}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-content-muted">
            الإطار الشفاف (PNG)
            <input type="file" accept="image/png" className="mt-1 block w-full text-sm text-content-faint file:mr-3 file:rounded-lg file:border-0 file:bg-accent-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-700 hover:file:bg-accent-100 dark:file:bg-accent-900/40 dark:file:text-accent-300" onChange={(e) => setFrame(e.target.files?.[0] ?? undefined)} />
          </label>
          <div className="checkerboard mt-3 flex h-48 items-center justify-center overflow-hidden rounded-xl ring-1 ring-surface-border">
            {newFrameUrl ?? savedFrameUrl ? (
              <img src={(newFrameUrl ?? savedFrameUrl) as string} alt="معاينة الإطار" className="h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-content-faint">
                <Frame size={24} />
                <span className="text-sm">لا توجد معاينة للإطار</span>
              </div>
            )}
          </div>
          {frame === undefined && nursery?.hasFrame && <button type="button" onClick={() => setFrame(null)} className="mt-2 text-xs text-rose-600 hover:underline">إزالة الإطار</button>}
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
