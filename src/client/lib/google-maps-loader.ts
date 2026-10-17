declare global {
  interface Window {
    google?: typeof google;
  }
}

let loadPromise: Promise<typeof google> | null = null;

function getMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof key === "string" && key.trim() ? key.trim() : undefined;
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(getMapsApiKey());
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (loadPromise) return loadPromise;

  const apiKey = getMapsApiKey();
  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is not configured"));
  }

  loadPromise = new Promise((resolve, reject) => {
    const callbackName = `__tripmateGoogleMapsInit_${Date.now()}`;
    const win = window as unknown as Record<string, () => void>;
    win[callbackName] = () => {
      delete win[callbackName];
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        loadPromise = null;
        reject(new Error("Google Maps JavaScript API did not initialize"));
      }
    };

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker,geometry&callback=${callbackName}`;
    script.onerror = () => {
      delete win[callbackName];
      loadPromise = null;
      reject(new Error("Failed to load Google Maps JavaScript API"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
