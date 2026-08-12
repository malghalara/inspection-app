from pathlib import Path
from fastapi.staticfiles import StaticFiles
from app.api.v1 import uploads
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import connect_to_mongo, close_mongo_connection
from app.core.config import settings
from app.api.v1 import auth, admin_users, admin_domains, admin_questions, inspection

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(admin_users.router, prefix="/api/v1")
app.include_router(admin_domains.router, prefix="/api/v1")
app.include_router(admin_questions.router, prefix="/api/v1")
app.include_router(inspection.router, prefix="/api/v1")
app.include_router(uploads.router, prefix="/api/v1")
@app.get("/health")
async def health_check():
    return {"status": "ok", "environment": settings.environment}