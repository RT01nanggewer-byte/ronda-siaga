import { useEffect } from "react";

export function PhotoViewer({
  src,
  caption,
  onClose,
}: {
  src: string;
  caption?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black/92"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-3 py-2 text-sm text-white"
        onClick={onClose}
      >
        Tutup
      </button>
      <img
        src={src}
        alt={caption ?? "Foto ronda"}
        className="mx-auto my-auto max-h-[82dvh] max-w-[96vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {caption ? (
        <p className="px-5 pb-8 text-center text-sm text-white/80" onClick={(e) => e.stopPropagation()}>
          {caption}
        </p>
      ) : null}
    </div>
  );
}
