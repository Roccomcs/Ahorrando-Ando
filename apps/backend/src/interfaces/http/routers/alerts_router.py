from fastapi import APIRouter

from interfaces.http.controllers.alerts_controller import (
    AlertResponse,
    AlertsController,
    CreateAlertRequest,
    PushSubscribeRequest,
)

router = APIRouter(prefix="/alerts", tags=["alerts"])
ctrl = AlertsController()

router.add_api_route("", ctrl.list_alerts, methods=["GET"], response_model=list[AlertResponse])
router.add_api_route("", ctrl.create_alert, methods=["POST"], response_model=AlertResponse, status_code=201)
router.add_api_route("/{alert_id}", ctrl.delete_alert, methods=["DELETE"])
router.add_api_route("/{alert_id}", ctrl.toggle_alert, methods=["PATCH"])
router.add_api_route("/push/subscribe", ctrl.subscribe_push, methods=["POST"])
router.add_api_route("/push/unsubscribe", ctrl.unsubscribe_push, methods=["POST"])
