import { useEffect, useState } from "react";
import {
  fetchPlacePhotoName,
  placePhotoMediaUrl,
  rememberPlacePhotoName,
} from "../lib/google-places";
import { GENERIC_TRIP_IMAGE } from "../lib/trip-default-image";

export type PlacePhotoSource = {
  photo_name: string | null;
  place_id: string | null;
};

type Props = PlacePhotoSource & {
  className?: string;
  imgClassName?: string;
  maxWidthPx?: number;
  alt?: string;
};

function resolveSrc(
  photoName: string | null,
  maxWidthPx: number,
): string {
  if (photoName) {
    const url = placePhotoMediaUrl(photoName, maxWidthPx);
    if (url) return url;
  }
  return GENERIC_TRIP_IMAGE;
}

export function PlaceLocationImage({
  photo_name,
  place_id,
  className = "",
  imgClassName = "h-full w-full object-cover",
  maxWidthPx = 800,
  alt = "",
}: Props) {
  const [src, setSrc] = useState(() => resolveSrc(photo_name, maxWidthPx));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (photo_name) {
      if (place_id) rememberPlacePhotoName(place_id, photo_name);
      setSrc(resolveSrc(photo_name, maxWidthPx));
      return;
    }
    if (!place_id) {
      setSrc(GENERIC_TRIP_IMAGE);
      return;
    }

    let cancelled = false;
    void fetchPlacePhotoName(place_id).then((name) => {
      if (cancelled) return;
      setSrc(resolveSrc(name, maxWidthPx));
    });
    return () => {
      cancelled = true;
    };
  }, [photo_name, place_id, maxWidthPx]);

  const displaySrc = failed ? GENERIC_TRIP_IMAGE : src;

  return (
    <div className={`overflow-hidden bg-slate-100 ${className}`}>
      <img
        src={displaySrc}
        alt={alt}
        className={imgClassName}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
