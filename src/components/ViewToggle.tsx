import { LayoutGrid, Table2 } from 'lucide-react';

/** Modo de visualizacion de una lista: tarjetas o tabla. */
export type ViewMode = 'cards' | 'table';

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

const baseClass =
  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-small transition-colors';
const activeClass = 'bg-brand text-white';
const idleClass =
  'text-muted hover:text-ink dark:text-night-muted dark:hover:text-night-ink';

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-line p-0.5 dark:border-night-line"
      role="group"
      aria-label="Cambiar la forma de visualizacion"
    >
      <button
        type="button"
        onClick={() => onChange('cards')}
        aria-pressed={view === 'cards'}
        className={`${baseClass} ${view === 'cards' ? activeClass : idleClass}`}
      >
        <LayoutGrid size={15} /> Tarjetas
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={view === 'table'}
        className={`${baseClass} ${view === 'table' ? activeClass : idleClass}`}
      >
        <Table2 size={15} /> Tabla
      </button>
    </div>
  );
}