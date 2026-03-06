import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crop as CropIcon, RotateCcw } from "lucide-react";

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export default function ImageCropDialog({ open, imageSrc, onClose, onCropComplete }: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setCrop(centerAspectCrop(naturalWidth, naturalHeight, 1));
  }, []);

  const resetCrop = () => {
    if (!imgRef.current) return;
    setCrop(centerAspectCrop(imgRef.current.naturalWidth, imgRef.current.naturalHeight, 1));
  };

  const handleApply = useCallback(async () => {
    const img = imgRef.current;
    if (!img || !completedCrop) return;

    const canvas = document.createElement("canvas");
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const size = Math.round(Math.max(completedCrop.width * scaleX, completedCrop.height * scaleY));
    const outputSize = Math.min(size, 1200);
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0, outputSize, outputSize
    );

    canvas.toBlob(
      (blob) => { if (blob) onCropComplete(blob); },
      "image/webp",
      0.85
    );
  }, [completedCrop, onCropComplete]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <CropIcon className="w-4 h-4 text-primary" />
            Crop Image (1:1)
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-h-[60vh] overflow-auto rounded-lg border border-border bg-muted/30 flex items-center justify-center">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop={false}
              className="max-w-full"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-w-full max-h-[55vh] object-contain"
                crossOrigin="anonymous"
              />
            </ReactCrop>
          </div>

          <div className="flex items-center gap-2 w-full">
            <Button type="button" variant="outline" size="sm" onClick={resetCrop} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Skip
            </Button>
            <Button type="button" size="sm" onClick={handleApply} disabled={!completedCrop} className="gap-1.5">
              <CropIcon className="w-3.5 h-3.5" />
              Crop & Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
