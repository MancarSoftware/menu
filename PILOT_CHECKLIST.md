# Piloto y autorización de salida

Fecha de preparación: 2026-09-02. Producto para un restaurante; no SaaS.

**Estado:** implementación local. La migración y la simulación integral sobre Neon/staging siguen pendientes de una conexión de pruebas confirmada. Las pruebas con servicios simulados no prueban concurrencia real de PostgreSQL, GPS, impresoras ni permisos de Vercel.

## Verificación tras la limpieza del repositorio

Las pruebas automatizadas, sus datos ficticios y ejecutores se retiraron el 2026-09-08. La evidencia anterior con servicios simulados es histórica; no certifica versiones posteriores. El historial de Git conserva esos archivos para recuperarlos. Se mantienen `npm run typecheck`, `npm run lint` y el guion manual de staging que sigue.

## Preparación segura

1. Crea una rama Neon desechable distinta de producción. Evita datos personales reales y revisa su fecha de autoeliminación.
2. Configura `DATABASE_URL` para esa rama y `SESSION_SECRET` en Vercel Preview, limitados a `staging`. Comprueba que los valores de Production no cambien. No pegues secretos en chats, capturas o commits.
3. Prepara cuentas de administración, caja, cocina y reparto en la base de staging para realizar el ensayo con sesiones separadas.
4. Ejecuta `npm run typecheck` y `npm run lint` localmente. La compilación de staging aplicará las migraciones pendientes con su conexión separada.
5. Publica en `staging` cuando tú apruebes el commit/push. Revisa que Vercel use Preview + rama staging, con la URL Neon y secreto separados de Production. Comprueba el commit desplegado y el estado Ready.
6. Para el piloto real usa el dominio estable de staging en todos los dispositivos y genera allí los QR de prueba. No uses los QR de producción para este ensayo. No cambies protecciones de acceso sin revisar qué datos quedarán expuestos.

## Guion de servicio — registrar evidencia

Anota commit, fecha, responsable, dispositivos y resultado de cada paso. Los importes de abajo son datos ficticios.

| Comprobación | Resultado esperado | Estado |
| --- | --- | --- |
| Abrir turno con $20 | Un solo turno abierto, fondo $20 | Pendiente staging |
| QR en dos mesas | Pedido y estado vinculados a cada mesa, sin mezclar clientes | Pendiente teléfonos |
| Recargar y navegar durante pedido | Persiste en cliente y cocina | Local con mocks; falta staging |
| Retiro sin ubicación | Sin exigencia de mapa ni envío; entra en cocina | Pendiente staging |
| Delivery con mapa / GPS permitido o denegado | Punto confirmado obligatorio; alternativa manual funcional | Pendiente teléfonos |
| Dos operadores cambian el mismo pedido | Un cambio válido; el otro recibe conflicto y conserva el pedido | Local con mocks; falta concurrencia real |
| Driver reporta incidencia | Sigue en pendientes; cliente ve revisión; no hay cobro | Local con mocks; falta staging |
| Caja autoriza reintento | Motivo auditado; salida/entrega vuelven a estar disponibles | Local con mocks; falta staging |
| Cobro local $10 + driver $15,74 + tarjeta $8 | Ventas $33,74; esperado de efectivo $45,74; antes de recepción disponible $30 | Pendiente staging |
| Driver repite cobro | Un solo PaymentEvent; Ventas/Resumen/Caja concuerdan | Local con mocks; falta concurrencia real |
| Driver intenta confirmar su recepción | Rechazado; solo caja/admin confirma dinero contado | Local con mocks; falta staging |
| Caja recibe $15,74 y repite confirmación | Un registro; pendientes $0; ventas siguen $33,74 | Local con mocks; falta concurrencia real |
| Cierre con efectivo aún en manos del driver | Bloqueado sin modificar el turno | Local con mocks; falta staging |
| Reembolso parcial y reintento simultáneo | No duplica devolución ni supera saldo pagado | Local con mocks; falta concurrencia real |
| Corregir método con cierre/recepción/reembolso | Rechazado, sin reescribir historia | Local con mocks; falta staging |
| Cerrar con conteo distinto | Diferencia y nota conservadas | Pendiente staging |
| Cruce de medianoche Ecuador | Numeración empieza #1; cobro va a su fecha; turno conserva su total | Local parcial; falta staging |
| Roles y cuentas desactivadas | Driver no lee otros repartos, caja/equipo/ventas según permisos | Local parcial; falta sesiones reales |
| Corte de red durante acción | Conserva datos; permite reconciliar antes de reintentar | Local parcial; falta red real |
| Historial / comprobante / impresión | Nombre del driver, sin correo, cantidades y totales correctos | Local parcial; falta impresora |
| Restaurar un backup en base vacía aislada | Tablas, menú, personal y totales coinciden; flujos básicos funcionan | Pendiente acceso/backup |

## Puerta de salida a producción

- [ ] Todas las pruebas de dinero y permisos anteriores pasan en staging.
- [ ] Backup previo verificable y restauración ensayada; responsable y retención registrados.
- [ ] Menú, fotos, precios, horarios, datos de contacto y permisos aprobados por el negocio.
- [ ] Dominio/HTTPS confirmados; QR impresos desde el dominio final y probados en dos teléfonos.
- [ ] Cloudinary y otros recursos externos aislados o su uso compartido explícitamente aceptado. Una base separada no aísla imágenes si las credenciales Cloudinary se comparten.
- [ ] Piloto con personal usando `STAFF_GUIDE.md`, y conciliación de efectivo histórico antes del nuevo control.
- [ ] Logs/alertas revisados, responsable de soporte y procedimiento de reversión definidos.
- [ ] Commit revisado y aprobado para promoción de staging a main. El workflow de CI no sustituye las reglas de protección de ramas ni bloquea Vercel por sí solo.

No ejecutar limpieza de demo sobre producción. La publicación y las decisiones de dominio, credenciales, copias de seguridad y conciliación real requieren al propietario.
