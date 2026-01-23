const fs = require('fs');

// Leer el archivo JSON
const filePath = '/Users/juliocastillo/ett/dev-br/esv-frontend/src/locales/es.json';
const content = fs.readFileSync(filePath, 'utf8');

// Parsear JSON
const data = JSON.parse(content);

// Agregar la sección incomeCard
if (!data.dashboard.incomeCard) {
  data.dashboard.incomeCard = {
    "contactInfo": "Información de Contacto",
    "tooltip": {
      "type": "Tipo de Ingreso",
      "copy": "Copiar información del ingreso",
      "paymentType": "Método de Pago",
      "status": "Estado del Pago"
    }
  };
}

// Escribir el archivo actualizado
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log('✅ Se agregó correctamente la sección incomeCard a dashboard en es.json');