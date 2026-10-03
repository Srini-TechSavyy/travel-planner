import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  filterTripNameSuggestions,
  getTripNameSuggestions,
} from "../lib/trip-name-suggestions";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function TripNameInput({ value, onChange, placeholder }: Props) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const allSuggestions = useMemo(() => getTripNameSuggestions(), []);
  const suggestions = useMemo(
    () => filterTripNameSuggestions(allSuggestions, value),
    [allSuggestions, value],
  );

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function selectSuggestion(name: string) {
    onChange(name);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showPanel = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <input
        required
        value={value}
        onChange={(e) => {
          setActiveIndex(-1);
          onChange(e.target.value);
        }}
        onFocus={() => {
          setActiveIndex(-1);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="input"
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={showPanel ? listId : undefined}
        aria-expanded={showPanel}
      />
      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((name, index) => (
            <li key={name} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 ${
                  index === activeIndex ? "bg-teal-50" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(name)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
