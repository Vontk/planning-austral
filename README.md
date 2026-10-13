# campus lookup

Buscador de materias y aulas libres de Austral. Sin login ni paquetes externos. Necesitás **Python 3.10+** e internet.

## Abrir

```bash
python3 server.py
```

Abre tu navegador predeterminado. Al cerrar la última pestaña de la app, Python termina unos segundos después. Recargar no lo cierra. También podés terminarlo con `Ctrl+C`.

## Abrir desde la barra de favoritos

En **Linux con systemd** (como esta computadora), configurá esto una sola vez, desde la carpeta del proyecto y **sin sudo**:

```bash
python3 install_bookmark.py
```

1. Abrí **http://127.0.0.1:18787/** en tu navegador.
2. Presioná **Ctrl+D**, poné el nombre **campus lookup** y elegí **Barra de favoritos**.
3. Cerrá la pestaña. La próxima vez, al pulsar ese favorito, Python arranca automáticamente y la app abre en **esa misma pestaña**.

**En esta computadora ya está configurado el inicio automático. Solo falta guardar el favorito.**

Python termina al cerrar la última pestaña. Linux conserva el punto de entrada local para poder volver a iniciarlo: no queda un proceso de Python ejecutándose entre usos. Funciona después de volver a iniciar sesión. No expone la app a otras computadoras.

Si movés la carpeta, volvé a ejecutar el setup. Si el puerto está ocupado, usá `python3 install_bookmark.py --port 18788` y guardá la dirección que indique. Para desinstalar esta integración:

```bash
python3 install_bookmark.py --uninstall
```

Un HTML o favorito común no puede ejecutar un archivo Python por su ruta. La integración usa [activación por socket de systemd](https://github.com/systemd/systemd/blob/main/man/systemd.socket.xml). En Windows, macOS o Linux sin systemd, usá `python3 server.py`; el inicio desde favoritos de este proyecto está disponible para Linux con systemd.

## Usar

- Elegí fecha o **Hoy / Mañana**, y campus. Los datos se cargan automáticamente.
- **Buscar materias**: `analisis 2` encuentra `Análisis Matemático II`. Ignora tildes y mayúsculas, reconoce romanos I–X y tolera pequeños errores. Distingue el número de la materia del de la comisión.
- **Buscar aula vacía**: elegí **Desde** o pulsá **Ahora**. Ahora selecciona la fecha y hora actuales de Buenos Aires.
- En **Hasta**, podés editar la hora o poner **+ N horas** desde el inicio: acepta `1,5`, `1.5` y `0.5`. La duración mínima es un minuto y la máxima 24 horas; se redondea al minuto más cercano.
- Si termina al día siguiente, lo indica y consulta las reservas de ambos días. Una hora final anterior al inicio se interpreta como el día siguiente. Para un intervalo de exactamente 24 horas, escribí `24` en la duración.
- En Pilar se busca por defecto en Olivo A/B, Roble y Ceibo. En otros campus busca sus aulas; no aplica edificios de Pilar. Se excluyen laboratorios, talleres, oficinas, salas y espacios virtuales o exteriores.
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

Node solo es necesario para ejecutar las pruebas del buscador, no para usar la app. Las pruebas cubren comisiones, fechas UTC−3, cambio de año, decimales, medianoche, límites de reservas, CSV, cambio rápido de filtros y tema claro sin almacenamiento. Pasaron 11 pruebas de JavaScript y 7 de Python. También se comprobó el inicio, cierre y reinicio desde favoritos con systemd y la interfaz con datos reales en Brave.

Capturas: [tema oscuro](docs/dark.jpg) · [tema claro](docs/light.jpg).

## Compartir

El [repositorio es privado](https://github.com/Vontk/planning-austral). Para acceder hay que ser colaborador invitado; el enlace por sí solo no concede acceso.
