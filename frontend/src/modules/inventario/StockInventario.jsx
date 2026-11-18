// Re-export del módulo rico de stock (matriz, KPIs, alertas, próximas a
// caducar). Se mantiene este archivo para no romper imports existentes
// (por ejemplo, Dashboard lo importa desde ../inventario/StockInventario).
export { default } from '../stockInventario/StockInventario';
