from datetime import datetime, timezone
from functools import lru_cache
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from ..config import get_settings


CONTENT_TYPE_TO_EXTENSION = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def _assert_s3_config() -> None:
    settings = get_settings()
    if not settings.s3_bucket_name:
        raise RuntimeError("Missing S3_BUCKET_NAME.")
    if not settings.aws_access_key_id:
        raise RuntimeError("Missing AWS_ACCESS_KEY_ID.")
    if not settings.aws_secret_access_key:
        raise RuntimeError("Missing AWS_SECRET_ACCESS_KEY.")
    if not settings.aws_region:
        raise RuntimeError("Missing AWS_REGION.")


@lru_cache
def _s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def build_photo_key(content_type: str) -> str:
    extension = CONTENT_TYPE_TO_EXTENSION.get(content_type)
    if not extension:
        raise ValueError("Unsupported image content type.")
    now = datetime.now(timezone.utc)
    return f"sightings/{now.year:04d}/{now.month:02d}/{uuid4().hex}.{extension}"


def _public_url_for_key(key: str) -> str:
    settings = get_settings()
    if settings.s3_public_base_url:
        base_url = settings.s3_public_base_url.rstrip("/")
        return f"{base_url}/{key}"
    return f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/{key}"


def upload_image_bytes(key: str, payload: bytes, content_type: str) -> str:
    _assert_s3_config()
    settings = get_settings()
    try:
        _s3_client().put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=payload,
            ContentType=content_type,
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError("Failed to upload image to S3.") from exc
    return _public_url_for_key(key)


def delete_object(key: str) -> None:
    _assert_s3_config()
    settings = get_settings()
    try:
        _s3_client().delete_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError("Failed to delete image from S3.") from exc
