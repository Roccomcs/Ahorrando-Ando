from fastapi import APIRouter, Depends, status

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
    return await controller.add_integration(user_id=current_user.id, dto=dto)


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_integration(
    integration_id: str,
    current_user=Depends(get_current_user),
    controller: IntegrationsController = Depends(),
):
    await controller.remove_integration(user_id=current_user.id, integration_id=integration_id)
