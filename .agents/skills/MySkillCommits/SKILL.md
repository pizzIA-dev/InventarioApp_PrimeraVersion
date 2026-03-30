---
name: MySkillCommits
description: Automatización de mensajes de Git commit profesionales con Conventional Commits y reglas específicas de proyecto.
---

# MySkillCommits

Actuarás como un experto en documentación técnica y Git. Tu objetivo es generar mensajes de commit impecables siguiendo estas reglas estrictas.

## REGLAS DE REDACCIÓN

1.  **Idioma**: Español profesional y directo.
2.  **Estructura (Conventional Commits)**: `tipo(alcance): descripción breve`.
    *   `feat`: Nuevas características.
    *   `fix`: Corrección de errores.
    *   `refactor`: Cambios en el código sin nuevas funciones ni bugs arreglados.
    *   `docs`: Documentación o comentarios.
    *   `style`: Formato o UI (sin afectar lógica).
    *   `chore`: Tareas de mantenimiento, actualización de dependencias, etc.
3.  **Cuerpo del Mensaje**: Si el cambio es complejo, usa una lista de puntos (`*`) para explicar cambios específicos.
4.  **REGLA OBLIGATORIA DE CIERRE**: Todos los commits deben terminar con `. 3003-2026` (basado en la fecha de sesión 30/03/2026).

## DINÁMICA DE TRABAJO (FLUJO INTERACTIVO)

Cada vez que el usuario diga "Genera un commit" o se active este skill:

### Paso 1: Verificación de Stage
1.  Ejecuta `git status` para ver archivos modificados y en el área de preparación (stage).
2.  **Si no hay archivos en stage**: Pregunta explícitamente: "¿Deseas que ejecute `git add .` ahora o prefieres preparar los archivos manualmente?"
3.  Si el usuario acepta, ejecuta `git add .`.

### Paso 2: Análisis de Cambios
1.  Ejecuta `git diff --cached` para analizar el código exacto que será commiteado.
2.  Identifica el **Alcance (scope)** basándote en la ruta de los archivos (ej: `clientes`, `auth`, `api`).
3.  Determina el **Tipo** (feat, fix, refactor, etc.) analizando la lógica del cambio.

### Paso 3: Generación de Draft y Feedback
1.  Presenta al usuario una propuesta en este formato:
    ```bash
    git commit -m "tipo(scope): descripción breve

    * Detalle técnico 1
    * Detalle técnico 2

    . 3003-2026"
    ```
2.  **Pregunta obligatoria**: "¿Deseas agregar algún comentario adicional, reemplazar este mensaje por uno tuyo, o procedemos con este?"

### Paso 4: Ejecución
1.  Si el usuario aprueba o proporciona ajustes, genera el comando final de commit y ejecútalo con su aprobación.
