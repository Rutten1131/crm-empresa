// Local enum definitions to avoid importing @prisma/client in client bundles
export enum EstadoCliente {
  PENDIENTE = "PENDIENTE",
  ENVIADO = "ENVIADO",
  PAGADO = "PAGADO",
  CERRADO = "CERRADO",
}

export enum EstadoSeguimiento {
  PENDIENTE = "PENDIENTE",
  ENVIADO = "ENVIADO",
  OMITIDO = "OMITIDO",
}
