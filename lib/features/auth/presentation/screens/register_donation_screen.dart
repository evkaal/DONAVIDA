import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/donavida_header.dart';
import '../../data/models/donation_record_model.dart';

// Front/Back: Pantalla de registro de nueva donación con soporte de comprobante
class RegisterDonationScreen extends StatefulWidget {
  // Backend: Lista opcional de nombres de instituciones precargadas desde la API
  final List<String>? initialInstituciones;

  const RegisterDonationScreen({super.key, this.initialInstituciones});

  @override
  State<RegisterDonationScreen> createState() => _RegisterDonationScreenState();
}

class _RegisterDonationScreenState extends State<RegisterDonationScreen> {
  // Backend: Catálogo de instituciones (sustituir por llamada a GET /instituciones)
  List<String> _instituciones = [
    'Banco de Sangre Central',
    'IMSS · Hospital General de Zona',
    'Hospital General',
    'Hospital ABC',
    'Clínica Hospital San José',
    'Banco de Sangre Reforma',
    'Banco de Sangre Norte',
    'Otra institución...',
  ];

  String? _selectedInstitucion;
  final TextEditingController _otraInstitucionController =
      TextEditingController();
  final FocusNode _otraInstitucionFocus = FocusNode();

  // Backend: Clave del tipo de donación ('Sangre total', 'Plaquetas', 'Plasma')
  String _selectedTipoDonacion = 'Sangre total';
  final List<Map<String, dynamic>> _tiposDonacion = [
    {
      'label': 'Sangre total',
      'color': const Color(0xFFE11D48),
      'bgColor': const Color(0xFFFFE4E6),
    },
    {
      'label': 'Plaquetas',
      'color': const Color(0xFFB45309),
      'bgColor': const Color(0xFFFEF3C7),
    },
    {
      'label': 'Plasma',
      'color': const Color(0xFF2563EB),
      'bgColor': const Color(0xFFDBEAFE),
    },
  ];

  // Backend: Fecha en objeto DateTime (para formatear a ISO 8601 en la API)
  DateTime _selectedDate = DateTime.now();

  // Backend: Bandera y referencia del archivo/comprobante a subir
  bool _tieneComprobante = false;
  String? _comprobanteNombre;

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialInstituciones != null && widget.initialInstituciones!.isNotEmpty) {
      _instituciones = [...widget.initialInstituciones!, 'Otra institución...'];
    }
    _selectedInstitucion = _instituciones.first;
    _otraInstitucionFocus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _otraInstitucionController.dispose();
    _otraInstitucionFocus.dispose();
    super.dispose();
  }

  String _formatDate(DateTime date) {
    const meses = [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ];
    final day = date.day.toString().padLeft(2, '0');
    final month = meses[date.month - 1];
    return '$day $month ${date.year}';
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: const Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  // Front/Back: Integrar image_picker / file_picker para capturar archivo real
  void _showComprobanteOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Adjuntar comprobante',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Sube una fotografía clara o archivo de tu comprobante de donación',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: const Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 18),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Image.asset(
                    AppAssets.icCamara,
                    width: 22,
                    height: 22,
                    color: AppColors.primary,
                  ),
                ),
                title: Text(
                  'Tomar fotografía con la cámara',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w600,
                    fontSize: 14.5,
                  ),
                ),
                onTap: () {
                  Navigator.of(ctx).pop();
                  setState(() {
                    _tieneComprobante = true;
                    _comprobanteNombre = 'foto_comprobante_${DateTime.now().millisecondsSinceEpoch}.jpg';
                  });
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Image.asset(
                    AppAssets.icDoc,
                    width: 22,
                    height: 22,
                    color: const Color(0xFF475569),
                  ),
                ),
                title: Text(
                  'Seleccionar de la galería o archivos',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w600,
                    fontSize: 14.5,
                  ),
                ),
                onTap: () {
                  Navigator.of(ctx).pop();
                  setState(() {
                    _tieneComprobante = true;
                    _comprobanteNombre = 'comprobante_donacion_${DateTime.now().millisecondsSinceEpoch}.pdf';
                  });
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Backend: Enviar registro de donación a la API (POST /donaciones)
  Future<void> _handleSave() async {
    if (_isSaving) return;

    String institucionFinal = _selectedInstitucion ?? '';
    if (institucionFinal == 'Otra institución...') {
      institucionFinal = _otraInstitucionController.text.trim();
      if (institucionFinal.isEmpty) {
        _showError('Por favor escribe el nombre de la institución');
        return;
      }
    }

    if (institucionFinal.isEmpty) {
      _showError('Por favor selecciona una institución');
      return;
    }

    setState(() => _isSaving = true);

    try {
      final newDonation = DonationRecordModel(
        id: 'don-${DateTime.now().millisecondsSinceEpoch}',
        fecha: _formatDate(_selectedDate),
        tipoDonacion: _selectedTipoDonacion,
        institucion: institucionFinal,
        tieneComprobante: _tieneComprobante,
        urlComprobante: _comprobanteNombre,
      );

      // Backend: Conexión con endpoint POST /donaciones
      // final response = await apiClient.dio.post(
      //   ApiConstants.donations,
      //   data: {
      //     ...newDonation.toJson(),
      //     'fecha_iso': _selectedDate.toIso8601String(),
      //   },
      // );

      await Future.delayed(const Duration(milliseconds: 400));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '¡Donación registrada con éxito en tu historial!',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            duration: const Duration(seconds: 2),
          ),
        );

        Navigator.of(context).pop(newDonation);
      }
    } catch (e) {
      if (mounted) {
        _showError('Error al guardar donación: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: GoogleFonts.inter(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFFE11D48),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DonavidaHeader(
              title: 'Registrar donación',
              subtitle: 'Ingresa los datos de tu comprobante médico',
              showBackButton: true,
              onBackPressed: () => Navigator.of(context).pop(),
            ),
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20.0,
                    vertical: 24.0,
                  ),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(22.0),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Institución o Banco de Sangre',
                          style: GoogleFonts.inter(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: const Color(0xFFE2E8F0),
                              width: 1.2,
                            ),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              isExpanded: true,
                              value: _selectedInstitucion,
                              icon: const Icon(
                                Icons.keyboard_arrow_down_rounded,
                                color: Color(0xFF64748B),
                              ),
                              borderRadius: BorderRadius.circular(16),
                              items: _instituciones.map((inst) {
                                return DropdownMenuItem<String>(
                                  value: inst,
                                  child: Row(
                                    children: [
                                      Image.asset(
                                        AppAssets.icHospital,
                                        width: 18,
                                        height: 18,
                                        color: inst == 'Otra institución...'
                                            ? const Color(0xFF94A3B8)
                                            : AppColors.primary,
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          inst,
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.inter(
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w600,
                                            color: const Color(0xFF0F172A),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                              onChanged: (val) {
                                setState(() {
                                  _selectedInstitucion = val;
                                });
                              },
                            ),
                          ),
                        ),
                        if (_selectedInstitucion == 'Otra institución...') ...[
                          const SizedBox(height: 12),
                          TextField(
                            controller: _otraInstitucionController,
                            focusNode: _otraInstitucionFocus,
                            textCapitalization: TextCapitalization.words,
                            decoration: InputDecoration(
                              hintText: 'Nombre del hospital o clínica',
                              hintStyle: GoogleFonts.inter(
                                color: const Color(0xFF94A3B8),
                                fontSize: 13.5,
                              ),
                              prefixIcon: const Padding(
                                padding: EdgeInsets.all(12.0),
                                child: Icon(
                                  Icons.local_hospital_outlined,
                                  color: Color(0xFF94A3B8),
                                  size: 20,
                                ),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: const BorderSide(
                                  color: Color(0xFFE2E8F0),
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: const BorderSide(
                                  color: Color(0xFFE2E8F0),
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: const BorderSide(
                                  color: AppColors.primary,
                                  width: 1.5,
                                ),
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 22),
                        Text(
                          'Tipo de donación realizada',
                          style: GoogleFonts.inter(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _tiposDonacion.map((tipo) {
                            final label = tipo['label'] as String;
                            final isSelected = _selectedTipoDonacion == label;
                            final color = tipo['color'] as Color;
                            final bgColor = tipo['bgColor'] as Color;

                            return GestureDetector(
                              onTap: () => setState(() {
                                _selectedTipoDonacion = label;
                              }),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: isSelected ? bgColor : const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: isSelected
                                        ? color
                                        : const Color(0xFFE2E8F0),
                                    width: isSelected ? 1.5 : 1.0,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? color
                                            : const Color(0xFF94A3B8),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      label,
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: isSelected
                                            ? FontWeight.w700
                                            : FontWeight.w500,
                                        color: isSelected
                                            ? color
                                            : const Color(0xFF475569),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 22),
                        Text(
                          'Fecha de la donación',
                          style: GoogleFonts.inter(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 8),
                        GestureDetector(
                          onTap: _pickDate,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: const Color(0xFFE2E8F0),
                                width: 1.2,
                              ),
                            ),
                            child: Row(
                              children: [
                                Image.asset(
                                  AppAssets.icCalendario,
                                  width: 20,
                                  height: 20,
                                  color: AppColors.primary,
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  _formatDate(_selectedDate),
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                                const Spacer(),
                                Text(
                                  'Cambiar fecha',
                                  style: GoogleFonts.inter(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 22),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Comprobante médico',
                              style: GoogleFonts.inter(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              '(Opcional)',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: const Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (!_tieneComprobante) ...[
                          GestureDetector(
                            onTap: _showComprobanteOptions,
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 20,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: const Color(0xFFCBD5E1),
                                  width: 1.2,
                                  style: BorderStyle.solid,
                                ),
                              ),
                              child: Column(
                                children: [
                                  Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: AppColors.primarySoft,
                                      shape: BoxShape.circle,
                                    ),
                                    child: Center(
                                      child: Image.asset(
                                        AppAssets.icCamara,
                                        width: 22,
                                        height: 22,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    'Toca para adjuntar fotografía o archivo',
                                    style: GoogleFonts.inter(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF0F172A),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Puedes subirlo ahora o agregarlo después',
                                    style: GoogleFonts.inter(
                                      fontSize: 12,
                                      color: const Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ] else ...[
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: const Color(0xFFA7F3D0),
                                width: 1.2,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(
                                    Icons.check_rounded,
                                    color: Colors.white,
                                    size: 18,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _comprobanteNombre ?? 'comprobante.jpg',
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.inter(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: const Color(0xFF065F46),
                                        ),
                                      ),
                                      Text(
                                        'Archivo listo para guardar',
                                        style: GoogleFonts.inter(
                                          fontSize: 11.5,
                                          color: const Color(0xFF047857),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.close_rounded,
                                    color: Color(0xFF047857),
                                    size: 20,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _tieneComprobante = false;
                                      _comprobanteNombre = null;
                                    });
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 28),
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              elevation: 2,
                              shadowColor: AppColors.primary.withOpacity(0.35),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            onPressed: _isSaving ? null : _handleSave,
                            child: _isSaving
                                ? const SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.check_circle_outline, size: 20),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Guardar donación',
                                        style: GoogleFonts.inter(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
