# Planning Austral

Buscá materias y aulas libres en los horarios públicos de Universidad Austral. Sin login, sin paquetes externos. Necesitás Python 3.10 o posterior y conexión a internet.

## Abrir

Ejecutá desde esta carpeta:

```bash
python3 server.py
```

Se abre automáticamente en tu navegador predeterminado. **Al cerrar la pestaña, Python termina unos segundos después.** Si abriste varias pestañas de la app, cerrá todas. Recargar la página no termina el programa. También podés salir con `Ctrl+C`.

Si el navegador no se abre automáticamente, usá la dirección que aparece en la terminal. Si no se abre ninguna página en 90 segundos, el programa termina.

## Usar

1. Elegí fecha y campus y pulsá **Actualizar horarios**.
2. En **Buscar materias**, escribí el nombre: `analisis 2` encuentra `Análisis Matemático II`. Ignora tildes y mayúsculas, reconoce números romanos I–X y tolera pequeños errores.
3. En **Aulas libres**, elegí la hora de inicio y fin. En Pilar, busca por defecto en Olivo A/B, Roble y Ceibo; podés ampliar a todas las aulas del campus.

Los resultados corresponden al día elegido. “Disponible” significa sin reservas registradas durante todo el intervalo; no garantiza que el aula esté físicamente vacía. Actualizá los horarios antes de usar un aula.

## Archivos

- `server.py`: abre el navegador, lee Planning y se cierra con la página.
- `index.html`: interfaz y buscador; incluye estilos y JavaScript.

## Por qué usa Python

Planning es público, pero bloquea que un HTML de otro origen lea sus datos (CORS). Python funciona como puente local: solo lee las páginas públicas `day.php` y `report.php` de https://planning-campus.austral.edu.ar:44443/. No inicia sesión ni modifica reservas. Las aulas se obtienen del inventario de las grillas, incluyendo las que no tienen reservas.

El servidor solo escucha en tu computadora y elige un puerto libre. Mantiene una conexión con cada pestaña para saber cuándo terminar. Si falla un edificio, la app informa que el inventario está incompleto y no confirma aulas de ese edificio.

## Compartir

Un repositorio privado de GitHub solo es accesible para su dueño y los colaboradores invitados. Tener el enlace no concede acceso. Los colaboradores pueden descargar o clonar el proyecto y ejecutar `python3 server.py`.

## Comprobaciones realizadas

Se comprobó la lectura de un reporte real de Planning, la búsqueda flexible y el procesamiento de CSV y fechas. También se comprobó que el servidor sigue activo al recargar o mantener otra pestaña abierta, y termina al cerrar la última. La comprobación del ciclo de vida simuló las conexiones del navegador; no se hizo una revisión visual de la interfaz.
