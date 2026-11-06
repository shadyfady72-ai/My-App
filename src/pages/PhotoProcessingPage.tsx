import { Crop, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Card, EmptyState, PageTitle } from '@/components/ui';
import { useStore } from '@/store';

export default function PhotoProcessingPage() {
  const { state } = useStore();
  const processedIds = new Set(state.processed.map((p) => p.photoId));

  if (state.nurseries.length === 0) {
    return (
      <div>
        <PageTitle title="معالجة الصور" desc="الصور المختارة تتعالج تلقائياً: قص بنسبة الحضانة ووضع إطار الحضانة على كامل الصورة." />
        <EmptyState icon={Crop} title="لا توجد حضانات بعد" desc="أضف حضانة وإطارها من صفحة الحضانات لبدء المعالجة التلقائية." />
      </div>
    );
  }

  return (
    <div>
      <PageTitle title="معالجة الصور" desc="الصور المختارة تتعالج تلقائياً: قص بنسبة الحضانة ووضع إطار الحضانة على كامل الصورة." />

      <div className="grid gap-4 stagger">
        {state.nurseries.map((n) => {
          const waiting = state.photos.filter((p) => p.nurseryId === n.id && p.status === 'selected' && !processedIds.has(p.id)).length;
          const done = state.processed.filter((p) => p.nurseryId === n.id).length;
          const total = done + waiting;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <Card key={n.id} interactive>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${waiting > 0 ? 'bg-accent-50 text-accent-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {waiting > 0 ? <Clock size={20} /> : <CheckCircle2 size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-content">{n.name}</p>
                    <p className="mt-0.5 text-sm text-content-faint">
                      معالجة: <span className="tabular-nums font-medium text-content-muted">{done}</span>
                      {' · '}بانتظار: <span className="tabular-nums font-medium text-content-muted">{waiting}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {n.hasFrame ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/40">
                      <CheckCircle2 size={12} /> الإطار جاهز
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/40">
                      <AlertTriangle size={12} /> ارفع إطار الحضانة لبدء المعالجة
                    </span>
                  )}
                </div>
              </div>

              {total > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-content-faint">التقدم</span>
                    <span className="tabular-nums text-content-muted">{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-border">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-accent-600 to-accent-400 transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
