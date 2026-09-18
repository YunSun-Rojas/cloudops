import {
  Server,
  Database,
  HardDrive,
  ShieldCheck,
  Network,
  Globe2,
  Gauge,
  Boxes,
} from 'lucide-react';
import type { AwsService, ServiceCategory } from '../types/cloud';

export const serviceCategories: ServiceCategory[] = [
  'Computo',
  'Almacenamiento',
  'Base de datos',
  'Seguridad e identidad',
  'Redes',
  'Entrega de contenido',
];

export const awsServices: AwsService[] = [
  {
    id: 'ec2',
    name: 'Amazon EC2',
    category: 'Computo',
    description:
      'Capacidad de computo redimensionable en la nube mediante instancias virtuales que se aprovisionan en minutos.',
    mainFunction: 'Ejecutar los servidores de aplicacion del sistema empresarial.',
    usage: 'En uso',
    hourlyPrice: 0.096,
    unit: 'instancia t3.medium / hora',
    icon: Server,
    responsibility: 'Compartida',
    docs: 'Modelo de pago por uso. Se factura por segundo con un minimo de 60 segundos.',
  },
  {
    id: 's3',
    name: 'Amazon S3',
    category: 'Almacenamiento',
    description:
      'Almacenamiento de objetos con durabilidad de 99.999999999% y escalado practicamente ilimitado.',
    mainFunction: 'Guardar archivos estaticos, respaldos y evidencias de la aplicacion.',
    usage: 'En uso',
    hourlyPrice: 0.032,
    unit: '100 GB almacenados / hora',
    icon: HardDrive,
    responsibility: 'Compartida',
    docs: 'Clases de almacenamiento: Standard, Infrequent Access, Glacier.',
  },
  {
    id: 'rds',
    name: 'Amazon RDS',
    category: 'Base de datos',
    description:
      'Base de datos relacional administrada con respaldos automaticos, parches y replicas de lectura.',
    mainFunction: 'Persistir los datos transaccionales de la aplicacion empresarial.',
    usage: 'En uso',
    hourlyPrice: 0.145,
    unit: 'instancia db.t3.medium / hora',
    icon: Database,
    responsibility: 'Compartida',
    docs: 'Implementacion Multi-AZ para alta disponibilidad con conmutacion automatica.',
  },
  {
    id: 'iam',
    name: 'AWS IAM',
    category: 'Seguridad e identidad',
    description:
      'Servicio de administracion de identidades y accesos que controla quien puede hacer que sobre cada recurso.',
    mainFunction: 'Definir usuarios, grupos, roles y politicas de minimo privilegio.',
    usage: 'En uso',
    hourlyPrice: 0,
    unit: 'sin costo adicional',
    icon: ShieldCheck,
    responsibility: 'Cliente',
    docs: 'Servicio global y sin costo. La seguridad de las credenciales es del cliente.',
  },
  {
    id: 'vpc',
    name: 'Amazon VPC',
    category: 'Redes',
    description:
      'Red virtual aislada logicamente donde se despliegan los recursos con control total de direccionamiento.',
    mainFunction: 'Aislar la infraestructura en subredes publicas y privadas.',
    usage: 'En uso',
    hourlyPrice: 0.045,
    unit: 'NAT Gateway / hora',
    icon: Network,
    responsibility: 'Cliente',
    docs: 'Incluye subredes, tablas de enrutamiento, security groups y NACL.',
  },
  {
    id: 'route53',
    name: 'Amazon Route 53',
    category: 'Redes',
    description:
      'Servicio DNS escalable y de alta disponibilidad con comprobaciones de estado y enrutamiento inteligente.',
    mainFunction: 'Resolver el dominio publico y enrutar el trafico hacia CloudFront.',
    usage: 'En uso',
    hourlyPrice: 0.0007,
    unit: 'zona alojada / hora',
    icon: Globe2,
    responsibility: 'Compartida',
    docs: 'Politicas de enrutamiento: simple, ponderado, latencia, geolocalizacion y failover.',
  },
  {
    id: 'cloudfront',
    name: 'Amazon CloudFront',
    category: 'Entrega de contenido',
    description:
      'Red de entrega de contenido que almacena en cache los recursos en ubicaciones de borde cercanas al usuario.',
    mainFunction: 'Reducir la latencia y proteger el origen con AWS Shield y WAF.',
    usage: 'En uso',
    hourlyPrice: 0.012,
    unit: '10 GB transferidos / hora',
    icon: Gauge,
    responsibility: 'Compartida',
    docs: 'Mas de 600 ubicaciones de borde integradas con certificados TLS gratuitos.',
  },
  {
    id: 'cloudwatch',
    name: 'Amazon CloudWatch',
    category: 'Computo',
    description:
      'Monitoreo de metricas, registros y alarmas para los recursos y aplicaciones desplegadas.',
    mainFunction: 'Vigilar consumo, disponibilidad y disparar alertas operativas.',
    usage: 'Planificado',
    hourlyPrice: 0.008,
    unit: 'conjunto de metricas / hora',
    icon: Boxes,
    responsibility: 'Compartida',
    docs: 'Permite definir alarmas que activan escalado automatico o notificaciones SNS.',
  },
];

export const getServiceById = (id: string): AwsService | undefined =>
  awsServices.find((service) => service.id === id);
