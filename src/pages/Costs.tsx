import { useMemo, useState } from 'react';
import { Calculator, Download, PieChart, RotateCcw, Wallet } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import CostCard from '../components/CostCard';
import StatCard from '../components/StatCard';
import DonutChart from '../components/DonutChart';
import BarChart from '../components/BarChart';
import { useApp } from '../context/AppContext';
import { awsServices, getServiceById } from '../data/awsServices';
import { chartPalette, currency, numberFormat, today } from '../utils/format';
import { downloadCsv } from '../utils/report';
import type { ChartDatum } from '../types/cloud';

export default function Costs() {
  const {
    costItems,
    addCostItem,
    removeCostItem,
    resetCostItems,
    region,
    monthlyCost,
    annualCost,
    pushNotification,
  } = useApp();

  const [serviceId, setServiceId] = useState(awsServices[0].id);
  const [quantity, setQuantity] = useState('1');
  const [hours, setHours] = useState('730');

  const selectedService = getServiceById(serviceId) ?? awsServices[0];
  const previewMonthly =
    selectedService.hourlyPrice * Number(quantity || 0) * Number(hours || 0) * region.costFactor;

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const qty = Math.max(Number(quantity) || 0, 0);
    const hrs = Math.max(Number(hours) || 0, 0);
    if (qty <= 0 || hrs <= 0) return;

    const base = selectedService.hourlyPrice * qty * hrs;
    addCostItem({
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      quantity: qty,
      hours: hrs,
      hourlyPrice: selectedService.hourlyPrice,
      monthlyCost: base,
      annualCost: base * 12,
    });

    pushNotification({
      title: 'Costo agregado',
      message: `${selectedService.name} se incorporo a la estimacion mensual.`,
      status: 'warning',
    });
  };

  const distribution: ChartDatum[] = useMemo(
    () =>
      costItems
        .map((item, index) => ({
          label: item.serviceName.replace('Amazon ', '').replace('AWS ', ''),
          value: item.monthlyCost * region.costFactor,
          color: chartPalette[index % chartPalette.length],
        }))
        .sort((a, b) => b.value - a.value),
    [costItems, region.costFactor],
  );

  const annualSeries: ChartDatum[] = useMemo(
    () =>
      distribution.slice(0, 6).map((item) => ({
        label: item.label,
        value: item.value * 12,
        color: '#F59E0B',
      })),
    [distribution],
  );

  /** Reto adicional: exportacion del reporte de costos en formato CSV */
  const exportReport = () => {
    downloadCsv(`reporte-costos-${region.name}.csv`, [
      ['Reporte de costos CloudOps Dashboard'],
      ['Region', region.name, region.location],
      ['Factor de region', region.costFactor.toFixed(2)],
      ['Fecha de emision', today()],
      [],
      ['Servicio', 'Cantidad', 'Horas', 'Precio hora USD', 'Costo mensual USD', 'Costo anual USD'],
      ...costItems.map((item) => [
        item.serviceName,
        item.quantity,
        item.hours,
        item.hourlyPrice.toFixed(4),
        (item.monthlyCost * region.costFactor).toFixed(2),
        (item.annualCost * region.costFactor).toFixed(2),
      ]),
      [],
      ['Total mensual', monthlyCost.toFixed(2)],
      ['Total anual', annualCost.toFixed(2)],
    ]);

    pushNotification({
      title: 'Reporte exportado',
      message: 'Se descargo el reporte de costos en formato CSV.',
      status: 'ok',
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Costo mensual"
          value={currency(monthlyCost)}
          hint={`Region ${region.name}`}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Costo anual"
          value={currency(annualCost)}
          hint="Proyeccion a 12 meses"
          icon={Calculator}
          tone="warning"
        />
        <StatCard
          label="Lineas de costo"
          value={numberFormat(costItems.length)}
          hint="Servicios incluidos en la estimacion"
          icon={PieChart}
          tone="info"
        />
        <StatCard
          label="Costo por usuario"
          value={currency(monthlyCost / 3500)}
          hint="Base de 3 500 usuarios activos"
          icon={Wallet}
          tone="info"
        />
      </div>

      <SectionCard
        title="Calculadora de costos simulada"
        description="Selecciona el servicio, la cantidad y las horas de uso estimadas al mes"
        icon={Calculator}
        action={
          <div className="flex gap-2">
            <button type="button" onClick={resetCostItems} className="btn-ghost py-2">
              <RotateCcw size={15} /> Restaurar
            </button>
            <button type="button" onClick={exportReport} className="btn-primary py-2">
              <Download size={15} /> Exportar reporte
            </button>
          </div>
        }
      >
        <form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="label-field" htmlFor="service">
              Seleccion del servicio
            </label>
            <select
              id="service"
              className="input-field"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
            >
              {awsServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-field" htmlFor="quantity">
              Cantidad
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              className="input-field"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>

          <div>
            <label className="label-field" htmlFor="hours">
              Horas estimadas al mes
            </label>
            <input
              id="hours"
              type="number"
              min={1}
              className="input-field"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:col-span-4">
            <div className="rounded-lg bg-base p-3 dark:bg-night-bg">
              <p className="text-[12px] text-muted dark:text-night-muted">Costo estimado unitario</p>
              <p className="text-[18px] font-bold text-ink dark:text-night-ink">
                {currency(selectedService.hourlyPrice)} / h
              </p>
            </div>
            <div className="rounded-lg bg-base p-3 dark:bg-night-bg">
              <p className="text-[12px] text-muted dark:text-night-muted">Costo mensual</p>
              <p className="text-[18px] font-bold text-cost">{currency(previewMonthly)}</p>
            </div>
            <div className="rounded-lg bg-base p-3 dark:bg-night-bg">
              <p className="text-[12px] text-muted dark:text-night-muted">Costo anual</p>
              <p className="text-[18px] font-bold text-ink dark:text-night-ink">
                {currency(previewMonthly * 12)}
              </p>
            </div>
          </div>

          <div className="md:col-span-4">
            <button type="submit" className="btn-primary w-full sm:w-auto">
              <Calculator size={16} /> Agregar a la estimacion
            </button>
          </div>
        </form>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Distribucion de costos"
          description="Pasa el cursor sobre el grafico para ver el detalle"
          icon={PieChart}
        >
          {distribution.length === 0 ? (
            <p className="py-10 text-center text-small text-muted dark:text-night-muted">
              Agrega un servicio para ver la distribucion del gasto.
            </p>
          ) : (
            <DonutChart
              data={distribution}
              centerLabel="Total mensual"
              centerValue={currency(monthlyCost)}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Costo anual por servicio"
          description="Comparativa del gasto proyectado a 12 meses"
          icon={Wallet}
        >
          {annualSeries.length === 0 ? (
            <p className="py-10 text-center text-small text-muted dark:text-night-muted">
              Sin datos para graficar.
            </p>
          ) : (
            <BarChart data={annualSeries} />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Detalle de la estimacion"
        description="Cada linea aplica el factor de costo de la region activa"
        icon={Wallet}
      >
        {costItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line py-10 text-center text-small text-muted dark:border-night-line dark:text-night-muted">
            La estimacion esta vacia. Agrega servicios desde la calculadora.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {costItems.map((item) => (
              <CostCard
                key={item.id}
                item={{
                  ...item,
                  monthlyCost: item.monthlyCost * region.costFactor,
                  annualCost: item.annualCost * region.costFactor,
                }}
                share={monthlyCost === 0 ? 0 : ((item.monthlyCost * region.costFactor) / monthlyCost) * 100}
                onRemove={removeCostItem}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
