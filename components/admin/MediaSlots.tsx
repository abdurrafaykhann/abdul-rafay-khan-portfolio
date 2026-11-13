"use client";

import { ImageUp, Trash2, Video } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/admin/ui";
import {
  checkImage,
  checkVideo,
  compressImage,
  cropImage,
  uploadFile,
  type PixelArea,
} from "@/lib/admin/upload";

/** Shown on every upload control (client data must be blurred first). */
export function BlurHint() {
  return (
    <p className="text-xs text-amber-200/80">
      Blur client and customer data (names, emails, phone numbers, order
      details) in screenshots before uploading.
    </p>
  );
}

function CropDialog({
  file,
  aspect,
  onCancel,
  onDone,
}: {
  file: File;
  aspect: number;
  onCancel: () => void;
  onDone: (area: PixelArea) => void;
}) {
  const [url] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const area = useRef<PixelArea | null>(null);
  const onComplete = useCallback((_: unknown, px: PixelArea) => {
    area.current = px;
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
    >
      <div className="relative min-h-0 flex-1">
        <Cropper
          image={url}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onComplete}
        />
      </div>
      <div className="mx-auto flex w-full max-w-xl flex-wrap items-center gap-4 pt-4">
        <label className="flex flex-1 items-center gap-3 text-sm">
          Zoom
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#B600A8]"
          />
        </label>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => {
            URL.revokeObjectURL(url);
            if (area.current) onDone(area.current);
          }}
        >
          Crop & upload
        </Button>
      </div>
    </div>
  );
}

/**
 * One image slot: upload → (optional) crop at the slot's shape → compress to
 * WebP → upload to Storage → URL.
 */
export function ImageSlot({
  label,
  value,
  onChange,
  aspect,
  folder,
  slot,
  maxWidth = 2000,
  previewClass = "aspect-video",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** width / height of the crop box; omit for no cropping */
  aspect?: number;
  folder: string;
  slot: string;
  maxWidth?: number;
  previewClass?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const small = await compressImage(file, maxWidth);
      onChange(await uploadFile(small, folder, slot, "webp"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wider uppercase opacity-70">
        {label}
      </span>
      <div
        className={`relative overflow-hidden rounded-2xl border border-dashed border-[#D7E2EA]/25 bg-white/[0.02] ${previewClass}`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs opacity-40">
            Empty (hidden on the site)
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={() => input.current?.click()}
          className="text-xs"
        >
          <ImageUp className="size-4" aria-hidden />
          {busy ? "Uploading…" : value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => onChange("")}
            className="text-xs"
          >
            <Trash2 className="size-4" aria-hidden /> Remove
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        aria-label={`Upload ${label}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const problem = checkImage(file);
          if (problem) return setError(problem);
          if (aspect) setPendingFile(file);
          else void finish(file);
        }}
      />
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
      {pendingFile && aspect && (
        <CropDialog
          file={pendingFile}
          aspect={aspect}
          onCancel={() => setPendingFile(null)}
          onDone={async (area) => {
            const file = pendingFile;
            setPendingFile(null);
            try {
              await finish(await cropImage(file, area));
            } catch (e) {
              setError(e instanceof Error ? e.message : "Crop failed");
            }
          }}
        />
      )}
    </div>
  );
}

/** Short muted clip (MP4/WebM, size-capped) uploaded as-is. */
export function VideoSlot({
  label,
  value,
  onChange,
  folder,
  slot,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  slot: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wider uppercase opacity-70">
        {label}
      </span>
      {value ? (
        <video
          src={value}
          muted
          loop
          playsInline
          controls
          className="aspect-video w-full rounded-2xl bg-black"
        />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-[#D7E2EA]/25 text-xs opacity-40">
          No clip
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={() => input.current?.click()}
          className="text-xs"
        >
          <Video className="size-4" aria-hidden />
          {busy ? "Uploading…" : value ? "Replace" : "Upload clip"}
        </Button>
        {value && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => onChange("")}
            className="text-xs"
          >
            <Trash2 className="size-4" aria-hidden /> Remove
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm"
        hidden
        aria-label={`Upload ${label}`}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const problem = checkVideo(file);
          if (problem) return setError(problem);
          setBusy(true);
          setError(null);
          try {
            onChange(
              await uploadFile(
                file,
                folder,
                slot,
                file.type === "video/webm" ? "webm" : "mp4",
              ),
            );
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setBusy(false);
          }
        }}
      />
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
