import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Servicio de almacenamiento seguro para tokens JWT y credenciales
class SecureStorageService {
  final FlutterSecureStorage _secureStorage;

  SecureStorageService({FlutterSecureStorage? secureStorage})
      : _secureStorage = secureStorage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  static const String _keyToken = 'donavida_jwt_token';
  static const String _keyUserJson = 'donavida_user_data';
  static const String _keyRememberMe = 'donavida_remember_me';
  static const String _keySavedEmail = 'donavida_saved_email';

  // Guardar Token JWT
  Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _keyToken, value: token);
  }

  // Obtener Token JWT
  Future<String?> getToken() async {
    return await _secureStorage.read(key: _keyToken);
  }

  // Eliminar Token JWT (Logout)
  Future<void> deleteToken() async {
    await _secureStorage.delete(key: _keyToken);
  }

  // Guardar datos del usuario autenticado (JSON String)
  Future<void> saveUserData(String userJson) async {
    await _secureStorage.write(key: _keyUserJson, value: userJson);
  }

  // Leer datos del usuario autenticado
  Future<String?> getUserData() async {
    return await _secureStorage.read(key: _keyUserJson);
  }

  // Borrar todos los datos de sesión
  Future<void> clearSession() async {
    await _secureStorage.delete(key: _keyToken);
    await _secureStorage.delete(key: _keyUserJson);
  }

  // Preferencias generales (Recordarme y correo guardado)
  Future<void> setRememberMe(bool value, String email) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyRememberMe, value);
    if (value) {
      await prefs.setString(_keySavedEmail, email);
    } else {
      await prefs.remove(_keySavedEmail);
    }
  }

  Future<bool> getRememberMe() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyRememberMe) ?? false;
  }

  Future<String?> getSavedEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keySavedEmail);
  }
}

