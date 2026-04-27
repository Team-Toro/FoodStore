"""Idempotent seed script for catalog data.

Run with:
    python -m app.db.seed
"""
from __future__ import annotations

import asyncio

from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.core.config import settings


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        # -----------------------------------------------------------------
        # 1. Roles  (id=1 ADMIN, 2 STOCK, 3 PEDIDOS, 4 CLIENT)
        # -----------------------------------------------------------------
        await session.execute(
            text("""
                INSERT INTO rol (id, codigo, nombre, descripcion)
                VALUES
                    (1, 'ADMIN',   'Administrador',        'Acceso total al sistema'),
                    (2, 'STOCK',   'Gestión de stock',     'Puede gestionar productos e inventario'),
                    (3, 'PEDIDOS', 'Gestión de pedidos',   'Puede ver y gestionar pedidos'),
                    (4, 'CLIENT',  'Cliente',              'Cliente registrado')
                ON CONFLICT (id) DO NOTHING
            """)
        )

        # -----------------------------------------------------------------
        # 2. Estados de pedido
        # -----------------------------------------------------------------
        await session.execute(
            text("""
                INSERT INTO estado_pedido (codigo, nombre, descripcion, es_terminal)
                VALUES
                    ('PENDIENTE',  'Pendiente',     'Pedido recibido, esperando confirmación', FALSE),
                    ('CONFIRMADO', 'Confirmado',    'Pedido confirmado por el negocio',         FALSE),
                    ('EN_PREP',    'En preparación','El pedido está siendo preparado',           FALSE),
                    ('EN_CAMINO',  'En camino',     'El pedido está siendo entregado',           FALSE),
                    ('ENTREGADO',  'Entregado',     'El pedido fue entregado al cliente',        TRUE),
                    ('CANCELADO',  'Cancelado',     'El pedido fue cancelado',                   TRUE)
                ON CONFLICT (codigo) DO NOTHING
            """)
        )

        # -----------------------------------------------------------------
        # 3. Formas de pago
        # -----------------------------------------------------------------
        await session.execute(
            text("""
                INSERT INTO forma_pago (codigo, nombre, habilitado)
                VALUES
                    ('MERCADOPAGO', 'MercadoPago', TRUE),
                    ('EFECTIVO',    'Efectivo',    TRUE)
                ON CONFLICT (codigo) DO NOTHING
            """)
        )

        # -----------------------------------------------------------------
        # 4. Usuario admin
        # -----------------------------------------------------------------
        password_hash = hash_password(settings.ADMIN_PASSWORD)
        await session.execute(
            text("""
                INSERT INTO usuario (nombre, apellido, email, password_hash, creado_en, actualizado_en)
                VALUES (:nombre, :apellido, :email, :password_hash, NOW(), NOW())
                ON CONFLICT (email) DO NOTHING
            """),
            {
                "nombre": "Admin",
                "apellido": "FoodStore",
                "email": settings.ADMIN_EMAIL,
                "password_hash": password_hash,
            },
        )

        # Assign ADMIN role to admin user (idempotent via ON CONFLICT)
        await session.execute(
            text("""
                INSERT INTO usuario_rol (usuario_id, rol_id)
                SELECT u.id, 1
                FROM usuario u
                WHERE u.email = :email
                ON CONFLICT (usuario_id, rol_id) DO NOTHING
            """),
            {"email": settings.ADMIN_EMAIL},
        )

        # -----------------------------------------------------------------
        # 5. Ingredientes de prueba
        # -----------------------------------------------------------------
        await session.execute(
            text("""
                INSERT INTO ingrediente (nombre, descripcion, es_alergeno, creado_en, actualizado_en)
                VALUES
                    ('Gluten',   'Proteína del trigo',         TRUE,  NOW(), NOW()),
                    ('Lactosa',  'Azúcar de la leche',         TRUE,  NOW(), NOW()),
                    ('Tomate',   'Tomate fresco o en salsa',   FALSE, NOW(), NOW()),
                    ('Mozzarella','Queso mozzarella',          FALSE, NOW(), NOW()),
                    ('Albahaca', 'Hierba aromática',           FALSE, NOW(), NOW())
                ON CONFLICT (nombre) DO NOTHING
            """)
        )

        # -----------------------------------------------------------------
        # 6. Categorías de prueba
        # -----------------------------------------------------------------
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, creado_en, actualizado_en)
                VALUES
                    ('Pizzas',  NOW(), NOW()),
                    ('Bebidas', NOW(), NOW())
                ON CONFLICT DO NOTHING
            """)
        )

        # -----------------------------------------------------------------
        # 7. Productos de prueba con categorías e ingredientes
        # -----------------------------------------------------------------
        await session.execute(
            text("""
                INSERT INTO producto (nombre, descripcion, precio_base, stock_cantidad, disponible, creado_en, actualizado_en)
                VALUES
                    ('Pizza Margarita', 'Pizza clásica con tomate y mozzarella', 850.00, 20, TRUE,  NOW(), NOW()),
                    ('Agua Mineral',    'Agua mineral 500ml',                     150.00, 50, TRUE,  NOW(), NOW())
                ON CONFLICT DO NOTHING
            """)
        )

        # Assign categories to Pizza Margarita
        await session.execute(
            text("""
                INSERT INTO producto_categoria (producto_id, categoria_id)
                SELECT p.id, c.id
                FROM producto p, categoria c
                WHERE p.nombre = 'Pizza Margarita' AND c.nombre = 'Pizzas'
                ON CONFLICT DO NOTHING
            """)
        )

        # Assign ingredients to Pizza Margarita
        await session.execute(
            text("""
                INSERT INTO producto_ingrediente (producto_id, ingrediente_id, es_removible)
                SELECT p.id, i.id, FALSE
                FROM producto p, ingrediente i
                WHERE p.nombre = 'Pizza Margarita' AND i.nombre IN ('Gluten', 'Lactosa', 'Tomate', 'Mozzarella', 'Albahaca')
                ON CONFLICT DO NOTHING
            """)
        )

        await session.commit()
        print("Seed completed successfully.")


if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
