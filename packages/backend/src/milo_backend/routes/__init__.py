from milo_backend.routes.auth import router as auth_router
from milo_backend.routes.resume import router as resume_router
from milo_backend.routes.tracking_link import router as tracking_link_router

__all__ = [
    "auth_router",
    "resume_router",
    "tracking_link_router",
]
