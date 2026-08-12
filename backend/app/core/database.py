from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.domain import Domain
from app.models.question import Question
from app.models.answer import Answer
from app.models.inspection import Inspection

client: AsyncIOMotorClient | None = None

async def connect_to_mongo():
    global client
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client[settings.mongodb_db_name],
        document_models=[User, Domain, Question, Answer, Inspection],
    )

async def close_mongo_connection():
    if client:
        client.close()