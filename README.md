# campus lookup

Buscá materias, horarios por aula y aulas vacías de Austral. Sin login ni dependencias externas. Requiere **Python 3.10+**, internet y un navegador moderno.

## Instalación habitual · Linux con systemd

Cloná el repo donde quieras y ejecutá el setup **sin sudo**:

```bash
git clone https://github.com/Vontk/planning-austral.git
cd planning-austral
python3 setup.py
```

El setup instala el inicio automático y abre la app. Después entrá a **http://campus-lookup.localhost:18787/** desde tu navegador cuando quieras. Guardalo con **Ctrl+D** en la barra de favoritos como **campus lookup**.

Al abrir el enlace, Python arranca automáticamente. Al cerrar la última pestaña, termina en unos 6–9 segundos. Funciona al volver a iniciar sesión; la app solo es accesible desde tu computadora.

Conservá la carpeta del proyecto. Si la movés, ejecutá `python3 setup.py` de nuevo desde su nueva ubicación. Para actualizar: `git pull` y cerrá/reabrí las pestañas de la app.

Si tu navegador no reconoce el nombre local, usá **http://127.0.0.1:18787/**. Si el puerto está ocupado, ejecutá `python3 install_bookmark.py --port 18788` y abrí el enlace que indique.

## Windows, macOS o Linux sin systemd

Descargá o cloná el repo y, desde su carpeta, ejecutá:

```bash
python3 server.py
```

En Windows podés usar `py -3 server.py`. Se abre el navegador predeterminado y Python termina al cerrar la última pestaña. En estos sistemas hay que ejecutar el comando cada vez que quieras abrir la app; el setup automático requiere Linux con systemd.

## Uso

- Elegí fecha y campus. Los horarios se actualizan automáticamente.
- **Buscar materias**: `analisis 2` encuentra `Análisis Matemático II`. Podés buscar y seleccionar una **Facultad / unidad** y **Carrera / programa**; las opciones dependen de la fecha y del campus. Escribir en el buscador del filtro reduce las opciones; elegí una para aplicarla. Las clasificaciones son las que registra Planning.
- **Buscar aula**: escribí `R2`, `C8.1` o un edificio para ver sus reservas del día.
- **Buscar aula vacía**: elegí Desde / Hasta, o **Ahora** y **+ horas** (acepta `1,5`). Puede abarcar hasta 24 horas, incluso cruzar medianoche.
- **Tema claro / oscuro** cambia y recuerda la apariencia.

Los horarios usan la hora de Buenos Aires. Aula libre significa sin reservas registradas; puede estar ocupada sin figurar en Planning.

Para quitar el inicio automático:

```bash
python3 install_bookmark.py --uninstall
```
