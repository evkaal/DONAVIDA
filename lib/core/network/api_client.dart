import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';

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
}

