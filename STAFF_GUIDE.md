# Guía rápida del personal — El Bueno

Este sistema atiende un solo restaurante. Cada persona usa su propia cuenta en `/admin/login`; no compartas contraseñas.

## Antes de abrir

1. Administración revisa precios, disponibilidad, horarios, mesas y los permisos del equipo.
2. Caja cuenta el fondo inicial y abre un turno en **Caja**. Sin turno abierto no se pueden registrar cobros ni reembolsos en efectivo.
3. Cocina abre **Cocina**, pulsa **Activar alarma** y comprueba el volumen. El navegador exige esta interacción; no confíes solo en el sonido.
4. Repartidores abren **Mis entregas**. Verifican conexión, batería y acceso al mapa.

## Configurar tamaños, extras y opciones del producto

En **Productos → Nuevo o Editar → Personalización del producto**, debajo de Ingredientes:

- **Tamaños:** nombre y recargo por unidad. El primero es el predeterminado, incluido en el precio base (recargo $0). Deja el grupo vacío para vender sin tamaños.
- **Extras:** ingredientes adicionales y su recargo. Configura cuántos se pueden elegir por unidad. Un máximo de 0 los oculta.
- **Salsas:** nombres y máximo de selecciones. Se incluyen sin recargo; una salsa con costo se configura como extra.
- **Ingredientes que se pueden quitar:** marca los ingredientes permitidos; no se seleccionan automáticamente. Quitarlos no rebaja el precio. Si eliminas o renombras un ingrediente en el campo superior, vuelve a revisar estas casillas.
- Guarda con **Guardar producto** o **Publicar producto**. No se permiten nombres repetidos dentro de un grupo ni recargos negativos.

Los productos anteriores conservan sus opciones hasta editarlos; al guardar, quedan configuradas para ese producto, independientemente de su categoría. Los nuevos empiezan sin opciones. Los pedidos enviados conservan precios y detalles. Si una opción se elimina mientras el cliente tiene un carrito pendiente, el sistema le pedirá retirar ese producto y volver a añadirlo desde el menú.

## Pedidos de mesa, retiro y delivery

- **Mesa:** el cliente escanea el QR de su mesa, arma el carrito y confirma. Cocina empieza el pedido, lo marca listo y el personal confirma la entrega. Caja registra el pago; la mesa se libera cuando no quedan pedidos pendientes.
- **Retiro:** el cliente selecciona retiro; no necesita ubicación ni envío. Cocina marca listo; confirma la entrega solo cuando el cliente lo recibe.
- **Delivery:** el cliente confirma un punto del mapa. Caja asigna un repartidor en **Repartos**. Después de que cocina marque listo, el repartidor usa **Salir a reparto**, abre la ruta y pulsa **Confirmar entrega** al entregarlo.
- **Destino:** la ubicación confirmada (GPS o punto elegido en el mapa) manda sobre el texto. **Referencia** sirve para describir la entrada, no para calcular la ruta. Usa **Ver punto** para revisar el mapa y **Abrir ruta** para navegar. Los pedidos anteriores sin coordenadas muestran una advertencia: confirma la dirección con el cliente.
- **Funciones separadas:** caja/administración asigna y supervisa; el repartidor asignado registra salida, entrega e incidencias. Solo administración dispone de **Intervención administrativa**, una excepción con motivo obligatorio de 4 a 240 caracteres. No salta la preparación, asignación ni control de cambios simultáneos; su responsable y motivo quedan auditados.
- Los pedidos enviados siguen guardados al cambiar de sección o recargar. Ante un error, revisa el pedido existente antes de volver a enviarlo. El contenido del carrito todavía no enviado no es una orden de cocina.

## Cobrar no significa recibir el efectivo en caja

| Acción | Quién la realiza | Qué registra |
| --- | --- | --- |
| Confirmar cobro | Caja o repartidor autorizado | Pago del cliente: aumenta ventas una sola vez. |
| Confirmar recepción | Caja o administración, distinta del cobrador | Entrega física del efectivo del repartidor; no crea otra venta. |
| Cerrar y conciliar | Caja o administración | Conteo real del turno y diferencia frente al esperado. |

1. Al cobrar, selecciona el método realmente recibido. **Tarjeta:** verifica aprobación en el terminal. **Transferencia:** confirma el ingreso en la cuenta del local, no solo una captura. El sistema registra el pago; no carga tarjetas ni hace transferencias.
2. Cada método del repartidor requiere permiso independiente de administración. Solo puede cobrar pedidos propios entregados.
3. El efectivo del repartidor aparece en **Efectivo por entregar** y en **Caja → Efectivo de repartidores**. Es dinero del restaurante, no ganancia personal. La sección solo aparece si tiene permiso para cobrar efectivo, cobros pendientes de entrega o recepciones históricas. Sigue contando como venta aunque todavía no esté en el cajón.
4. El cajero cuenta el dinero en presencia del repartidor y pulsa **Confirmar recepción**, por el importe completo del cobro indicado. La confirmación guarda pedido, importe, nombres y fecha.
5. Si falta dinero o la entrega es parcial, **no confirmes un importe que no recibiste**. Avisa al administrador y resuelve la diferencia antes del cierre. Esta versión no registra entregas parciales ni pérdidas de efectivo del repartidor.
6. Caja no permite cerrar mientras haya cobros de repartidores del turno sin recepción confirmada. Reintentar una recepción ya registrada no duplica dinero.
7. **Completadas** conserva las entregas del repartidor. El historial de efectivo muestra sus últimas 30 recepciones confirmadas.

## Leer los totales

- **Ventas / Cobros del día:** pagos de efectivo, tarjeta y transferencia por fecha de cobro en Ecuador, menos reembolsos para obtener el neto. No incluye pedidos aún sin pagar.
- **Turno:** fondo inicial + cobros en efectivo − reembolsos en efectivo del turno. Un turno puede cruzar medianoche.
- **Disponible esperado en caja:** esperado del turno menos efectivo que todavía mantienen repartidores.
- Ejemplo: fondo $20, cobro local $10, driver $15,74 y tarjeta $8. Ventas: $33,74; efectivo esperado al cierre: $45,74; antes de recibir al driver, disponible esperado en caja: $30. Su recepción no cambia las ventas.
- Los pedidos muestran número diario y fecha; el número vuelve a #1 al cambiar el día. Usa ambos para identificar pedidos históricos.

## Cuando algo sale mal

**No pude entregar:** el repartidor registra el motivo. El pedido sigue visible con incidencia; no lo marques entregado ni cobrado. Caja contacta al cliente y usa **Autorizar reintento** con un motivo. Luego se vuelve a despachar. Si se cancela, administración/caja lo hace desde Cocina; solo se admiten pedidos sin cobro y que no estén en camino.

**Cancelar:** indica un motivo entre 4 y 240 caracteres. El cliente verá la razón: usa una explicación clara y respetuosa. Nunca canceles para ocultar un cobro. Un pago ya registrado se gestiona desde el comprobante.

**Pago incorrecto:** abre **Ventas → pedido → Corregir método**. Indica la razón. Cambiar a efectivo exige tener el dinero físicamente en caja. No se reescriben pagos con recepción confirmada, reembolsos o turnos cerrados: escala la conciliación a administración.

**Reembolso:** devuelve el dinero por el método correspondiente y registra importe y motivo desde el comprobante. Nunca superes el saldo cobrado. El reembolso en efectivo sale de caja y exige turno abierto; si el repartidor sigue teniendo el cobro original, todavía debe entregarlo completo. Este registro no ejecuta automáticamente la devolución bancaria.

**Otro usuario actualizó el pedido:** revisa el estado actualizado. Para correcciones de pago, vuelve a abrir el comprobante. No repitas a ciegas una acción que pudo completarse.

**Sin conexión:** conserva la pantalla. Los pedidos enviados siguen en el servidor; los datos visibles pueden estar desactualizados. Reconecta y pulsa Actualizar/Reintentar. No cobres dos veces ni crees un pedido nuevo para sustituir uno cuyo estado desconoces.

## Cerrar turno

1. Revisa repartos y todos los cobros pendientes de recepción. Recibe y confirma el efectivo.
2. Cuenta el cajón: no incluyas pagos por tarjeta ni transferencia.
3. Ingresa efectivo contado y una nota si existe diferencia. Confirma el cierre una sola vez.
4. Comprueba el cierre en el historial y revisa Ventas para el período deseado.
5. Cierra sesión, especialmente en dispositivos compartidos. En móvil, administración tiene el botón junto al logotipo.

## Comprobantes y piloto

En **Equipo → Historial de auditoría**, administración puede filtrar fechas, persona y actividad. Los eventos aparecen agrupados por pedido y fecha, con 25 eventos por página. Abre un grupo para ver sus cambios y **Ver detalle** para consultar motivo, responsable e importes. **Ver todo el pedido** quita los demás filtros y reúne también sus recepciones de efectivo; puede ocupar varias páginas. Los grupos resumen la página actual, no un total histórico del pedido. **Limpiar filtros** vuelve al historial general. Los registros originales se conservan; los nombres sustituyen los correos en la vista.

El comprobante incluye artículos, cantidades, totales y nombres del personal, no el correo del repartidor. **No es una factura tributaria.** Al imprimir, desactiva encabezado/pie del navegador y verifica el tamaño en la impresora real.

Usa solo staging para practicar. No reinicies ni borres ventas reales. Los cobros anteriores al nuevo control de recepción deben revisarse manualmente: no existe prueba retroactiva de quién entregó ese efectivo.
