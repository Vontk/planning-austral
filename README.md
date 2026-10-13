# campus lookup

Buscador de materias y aulas libres de Austral. Sin login ni paquetes externos. Necesitás **Python 3.10+** e internet.

## Abrir

```bash
python3 server.py
```

Abre tu navegador predeterminado en **http://127.0.0.1:18787/**. Si la integración de favoritos ya está activa, reutiliza ese servidor. Al cerrar la última pestaña de la app, Python termina unos segundos después. Recargar no lo cierra. También podés terminarlo con `Ctrl+C`.

## Abrir desde la barra de favoritos

En **Linux con systemd** (como esta computadora), configurá esto una sola vez, desde la carpeta del proyecto y **sin sudo**:

```bash
python3 install_bookmark.py
```

1. Abrí **http://127.0.0.1:18787/** en tu navegador.
2. Presioná **Ctrl+D**, poné el nombre **campus lookup** y elegí **Barra de favoritos**.
3. Cerrá la pestaña. La próxima vez, al pulsar ese favorito, Python arranca automáticamente y la app abre en **esa misma pestaña**.

**En esta computadora ya está configurado el inicio automático. Solo falta guardar el favorito.**

No guardes URLs temporales como `http://127.0.0.1:40875/`: pertenecen a una ejecución anterior y dejan de responder al cerrar Python. El puerto estable de este setup es **18787**.

Python termina al cerrar la última pestaña. Linux conserva el punto de entrada local para poder volver a iniciarlo: no queda un proceso de Python ejecutándose entre usos. Funciona después de volver a iniciar sesión. No expone la app a otras computadoras.

Si movés la carpeta, volvé a ejecutar el setup. Si el puerto está ocupado, usá `python3 install_bookmark.py --port 18788` y guardá la dirección que indique. Para desinstalar esta integración:

```bash
python3 install_bookmark.py --uninstall
```

Un HTML o favorito común no puede ejecutar un archivo Python por su ruta. La integración usa [activación por socket de systemd](https://github.com/systemd/systemd/blob/main/man/systemd.socket.xml). En Windows, macOS o Linux sin systemd, usá `python3 server.py`; el inicio desde favoritos de este proyecto está disponible para Linux con systemd.

## Usar

- Elegí fecha o **Hoy / Mañana**, y campus. Los datos se cargan automáticamente.
- **Buscar materias**: `analisis 2` encuentra `Análisis Matemático II`. Ignora tildes y mayúsculas, reconoce romanos I–X y tolera pequeños errores. Distingue el número de la materia del de la comisión. Podés combinar la búsqueda con **Facultad / unidad** y **Carrera / programa**; al elegir una facultad, el selector de carreras muestra sus clasificaciones del día.
- **Buscar aula**: escribí `R2`, `C8.1`, `B7` o un edificio. Muestra las reservas de cada aula para la fecha seleccionada, ordenadas por hora, y también aulas sin reservas. Incluye laboratorios y talleres que figuran como aulas numeradas. Cada reserva muestra su unidad y carrera/programa. **Detalle** solo aparece si hay contenido; se eliminan las etiquetas vacías y el título repetido.
- **Buscar aula vacía**: elegí **Desde** o pulsá **Ahora**. Ahora selecciona la fecha y hora actuales de Buenos Aires.
- En **Hasta**, podés editar la hora o poner **+ N horas** desde el inicio: acepta `1,5`, `1.5` y `0.5`. La duración mínima es un minuto y la máxima 24 horas; se redondea al minuto más cercano.
- Si termina al día siguiente, lo indica y consulta las reservas de ambos días. Una hora final anterior al inicio se interpreta como el día siguiente. Para un intervalo de exactamente 24 horas, escribí `24` en la duración.
- En Pilar se busca por defecto en Olivo A/B, Roble y Ceibo, con códigos A/B/C/R seguidos de un número (también decimales como B11.1). Un aula numerada no se excluye por llamarse Lab, Biolab o Taller. SUM queda fuera de ese alcance; **Todas las aulas** amplía el inventario. En otros campus se usan sus propias aulas. Se excluyen oficinas y espacios virtuales o exteriores.
- **Tema claro / Tema oscuro** cambia la paleta y recuerda tu elección cuando el navegador permite guardar preferencias. La lupa es también el icono de la pestaña.

Libre significa **sin reservas registradas**; no garantiza que el aula esté físicamente vacía. Los horarios son de Buenos Aires (UTC−3).

La app sincroniza cada cinco minutos mientras está visible, al volver después de cinco minutos y al recuperar internet. Reintenta si falla una carga y avisa cuando falta el inventario de un edificio. Las respuestas de búsquedas anteriores no reemplazan la selección actual.

## Archivos

- `server.py`: puente local, navegador y cierre automático.
- `index.html`: interfaz, búsqueda, temas y horarios.
- `logo.svg`: lupa en el color de acento.
- `install_bookmark.py`: instala o quita el inicio desde favoritos en Linux.
- `tests/`: pruebas de casos límite.

Planning bloquea la lectura desde un HTML externo por CORS. El puente solo lee `day.php` y `report.php` de https://planning-campus.austral.edu.ar:44443/. No inicia sesión ni cambia reservas. El inventario se obtiene de las grillas públicas, incluyendo aulas sin reservas.

## Comprobaciones

```bash
node tests/app.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

Node solo es necesario para ejecutar las pruebas del buscador, no para usar la app. Las pruebas cubren comisiones, fechas UTC−3, cambio de año, decimales, medianoche, límites de reservas, CSV, cambio rápido de filtros y tema claro sin almacenamiento. Pasaron 17 pruebas de JavaScript y 9 de Python. También se comprobó el inicio, cierre y reinicio desde favoritos con systemd y la interfaz con datos reales en Brave.

Capturas: [tema oscuro](docs/dark.jpg) · [tema claro](docs/light.jpg) · [conteo corregido](docs/availability-fixed.jpg) · [reservas por aula](docs/room-schedule.jpg) · [filtros académicos](docs/academic-filters.jpg).

## Compartir

El [repositorio es privado](https://github.com/Vontk/planning-austral). Para acceder hay que ser colaborador invitado; el enlace por sí solo no concede acceso.

## Corrección del conteo

El filtro anterior excluía R1, R4, R5, R7, C5, C6 y C7 por contener “Lab”, “Biolab” o “Taller”. Se corrigió para usar el código del aula. En la auditoría del 13/10/2026, de 14:23 a 16:23, se verificaron seis aulas sin reservas: R4, R7, C2, C5, C6 y C7. El inventario habitual pasó de 41 a 47 (48 del original menos SUM). Estos son resultados históricos de esa consulta, no disponibilidad garantizada para otro momento.

## Campos de Planning

Los filtros usan los datos del reporte, no inferencias por el título:

- **Unidad**: código de facultad o unidad, por ejemplo FI, FCB o FCE BA.
- **Ceco**: clasificación que suele identificar una carrera o programa. En el CSV actual su encabezado está vacío, entre Unidad y Orden; se verificó contra los detalles públicos de la reserva. Puede contener categorías administrativas y no garantiza que toda reserva esté correctamente clasificada.
- **Orden**: actividad/programa adicional; muchas clases tienen el valor genérico “Reuniones Varias”, por eso no se usa como carrera.

La descripción puede tener Responsable o Director-Profesor aunque Detalle esté vacío. Se conserva esa información cuando está completa.

## Qué queda funcionando cuando cerrás la página

Al entrar a `http://127.0.0.1:18787/`, systemd inicia `server.py` si no está activo. Python sirve la interfaz y lee Planning mientras haya alguna pestaña abierta. Después de cerrar la última, detecta la desconexión y termina tras unos 6–9 segundos. Recargar no lo termina.

**No queda Python ejecutándose permanentemente.** Solo queda el socket local gestionado por systemd, listo para iniciar la app la próxima vez. Si dejás una pestaña abierta, incluso en segundo plano, Python sí sigue activo. Si se inicia sin llegar a abrir una página, termina después de 90 segundos.

Para comprobarlo desde una terminal (estas consultas no inician Python):

```bash
systemctl --user is-active campus-lookup.service  # Python: active o inactive
systemctl --user is-active campus-lookup.socket   # Punto de entrada: active
```
