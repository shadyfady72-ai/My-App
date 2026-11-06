import { useEffect, useRef, useState } from 'react';
import { Baby, CheckCheck, Images, Send, TrendingUp, Clock, Zap } from 'lucide-react';
import { Card, PageTitle } from '@/components/ui';
import { useStore } from '@/store';

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const from = prevRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  delay,
}: {
  label: string;
  value: number;
  icon: typeof Baby;
  tone: string;
  delay: number;
}) {
  const animated = useCountUp(value);
  return (
    <div
      className="rounded-2xl bg-surface-card p-5 shadow-card ring-1 ring-surface-border transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
      style={{ animation: `slideUp 0.4s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={20} />
        </div>
        <TrendingUp size={16} className="text-content-faint" />
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums text-content">{animated}</p>
      <p className="mt-1 text-sm text-content-faint">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { state } = useStore();
  const today = new Date().toISOString().slice(0, 10);

  const stats = [
    { label: 'عدد الحضانات', value: state.nurseries.length, icon: Baby, tone: 'bg-accent-50 text-accent-600' },
    { label: 'الصور المستلمة اليوم', value: state.photos.filter((p) => p.batchDate === today).length, icon: Images, tone: 'bg-sky-50 text-sky-600' },
    { label: 'الصور المختارة', value: state.photos.filter((p) => p.status === 'selected').length, icon: CheckCheck, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'الصور المعالجة', value: state.processed.length, icon: Send, tone: 'bg-violet-50 text-violet-600' },
  ];

  const recentBatches = [...state.photos]
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, 8);

  return (
    <div className="min-w-0">
      <PageTitle title="لوحة التحكم" desc="نظرة سريعة على نشاط الحضانات وحالة الصور والمعالجة." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} delay={i * 60} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 min-w-0">
          <div className="mb-4 flex items-center gap-2">
            <Clock size={18} className="text-content-faint" />
            <h2 className="font-bold text-content">آخر الصور المضافة</h2>
          </div>
          {recentBatches.length === 0 ? (
            <p className="py-8 text-center text-sm text-content-faint">لا توجد صور بعد. ابدأ برفع صور من صندوق الصور.</p>
          ) : (
            <div className="space-y-2">
              {recentBatches.map((p, i) => {
                const nursery = state.nurseries.find((n) => n.id === p.nurseryId);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-2.5 transition-colors hover:bg-surface-hover"
                    style={{ animation: `fadeIn 0.3s ease-out ${i * 40}ms both` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-2 w-2 rounded-full ${p.status === 'selected' ? 'bg-emerald-500' : p.status === 'rejected' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                      <span className="truncate text-sm font-medium text-content">{p.fileName}</span>
                    </div>
                    <span className="shrink-0 text-xs text-content-faint">{nursery?.name ?? '—'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Zap size={18} className="text-accent-500" />
            <h2 className="font-bold text-content">حالة المعالجة</h2>
          </div>
          <div className="space-y-3">
            {state.nurseries.slice(0, 5).map((n) => {
              const total = state.photos.filter((p) => p.nurseryId === n.id).length;
              const done = state.processed.filter((p) => p.nurseryId === n.id).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={n.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-content-muted">{n.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-content-faint">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-border">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-accent-600 to-accent-400 transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {state.nurseries.length === 0 && (
              <p className="py-4 text-center text-sm text-content-faint">لا توجد حضانات بعد.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
