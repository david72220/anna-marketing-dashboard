"use client";

export default function FilterChips({
  items,
  active,
  onChange,
}: {
  items: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="filter-chips">
      {items.map((item) => (
        <button
          key={item.id}
          className={`filter-chip ${active === item.id ? "active" : ""}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}