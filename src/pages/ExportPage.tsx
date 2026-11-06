import { useState } from 'react';
import { Download, FileArchive, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { Button, Card, EmptyState, PageTitle, ProgressBar, inputClass, useToast } from '@/components/ui';
import { buildZip, collectExport, downloadBlob } from '@/lib/exportZip';
import { useStore } from '@/store';

export default function ExportPage() {
  const { state } = useStore();
  const toast = useToast();
  const [nurseryId, setNurseryId] = useState('all');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const preview = collectExport(state, nurseryId === 'all' ? undefined : nurseryId);
  const imageCount = preview.reduce((sum, n) => sum + n.images.length, 0);

  async function exportZip() {
    setBusy(true);
    setMessage(null);
    setSuccess(false);
    setProgress(0);
    try {
      const blob = await buildZip(preview, state.settings.namingPattern, setProgress);
      downloadBlob(blob, `NurseryFlow_${new Date().toISOString().slice(0, 10)}.zip`);
      setMessage('تم تجهيز الملف وبدأ التنزيل.');
      setSuccess(true);
      toast('success', 'تم تنزيل الملف المضغوط بنجاح');
    } catch {
      setMessage('تعذر تجهيز الملف، حاول مرة أخرى.');
      setSuccess(false);
      toast('error', 'تعذر تجهيز الملف، حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle title="التصدير" desc="نزّل الصور المعالجة في ملف مضغوط واحد، مرتبة في مجلد لكل حضانة." />

      {imageCount === 0 && !busy ? (
        <EmptyState
          icon={Package}
          title="لا توجد صور معالجة بعد"
          desc="ارفع الصور من صندوق الصور وتأكد من رفع إطار الحضانة لبدء المعالجة التلقائية."
        />
      ) : (
        <Card className="max-w-2xl">
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-content-muted">اختر الحضانة</label>
            <select className={`${inputClass} md:w-72`} value={nurseryId} onChange={(e) => setNurseryId(e.target.value)}>
              <option value="all">كل الحضانات</option>
              {state.nurseries.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
              <FileArchive size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-content">صور معالجة جاهزة للتنزيل</p>
              <p className="text-2xl font-bold tabular-nums text-content">{imageCount}</p>
            </div>
          </div>

          {busy && (
            <div className="mt-5 animate-slide-up">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-accent-700">جاري تجهيز الملف المضغوط…</span>
                <span className="tabular-nums text-content-faint">{progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}

          <Button className="mt-5 w-full" disabled={busy || imageCount === 0} onClick={exportZip}>
            <Download size={18} /> {busy ? `جاري التجهيز ${progress}%` : 'تنزيل الملف المضغوط'}
          </Button>

          {message && !busy && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium animate-slide-down ${
              success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
            }`}>
              {success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {message}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
