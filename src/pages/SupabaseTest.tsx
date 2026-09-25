import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface RecursoCloud {
  id: number;
  nombre: string;
  proveedor: string;
  tipo: string;
  region: string;
  estado: string;
  costo_mensual: number;
}

export default function SupabaseTest() {
  const [recursos, setRecursos] = useState<RecursoCloud[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarRecursos() {
      const { data, error } = await supabase
        .from("recursos_cloud")
        .select("*");

      if (error) {
        console.error(error);
        setError(error.message);
        return;
      }

      setRecursos(data ?? []);
    }

    cargarRecursos();
  }, []);

  return (
    <div style={{ padding: "30px" }}>
      <h1>Prueba Supabase</h1>

      {error && (
        <p style={{ color: "red" }}>
          Error: {error}
        </p>
      )}

      {recursos.map((recurso) => (
        <div key={recurso.id}>
          <h2>{recurso.nombre}</h2>

          <p>Proveedor: {recurso.proveedor}</p>
          <p>Tipo: {recurso.tipo}</p>
          <p>Región: {recurso.region}</p>
          <p>Estado: {recurso.estado}</p>
        </div>
      ))}
    </div>
  );
}