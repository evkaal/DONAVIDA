// Backend: Modelo de donante para perfil y sesión en BD
class UserModel {
  final String id;
  final String nombre;
  final String correo;
  final String tipoSangre; // 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  final String? fechaNacimiento;
  final String? sexo; // 'Mujer' | 'Hombre' | 'Otro'
  final String? telefono;
  final String? colonia;
  final String? fechaRegistro; // Ej. '2024'
  final String? token;

  const UserModel({
    required this.id,
    required this.nombre,
    required this.correo,
    required this.tipoSangre,
    this.fechaNacimiento,
    this.sexo,
    this.telefono,
    this.colonia,
    this.fechaRegistro,
    this.token,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      nombre: json['nombre'] ?? '',
      correo: json['correo'] ?? '',
      tipoSangre: json['tipo_sangre'] ?? 'O+',
      fechaNacimiento: json['fecha_nacimiento'],
      sexo: json['sexo'],
      telefono: json['telefono'],
      colonia: json['colonia'],
      fechaRegistro: json['fecha_registro'],
      token: json['token'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nombre': nombre,
      'correo': correo,
      'tipo_sangre': tipoSangre,
      if (fechaNacimiento != null) 'fecha_nacimiento': fechaNacimiento,
      if (sexo != null) 'sexo': sexo,
      if (telefono != null) 'telefono': telefono,
      if (colonia != null) 'colonia': colonia,
      if (fechaRegistro != null) 'fecha_registro': fechaRegistro,
      if (token != null) 'token': token,
    };
  }
}
