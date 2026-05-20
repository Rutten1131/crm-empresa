# API de Integración CRM - ActivaQR

Esta documentación describe los endpoints disponibles para que el CRM externo pueda acceder a los datos de clientes pendientes de ActivaQR.

## Base URL

```
https://activaqr.com
```

## Autenticación

Todos los endpoints requieren autenticación mediante API key en el header:

```
x-crm-api-key: TU_API_KEY
```

La API key debe configurarse en el archivo `.env` de ActivaQR como:

```
CRM_API_KEY=tu_clave_secreta_aqui
```

## Endpoints

### 1. Listar Clientes Pendientes

**Endpoint:** `GET /api/crm/clients-pending`

**URL Completa:** `https://activaqr.com/api/crm/clients-pending`

**Descripción:** Obtiene una lista paginada de todos los clientes con estado "pendiente".

**Parámetros Query:**
- `limit` (opcional): Número de resultados por página (default: 100)
- `offset` (opcional): Número de resultados a saltar (default: 0)

**Ejemplo de Request:**
```bash
curl -H "x-crm-api-key: TU_API_KEY" \
  "https://activaqr.com/api/crm/clients-pending?limit=50&offset=0"
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-del-cliente",
      "slug": "nombre-del-cliente",
      "nombre": "Juan Pérez",
      "nombre_negocio": "Mi Negocio",
      "email": "juan@ejemplo.com",
      "whatsapp": "593987654321",
      "status": "pendiente",
      "plan": "business",
      "fecha_pendiente": "2026-05-20T10:00:00.000Z",
      "activated_at": null,
      "expires_at": null,
      "tipo_perfil": "negocio",
      "profesion": "Consultor",
      "bio": "Descripción del perfil",
      "direccion": "Calle Principal 123",
      "seller_id": 1,
      "vendedor_nombre": "Vendedor Ejemplo",
      "vendedor_codigo": "VEN-001",
      "commission_status": "pendiente",
      "leader_paid_at": null,
      "payment_method": null,
      "google_rating": null,
      "google_reviews_count": null,
      "descargas": 0
    }
  ],
  "meta": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

### 2. Detalles de Cliente Específico

**Endpoint:** `GET /api/crm/client/[id]`

**URL Completa:** `https://activaqr.com/api/crm/client/[id]`

**Descripción:** Obtiene detalles completos de un cliente específico por su ID.

**Parámetros URL:**
- `id`: UUID del cliente

**Ejemplo de Request:**
```bash
curl -H "x-crm-api-key: TU_API_KEY" \
  "https://activaqr.com/api/crm/client/uuid-del-cliente"
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-del-cliente",
    "slug": "nombre-del-cliente",
    "nombre": "Juan Pérez",
    "nombre_negocio": "Mi Negocio",
    "empresa": "Empresa S.A.",
    "email": "juan@ejemplo.com",
    "whatsapp": "593987654321",
    "status": "pendiente",
    "plan": "business",
    "fecha_registro": "2026-05-20T10:00:00.000Z",
    "fecha_activacion": null,
    "fecha_expiracion": null,
    "tipo_perfil": "negocio",
    "profesion": "Consultor",
    "bio": "Descripción del perfil",
    "direccion": "Calle Principal 123",
    "web": "https://ejemplo.com",
    "instagram": "@usuario",
    "linkedin": "linkedin.com/in/usuario",
    "facebook": "facebook.com/usuario",
    "tiktok": "@usuario",
    "youtube": "youtube.com/canal",
    "x": "@usuario",
    "template_id": "classic",
    "foto_url": "https://ejemplo.com/foto.jpg",
    "portada_desktop": "https://ejemplo.com/portada.jpg",
    "portada_movil": "https://ejemplo.com/portada-movil.jpg",
    "seller_id": 1,
    "vendedor_nombre": "Vendedor Ejemplo",
    "vendedor_codigo": "VEN-001",
    "parent_id": null,
    "vendedor_padre_nombre": null,
    "vendedor_padre_codigo": null,
    "commission_status": "pendiente",
    "leader_paid_at": null,
    "payment_method": null,
    "google_rating": null,
    "google_reviews_count": null,
    "reminder_count": 0,
    "last_reminder_at": null,
    "activation_type": null,
    "hero_action": null,
    "hero_file_url": null,
    "hero_external_link": null,
    "hero_section_title": null,
    "hero_button_text": null,
    "hero_wifi_steps": null,
    "hero_step1_title": null,
    "hero_step1_text": null,
    "hero_step2_title": null,
    "hero_step2_text": null,
    "hero_step3_title": null,
    "hero_step3_text": null,
    "hero_slides_json": null,
    "productos_servicios": null,
    "etiquetas": null,
    "descargas": 0
  }
}
```

## Campos Importantes para el CRM

### Información del Cliente
- `id`: UUID único del cliente
- `slug`: Slug único para la URL del perfil
- `nombre`: Nombre del cliente
- `nombre_negocio`: Nombre del negocio (si aplica)
- `email`: Email del cliente
- `whatsapp`: Número de WhatsApp
- `status`: Estado actual ("pendiente", "activo", "cancelado")
- `plan`: Plan comprado ("basic", "business", "catalog")

### Fechas Importantes
- `fecha_pendiente` / `fecha_registro`: Fecha desde cuando está en pendiente
- `fecha_activacion`: Fecha cuando fue activado (null si está pendiente)
- `fecha_expiracion`: Fecha de expiración del plan

### Información del Vendedor
- `seller_id`: ID del vendedor
- `vendedor_nombre`: Nombre del vendedor
- `vendedor_codigo`: Código único del vendedor
- `vendedor_padre_nombre`: Nombre del vendedor padre (si aplica)

### Métricas
- `descargas`: Número de veces que se ha descargado el contacto
- `google_rating`: Calificación en Google (si aplica)
- `google_reviews_count`: Número de reseñas en Google

## Estrategia de Actualización

Para mantener el CRM sincronizado:

1. **Polling Recomendado:** Consultar el endpoint `/api/crm/clients-pending` cada 5-10 minutos
2. **Usar Paginación:** Implementar paginación con `limit` y `offset` para manejar grandes volúmenes
3. **Detectar Nuevos Clientes:** Comparar los IDs recibidos con los almacenados en el CRM
4. **Actualizar Estado:** Si un cliente cambia de "pendiente" a "activo", actualizar en el CRM

## Ejemplo de Implementación (JavaScript)

```javascript
const CRM_API_KEY = 'TU_API_KEY';
const BASE_URL = 'https://activaqr.com';

async function obtenerClientesPendientes(limit = 100, offset = 0) {
  const response = await fetch(
    `${BASE_URL}/api/crm/clients-pending?limit=${limit}&offset=${offset}`,
    {
      headers: {
        'x-crm-api-key': CRM_API_KEY
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  
  return await response.json();
}

async function obtenerDetalleCliente(id) {
  const response = await fetch(
    `${BASE_URL}/api/crm/client/${id}`,
    {
      headers: {
        'x-crm-api-key': CRM_API_KEY
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  
  return await response.json();
}

// Ejemplo de uso
async function sincronizarCRM() {
  try {
    const resultado = await obtenerClientesPendientes(50, 0);
    
    resultado.data.forEach(cliente => {
      console.log(`Cliente: ${cliente.nombre} - Plan: ${cliente.plan} - Desde: ${cliente.fecha_pendiente}`);
    });
    
    console.log(`Total pendientes: ${resultado.meta.total}`);
  } catch (error) {
    console.error('Error sincronizando CRM:', error);
  }
}

// Ejecutar cada 5 minutos
setInterval(sincronizarCRM, 5 * 60 * 1000);
```

## Errores Comunes

### 401 Unauthorized
- Causa: API key inválida o no proporcionada
- Solución: Verificar que el header `x-crm-api-key` sea correcto

### 404 Not Found
- Causa: Cliente no encontrado
- Solución: Verificar que el ID del cliente sea correcto

### 500 Internal Server Error
- Causa: Error en el servidor
- Solución: Contactar al equipo de ActivaQR

## Soporte

Para cualquier pregunta o problema con la integración, contactar al equipo de ActivaQR.
