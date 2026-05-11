"""
Dev utility: reset all product stocks to 100 for testing.
Run from the backend/ directory with the venv active:
  python reset_stocks.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def main() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("UPDATE producto SET stock_cantidad = 100 WHERE eliminado_en IS NULL")
        )
        await session.commit()
        print(f"Stock reseteado a 100 en {result.rowcount} productos.")


if __name__ == "__main__":
    asyncio.run(main())
