// Backend: Modelo de registro individual de donación en historial
class DonationRecordModel {
  final String id;
  final String fecha; // Ej. "28 jul 2026"
  final String tipoDonacion; // "Sangre total", "Plaquetas", "Plasma"
  final String institucion; // Ej. "IMSS · Hospital General de Zona"
  final bool tieneComprobante;
  final String? urlComprobante;

  const DonationRecordModel({
    required this.id,
    required this.fecha,
    required this.tipoDonacion,
    required this.institucion,
    this.tieneComprobante = false,
    this.urlComprobante,
  });

  factory DonationRecordModel.fromJson(Map<String, dynamic> json) {
    return DonationRecordModel(
      id: json['id']?.toString() ?? '',
      fecha: json['fecha'] ?? '',
      tipoDonacion: json['tipo_donacion'] ?? 'Sangre total',
      institucion: json['institucion'] ?? '',
      tieneComprobante: json['tiene_comprobante'] ?? false,
      urlComprobante: json['url_comprobante'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fecha': fecha,
      'tipo_donacion': tipoDonacion,
      'institucion': institucion,
      'tiene_comprobante': tieneComprobante,
      'url_comprobante': urlComprobante,
    };
  }

  DonationRecordModel copyWith({
    String? id,
    String? fecha,
    String? tipoDonacion,
    String? institucion,
    bool? tieneComprobante,
    String? urlComprobante,
  }) {
    return DonationRecordModel(
      id: id ?? this.id,
      fecha: fecha ?? this.fecha,
      tipoDonacion: tipoDonacion ?? this.tipoDonacion,
      institucion: institucion ?? this.institucion,
      tieneComprobante: tieneComprobante ?? this.tieneComprobante,
      urlComprobante: urlComprobante ?? this.urlComprobante,
    );
  }

  /// Lista de ejemplo para el estado "Apto para donar" (3 donaciones - historico_puede_donar.png)
  static const List<DonationRecordModel> sampleApto = [
    DonationRecordModel(
      id: 'don-01',
      fecha: '24 mar 2026',
      tipoDonacion: 'Sangre total',
      institucion: 'IMSS · Hospital General de Zona',
      tieneComprobante: true,
    ),
    DonationRecordModel(
      id: 'don-02',
      fecha: '18 nov 2025',
      tipoDonacion: 'Plaquetas',
      institucion: 'Hospital ABC',
      tieneComprobante: false,
    ),
    DonationRecordModel(
      id: 'don-03',
      fecha: '05 jun 2025',
      tipoDonacion: 'Plasma',
      institucion: 'Banco de Sangre Central',
      tieneComprobante: true,
    ),
  ];

  /// Lista de ejemplo para el estado "No apto para donar" (4 donaciones - historico_no_puede_donar.png)
  static const List<DonationRecordModel> sampleNoApto = [
    DonationRecordModel(
      id: 'don-00',
      fecha: '28 jul 2026',
      tipoDonacion: 'Sangre total',
      institucion: 'Hospital General',
      tieneComprobante: true,
    ),
    DonationRecordModel(
      id: 'don-01',
      fecha: '24 mar 2026',
      tipoDonacion: 'Sangre total',
      institucion: 'IMSS · Hospital General de Zona',
      tieneComprobante: true,
    ),
    DonationRecordModel(
      id: 'don-02',
      fecha: '18 nov 2025',
      tipoDonacion: 'Plaquetas',
      institucion: 'Hospital ABC',
      tieneComprobante: false,
    ),
    DonationRecordModel(
      id: 'don-03',
      fecha: '05 jun 2025',
      tipoDonacion: 'Plasma',
      institucion: 'Banco de Sangre Central',
      tieneComprobante: true,
    ),
  ];
}

// Backend: Estado de aptitud y recuperación del donante
class DonorEligibilityModel {
  final bool esApto;
  final String titulo;
  final String mensaje;
  final String textoEstado; // Ej. "Listo para donar" o "Faltan 38 días"
  final String textoFecha; // Ej. "Apto desde el 24 jul 2026" o "Podrás donar el 28 nov 2026"
  final double progreso; // 0.0 a 1.0 (1.0 = completo/verde, 0.65 = en proceso/rojo)

  const DonorEligibilityModel({
    required this.esApto,
    required this.titulo,
    required this.mensaje,
    required this.textoEstado,
    required this.textoFecha,
    required this.progreso,
  });

  factory DonorEligibilityModel.fromJson(Map<String, dynamic> json) {
    return DonorEligibilityModel(
      esApto: json['es_apto'] ?? false,
      titulo: json['titulo'] ?? '',
      mensaje: json['mensaje'] ?? '',
      textoEstado: json['texto_estado'] ?? '',
      textoFecha: json['texto_fecha'] ?? '',
      progreso: (json['progreso'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'es_apto': esApto,
      'titulo': titulo,
      'mensaje': mensaje,
      'texto_estado': textoEstado,
      'texto_fecha': textoFecha,
      'progreso': progreso,
    };
  }

  /// Estado de ejemplo: Apto para donar (historico_puede_donar.png)
  static const DonorEligibilityModel sampleApto = DonorEligibilityModel(
    esApto: true,
    titulo: '¡Felicidades!',
    mensaje: 'Ya eres apto para volver a donar y salvar vidas.',
    textoEstado: 'Listo para donar',
    textoFecha: 'Apto desde el 24 jul 2026',
    progreso: 1.0,
  );

  /// Estado de ejemplo: No apto para donar (historico_no_puede_donar.png)
  static const DonorEligibilityModel sampleNoApto = DonorEligibilityModel(
    esApto: false,
    titulo: 'Aún no puedes donar',
    mensaje: 'Tu cuerpo se está recuperando.',
    textoEstado: 'Faltan 38 días',
    textoFecha: 'Podrás donar el 28 nov 2026',
    progreso: 0.62,
  );
}
