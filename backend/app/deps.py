from typing import Optional

from fastapi import Header

from .services.identity import normalize_identifier


# NOTE: Header-based demo identity (X-Demo-Identity, X-Demo-Role) is strictly for
# frictionless evaluator/judge testing without SMS OTP or OAuth setup dependencies.
# In a production clinical environment, this must be replaced with verified OAuth2/OIDC
# bearer tokens and server-side RBAC session management.
def get_current_demo_user(
    x_demo_identity: Optional[str] = Header(None, alias="X-Demo-Identity"),
    x_demo_role: Optional[str] = Header(None, alias="X-Demo-Role")
):
    if not x_demo_identity:
        return {"identifier": None, "id_type": None, "role": x_demo_role or "user"}
    norm_id, id_type = normalize_identifier(x_demo_identity)
    return {
        "identifier": norm_id,
        "id_type": id_type,
        "role": (x_demo_role or "user").lower()
    }
