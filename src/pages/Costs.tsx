/*
INSTALACIÓN
1. Reemplaza src/pages/Costs.tsx por este archivo.
2. En AppContext.tsx, reemplaza addCostItem por la siguiente función.
   Se asume que el estado existente se llama costItems / setCostItems.
   Conserva la persistencia del contexto si tiene lógica adicional.

const addCostItem = (item: Omit<(typeof costItems)[number], 'id'>) => {
  const newId = crypto.randomUUID();
  setCostItems((previous) => {
    const existing = previous.find((entry) => entry.serviceId === item.serviceId);
    const updated = { ...item, id: existing?.id ?? newId };
    if (!existing) return [...previous, updated];
    return previous
      .filter((entry) => entry.serviceId !== item.serviceId || entry.id === existing.id)
      .map((entry) => entry.id === existing.id ? updated : entry);
  });
};

Cada servicio tiene una sola estimación. Actualizar reemplaza cantidad y horas;
los demás servicios permanecen. Los importes guardados no incluyen factor regional.
La página conserva la acción original Restaurar del contexto.
*/

import { useMemo, useState, type FormEvent } from 'react';
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
    pushNotification,
  } = useApp();
  const [serviceId, setServiceId] = useState(awsServices[0]?.id ?? '');
  const initialItem = costItems.find((item) => item.serviceId === serviceId);
  const [quantity, setQuantity] = useState(() => String(initialItem?.quantity ?? 1));
  const [hours, setHours] = useState(() => String(initialItem?.hours ?? 730));
  const [error, setError] = useState('');
  const selectedService = getServiceById(serviceId);
  const existingItem = costItems.find((item) => item.serviceId === serviceId);
  const qty = Number(quantity);
  const hrs = Number(hours);
  const validInputs = quantity.trim() !== '' && hours.trim() !== '' &&
    Number.isSafeInteger(qty) && qty >= 1 && Number.isFinite(hrs) && hrs > 0;
  const base = selectedService ? selectedService.hourlyPrice * qty * hrs : 0;
  const validEstimate = Boolean(selectedService) && validInputs &&
    Number.isFinite(base) && base >= 0 &&
    Number.isFinite(base * region.costFactor * 12) && region.costFactor >= 0;
  const previewMonthly = validEstimate ? base * region.costFactor : 0;

  // Stored amounts are base costs. Apply the regional factor once, when displaying.
  const pricedItems = useMemo(() => costItems.map((item) => {
    const monthlyCost = item.hourlyPrice * item.quantity * item.hours * region.costFactor;
    return { ...item, monthlyCost, annualCost: monthlyCost * 12 };
  }), [costItems, region.costFactor]);
  const monthlyCost = pricedItems.reduce((total, item) => total + item.monthlyCost, 0);
  const annualCost = monthlyCost * 12;

  const selectService = (id: string) => {
    const item = costItems.find((entry) => entry.serviceId === id);
    setServiceId(id);
    setQuantity(String(item?.quantity ?? 1));
    setHours(String(item?.hours ?? 730));
    setError('');
  };

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validEstimate || !selectedService) {
      setError('Ingresa una cantidad entera mayor que cero y horas válidas mayores que cero.');
      return;
    }
    setError('');
    // Requires the atomic addCostItem replacement supplied with this page.
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
      title: existingItem ? 'Estimación actualizada' : 'Costo agregado',
      message: existingItem
        ? `${selectedService.name}: se reemplazaron la cantidad y las horas anteriores.`
        : `${selectedService.name} se incorporó a la estimación mensual.`,
      status: 'ok',
    });
  };
  const distribution: ChartDatum[] = useMemo(
    () =>
      pricedItems
        .map((item, index) => ({
          label: item.serviceName.replace('Amazon ', '').replace('AWS ', ''),
          value: item.monthlyCost,
          color: chartPalette[index % chartPalette.length],
        }))
        .sort((a, b) => b.value - a.value),
    [pricedItems],
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
      ['Servicio', 'Cantidad', 'Horas', 'Precio hora base USD', 'Costo mensual USD', 'Costo anual USD'],
      ...pricedItems.map((item) => [
        item.serviceName,
        item.quantity,
        item.hours,
        item.hourlyPrice.toFixed(4),
        item.monthlyCost.toFixed(2),
        item.annualCost.toFixed(2),
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
          <div className="flex flex-wrap gap-2">
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
              onChange={(event) => selectService(event.target.value)}
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
              step={1}
              required
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
              min={0.01}
              step="any"
              required
              className="input-field"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 md:col-span-4">
            <div className="rounded-lg bg-base p-3 dark:bg-night-bg">
              <p className="text-[12px] text-muted dark:text-night-muted">Costo unitario en la región</p>
              <p className="text-[18px] font-bold text-ink dark:text-night-ink">
                {currency((selectedService?.hourlyPrice ?? 0) * region.costFactor)} / h
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
            <p className="mb-3 text-small text-muted dark:text-night-muted" aria-live="polite">
              {existingItem
                ? 'Este servicio ya está incluido. Al guardar se reemplazan sus valores anteriores.'
                : 'Este servicio se añadirá a la estimación.'}
            </p>
            {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full sm:w-auto">
              <Calculator size={16} /> {existingItem ? 'Actualizar estimación' : 'Agregar a la estimación'}
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
          description="Hasta 6 servicios con mayor gasto proyectado a 12 meses"
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
            {pricedItems.map((item) => (
              <CostCard
                key={item.id}
                item={item}
                share={monthlyCost === 0 ? 0 : (item.monthlyCost / monthlyCost) * 100}
                onRemove={removeCostItem}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
