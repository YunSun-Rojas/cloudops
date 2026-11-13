# Módulo Análisis IA

## Resumen para la exposición

El módulo **Análisis IA** revisa archivos seleccionados de un repositorio público de GitHub o de un ZIP. Muestra posibles riesgos con fragmentos de evidencia y sugerencias que requieren validación humana.

No modifica el repositorio, no aplica correcciones y no despliega recursos en AWS. Es una herramienta de apoyo para la revisión, no una certificación de seguridad.

## ¿Dónde se encuentra?

En el menú lateral, con el nombre **Análisis IA**. La ruta de la aplicación es `/analisis-ia`. Se puede elegir entre ingresar la URL de un repositorio público o cargar un archivo ZIP del proyecto.

La URL de GitHub debe tener este formato:

```text
https://github.com/usuario/repositorio
```

## ¿Cómo funciona?

1. **Valida la dirección.** Comprueba que sea una URL de GitHub con el usuario y el nombre del repositorio.
2. **Obtiene los archivos del proyecto.** Para GitHub, consulta la API para identificar la rama principal y listar los archivos versionados. Para ZIP, lee el índice y extrae únicamente los archivos seleccionados en el navegador.
3. **Selecciona qué revisar.** Da prioridad al código, APIs, autenticación, infraestructura y configuración. Omite tests (`*.test.*`, `*.spec.*` y directorios de pruebas), carpetas de Cypress y Playwright, mocks, fixtures, binarios, dependencias, archivos generados y lockfiles. Puede incluir README y documentos de seguridad o contribución ubicados en la raíz, con prioridad baja.
4. **Limita el alcance por seguridad y consumo.** Revisa los archivos elegibles priorizados hasta un máximo de 600 archivos, 100 KB por archivo y 10 MB de contenido, distribuidos en hasta 200 lotes de un máximo de 15 archivos. Se priorizan rutas relacionadas con autenticación, tokens, clientes HTTP/API, permisos, configuración, seguridad y cargas de archivos. Si el proyecto supera alguno de esos límites, se analiza una selección priorizada, no el proyecto completo. El contador de archivos detectados también incluye los que se excluyen por tipo o ruta.
5. **Ejecuta reglas locales deterministas.** En cada lote busca patrones conocidos como tokens en almacenamiento web, XSS, ejecución dinámica, secretos incrustados, registros sensibles y URLs HTTP. Los resultados se combinan con los hallazgos de IA sin duplicar la misma evidencia; si ninguna IA está disponible, se usa el análisis local de respaldo.
6. **Solicita el análisis a los proveedores configurados.** El navegador envía los archivos seleccionados al endpoint del servidor `/api/github-audit`. El servidor procesa los lotes y prueba, en orden, los proveedores con clave configurada (Gemini, Mistral, OpenRouter y Groq). Se usa el primero que responda con un resultado válido; las IA no revisan el proyecto en paralelo. Las claves se configuran en el servidor.
7. **Valida y presenta la respuesta.** La evidencia se valida contra el archivo leído, tolerando diferencias de espacios. Los candidatos de IA sin coincidencia se descartan y se cuentan; las reglas locales también se identifican en el resultado. Si no hay IA disponible, se muestran coincidencias locales y se informa de sus límites.

El resultado agrupa los lotes de forma determinista; no se envía un segundo pedido a la IA para volver a resumirlos. Mientras trabaja, la interfaz informa el estado de lectura, revisión local, análisis de lotes, agrupación y espera por límites temporales.

## ¿Qué muestra el resultado?

- **Motor y alcance:** proveedor de IA o reglas locales, archivos revisados y cobertura de lectura.
- **Porcentaje de seguridad y riesgo:** indicadores orientativos calculados mediante la fórmula visible y los hallazgos respaldados por evidencia. El resultado local se basa únicamente en patrones conocidos; ninguno de estos índices es una probabilidad real de ataque ni una certificación.
- **Hallazgos:** candidatos con severidad sugerida, archivo y fragmento exacto. No son vulnerabilidades confirmadas; valida el contexto antes de corregir.
- **Recomendaciones AWS y proyección:** servicios vinculados a los hallazgos se muestran una sola vez. Después se estima el cambio del índice únicamente para los riesgos relacionados; se supone que las medidas se implementan y mitigan el riesgo. Desplegar AWS por sí solo no corrige el código.
- **Escalabilidad:** nivel y acciones derivados de señales de diseño con fragmentos exactos. Es una evaluación estática, no una medición; la capacidad real requiere pruebas de carga y métricas de ejecución.
- **Archivos revisados:** lista de rutas para que el alcance del resultado sea visible.

La secuencia del informe es: porcentaje de seguridad, riesgo y cobertura; detalle de hallazgos; recomendaciones AWS y su proyección; y evaluación de escalabilidad. Si no hay una recomendación AWS verificada contra un hallazgo, se muestra AWS Security Hub como opción general para evaluar en entornos AWS; se identifica como no derivada del código y no se le atribuye una mejora del porcentaje.

## Alcance y confianza

El índice de riesgo suma puntos por severidad (Crítica 40, Alta 25, Media 12, Baja 4 con aporte total de Baja limitado a 12 e Info 0), con tope de 100. Reserva como mínimo 1 punto por la incertidumbre propia de una revisión estática/parcial, así que el indicador de seguridad es 100 menos ese índice. Si no hay hallazgos con evidencia, la interfaz muestra “Sin determinar” en lugar de ese valor. El punto de incertidumbre no significa que se haya detectado una vulnerabilidad ni que exista una probabilidad de ataque determinada. Los hallazgos repetidos se deduplican por archivo y evidencia normalizada. El impacto potencial resta del riesgo solo los hallazgos asociados a opciones AWS mediante sus referencias de evidencia; la opción general de Security Hub no altera el cálculo. No predice probabilidades ni garantiza la mitigación. La evidencia verificable confirma que el fragmento existe, no que la interpretación sea correcta. Las recomendaciones de escalabilidad describen señales estáticas, no cuellos de botella medidos. Los lotes se agrupan sin pedirle a otro modelo que invente un resumen global. Si un lote falla, se continúa con los demás y se indica cuántos respondieron; la cobertura solo cuenta los archivos de lotes exitosos. Las reglas locales también pueden producir falsos positivos. La herramienta no demuestra que un proyecto sea seguro ni sustituye pruebas, revisión humana o una auditoría profesional.

## Guion breve para la demostración

> “Este módulo permite revisar un repositorio público de GitHub sin modificar el proyecto, o cargar un ZIP. Selecciona archivos relevantes del código y la configuración, y excluye pruebas y artefactos asociados para enfocar el análisis. Envía los archivos por lotes al primer proveedor de IA configurado que responda correctamente. El resultado organiza posibles riesgos por severidad y propone correcciones. Es una revisión parcial y automática, por lo que orienta la revisión, pero no garantiza que el proyecto sea seguro.”

**Demostración sugerida:** abrir Análisis IA, ingresar la URL de un repositorio público de prueba o seleccionar un ZIP, iniciar el análisis y mostrar el motor utilizado, el alcance de archivos, un hallazgo y su recomendación. Evitar proyectos con código o información que no se tenga autorización para compartir con el servicio de análisis.

## Consideraciones y límites

- GitHub solo permite repositorios públicos accesibles sin autenticación. La alternativa es cargar el proyecto en ZIP (máximo 25 MB).
- Los archivos seleccionados se envían al backend y al proveedor de IA que responda. En la opción ZIP se enmascaran patrones comunes de claves antes del envío, pero esta detección no puede garantizar que todos los secretos sean reconocidos. Usar únicamente proyectos autorizados y no enviar información privada.
- Configura las claves en variables de servidor de Vercel con los nombres `GEMINI_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY` y `GROQ_API_KEY`; no uses el prefijo `VITE_` para ellas.
- GitHub puede limitar las solicitudes anónimas; los proveedores de IA también pueden tener límites temporales de uso o de tamaño de contexto.
- El límite de 600 archivos, 10 MB en total, 100 KB por archivo y 200 lotes es un máximo técnico, no una garantía de que se revisarán todos los archivos elegibles de un proyecto.
- Un archivo no revisado puede contener riesgos que el informe no detectará.
- La ausencia de hallazgos no demuestra que el repositorio esté libre de vulnerabilidades.
- El análisis no reemplaza pruebas, revisión manual ni una auditoría profesional.
- El módulo no guarda el informe en una base de datos ni cambia el código del repositorio.

## Componentes técnicos relacionados

| Archivo | Responsabilidad |
|---|---|
| `src/components/AnalisisIAView.tsx` | Formulario, progreso, errores y presentación de resultados. |
| `src/services/githubAuditService.ts` | Valida la URL, obtiene y prioriza archivos de GitHub, aplica reglas locales y coordina las solicitudes. |
| `api/github-audit.ts` | Endpoint del servidor que valida los archivos y consulta los proveedores de IA configurados en orden. |
| `src/types/githubAudit.ts` | Tipos y validación de la estructura del resultado. |
| `src/App.tsx` | Registra la ruta `/analisis-ia`. |
