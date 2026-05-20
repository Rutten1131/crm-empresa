export interface Cliente {
  id: string;
  nombre: string;
  nombre_negocio?: string;
  email?: string;
  estado: EstadoCliente;
  fuenteExterna?: string;
  cuentaPrueba: boolean;
  fechaIngreso: string; // ISO date string
  // Note: seguimientos are loaded separately
}

export interface Seguimiento {
  id: string;
  clienteId: string;
  dia: number;
  estado: EstadoSeguimiento;
  fechaProg: string; // ISO date string
  fechaEnvio?: string;
  mensaje?: string;
}

export interface Transaccion {
  id: string;
  tipo: TipoTransaccion;
  monto: string; // decimal as string
  descripcion: string;
  categoria: string;
  fecha: string; // ISO date string
  creadoPor: string;
}

// Enums imported from dedicated files
import { EstadoCliente, EstadoSeguimiento } from "@/lib/estadoCliente";
import { TipoTransaccion } from "@/lib/tipoTransaccion";
