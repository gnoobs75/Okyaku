from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUserDep, SessionDep
from app.models.file import FileAttachment, FileAttachmentCreate, FileAttachmentRead
from app.services.storage import get_storage_service

router = APIRouter()


@router.post("/presigned-upload", status_code=status.HTTP_200_OK)
async def get_presigned_upload_url(
    filename: str,
    content_type: str,
    current_user: CurrentUserDep,
) -> dict:
    """Get a presigned URL for uploading a file."""
    storage = get_storage_service()
    key = storage.generate_key("uploads", filename)
    url = storage.get_presigned_upload_url(key, content_type=content_type)

    return {
        "upload_url": url,
        "s3_key": key,
    }


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=FileAttachmentRead)
async def create_file_record(
    data: FileAttachmentCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> FileAttachment:
    """Create a file attachment record after upload is complete."""
    # Verify file exists in S3
    storage = get_storage_service()
    if not storage.file_exists(data.s3_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File not found in storage",
        )

    file_record = FileAttachment(
        filename=data.filename,
        s3_key=data.s3_key,
        content_type=data.content_type,
        size_bytes=data.size_bytes,
        uploaded_by=current_user.sub,
    )
    session.add(file_record)
    session.commit()
    session.refresh(file_record)

    return file_record


@router.get("/{file_id}/download-url")
async def get_download_url(
    file_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Get a presigned URL for downloading a file."""
    file_record = session.get(FileAttachment, file_id)
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    storage = get_storage_service()
    url = storage.get_presigned_download_url(file_record.s3_key)

    return {"download_url": url}


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete a file attachment."""
    file_record = session.get(FileAttachment, file_id)
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    # Delete from S3
    storage = get_storage_service()
    storage.delete_file(file_record.s3_key)

    # Delete record
    session.delete(file_record)
    session.commit()
