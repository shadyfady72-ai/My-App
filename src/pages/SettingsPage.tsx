import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Upload, RotateCcw, Eye, EyeOff, Trash2, Sliders } from 'lucide-react';
import { Button, Card, PageTitle, inputClass, useBlobUrl, useToast } from '@/components/ui';
import { keys } from '@/lib/db';
import { RATIO, DEFAULT_STYLE, applyStyle } from '@/lib/image';
import type { PhotoStyle } from '@/types';
import { useStore } from '@/store';
import type { NamingPattern, Photo, RatioKey } from '@/types';

export default function SettingsPage() {
  const { state, dispatch, actions } = useStore();
  const { settings } = state;
  const update = (patch: Partial<typeof settings>) => dispatch({ type: 'settings/update', patch });

  return (
    <div>
      <PageTitle title="الإعدادات" desc="هذه القيم المستخدمة في معالجة الصور وطريقة تسمية الملفات عند التصدير." />
      <div className="grid max-w-5xl gap-6 stagger">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-bold text-content"><Sliders size={18} className="text-accent-500" /> إعدادات المعالجة</h2>
          <div className="grid gap-4">
            <label className="text-sm font-medium text-content-muted">
              نسبة الصورة عند المعالجة
              <select className={`${inputClass} mt-1.5`} value={settings.ratio} onChange={(e) => update({ ratio: e.target.value as RatioKey })}>
                <option value="3:4">3:4</option>
                <option value="4:5">4:5</option>
                <option value="1:1">1:1</option>
              </select>
            </label>
          </div>
          <label className="mt-4 block text-sm font-medium text-content-muted">
            طريقة تسمية الصور عند التصدير
            <select className={`${inputClass} mt-1.5`} value={settings.namingPattern} onChange={(e) => update({ namingPattern: e.target.value as NamingPattern })}>
              <option value="sequential">ترقيم بسيط (image_01)</option>
              <option value="nursery_sequential">اسم الحضانة مع الرقم</option>
              <option value="date_sequential">التاريخ مع الرقم</option>
            </select>
          </label>
          <div className="mt-5">
            <Slider
              label="جودة الصور المعالجة"
              value={settings.jpegQuality}
              min={0.6}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(jpegQuality) => update({ jpegQuality })}
            />
          </div>
        </Card>

        <StyleEditor />

        <Card>
          <h2 className="flex items-center gap-2 font-bold text-content"><Trash2 size={18} className="text-rose-500" /> حذف الصور والبيانات المؤقتة</h2>
          <p className="mt-2 text-sm text-content-faint">
            يحذف كل الصور المرفوعة والمعالجة. الحضانات (الاسم والصورة والإطار) وإعدادات الإضاءة والألوان هتفضل زي ما هي.
          </p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => window.confirm('حذف كل الصور والبيانات المؤقتة؟') && actions.clearPhotoData()}
          >
            حذف الصور والبيانات
          </Button>
        </Card>
      </div>
    </div>
  );
}

interface SliderDef {
  key: keyof PhotoStyle;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderDef[] = [
  { key: 'exposure', label: 'Exposure — التعريض', min: -100, max: 100, step: 1 },
  { key: 'brightness', label: 'Brightness — السطوع', min: -100, max: 100, step: 1 },
  { key: 'contrast', label: 'Contrast — التباين', min: -100, max: 100, step: 1 },
  { key: 'highlights', label: 'Highlights — المناطق المضيئة', min: -100, max: 100, step: 1 },
  { key: 'shadows', label: 'Shadows — الظلال', min: -100, max: 100, step: 1 },
  { key: 'whites', label: 'Whites — الأبيض', min: -100, max: 100, step: 1 },
  { key: 'blacks', label: 'Blacks — الأسود', min: -100, max: 100, step: 1 },
  { key: 'temperature', label: 'Temperature — الحرارة اللونية', min: -100, max: 100, step: 1 },
  { key: 'tint', label: 'Tint — التوازن اللوني', min: -100, max: 100, step: 1 },
  { key: 'vibrance', label: 'Vibrance — تقوية ذكية للألوان', min: -100, max: 100, step: 1 },
  { key: 'saturation', label: 'Saturation — تشبع الألوان', min: -100, max: 100, step: 1 },
  { key: 'sharpness', label: 'Sharpness — الحدة والوضوح', min: 0, max: 100, step: 1 },
];

function StyleEditor() {
  const { state, dispatch } = useStore();
  const style = state.settings.style;
  const updateStyle = (patch: Partial<PhotoStyle>) =>
    dispatch({ type: 'settings/update', patch: { style: { ...style, ...patch } } });

  const samplePhoto = useMemo(() => state.photos.find((p) => p.status !== 'rejected'), [state.photos]);
  const [uploaded, setUploaded] = useState<Blob | null>(null);
  const [showBefore, setShowBefore] = useState(false);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-content">إعدادات الإضاءة والألوان</h2>
          <p className="mt-2 text-sm text-content-faint">أدوات احترافية للتحكم في الصورة مثل Adobe Camera Raw. التعديلات تظهر مباشرة على المعاينة وتُطبق على الصور المعالجة.</p>
        </div>
        <Button variant="ghost" onClick={() => updateStyle({ ...DEFAULT_STYLE })}>
          <RotateCcw size={16} /> إعادة الكل
        </Button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <PreviewCanvas
          photo={samplePhoto}
          uploaded={uploaded}
          style={style}
          showBefore={showBefore}
          ratio={state.settings.ratio}
        />

        <div className="flex flex-col gap-3">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-surface-hover px-3 py-1.5 text-sm font-medium text-content-muted transition-colors hover:bg-surface-border">
                <Upload size={15} /> رفع صورة للتجربة
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { setUploaded(e.target.files?.[0] ?? null); e.target.value = ''; }}
                />
              </label>
              {uploaded && <button onClick={() => setUploaded(null)} className="text-xs text-rose-600 hover:underline">إزالة</button>}
            </div>
            <button
              onClick={() => setShowBefore((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-surface-hover px-3 py-1.5 text-sm font-medium text-content-muted transition-colors hover:bg-surface-border"
            >
              {showBefore ? <Eye size={15} /> : <EyeOff size={15} />}
              {showBefore ? 'After' : 'Before'}
            </button>
          </div>

          <div className="grid gap-2.5">
            {SLIDERS.map((s) => (
              <Slider
                key={s.key}
                label={s.label}
                value={style[s.key]}
                min={s.min}
                max={s.max}
                step={s.step}
                format={(v) => v > 0 ? `+${v}` : `${v}`}
                onChange={(v) => updateStyle({ [s.key]: v })}
                onReset={() => updateStyle({ [s.key]: DEFAULT_STYLE[s.key] })}
                defaultValue={DEFAULT_STYLE[s.key]}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PreviewCanvas({
  photo,
  uploaded,
  style,
  showBefore,
  ratio,
}: {
  photo: Photo | undefined;
  uploaded: Blob | null;
  style: PhotoStyle;
  showBefore: boolean;
  ratio: RatioKey;
}) {
  const photoUrl = useBlobUrl(photo ? keys.thumb(photo.id) : null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const srcUrl = uploaded ? URL.createObjectURL(uploaded) : photoUrl;

  useEffect(() => {
    if (!srcUrl) { setBitmap(null); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(srcUrl);
        const blob = await res.blob();
        const bmp = await createImageBitmap(blob);
        if (!cancelled) setBitmap(bmp);
      } catch {
        if (!cancelled) setBitmap(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [srcUrl]);

  const render = useCallback(() => {
    if (!bitmap || !canvasRef.current) return;
    const [rw, rh] = RATIO[ratio];
    const canvas = canvasRef.current;
    const W = 440;
    const H = Math.round((W * rh) / rw);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, W, H);
    const scale = Math.max(W / bitmap.width, H / bitmap.height);
    const dw = bitmap.width * scale;
    const dh = bitmap.height * scale;
    const x = (W - dw) / 2;
    const y = (H - dh) / 2;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, x, y, dw, dh);
    if (!showBefore) applyStyle(canvas, style);
  }, [bitmap, style, showBefore, ratio]);

  useEffect(() => { render(); }, [render]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-hover ring-1 ring-surface-border" style={{ aspectRatio: ratio.replace(':', ' / ') }}>
        <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" />
        {!bitmap && !loading && (
          <div className="absolute flex flex-col items-center gap-1 text-content-faint">
            <ImageIcon size={28} />
            <span className="text-xs">معاينة حية</span>
          </div>
        )}
        {loading && <div className="absolute text-sm text-content-faint">جارٍ التحميل…</div>}
        {showBefore && (
          <span className="absolute right-3 top-3 rounded-md bg-navy-950/60 px-2 py-0.5 text-xs font-medium text-white">Before</span>
        )}
        {!showBefore && (style.exposure || style.brightness || style.contrast || style.highlights || style.shadows || style.whites || style.blacks || style.temperature || style.tint || style.vibrance || style.saturation || style.sharpness) && (
          <span className="absolute right-3 top-3 rounded-md bg-accent-600/80 px-2 py-0.5 text-xs font-medium text-white">After</span>
        )}
      </div>
      {photo && !uploaded && <span className="text-xs text-content-faint">صورة من المرفوعة</span>}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  onReset,
  defaultValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  onReset?: () => void;
  defaultValue?: number;
}) {
  const display = format ? format(value) : value.toFixed(2);
  const changed = onReset !== undefined && defaultValue !== undefined && value !== defaultValue;

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-content-muted">{label}</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={value}
              min={min}
              max={max}
              step={step}
              onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
              className="w-16 rounded-md border border-surface-border bg-surface-card px-1.5 py-0.5 text-right text-xs tabular-nums text-content transition-colors focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/10"
            />
            {onReset && changed && (
              <button
                onClick={onReset}
                aria-label="إعادة"
                className="tooltip rounded p-0.5 text-content-faint transition-colors hover:bg-surface-hover hover:text-content-muted"
                data-tip="إعادة"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-1.5 w-full accent-accent-600"
        />
      </div>
    </div>
  );
}
