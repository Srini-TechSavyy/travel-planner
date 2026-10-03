import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { TripLocationMeta } from "../../shared/trip-location";
import {
  fetchPlaceDetails,
  fetchPlaceSuggestions,
  isGooglePlacesConfigured,
  type PlaceSuggestion,
} from "../lib/google-places";

export type SelectedPlaceDetails = TripLocationMeta & { display_name: string };

const DEBOUNCE_MS = 300;
const MIN_INPUT_LENGTH = 2;

type Props = {
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  onPlaceSelected: (place: SelectedPlaceDetails) => void;
  onPlaceCleared: () => void;
  selectedDisplayName: string | null;
};

export function LocationAutocompleteInput({
  value,
  placeholder,
  onValueChange,
  onPlaceSelected,
  onPlaceCleared,
  selectedDisplayName,
}: Props) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const selectedLabelRef = useRef<string | null>(selectedDisplayName);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resolving, setResolving] = useState(false);

  const placesEnabled = isGooglePlacesConfigured();

  useEffect(() => {
    selectedLabelRef.current = selectedDisplayName;
  }, [selectedDisplayName]);

  const ensureSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = crypto.randomUUID();
    }
    return sessionTokenRef.current;
  }, []);

  const endSession = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  const cancelPending = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const runAutocomplete = useCallback(
    (input: string) => {
      cancelPending();
      if (!placesEnabled || resolving) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      const trimmed = input.trim();
      if (trimmed.length < MIN_INPUT_LENGTH) {
        setSuggestions([]);
        setStatusMessage(null);
        setOpen(false);
        return;
      }

      if (selectedLabelRef.current && trimmed === selectedLabelRef.current) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);
        setStatusMessage(null);
        void (async () => {
          try {
            const token = ensureSessionToken();
            const results = await fetchPlaceSuggestions(
              trimmed,
              token,
              controller.signal,
            );
            if (controller.signal.aborted) return;
            setSuggestions(results);
            setActiveIndex(results.length > 0 ? 0 : -1);
            setOpen(true);
            if (results.length === 0) {
              setStatusMessage("No matching places found.");
            }
          } catch (err) {
            if (controller.signal.aborted) return;
            setSuggestions([]);
            setOpen(true);
            setStatusMessage(
              err instanceof Error
                ? err.message
                : "Unable to load suggestions.",
            );
          } finally {
            if (!controller.signal.aborted) setLoading(false);
          }
        })();
      }, DEBOUNCE_MS);
    },
    [cancelPending, ensureSessionToken, placesEnabled, resolving],
  );

  useEffect(() => {
    return () => cancelPending();
  }, [cancelPending]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function selectSuggestion(suggestion: PlaceSuggestion) {
    cancelPending();
    setOpen(false);
    setSuggestions([]);
    setResolving(true);
    setStatusMessage(null);

    const token = ensureSessionToken();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const details = await fetchPlaceDetails(
        suggestion.placeId,
        token,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      selectedLabelRef.current = details.display_name;
      onValueChange(details.display_name);
      onPlaceSelected(details);
      endSession();
    } catch (err) {
      if (controller.signal.aborted) return;
      selectedLabelRef.current = suggestion.label;
      onValueChange(suggestion.label);
      onPlaceCleared();
      setStatusMessage(
        err instanceof Error ? err.message : "Unable to load place details.",
      );
      endSession();
    } finally {
      setResolving(false);
    }
  }

  function handleInputChange(next: string) {
    if (
      selectedLabelRef.current != null &&
      next !== selectedLabelRef.current
    ) {
      selectedLabelRef.current = null;
      onPlaceCleared();
      ensureSessionToken();
    }
    onValueChange(next);
    runAutocomplete(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) =>
        i <= 0 ? suggestions.length - 1 : i - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showPanel =
    open &&
    (loading || suggestions.length > 0 || Boolean(statusMessage));

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (!placesEnabled) return;
          ensureSessionToken();
          if (value.trim().length >= MIN_INPUT_LENGTH) {
            runAutocomplete(value);
          }
        }}
        onKeyDown={handleKeyDown}
        className="input"
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={showPanel ? listId : undefined}
        aria-expanded={showPanel}
        disabled={resolving}
      />
      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {loading && (
            <li className="px-3 py-3 text-sm text-slate-500">
              Loading suggestions…
            </li>
          )}
          {!loading &&
            suggestions.map((suggestion, index) => (
              <li key={suggestion.placeId} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={`block w-full px-3 py-3 text-left text-sm text-slate-800 hover:bg-slate-50 ${
                    index === activeIndex ? "bg-teal-50" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void selectSuggestion(suggestion)}
                >
                  {suggestion.label}
                </button>
              </li>
            ))}
          {!loading && suggestions.length === 0 && statusMessage && (
            <li className="px-3 py-3 text-sm text-slate-500">{statusMessage}</li>
          )}
        </ul>
      )}
    </div>
  );
}
