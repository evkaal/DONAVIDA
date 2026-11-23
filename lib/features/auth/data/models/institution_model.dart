// Backend: Modelo de institución / banco de sangre para API y mapas
class InstitutionModel {
  final String id;
  final String nombre;
  final String direccion;
  final String? colonia;
  final String? codigoPostal;
  final String telefono;
  final String horario;
  final double distanciaKm;
  final int? tiempoMinutosAuto;
  final bool estaAbierto;
  final bool esPublica; // true: Pública, false: Privada
  final String estadoHorario; // Ej. "Hasta las 20:00" o "Abre a las 8:00"
  final double latitud; // Coordenada GPS real
  final double longitud; // Coordenada GPS real

  const InstitutionModel({
    required this.id,
    required this.nombre,
    required this.direccion,
    this.colonia,
    this.codigoPostal,
    required this.telefono,
    required this.horario,
    required this.distanciaKm,
    this.tiempoMinutosAuto,
    required this.estaAbierto,
    required this.esPublica,
    required this.estadoHorario,
    required this.latitud,
    required this.longitud,
  });

  factory InstitutionModel.fromJson(Map<String, dynamic> json) {
    return InstitutionModel(
      id: json['id']?.toString() ?? '',
      nombre: json['nombre'] ?? '',
      direccion: json['direccion'] ?? '',
      colonia: json['colonia'],
      codigoPostal: json['codigo_postal'],
      telefono: json['telefono'] ?? '',
      horario: json['horario'] ?? '',
      distanciaKm: (json['distancia_km'] as num?)?.toDouble() ?? 0.0,
      tiempoMinutosAuto: json['tiempo_minutos_auto'] as int?,
      estaAbierto: json['esta_abierto'] ?? false,
      esPublica: json['es_publica'] ?? true,
      estadoHorario: json['estado_horario'] ?? '',
      latitud: (json['latitud'] as num?)?.toDouble() ?? 0.0,
      longitud: (json['longitud'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nombre': nombre,
      'direccion': direccion,
      if (colonia != null) 'colonia': colonia,
      if (codigoPostal != null) 'codigo_postal': codigoPostal,
      'telefono': telefono,
      'horario': horario,
      'distancia_km': distanciaKm,
      if (tiempoMinutosAuto != null) 'tiempo_minutos_auto': tiempoMinutosAuto,
      'esta_abierto': estaAbierto,
      'es_publica': esPublica,
      'estado_horario': estadoHorario,
      'latitud': latitud,
      'longitud': longitud,
    };
  }

  /// Datos de ejemplo listos para ser sustituidos por el backend
  static List<InstitutionModel> get sampleList => const [
        InstitutionModel(
          id: '1',
          nombre: 'Banco de Sangre Centro',
          direccion: 'Av. Independencia 120, Col. Centro, C.P. 68000',
          colonia: 'Centro',
          codigoPostal: '68000',
          telefono: '951 123 4567',
          horario: 'Lunes a sábado · 8:00 – 20:00',
          distanciaKm: 0.8,
          tiempoMinutosAuto: 12,
          estaAbierto: true,
          esPublica: true,
          estadoHorario: 'Hasta las 20:00',
          latitud: 17.0605,
          longitud: -96.7256,
        ),
        InstitutionModel(
          id: '2',
          nombre: 'Banco de Sangre Reforma',
          direccion: 'C. Amapolas 45, Col. Reforma',
          colonia: 'Reforma',
          codigoPostal: '68050',
          telefono: '951 765 4321',
          horario: 'Lunes a viernes · 8:00 – 18:00',
          distanciaKm: 1.4,
          tiempoMinutosAuto: 18,
          estaAbierto: true,
          esPublica: false,
          estadoHorario: 'Hasta las 18:00',
          latitud: 17.0782,
          longitud: -96.7125,
        ),
        InstitutionModel(
          id: '3',
          nombre: 'Banco de Sangre Norte',
          direccion: 'Calzada Héroes 310, Zona Norte',
          colonia: 'Zona Norte',
          codigoPostal: '68020',
          telefono: '951 987 6543',
          horario: 'Lunes a domingo · 8:00 – 15:00',
          distanciaKm: 2.3,
          tiempoMinutosAuto: 25,
          estaAbierto: false,
          esPublica: true,
          estadoHorario: 'Abre a las 8:00',
          latitud: 17.0910,
          longitud: -96.7202,
        ),
        InstitutionModel(
          id: '4',
          nombre: 'Clínica Hospital San José',
          direccion: 'Privada de la Rosa 12, Las Flores',
          colonia: 'Las Flores',
          codigoPostal: '68080',
          telefono: '951 333 4444',
          horario: 'Atención 24 horas',
          distanciaKm: 3.1,
          tiempoMinutosAuto: 30,
          estaAbierto: true,
          esPublica: false,
          estadoHorario: '24 horas',
          latitud: 17.0520,
          longitud: -96.7110,
        ),
      ];
}
