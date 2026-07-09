from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from application.dtos.integration.add_integration_dto import AddIntegrationDTO
from application.dtos.integration.integration_summary_dto import IntegrationSummaryDTO
from application.dtos.integration.update_integration_dto import UpdateIntegrationDTO
from interfaces.http.controllers.integrations_controller import IntegrationsController
from interfaces.http.dependencies.get_current_user import get_current_user

router = APIRouter(prefix="/integrations", tags=["Integrations"])


@router.get("/", response_model=list[IntegrationSummaryDTO])
async def list_integrations(
    current_user=Depends(get_current_user),
    controller: IntegrationsController = Depends(),
):
    return await controller.list_integrations(user_id=current_user.id)


@router.post("/", response_model=IntegrationSummaryDTO, status_code=status.HTTP_201_CREATED)
async def add_integration(
    dto: AddIntegrationDTO,
    current_user=Depends(get_current_user),
    controller: IntegrationsController = Depends(),
):
    try:
        return await controller.add_integration(user_id=current_user.id, dto=dto)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/iol/import", response_model=IntegrationSummaryDTO, status_code=status.HTTP_201_CREATED)
async def import_iol_xls(
    file: UploadFile,
    current_user=Depends(get_current_user),
    controller: IntegrationsController = Depends(),
):
    """Importa la cartera actual desde el export 'Operaciones Finalizadas' de IOL (HTML/.xls)."""
    name = (file.filename or "").lower()
    if not name.endswith((".xls", ".xlsx", ".csv", ".html", ".htm")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subí el archivo exportado de IOL (.xls).")

    _MAX_SIZE = 5 * 1024 * 1024
    chunks: list[bytes] = []
    size = 0
    while chunk := await file.read(64 * 1024):
        size += len(chunk)
        if size > _MAX_SIZE:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="El archivo es demasiado grande (máx 5 MB).")
        chunks.append(chunk)
    content = b"".join(chunks)

    try:
        return await controller.import_iol_xls(user_id=current_user.id, file_bytes=content)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{integration_id}/manual")
async def get_manual_holdings(
    integration_id: str,
    current_user=Depends(get_current_user),
    controller: IntegrationsController = Depends(),
):
    """Devuelve las posiciones de una integración manual (solo el dueño) para editarlas."""
    try:
        return await controller.get_manual_holdings(
            user_id=current_user.id, integration_id=integration_id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/{integration_id}", response_model=IntegrationSummaryDTO)
async def update_integration(
    integration_id: str,
    dto: UpdateIntegrationDTO,
    current_user=Depends(get_current_user),
    controller: IntegrationsController = Depends(),
):
    try:
        return await controller.update_integration(
            user_id=current_user.id, integration_id=integration_id, dto=dto
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{integration_id}/sync")
async def sync_integration(
    integration_id: str,
    current_user=Depends(get_current_user),
    controller: IntegrationsController = Depends(),
):
    try:
        return await controller.sync_integration(user_id=current_user.id, integration_id=integration_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_integration(
    integration_id: str,
    current_user=Depends(get_current_user),
    controller: IntegrationsController = Depends(),
):
    await controller.remove_integration(user_id=current_user.id, integration_id=integration_id)
