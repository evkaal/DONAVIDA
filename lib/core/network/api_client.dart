import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';

/// Error legible de la API: lleva el mensaje del backend (cuando lo hay)
/// y el código HTTP, para que las pantallas lo muestren sin exponer
/// detalles de Dio.
class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

/// Cliente HTTP principal basado en Dio
/// Maneja automáticamente la inyección del token JWT en cada solicitud
class ApiClient {
  final Dio dio;
  final SecureStorageService storageService;

  ApiClient({
    Dio? customDio,
    SecureStorageService? customStorageService,
  })  : dio = customDio ?? Dio(),
        storageService = customStorageService ?? SecureStorageService() {
    _initDio();
  }

  void _initDio() {
    dio.options = BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );

    // Interceptor para inyectar Token JWT y capturar errores de sesión
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storageService.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            // 🎯 [BACKEND] Token expirado o inválido: limpiar sesión local
            await storageService.clearSession();
          }
          return handler.next(error);
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Autenticación de donantes (backend v2: usuarios_moviles + rol usuario_movil)
  // ---------------------------------------------------------------------------

  /// POST /api/auth/login {correo, password} -> 200 con token, rol_id y rol.
  /// El backend busca primero en `usuarios` (web, incluye admin_movil) y
  /// luego en `usuarios_moviles`. La respuesta NO trae el perfil completo
  /// (sin id ni tipo_sangre): después del login hay que pedir getProfile().
  Future<Map<String, dynamic>> login({
    required String correo,
    required String password,
  }) async {
    try {
      final response = await dio.post(
        ApiConstants.login,
        data: {'correo': correo, 'password': password},
      );
      return _comoMapa(response.data);
    } on DioException catch (e) {
      throw _traducirError(e);
    }
  }

  /// POST /api/auth/register {nombre, correo, password, tipo_sangre, ...}
  /// -> 201 con token + usuario. 409 si el correo ya existe en
  /// `usuarios_moviles` o en `usuarios`. Los campos de perfil
  /// (fecha_nacimiento, sexo, telefono, colonia) son opcionales: la app
  /// los pide después en "Datos del usuario". La fecha acepta ISO
  /// ("1990-01-15") o "15 ene 1990".
  Future<Map<String, dynamic>> register({
    required String nombre,
    required String correo,
    required String password,
    required String tipoSangre,
    String? fechaNacimiento,
    String? sexo,
    String? telefono,
    String? colonia,
  }) async {
    try {
      final response = await dio.post(
        ApiConstants.register,
        data: {
          'nombre': nombre,
          'correo': correo,
          'password': password,
          'tipo_sangre': tipoSangre,
          if (fechaNacimiento != null && fechaNacimiento.isNotEmpty)
            'fecha_nacimiento': fechaNacimiento,
          if (sexo != null && sexo.isNotEmpty) 'sexo': sexo,
          if (telefono != null && telefono.isNotEmpty) 'telefono': telefono,
          if (colonia != null && colonia.isNotEmpty) 'colonia': colonia,
        },
      );
      return _comoMapa(response.data);
    } on DioException catch (e) {
      throw _traducirError(e);
    }
  }

  /// GET /api/auth/profile -> perfil completo del usuario móvil de la
  /// sesión (id, nombre, correo, tipo_sangre, fecha_nacimiento, sexo,
  /// telefono, colonia, fecha_registro, rol_id, rol). Requiere el token
  /// guardado (el interceptor lo inyecta).
  Future<Map<String, dynamic>> getProfile() async {
    try {
      final response = await dio.get(ApiConstants.profile);
      return _comoMapa(response.data);
    } on DioException catch (e) {
      throw _traducirError(e);
    }
  }

  /// La respuesta del backend es JSON (Map). Si viene otra cosa, es un
  /// error de contrato, no un login/registro válido.
  Map<String, dynamic> _comoMapa(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    throw const ApiException('Respuesta inesperada del servidor.');
  }

  /// Convierte un DioException en un ApiException con mensaje legible:
  /// usa el mensaje del backend cuando viene en la respuesta (el backend
  /// devuelve texto plano con http.Error, o JSON con "mensaje"), y un
  /// mensaje de conexión cuando no hubo respuesta del servidor.
  ApiException _traducirError(DioException e) {
    final status = e.response?.statusCode;

    // Sin respuesta del servidor: no hay red o el servidor no responde.
    if (e.response == null) {
      return const ApiException(
        'No se pudo conectar con el servidor. Revisa tu conexión a internet.',
      );
    }

    final data = e.response?.data;
    String message;
    if (data is String && data.trim().isNotEmpty) {
      message = data.trim();
    } else if (data is Map) {
      message = (data['mensaje'] ?? data['message'] ?? data['error'] ?? '')
          .toString();
      if (message.isEmpty) message = _mensajePorEstado(status);
    } else {
      message = _mensajePorEstado(status);
    }
    return ApiException(message, statusCode: status);
  }

  String _mensajePorEstado(int? status) {
    switch (status) {
      case 400:
        return 'Revisa los datos e intenta de nuevo.';
      case 401:
        return 'Correo o contraseña incorrectos';
      case 409:
        return 'Ese correo ya está registrado';
      case 500:
        return 'Error del servidor. Intenta más tarde.';
      default:
        return 'Ocurrió un error. Intenta de nuevo.';
    }
  }
}

