/// Constantes de la API REST en Go para DONAVIDA
class ApiConstants {
  // 🎯 [BACKEND] Configurar la URL base del servidor Go (local o producción)
  // Producción (VPS con HTTPS): 'https://donavida.casa/api'
  // Para emulador Android usar 'http://10.0.2.2:8080/api'
  // Para dispositivo físico usar la IP local de tu máquina, ej: 'http://192.168.1.XX:8080/api'
  // Para backend local en la misma PC usar 'http://localhost:8080/api'
  static const String baseUrl = 'https://donavida.casa/api';

  // Timeout de peticiones
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);

  // Endpoints de Autenticación
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String logout = '/auth/logout';
  static const String profile = '/auth/profile';

  // Endpoints del Donante
  static const String updateProfile = '/donantes/perfil';
  static const String donations = '/donaciones';
  static const String donorEligibility = '/donantes/aptitud';

  // Endpoints de Instituciones y Bancos de Sangre
  static const String institutions = '/instituciones';

  // Endpoints de Notificaciones
  static const String notifications = '/notificaciones';
  static const String markNotificationsRead = '/notificaciones/marcar-leidas';

  // Endpoints de Stock e Inventario (para centros y hospitales)
  static const String stockSummary = '/stock/resumen';
  static const String stockMatrix = '/stock/matriz';
  static const String stockAlerts = '/stock/alertas';
  static const String stockThresholds = '/stock/umbrales';

  // Endpoints de Registro de Unidades
  static const String units = '/unidades';

  // Endpoints de Solicitudes
  static const String requests = '/solicitudes';
}
