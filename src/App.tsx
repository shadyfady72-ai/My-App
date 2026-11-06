import { useEffect, useState, type ComponentType } from 'react';
import {
  Baby,
  Crop,
  Download,
  LayoutDashboard,
  Moon,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { AutoProcessor } from '@/components/AutoProcessor';
import DashboardPage from '@/pages/DashboardPage';
import NurseriesPage from '@/pages/NurseriesPage';
import PhotoInboxPage from '@/pages/PhotoInboxPage';
import PhotoProcessingPage from '@/pages/PhotoProcessingPage';
import ExportPage from '@/pages/ExportPage';
import SettingsPage from '@/pages/SettingsPage';
import type { PageId } from '@/types';

const NAV_ITEMS: { id: PageId; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'nurseries', label: 'الحضانات', icon: Baby },
  { id: 'inbox', label: 'صندوق الصور', icon: Upload },
  { id: 'processing', label: 'معالجة الصور', icon: Crop },
  { id: 'export', label: 'التصدير', icon: Download },
  { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
];

const PAGES: Record<PageId, ComponentType> = {
  dashboard: DashboardPage,
  nurseries: NurseriesPage,
  inbox: PhotoInboxPage,
  processing: PhotoProcessingPage,
  export: ExportPage,
  settings: SettingsPage,
};

const THEME_KEY = 'nurseryflow:theme';

function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      return;
    }
  }, [dark]);

  return { dark, toggle: () => setDark((v) => !v) };
}

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const { dark, toggle } = useTheme();
  const Page = PAGES[page];

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-content md:flex">
      <Sidebar current={page} onNavigate={setPage} dark={dark} onToggleTheme={toggle} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div key={page} className="animate-slide-up">
          <Page />
        </div>
        <AutoProcessor />
      </main>
    </div>
  );
}

function Sidebar({
  current,
  onNavigate,
  dark,
  onToggleTheme,
}: {
  current: PageId;
  onNavigate: (id: PageId) => void;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [current]);

  return (
    <>
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:self-start md:sticky md:top-0 md:h-screen">
        <SidebarContent current={current} onNavigate={onNavigate} dark={dark} onToggleTheme={onToggleTheme} />
      </aside>

      <div className="md:hidden">
        <div className="flex items-center justify-between border-b border-surface-border bg-surface-card px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-600 text-white">
              <Sparkles size={18} />
            </div>
            <span className="font-bold text-content">NurseryFlow</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle dark={dark} onToggle={onToggleTheme} />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg p-2 text-content-muted hover:bg-surface-hover"
              aria-label="القائمة"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-b border-surface-border bg-surface-card px-3 py-3 animate-slide-down">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavItem key={item.id} item={item} active={current === item.id} onClick={() => onNavigate(item.id)} />
              ))}
            </nav>
          </div>
        )}
      </div>
    </>
  );
}

function SidebarContent({
  current,
  onNavigate,
  dark,
  onToggleTheme,
}: {
  current: PageId;
  onNavigate: (id: PageId) => void;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-navy-900 p-5 text-navy-200">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-glow">
          <Sparkles size={20} />
        </div>
        <div>
          <p className="text-lg font-bold text-white">NurseryFlow</p>
          <p className="text-xs text-navy-400">إدارة صور الحضانات</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.id} item={item} active={current === item.id} onClick={() => onNavigate(item.id)} />
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-navy-800/60 px-4 py-2.5">
          <span className="flex items-center gap-2 text-xs text-navy-300">
            {dark ? <Moon size={14} /> : <Sun size={14} />}
            {dark ? 'الوضع الليلي' : 'الوضع النهاري'}
          </span>
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
        </div>
        <div className="rounded-xl bg-navy-800/60 p-4 text-center">
          <p className="text-xs text-navy-400">NurseryFlow Pro</p>
          <p className="mt-0.5 text-sm font-semibold text-navy-200">إصدار احترافي</p>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
      className="tooltip relative inline-flex h-8 w-14 items-center rounded-full bg-navy-700 transition-colors duration-300"
      data-tip={dark ? 'الوضع النهاري' : 'الوضع الليلي'}
    >
      <span
        className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ${
          dark ? 'translate-x-1' : 'translate-x-7'
        }`}
      >
        {dark ? <Moon size={14} className="text-navy-800" /> : <Sun size={14} className="text-amber-500" />}
      </span>
    </button>
  );
}

function NavItem({
  item,
  active,
  onClick,
}: {
  item: { id: PageId; label: string; icon: LucideIcon };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-gradient-to-l from-accent-600/30 to-accent-600/10 text-white'
          : 'text-navy-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      {active && (
        <span className="absolute -start-5 h-7 w-1.5 rounded-full bg-accent-400" />
      )}
      <Icon
        size={18}
        className={`transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`}
      />
      {item.label}
    </button>
  );
}
