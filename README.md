# CloudOps Dashboard

Sistema web para la planificación y visualización de una solución Cloud.
Práctica integrativa de **Cloud Foundations – Semanas 5 y 6** (Diseño de una solución Cloud con React).

---

## 1. Descripción

CloudOps Dashboard es un panel profesional que permite planificar, visualizar y analizar los componentes
fundamentales de una solución de computación en la nube: planificación Cloud, economía y costos,
infraestructura global, seguridad y modelo de responsabilidad compartida, IAM, arquitectura de red (VPC,
Route 53, CloudFront) y catálogo de servicios AWS.

Toda la información es **simulada (mock)**. No se realiza ninguna implementación real sobre AWS: el objetivo
es aplicar los conceptos de Cloud Foundations mediante un frontend profesional en React.

---

## 2. Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| React 18 | Librería principal de interfaz |
| TypeScript | Tipado estático del dominio Cloud |
| Vite | Entorno de desarrollo y compilación |
| HTML5 + CSS | Estructura y estilos base |
| Tailwind CSS | Sistema de utilidades y paleta corporativa |
| React Router DOM | Navegación entre módulos |
| Lucide React | Iconografía coherente |
| SVG propio | Gráficos interactivos (dona y barras) y mapa global |

---

## 3. Instalación

Requisito previo: **Node.js 18 o superior**.

```bash
# 1. Abrir la carpeta del proyecto en Visual Studio Code
cd cloudops-dashboard

# 2. Instalar las dependencias
npm install
```

## 4. Ejecución

```bash
# Modo desarrollo (http://localhost:5173)
npm run dev

# Compilación de producción
npm run build

# Previsualizar la compilación
npm run preview

# Verificación de tipos
npm run lint
```

---

## 5. Paleta y tipografía

| Elemento | Valor |
|---|---|
| Fondo principal | `#F8FAFC` |
| Sidebar | `#0F172A` |
| Color principal | `#2563EB` |
| Seguridad | `#16A34A` |
| Costos | `#F59E0B` |
| Alertas | `#DC2626` |
| Texto principal | `#1E293B` |
| Texto secundario | `#64748B` |
| Bordes | `#E2E8F0` |
| Cards | `#FFFFFF` |

Título principal 28–32 px (700), subtítulos 18–20 px (600), texto 14–16 px, texto secundario 12–14 px.
Cards con `border-radius` de 12–16 px, sombra ligera y bordes suaves.

---

## 6. Estructura del proyecto

```
cloudops-dashboard/
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
├── public/
│   └── cloud.svg
└── src/
    ├── components/
    │   ├── Header.tsx
    │   ├── Sidebar.tsx
    │   ├── Layout.tsx
    │   ├── StatCard.tsx
    │   ├── ServiceCard.tsx
    │   ├── CostCard.tsx
    │   ├── SecurityCard.tsx
    │   ├── RegionCard.tsx
    │   ├── StatusBadge.tsx
    │   ├── SectionCard.tsx
    │   ├── DonutChart.tsx
    │   └── BarChart.tsx
    ├── pages/
    │   ├── Dashboard.tsx
    │   ├── Planning.tsx
    │   ├── Costs.tsx
    │   ├── Infrastructure.tsx
    │   ├── Security.tsx
    │   ├── Network.tsx
    │   └── Services.tsx
    ├── context/
    │   └── AppContext.tsx
    ├── data/
    │   ├── awsServices.ts
    │   ├── regions.ts
    │   └── security.ts
    ├── types/
    │   └── cloud.ts
    ├── utils/
    │   └── format.ts
    ├── App.tsx
    ├── main.tsx
    └── index.css
```

---

## 7. Módulos y funcionalidades

| Ruta | Módulo | Contenido |
|---|---|---|
| `/dashboard` | Dashboard | Servicios utilizados, región seleccionada, costo mensual y anual, estado de seguridad, recursos Cloud, estado de la arquitectura, tarjetas de indicadores y dos gráficos |
| `/planning` | Planificación Cloud | Formulario de propuesta (nombre, tipo de aplicación, descripción, región, usuarios, disponibilidad, servicios y objetivo de migración) con validación, y visualización en tarjetas y tabla |
| `/costs` | Costos y economía Cloud | Calculadora simulada (servicio, cantidad, horas, costo estimado, mensual y anual), gráfico de dona, gráfico de barras y detalle por línea |
| `/infrastructure` | Infraestructura Global | Mapa SVG de regiones, tarjetas de región (ubicación, AZ, ubicaciones de borde, latencia, servicios desplegados y estado) y tabla resumen |
| `/security` | Seguridad | Modelo de responsabilidad compartida, controles con semáforo verde/amarillo/rojo, protección de cuentas, protección de datos, cumplimiento y tabla IAM |
| `/network` | Arquitectura de Red | Diagrama construido en la interfaz: Internet → Route 53 → CloudFront → VPC → subredes pública y privada → EC2 / RDS, con tablas de enrutamiento y controles de red |
| `/services` | Servicios AWS | Catálogo con EC2, S3, RDS, IAM, VPC, Route 53, CloudFront y CloudWatch: nombre, categoría, descripción, función principal y estado de utilización |

### Requisitos funcionales cubiertos

Visualizar el dashboard · navegar entre módulos · registrar una propuesta Cloud · seleccionar servicios ·
visualizar regiones · calcular costos simulados · visualizar gráficos · consultar información de seguridad ·
visualizar IAM · visualizar una arquitectura de red · consultar servicios AWS · mostrar estados mediante
indicadores · adaptarse a dispositivos móviles.

---

## 8. Reto adicional implementado

| Reto | Dónde se encuentra |
|---|---|
| Modo oscuro | Botón sol/luna en el header, con persistencia |
| Buscador de servicios | Buscador global del header y buscador propio en `/services` |
| Filtros por categoría | Filtros en Servicios AWS, Seguridad e Infraestructura Global |
| Gráfico interactivo | Dona y barras con resaltado y valores al pasar el cursor |
| Exportación de un reporte | Botón «Exportar reporte» en Dashboard y Costos, y «Exportar» en Servicios (CSV con utilidad compartida `utils/report.ts`) |
| Selector de regiones | Selector en el header, tarjetas de región y mapa interactivo |
| Notificaciones | Campana con contador, panel desplegable y avisos automáticos |
| Vista detallada de cada servicio | Botón «Ver detalle» en cada ServiceCard y ficha completa en ventana modal («Abrir ficha completa», se cierra con Escape) |
| Animaciones y transiciones | Entradas de página, apertura del menú, barras y estados de hover |
| Persistencia con localStorage | Propuestas, costos, región, tema y notificaciones (`cloudops-dashboard-state-v1`) |

---

## 9. Evidencias

Agregar en la carpeta `docs/` las capturas de: Dashboard, Planificación, Costos, Infraestructura Global,
Seguridad, Arquitectura de Red, Servicios AWS y la vista responsive (móvil).

```
docs/
├── 01-dashboard.png
├── 02-planificacion.png
├── 03-costos.png
├── 04-infraestructura.png
├── 05-seguridad.png
├── 06-red.png
├── 07-servicios.png
└── 08-responsive.png
```

---

## 10. Decisiones de diseño

- **Componentes reutilizables**: Sidebar, Header, StatCard, ServiceCard, CostCard, SecurityCard, RegionCard
  y StatusBadge, más SectionCard, DonutChart y BarChart para mantener consistencia visual.
- **Estado centralizado**: un único `AppContext` guarda propuestas, costos, región, tema y notificaciones,
  de modo que cambiar la región recalcula automáticamente los costos y actualiza el dashboard.
- **Gráficos propios en SVG**: evitan dependencias pesadas y se adaptan a la paleta y al modo oscuro.
- **Responsive**: sidebar fijo desde 1024 px y menú lateral deslizante en móvil; las rejillas pasan de tres
  columnas a una y las tablas se desplazan horizontalmente.
- **Accesibilidad**: etiquetas asociadas a cada campo, foco visible, textos alternativos en los gráficos y
  respeto por `prefers-reduced-motion`.

---

## 11. Autor
Yun Sun Jessy Rojas Pagan - 1601065
Estudiante de Tecnologías de la Información – Nivel Profesional Técnico
Práctica integrativa Cloud Foundations, Semanas 5 y 6.
#   c l o u d o p s  
 