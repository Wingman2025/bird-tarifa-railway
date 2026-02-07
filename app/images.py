from __future__ import annotations

from io import BytesIO


def normalize_upload_image(*, payload: bytes, content_type: str) -> bytes:
    """Normalize uploaded image bytes for consistent browser rendering.

    Currently this only fixes JPEG EXIF orientation. Some devices store images
    "rotated" in the pixel data and rely on the EXIF Orientation tag. Browsers
    and CSS properties don't always apply it consistently once the image is
    uploaded and served from S3, so we transpose and re-encode when needed.
    """

    if content_type != "image/jpeg":
        return payload

    try:
        from PIL import Image, ImageOps  # type: ignore[import-not-found]
    except Exception:
        # Pillow is optional at runtime; fail open if it's not available.
        return payload

    try:
        with Image.open(BytesIO(payload)) as img:
            try:
                orientation = img.getexif().get(274)
            except Exception:
                orientation = None

            if not orientation or orientation == 1:
                return payload

            fixed = ImageOps.exif_transpose(img)
            out = BytesIO()
            fixed.convert("RGB").save(
                out,
                format="JPEG",
                quality=92,
                optimize=True,
                progressive=True,
            )
            return out.getvalue()
    except Exception:
        return payload

