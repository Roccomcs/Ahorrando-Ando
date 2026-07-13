from fastapi import APIRouter

from interfaces.http.controllers.alerts_controller import (
    AlertResponse,
    AlertsController,
    CreateAlertRequest,
    PushSubscribeRequest,
)

# Endpoints de alertas de precio del usuario. Todos requieren autenticación.
# Una alerta se dispara cuando un activo supera o baja de un umbral de precio definido.
# Usa add_api_route (en vez de @router.get) porque los métodos del controller ya están definidos en alerts_controller.py con sus propias dependencias.
router = APIRouter(prefix="/alerts", tags=["alerts"])
ctrl = AlertsController()

# GET /alerts — lista todas las alertas del usuario
router.add_api_route("", ctrl.list_alerts, methods=["GET"], response_model=list[AlertResponse])
# POST /alerts — crea una nueva alerta de precio
router.add_api_route("", ctrl.create_alert, methods=["POST"], response_model=AlertResponse, status_code=201)
# DELETE /alerts/{alert_id} — elimina una alerta por id
router.add_api_route("/{alert_id}", ctrl.delete_alert, methods=["DELETE"])
# PATCH /alerts/{alert_id} — activa o desactiva una alerta
router.add_api_route("/{alert_id}", ctrl.toggle_alert, methods=["PATCH"])
# POST /alerts/push/subscribe — registra un dispositivo para notificaciones push
router.add_api_route("/push/subscribe", ctrl.subscribe_push, methods=["POST"])
# POST /alerts/push/unsubscribe — elimina la suscripción push de un dispositivo
router.add_api_route("/push/unsubscribe", ctrl.unsubscribe_push, methods=["POST"])
