type TabItem<T extends string> = {
  id: T;
  label: string;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
};

export function Tabs<T extends string>({ items, activeId, onChange }: TabsProps<T>) {
  return (
    <nav className="tabs" aria-label="Secciones">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`tab-btn ${activeId === item.id ? 'tab-btn--active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
