from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from application.dtos.integration.add_integration_dto import AddIntegrationDTO
from application.dtos.integration.integration_summary_dto import IntegrationSummaryDTO
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


@router.post("/balanz/import", response_model=IntegrationSummaryDTO, status_code=status.HTTP_201_CREATED)
async def import_balanz_csv(
    file: UploadFile,
    current_user=Depends(get_current_user),
    controller: IntegrationsController = Depends(),
):
    """Importa posiciones desde un CSV exportado de Balanz (o formato compatible)."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo debe ser un CSV.")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5 MB max
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo es demasiado grande (máx 5 MB).")
    try:
        return await controller.import_balanz_csv(user_id=current_user.id, csv_bytes=content)
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
