import type { ReactNode } from 'react';

type BottomNavItem<T extends string> = {
  id: T;
  label: string;
  icon: ReactNode;
};

type BottomNavProps<T extends string> = {
  items: BottomNavItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
};

export function BottomNav<T extends string>({
  items,
  activeId,
  onChange,
}: BottomNavProps<T>) {
  return (
    <nav className="bottom-nav" aria-label="Navegacion">
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav__btn ${isActive ? 'bottom-nav__btn--active' : ''}`}
            onClick={() => onChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="bottom-nav__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="bottom-nav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

