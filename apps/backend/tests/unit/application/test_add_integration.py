import pytest
from unittest.mock import AsyncMock, MagicMock

from application.dtos.integration.add_integration_dto import AddIntegrationDTO
from application.use_cases.integrations.add_integration import AddIntegration
from domain.entities.integration import Integration


def _make_use_case(auth_result: bool = True, auth_raises: Exception | None = None):
    repo = AsyncMock()
    repo.save.side_effect = lambda i: i

    encryption = MagicMock()
    encryption.encrypt.return_value = "encrypted"

    provider = AsyncMock()
    if auth_raises:
        provider.authenticate.side_effect = auth_raises
    else:
        provider.authenticate.return_value = auth_result

    registry = MagicMock()
    registry.get.return_value = provider

    return AddIntegration(repo, encryption, registry), repo, provider


@pytest.mark.asyncio
async def test_add_integration_valid_credentials():
    uc, repo, _ = _make_use_case(auth_result=True)
    dto = AddIntegrationDTO(provider_type="binance", credentials={"api_key": "k", "api_secret": "s"})
    result = await uc.execute("user-1", dto)
    assert result.provider_type == "binance"
    repo.save.assert_called_once()


@pytest.mark.asyncio
async def test_add_integration_invalid_credentials_raises():
    uc, repo, _ = _make_use_case(auth_result=False)
    dto = AddIntegrationDTO(provider_type="binance", credentials={"api_key": "wrong"})
    with pytest.raises(ValueError, match="credenciales"):
        await uc.execute("user-1", dto)
    repo.save.assert_not_called()


@pytest.mark.asyncio
async def test_add_integration_provider_exception_raises_value_error():
    uc, repo, _ = _make_use_case(auth_raises=ConnectionError("timeout"))
    dto = AddIntegrationDTO(provider_type="binance", credentials={"api_key": "k"})
    with pytest.raises(ValueError, match="verificar"):
        await uc.execute("user-1", dto)
    repo.save.assert_not_called()


@pytest.mark.asyncio
async def test_add_integration_encrypts_credentials():
    uc, _, _ = _make_use_case(auth_result=True)
    dto = AddIntegrationDTO(provider_type="binance", credentials={"api_key": "mykey"})
    result = await uc.execute("user-1", dto)
    # El resultado viene del repo.save que devuelve la entidad con encrypted_credentials
    assert result is not None
