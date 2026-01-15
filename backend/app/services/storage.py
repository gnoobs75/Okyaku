from typing import BinaryIO
from uuid import uuid4

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class StorageService:
    """Service for S3 file storage operations."""

    def __init__(self):
        self._client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
        )
        self.bucket_name = settings.S3_BUCKET_NAME

    def generate_key(self, folder: str, filename: str) -> str:
        """Generate a unique S3 key for a file."""
        unique_id = uuid4().hex[:8]
        return f"{folder}/{unique_id}_{filename}"

    def upload_file(
        self,
        file: BinaryIO,
        key: str,
        content_type: str | None = None,
    ) -> str:
        """Upload a file to S3."""
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        try:
            self._client.upload_fileobj(
                file,
                self.bucket_name,
                key,
                ExtraArgs=extra_args,
            )
            logger.info("File uploaded", bucket=self.bucket_name, key=key)
            return key
        except ClientError as e:
            logger.error("Failed to upload file", bucket=self.bucket_name, key=key, error=str(e))
            raise

    def download_file(self, key: str) -> bytes:
        """Download a file from S3."""
        try:
            response = self._client.get_object(Bucket=self.bucket_name, Key=key)
            return response["Body"].read()
        except ClientError as e:
            logger.error("Failed to download file", bucket=self.bucket_name, key=key, error=str(e))
            raise

    def delete_file(self, key: str) -> None:
        """Delete a file from S3."""
        try:
            self._client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info("File deleted", bucket=self.bucket_name, key=key)
        except ClientError as e:
            logger.error("Failed to delete file", bucket=self.bucket_name, key=key, error=str(e))
            raise

    def get_presigned_upload_url(
        self,
        key: str,
        content_type: str | None = None,
        expiry: int | None = None,
    ) -> str:
        """Generate a presigned URL for uploading a file."""
        params = {
            "Bucket": self.bucket_name,
            "Key": key,
        }
        if content_type:
            params["ContentType"] = content_type

        try:
            url = self._client.generate_presigned_url(
                "put_object",
                Params=params,
                ExpiresIn=expiry or settings.S3_PRESIGNED_URL_EXPIRY,
            )
            logger.info("Generated presigned upload URL", key=key)
            return url
        except ClientError as e:
            logger.error("Failed to generate presigned upload URL", key=key, error=str(e))
            raise

    def get_presigned_download_url(
        self,
        key: str,
        expiry: int | None = None,
    ) -> str:
        """Generate a presigned URL for downloading a file."""
        try:
            url = self._client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": key,
                },
                ExpiresIn=expiry or settings.S3_PRESIGNED_URL_EXPIRY,
            )
            logger.info("Generated presigned download URL", key=key)
            return url
        except ClientError as e:
            logger.error("Failed to generate presigned download URL", key=key, error=str(e))
            raise

    def file_exists(self, key: str) -> bool:
        """Check if a file exists in S3."""
        try:
            self._client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False


# Singleton instance
_storage_service: StorageService | None = None


def get_storage_service() -> StorageService:
    """Get the storage service instance."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
