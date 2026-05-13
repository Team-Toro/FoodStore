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
        # 4b. Additional staff users
        # -----------------------------------------------------------------
        staff_users = [
            ("Gestión", "Pedidos",  "pedidos@foodstore.com",  "Pedidos1234!", 3),  # PEDIDOS
            ("Gestión", "Stock",    "stock@foodstore.com",    "Stock1234!",   2),  # STOCK
        ]
        for nombre, apellido, email, password, rol_id in staff_users:
            ph = hash_password(password)
            await session.execute(
                text("""
                    INSERT INTO usuario (nombre, apellido, email, password_hash, creado_en, actualizado_en)
                    VALUES (:nombre, :apellido, :email, :password_hash, NOW(), NOW())
                    ON CONFLICT (email) DO NOTHING
                """),
                {"nombre": nombre, "apellido": apellido, "email": email, "password_hash": ph},
            )
            await session.execute(
                text("""
                    INSERT INTO usuario_rol (usuario_id, rol_id)
                    SELECT u.id, :rol_id FROM usuario u WHERE u.email = :email
                    ON CONFLICT (usuario_id, rol_id) DO NOTHING
                """),
                {"email": email, "rol_id": rol_id},
            )

        # -----------------------------------------------------------------
        # 4c. Client users
        # -----------------------------------------------------------------
        client_users = [
            ("Carlos",   "García",    "cliente1@test.com", "Cliente1234!"),
            ("Valentina","Rodríguez", "cliente2@test.com", "Cliente2234!"),
        ]
        for nombre, apellido, email, password in client_users:
            ph = hash_password(password)
            await session.execute(
                text("""
                    INSERT INTO usuario (nombre, apellido, email, password_hash, creado_en, actualizado_en)
                    VALUES (:nombre, :apellido, :email, :password_hash, NOW(), NOW())
                    ON CONFLICT (email) DO NOTHING
                """),
                {"nombre": nombre, "apellido": apellido, "email": email, "password_hash": ph},
            )
            await session.execute(
                text("""
                    INSERT INTO usuario_rol (usuario_id, rol_id)
                    SELECT u.id, 4 FROM usuario u WHERE u.email = :email
                    ON CONFLICT (usuario_id, rol_id) DO NOTHING
                """),
                {"email": email},
            )

        # -----------------------------------------------------------------
        # 5. Ingredientes de prueba
        # -----------------------------------------------------------------
        await session.execute(
            text("""
                INSERT INTO ingrediente (nombre, descripcion, es_alergeno, creado_en, actualizado_en)
                VALUES
                    ('Gluten',        'Proteína del trigo',               TRUE,  NOW(), NOW()),
                    ('Lactosa',       'Azúcar de la leche',               TRUE,  NOW(), NOW()),
                    ('Tomate',        'Tomate fresco o en salsa',         FALSE, NOW(), NOW()),
                    ('Mozzarella',    'Queso mozzarella',                 FALSE, NOW(), NOW()),
                    ('Albahaca',      'Hierba aromática',                 FALSE, NOW(), NOW()),
                    ('Lechuga',       'Lechuga fresca',                   FALSE, NOW(), NOW()),
                    ('Cebolla',       'Cebolla blanca o morada',          FALSE, NOW(), NOW()),
                    ('Huevo',         'Huevo de gallina',                 TRUE,  NOW(), NOW()),
                    ('Maní',          'Cacahuete / maní',                 TRUE,  NOW(), NOW()),
                    ('Mostaza',       'Mostaza amarilla',                 FALSE, NOW(), NOW())
                ON CONFLICT (nombre) DO NOTHING
            """)
        )

        # -----------------------------------------------------------------
        # 6. Categorías — jerarquía padre → hijo
        # -----------------------------------------------------------------
        # Parent categories (no padre_id)
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, descripcion, creado_en, actualizado_en)
                VALUES
                    ('Bebidas',       'Todo tipo de bebidas',          NOW(), NOW()),
                    ('Comida Rápida', 'Hamburguesas, pizzas y más',   NOW(), NOW()),
                    ('Saludable',     'Opciones ligeras y nutritivas', NOW(), NOW()),
                    ('Postres',       'Dulces y helados',              NOW(), NOW())
                ON CONFLICT DO NOTHING
            """)
        )
        # Child categories referencing parents
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, descripcion, padre_id, creado_en, actualizado_en)
                SELECT 'Gaseosas', 'Refrescos con gas', c.id, NOW(), NOW()
                FROM categoria c WHERE c.nombre = 'Bebidas' AND c.padre_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Gaseosas')
            """)
        )
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, descripcion, padre_id, creado_en, actualizado_en)
                SELECT 'Jugos', 'Jugos naturales y envasados', c.id, NOW(), NOW()
                FROM categoria c WHERE c.nombre = 'Bebidas' AND c.padre_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Jugos')
            """)
        )
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, descripcion, padre_id, creado_en, actualizado_en)
                SELECT 'Agua', 'Agua mineral y saborizada', c.id, NOW(), NOW()
                FROM categoria c WHERE c.nombre = 'Bebidas' AND c.padre_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Agua')
            """)
        )
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, descripcion, padre_id, creado_en, actualizado_en)
                SELECT 'Hamburguesas', 'Clásicas y gourmet', c.id, NOW(), NOW()
                FROM categoria c WHERE c.nombre = 'Comida Rápida' AND c.padre_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Hamburguesas')
            """)
        )
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, descripcion, padre_id, creado_en, actualizado_en)
                SELECT 'Pizzas', 'Pizzas artesanales', c.id, NOW(), NOW()
                FROM categoria c WHERE c.nombre = 'Comida Rápida' AND c.padre_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Pizzas')
            """)
        )
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, descripcion, padre_id, creado_en, actualizado_en)
                SELECT 'Sándwiches', 'Sándwiches fríos y calientes', c.id, NOW(), NOW()
                FROM categoria c WHERE c.nombre = 'Comida Rápida' AND c.padre_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Sándwiches')
            """)
        )
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, descripcion, padre_id, creado_en, actualizado_en)
                SELECT 'Ensaladas', 'Ensaladas frescas', c.id, NOW(), NOW()
                FROM categoria c WHERE c.nombre = 'Saludable' AND c.padre_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Ensaladas')
            """)
        )
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, descripcion, padre_id, creado_en, actualizado_en)
                SELECT 'Wraps', 'Wraps y burritos saludables', c.id, NOW(), NOW()
                FROM categoria c WHERE c.nombre = 'Saludable' AND c.padre_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Wraps')
            """)
        )
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, descripcion, padre_id, creado_en, actualizado_en)
                SELECT 'Tortas', 'Tortas y bizcochos', c.id, NOW(), NOW()
                FROM categoria c WHERE c.nombre = 'Postres' AND c.padre_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Tortas')
            """)
        )
        await session.execute(
            text("""
                INSERT INTO categoria (nombre, descripcion, padre_id, creado_en, actualizado_en)
                SELECT 'Helados', 'Helados artesanales', c.id, NOW(), NOW()
                FROM categoria c WHERE c.nombre = 'Postres' AND c.padre_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Helados')
            """)
        )

        # -----------------------------------------------------------------
        # 7. Productos (15+ variados)
        # -----------------------------------------------------------------
        products = [
            # (nombre, descripción, precio, stock)
            ("Pizza Margarita",          "Pizza clásica con tomate y mozzarella",           850.00,  20),
            ("Pizza Napolitana",         "Pizza con tomate, mozzarella y albahaca",          920.00,  15),
            ("Hamburguesa Clásica",      "Medallón de carne, lechuga, tomate y mostaza",     750.00,  25),
            ("Hamburguesa Doble",        "Doble medallón con queso cheddar",                 950.00,  20),
            ("Sándwich de Pollo",        "Pollo a la plancha con vegetales",                 620.00,  30),
            ("Coca-Cola 350ml",          "Bebida gaseosa cola",                              250.00, 100),
            ("Sprite 350ml",             "Bebida gaseosa lima-limón",                        250.00,  80),
            ("Agua Mineral 500ml",       "Agua mineral natural",                             150.00, 150),
            ("Jugo de Naranja 330ml",    "Jugo de naranja natural exprimido",                320.00,  60),
            ("Ensalada César",           "Lechuga romana, croutons, parmesano y aderezo",    580.00,  20),
            ("Ensalada Mixta",           "Lechuga, tomate, cebolla y zanahoria",             480.00,  25),
            ("Wrap de Pollo",            "Tortilla con pollo grillado y vegetales",          650.00,  20),
            ("Brownie de Chocolate",     "Brownie casero con chispas de chocolate",          380.00,  40),
            ("Helado de Vainilla",       "Dos bochas de helado artesanal de vainilla",       350.00,  50),
            ("Torta de Limón",           "Porción de torta de limón con merengue",           420.00,  30),
            ("Medialunas x3",            "Tres medialunas de manteca recién horneadas",      290.00,  60),
        ]
        for nombre, descripcion, precio, stock in products:
            await session.execute(
                text("""
                    INSERT INTO producto (nombre, descripcion, precio_base, stock_cantidad, disponible, creado_en, actualizado_en)
                    VALUES (:nombre, :descripcion, :precio, :stock, TRUE, NOW(), NOW())
                    ON CONFLICT DO NOTHING
                """),
                {"nombre": nombre, "descripcion": descripcion, "precio": precio, "stock": stock},
            )

        # Assign categories to products
        product_categories = [
            ("Pizza Margarita",       "Pizzas"),
            ("Pizza Napolitana",      "Pizzas"),
            ("Hamburguesa Clásica",   "Hamburguesas"),
            ("Hamburguesa Doble",     "Hamburguesas"),
            ("Sándwich de Pollo",     "Sándwiches"),
            ("Coca-Cola 350ml",       "Gaseosas"),
            ("Sprite 350ml",          "Gaseosas"),
            ("Agua Mineral 500ml",    "Agua"),
            ("Jugo de Naranja 330ml", "Jugos"),
            ("Ensalada César",        "Ensaladas"),
            ("Ensalada Mixta",        "Ensaladas"),
            ("Wrap de Pollo",         "Wraps"),
            ("Brownie de Chocolate",  "Postres"),
            ("Helado de Vainilla",    "Helados"),
            ("Torta de Limón",        "Tortas"),
        ]
        for prod_nombre, cat_nombre in product_categories:
            await session.execute(
                text("""
                    INSERT INTO producto_categoria (producto_id, categoria_id)
                    SELECT p.id, c.id
                    FROM producto p, categoria c
                    WHERE p.nombre = :prod AND c.nombre = :cat
                    ON CONFLICT DO NOTHING
                """),
                {"prod": prod_nombre, "cat": cat_nombre},
            )

        # Assign ingredients to key products
        await session.execute(
            text("""
                INSERT INTO producto_ingrediente (producto_id, ingrediente_id, es_removible)
                SELECT p.id, i.id, FALSE
                FROM producto p, ingrediente i
                WHERE p.nombre = 'Pizza Margarita'
                  AND i.nombre IN ('Gluten', 'Lactosa', 'Tomate', 'Mozzarella', 'Albahaca')
                ON CONFLICT DO NOTHING
            """)
        )
        await session.execute(
            text("""
                INSERT INTO producto_ingrediente (producto_id, ingrediente_id, es_removible)
                SELECT p.id, i.id, TRUE
                FROM producto p, ingrediente i
                WHERE p.nombre = 'Hamburguesa Clásica'
                  AND i.nombre IN ('Gluten', 'Lechuga', 'Tomate', 'Mostaza', 'Cebolla')
                ON CONFLICT DO NOTHING
            """)
        )
        await session.execute(
            text("""
                INSERT INTO producto_ingrediente (producto_id, ingrediente_id, es_removible)
                SELECT p.id, i.id, TRUE
                FROM producto p, ingrediente i
                WHERE p.nombre = 'Ensalada César'
                  AND i.nombre IN ('Lechuga', 'Gluten')
                ON CONFLICT DO NOTHING
            """)
        )

        # -----------------------------------------------------------------
        # 8. Direcciones para clientes
        # -----------------------------------------------------------------
        await session.execute(
            text("""
                INSERT INTO direccion_entrega (usuario_id, linea1, ciudad, alias, es_principal, creado_en, actualizado_en)
                SELECT u.id, 'Av. Corrientes 1234, Piso 3', 'Buenos Aires', 'Casa', TRUE, NOW(), NOW()
                FROM usuario u WHERE u.email = 'cliente1@test.com'
                  AND NOT EXISTS (
                    SELECT 1 FROM direccion_entrega d
                    WHERE d.usuario_id = u.id AND d.linea1 = 'Av. Corrientes 1234, Piso 3'
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO direccion_entrega (usuario_id, linea1, ciudad, alias, es_principal, creado_en, actualizado_en)
                SELECT u.id, 'Calle Florida 567', 'Buenos Aires', 'Trabajo', FALSE, NOW(), NOW()
                FROM usuario u WHERE u.email = 'cliente1@test.com'
                  AND NOT EXISTS (
                    SELECT 1 FROM direccion_entrega d
                    WHERE d.usuario_id = u.id AND d.linea1 = 'Calle Florida 567'
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO direccion_entrega (usuario_id, linea1, ciudad, alias, es_principal, creado_en, actualizado_en)
                SELECT u.id, 'San Martín 890, Dpto 4B', 'Córdoba', 'Casa', TRUE, NOW(), NOW()
                FROM usuario u WHERE u.email = 'cliente2@test.com'
                  AND NOT EXISTS (
                    SELECT 1 FROM direccion_entrega d
                    WHERE d.usuario_id = u.id AND d.linea1 = 'San Martín 890, Dpto 4B'
                  )
            """)
        )

        # -----------------------------------------------------------------
        # 9. Pedidos de prueba para cliente1
        #    Only insert if no pedidos exist for this user yet.
        # -----------------------------------------------------------------

        # --- Pedido 1: ENTREGADO ---
        await session.execute(
            text("""
                INSERT INTO pedido (usuario_id, estado_codigo, forma_pago_codigo, total, costo_envio,
                                    direccion_snapshot, direccion_snapshot_linea1, direccion_snapshot_ciudad,
                                    creado_en, actualizado_en)
                SELECT u.id, 'ENTREGADO', 'EFECTIVO', 1100.00, 200.00,
                       'Av. Corrientes 1234, Piso 3, Buenos Aires',
                       'Av. Corrientes 1234, Piso 3', 'Buenos Aires',
                       NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'
                FROM usuario u WHERE u.email = 'cliente1@test.com'
                  AND NOT EXISTS (
                    SELECT 1 FROM pedido p WHERE p.usuario_id = u.id AND p.estado_codigo = 'ENTREGADO'
                  )
            """)
        )
        # DetallePedido for pedido ENTREGADO
        await session.execute(
            text("""
                INSERT INTO detalle_pedido (pedido_id, producto_id, nombre_snapshot, precio_snapshot, cantidad, subtotal)
                SELECT ped.id, prod.id, 'Pizza Margarita', 850.00, 1, 850.00
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                JOIN producto prod ON prod.nombre = 'Pizza Margarita'
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'ENTREGADO'
                  AND NOT EXISTS (
                    SELECT 1 FROM detalle_pedido dp WHERE dp.pedido_id = ped.id
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO detalle_pedido (pedido_id, producto_id, nombre_snapshot, precio_snapshot, cantidad, subtotal)
                SELECT ped.id, prod.id, 'Coca-Cola 350ml', 250.00, 1, 250.00
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                JOIN producto prod ON prod.nombre = 'Coca-Cola 350ml'
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'ENTREGADO'
                  AND (SELECT COUNT(*) FROM detalle_pedido dp WHERE dp.pedido_id = ped.id) = 1
            """)
        )
        # HistorialEstadoPedido for pedido ENTREGADO (full transition chain)
        await session.execute(
            text("""
                INSERT INTO historial_estado_pedido (pedido_id, estado_desde, estado_hasta, creado_en)
                SELECT ped.id, NULL, 'PENDIENTE', NOW() - INTERVAL '5 days'
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'ENTREGADO'
                  AND NOT EXISTS (
                    SELECT 1 FROM historial_estado_pedido h WHERE h.pedido_id = ped.id AND h.estado_hasta = 'PENDIENTE'
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO historial_estado_pedido (pedido_id, estado_desde, estado_hasta, creado_en)
                SELECT ped.id, 'PENDIENTE', 'CONFIRMADO', NOW() - INTERVAL '5 days' + INTERVAL '1 hour'
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'ENTREGADO'
                  AND NOT EXISTS (
                    SELECT 1 FROM historial_estado_pedido h WHERE h.pedido_id = ped.id AND h.estado_hasta = 'CONFIRMADO'
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO historial_estado_pedido (pedido_id, estado_desde, estado_hasta, creado_en)
                SELECT ped.id, 'CONFIRMADO', 'EN_PREP', NOW() - INTERVAL '4 days' + INTERVAL '2 hours'
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'ENTREGADO'
                  AND NOT EXISTS (
                    SELECT 1 FROM historial_estado_pedido h WHERE h.pedido_id = ped.id AND h.estado_hasta = 'EN_PREP'
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO historial_estado_pedido (pedido_id, estado_desde, estado_hasta, creado_en)
                SELECT ped.id, 'EN_PREP', 'EN_CAMINO', NOW() - INTERVAL '4 days' + INTERVAL '3 hours'
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'ENTREGADO'
                  AND NOT EXISTS (
                    SELECT 1 FROM historial_estado_pedido h WHERE h.pedido_id = ped.id AND h.estado_hasta = 'EN_CAMINO'
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO historial_estado_pedido (pedido_id, estado_desde, estado_hasta, creado_en)
                SELECT ped.id, 'EN_CAMINO', 'ENTREGADO', NOW() - INTERVAL '4 days' + INTERVAL '4 hours'
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'ENTREGADO'
                  AND NOT EXISTS (
                    SELECT 1 FROM historial_estado_pedido h WHERE h.pedido_id = ped.id AND h.estado_hasta = 'ENTREGADO'
                  )
            """)
        )

        # --- Pedido 2: EN_PREP ---
        await session.execute(
            text("""
                INSERT INTO pedido (usuario_id, estado_codigo, forma_pago_codigo, total, costo_envio,
                                    direccion_snapshot, direccion_snapshot_linea1, direccion_snapshot_ciudad,
                                    creado_en, actualizado_en)
                SELECT u.id, 'EN_PREP', 'MERCADOPAGO', 1900.00, 200.00,
                       'Av. Corrientes 1234, Piso 3, Buenos Aires',
                       'Av. Corrientes 1234, Piso 3', 'Buenos Aires',
                       NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 hours'
                FROM usuario u WHERE u.email = 'cliente1@test.com'
                  AND NOT EXISTS (
                    SELECT 1 FROM pedido p WHERE p.usuario_id = u.id AND p.estado_codigo = 'EN_PREP'
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO detalle_pedido (pedido_id, producto_id, nombre_snapshot, precio_snapshot, cantidad, subtotal)
                SELECT ped.id, prod.id, 'Hamburguesa Doble', 950.00, 2, 1900.00
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                JOIN producto prod ON prod.nombre = 'Hamburguesa Doble'
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'EN_PREP'
                  AND NOT EXISTS (
                    SELECT 1 FROM detalle_pedido dp WHERE dp.pedido_id = ped.id
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO historial_estado_pedido (pedido_id, estado_desde, estado_hasta, creado_en)
                SELECT ped.id, NULL, 'PENDIENTE', NOW() - INTERVAL '1 day'
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'EN_PREP'
                  AND NOT EXISTS (
                    SELECT 1 FROM historial_estado_pedido h WHERE h.pedido_id = ped.id AND h.estado_hasta = 'PENDIENTE'
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO historial_estado_pedido (pedido_id, estado_desde, estado_hasta, creado_en)
                SELECT ped.id, 'PENDIENTE', 'CONFIRMADO', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'EN_PREP'
                  AND NOT EXISTS (
                    SELECT 1 FROM historial_estado_pedido h WHERE h.pedido_id = ped.id AND h.estado_hasta = 'CONFIRMADO'
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO historial_estado_pedido (pedido_id, estado_desde, estado_hasta, creado_en)
                SELECT ped.id, 'CONFIRMADO', 'EN_PREP', NOW() - INTERVAL '20 hours'
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'EN_PREP'
                  AND NOT EXISTS (
                    SELECT 1 FROM historial_estado_pedido h WHERE h.pedido_id = ped.id AND h.estado_hasta = 'EN_PREP'
                  )
            """)
        )

        # --- Pedido 3: PENDIENTE ---
        await session.execute(
            text("""
                INSERT INTO pedido (usuario_id, estado_codigo, forma_pago_codigo, total, costo_envio,
                                    direccion_snapshot, direccion_snapshot_linea1, direccion_snapshot_ciudad,
                                    creado_en, actualizado_en)
                SELECT u.id, 'PENDIENTE', 'EFECTIVO', 730.00, 200.00,
                       'Calle Florida 567, Buenos Aires',
                       'Calle Florida 567', 'Buenos Aires',
                       NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'
                FROM usuario u WHERE u.email = 'cliente1@test.com'
                  AND NOT EXISTS (
                    SELECT 1 FROM pedido p WHERE p.usuario_id = u.id AND p.estado_codigo = 'PENDIENTE'
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO detalle_pedido (pedido_id, producto_id, nombre_snapshot, precio_snapshot, cantidad, subtotal)
                SELECT ped.id, prod.id, 'Ensalada César', 580.00, 1, 580.00
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                JOIN producto prod ON prod.nombre = 'Ensalada César'
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'PENDIENTE'
                  AND NOT EXISTS (
                    SELECT 1 FROM detalle_pedido dp WHERE dp.pedido_id = ped.id
                  )
            """)
        )
        await session.execute(
            text("""
                INSERT INTO detalle_pedido (pedido_id, producto_id, nombre_snapshot, precio_snapshot, cantidad, subtotal)
                SELECT ped.id, prod.id, 'Jugo de Naranja 330ml', 320.00, 1, 320.00
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                JOIN producto prod ON prod.nombre = 'Jugo de Naranja 330ml'
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'PENDIENTE'
                  AND (SELECT COUNT(*) FROM detalle_pedido dp WHERE dp.pedido_id = ped.id) = 1
            """)
        )
        await session.execute(
            text("""
                INSERT INTO historial_estado_pedido (pedido_id, estado_desde, estado_hasta, creado_en)
                SELECT ped.id, NULL, 'PENDIENTE', NOW() - INTERVAL '2 hours'
                FROM pedido ped
                JOIN usuario u ON u.id = ped.usuario_id
                WHERE u.email = 'cliente1@test.com'
                  AND ped.estado_codigo = 'PENDIENTE'
                  AND NOT EXISTS (
                    SELECT 1 FROM historial_estado_pedido h WHERE h.pedido_id = ped.id
                  )
            """)
        )

        await session.commit()
        print("Seed completed successfully.")
        print("Users: admin@foodstore.com / pedidos@foodstore.com / stock@foodstore.com / cliente1@test.com / cliente2@test.com")
        print("Products: 16 products across hierarchical categories (Bebidas, Comida Rápida, Saludable, Postres)")
        print("Orders for cliente1: 1 ENTREGADO, 1 EN_PREP, 1 PENDIENTE")


if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
