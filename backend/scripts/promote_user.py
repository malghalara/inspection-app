import asyncio
import sys
from pathlib import Path

# Make the app package importable when running this script directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.user import User


async def promote(email: str, role: str):
    await connect_to_mongo()
    user = await User.find_one(User.email == email)
    if not user:
        print(f"No user found with email: {email}")
        await close_mongo_connection()
        return

    user.role = role
    await user.save()
    print(f"Updated {email} -> role: {role}")
    await close_mongo_connection()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/promote_user.py <email> <role>")
        print("Example: python scripts/promote_user.py malghalaraahmad9@gmail.com admin")
        sys.exit(1)

    email_arg = sys.argv[1]
    role_arg = sys.argv[2]

    if role_arg not in ("user", "admin"):
        print("Role must be 'user' or 'admin'")
        sys.exit(1)

    asyncio.run(promote(email_arg, role_arg))