export enum TipoTransaccionEnum {
  INGRESO = "INGRESO",
  GASTO = "GASTO",
}

export enum EstadoClienteEnum {
  PENDIENTE = "PENDIENTE",
  ENVIADO = "ENVIADO",
  PAGADO = "PAGADO",
  CERRADO = "CERRADO",
}

export enum EstadoSeguimientoEnum {
  PENDIENTE = "PENDIENTE",
  ENVIADO = "ENVIADO",
  OMITIDO = "OMITIDO",
}

export enum DemoReseñaEnum {
  INTERESADO = "INTERESADO",
  NO_INTERESADO = "NO_INTERESADO",
  VOLVER_A_PRESENTAR = "VOLVER_A_PRESENTAR",
}

export enum MetodoPagoEnum {
  EFECTIVO = "EFECTIVO",
  TRANSFERENCIA = "TRANSFERENCIA",
  TARJETA = "TARJETA",
}
