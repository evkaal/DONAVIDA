import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/donation_record_model.dart';
import 'map_screen.dart';
import 'register_donation_screen.dart';

// Front/Back: Pantalla de historial de donaciones y estado de aptitud del donante
class HistoryScreen extends StatefulWidget {
  // Backend: Lista de donaciones provistas por la API
  final List<DonationRecordModel>? initialDonations;

  // Backend: Estado de aptitud y recuperación para donar
  final DonorEligibilityModel? initialEligibility;

  const HistoryScreen({
    super.key,
    this.initialDonations,
    this.initialEligibility,
  });

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  // Backend: Lista de donaciones activas del usuario
  List<DonationRecordModel> _donations = [];
  DonorEligibilityModel? _eligibility;

  // Dev: 0 = datos reales, 1 = muestra apto, 2 = muestra no apto
  int _testMode = 0;

  @override
  void initState() {
    super.initState();
    _donations = widget.initialDonations ?? [];
    _eligibility = widget.initialEligibility;
  }

  List<DonationRecordModel> get _currentDonations {
    switch (_testMode) {
      case 1:
        return DonationRecordModel.sampleApto;
      case 2:
        return DonationRecordModel.sampleNoApto;
      case 0:
      default:
        return _donations;
    }
  }

  DonorEligibilityModel? get _currentEligibility {
    switch (_testMode) {
      case 1:
        return DonorEligibilityModel.sampleApto;
      case 2:
        return DonorEligibilityModel.sampleNoApto;
      case 0:
      default:
        return _eligibility;
    }
  }

  // Front/Back: Abre el formulario de registro e inserta el resultado localmente
  Future<void> _abrirRegistroDonacion() async {
    final nuevo = await Navigator.of(context).push<DonationRecordModel>(
      MaterialPageRoute(
        builder: (_) => const RegisterDonationScreen(),
      ),
    );

    if (nuevo != null) {
      setState(() {
        _testMode = 0;
        _donations.insert(0, nuevo);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );

    final donations = _currentDonations;
    final eligibility = _currentEligibility;
    final hasData = donations.isNotEmpty || eligibility != null;

    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _abrirRegistroDonacion,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 3,
        icon: const Icon(Icons.add_rounded, size: 22),
        label: Text(
          'Registrar donación',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w700,
            fontSize: 13.5,
          ),
        ),
      ),
      body: Column(
        children: [
          _buildStaticTopSection(eligibility),
          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 650),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 14),
                        if (!hasData) ...[
                          _buildEmptyStateCard(),
                        ] else ...[
                          _buildSectionHeader(donations.length),
                          const SizedBox(height: 14),
                          ...donations.map((don) => Padding(
                                padding: const EdgeInsets.only(bottom: 14.0),
                                child: _buildDonationCard(don),
                              )),
                        ],
                        const SizedBox(height: 16),
                        _buildDevTestSelector(),
                        const SizedBox(height: 36),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Front: Cabecera superior fija con tarjeta de aptitud
  Widget _buildStaticTopSection(DonorEligibilityModel? eligibility) {
    final topPadding = MediaQuery.of(context).padding.top;
    final bannerHeight = topPadding + (eligibility != null ? 140.0 : 80.0);

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: bannerHeight,
          child: Container(
            decoration: const BoxDecoration(
              gradient: AppColors.heroGradient,
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(32),
                bottomRight: Radius.circular(32),
              ),
            ),
            child: Stack(
              children: [
                Positioned(
                  top: -20,
                  right: 40,
                  child: IgnorePointer(
                    child: Container(
                      width: 160,
                      height: 160,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white.withOpacity(0.08),
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 5,
                  right: -30,
                  child: IgnorePointer(
                    child: Opacity(
                      opacity: 0.12,
                      child: Image.asset(
                        AppAssets.splashGota,
                        width: 180,
                        height: 180,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        SafeArea(
          bottom: false,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 650),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        GestureDetector(
                          onTap: () => Navigator.of(context).pop(),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.18),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white.withOpacity(0.25),
                                width: 1.0,
                              ),
                            ),
                            child: Center(
                              child: Image.asset(
                                AppAssets.icVolver,
                                width: 18,
                                height: 18,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Text(
                            'Histórico de donaciones',
                            style: GoogleFonts.inter(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (eligibility != null) ...[
                      _buildEligibilityCard(eligibility),
                      const SizedBox(height: 4),
                    ] else
                      const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // Front/Back: Muestra estado de aptitud y progreso de recuperación calculado por backend
  Widget _buildEligibilityCard(DonorEligibilityModel eligibility) {
    final isApto = eligibility.esApto;
    final borderColor = isApto ? const Color(0xFF10B981) : AppColors.primary;
    final iconBgColor =
        isApto ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2);
    final statusColor = isApto ? const Color(0xFF059669) : AppColors.primary;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: borderColor,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: borderColor.withOpacity(0.10),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconBgColor,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Image.asset(
                    isApto ? AppAssets.icCheckCir : AppAssets.icReloj,
                    width: 22,
                    height: 22,
                    color: statusColor,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      eligibility.titulo,
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      eligibility.mensaje,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: const Color(0xFF64748B),
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: eligibility.progreso.clamp(0.0, 1.0),
              minHeight: 6,
              backgroundColor: const Color(0xFFF1F5F9),
              valueColor: AlwaysStoppedAnimation<Color>(statusColor),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                eligibility.textoEstado,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: statusColor,
                ),
              ),
              Text(
                eligibility.textoFecha,
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  color: const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(int count) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Text(
              'TUS DONACIONES',
              style: GoogleFonts.inter(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF64748B),
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF475569),
                ),
              ),
            ),
          ],
        ),
        GestureDetector(
          onTap: _abrirRegistroDonacion,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.add_rounded, size: 16, color: AppColors.primary),
                const SizedBox(width: 4),
                Text(
                  'Registrar',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // Front/Back: Muestra datos de la donación y estado de su comprobante
  Widget _buildDonationCard(DonationRecordModel record) {
    final isSangre = record.tipoDonacion.toLowerCase().contains('sangre');
    final isPlaquetas = record.tipoDonacion.toLowerCase().contains('plaquetas');
    final isPlasma = record.tipoDonacion.toLowerCase().contains('plasma');

    Color badgeBg;
    Color badgeTextColor;

    if (isSangre) {
      badgeBg = const Color(0xFFFFE4E6);
      badgeTextColor = const Color(0xFFE11D48);
    } else if (isPlaquetas) {
      badgeBg = const Color(0xFFFEF3C7);
      badgeTextColor = const Color(0xFFB45309);
    } else if (isPlasma) {
      badgeBg = const Color(0xFFDBEAFE);
      badgeTextColor = const Color(0xFF2563EB);
    } else {
      badgeBg = const Color(0xFFF1F5F9);
      badgeTextColor = const Color(0xFF475569);
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFF1F5F9),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                record.fecha,
                style: GoogleFonts.inter(
                  fontSize: 16.5,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: badgeTextColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      record.tipoDonacion,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: badgeTextColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Image.asset(
                AppAssets.icHospital,
                width: 16,
                height: 16,
                color: const Color(0xFF94A3B8),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  record.institucion,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: const Color(0xFF475569),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () {
              if (record.tieneComprobante) {
                _showComprobanteDialog(record);
              } else {
                _showAgregarComprobanteDialog(record);
              }
            },
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset(
                  record.tieneComprobante
                      ? AppAssets.icDocFirmado
                      : AppAssets.icCamara,
                  width: 16,
                  height: 16,
                  color: record.tieneComprobante
                      ? const Color(0xFF64748B)
                      : AppColors.primary,
                ),
                const SizedBox(width: 6),
                Text(
                  record.tieneComprobante
                      ? 'Ver comprobante'
                      : 'Agregar comprobante',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: record.tieneComprobante
                        ? FontWeight.w600
                        : FontWeight.w700,
                    color: record.tieneComprobante
                        ? const Color(0xFF64748B)
                        : AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Front: Estado visual cuando el usuario no tiene donaciones registradas
  Widget _buildEmptyStateCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 38),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Image.asset(
                AppAssets.icHistorial,
                width: 34,
                height: 34,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Sin donaciones registradas',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Aún no tienes historial de donaciones en tu cuenta. Cuando asistas a un banco de sangre o registres una donación, aquí podrás consultar tus fechas, descargar comprobantes y ver tu tiempo de recuperación.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13.5,
              color: const Color(0xFF64748B),
              height: 1.45,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: _abrirRegistroDonacion,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                elevation: 2,
                shadowColor: AppColors.primary.withOpacity(0.35),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              icon: const Icon(Icons.add_circle_outline, size: 20),
              label: Text(
                'Registrar donación',
                style: GoogleFonts.inter(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const MapScreen()),
                );
              },
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF475569),
                side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              icon: Image.asset(
                AppAssets.icMapa,
                width: 18,
                height: 18,
                color: const Color(0xFF475569),
              ),
              label: Text(
                'Encontrar banco de sangre',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Front/Back: Muestra comprobante existente
  void _showComprobanteDialog(DonationRecordModel record) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Image.asset(
              AppAssets.icDocFirmado,
              width: 22,
              height: 22,
              color: AppColors.primary,
            ),
            const SizedBox(width: 10),
            Text(
              'Comprobante',
              style: GoogleFonts.inter(
                fontSize: 17,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Donación de ${record.tipoDonacion}',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Fecha: ${record.fecha}',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: const Color(0xFF64748B),
              ),
            ),
            Text(
              'Lugar: ${record.institucion}',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: const Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle,
                      color: Color(0xFF10B981), size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Comprobante verificado digitalmente',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF059669),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              'Cerrar',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Front/Back: Modal de selección para adjuntar comprobante
  void _showAgregarComprobanteDialog(DonationRecordModel record) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
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
                'Subir comprobante',
                style: GoogleFonts.inter(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Selecciona una opción para adjuntar tu comprobante de ${record.institucion}',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: const Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 18),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Image.asset(
                    AppAssets.icCamara,
                    width: 20,
                    height: 20,
                    color: AppColors.primary,
                  ),
                ),
                title: Text(
                  'Tomar fotografía',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                ),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _adjuntarComprobanteADonacion(record, 'foto_camara.jpg');
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Image.asset(
                    AppAssets.icDoc,
                    width: 20,
                    height: 20,
                    color: const Color(0xFF475569),
                  ),
                ),
                title: Text(
                  'Subir archivo (PDF o imagen)',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                ),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _adjuntarComprobanteADonacion(record, 'comprobante_archivo.pdf');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Backend: Adjuntar comprobante al registro y sincronizar con API / storage
  void _adjuntarComprobanteADonacion(DonationRecordModel record, String nombreArchivo) {
    final idx = _donations.indexOf(record);

    if (idx == -1) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Registra la donación primero para poder adjuntar el comprobante.',
            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
          ),
          backgroundColor: const Color(0xFF334155),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
        ),
      );
      return;
    }

    final actualizado = record.copyWith(
      tieneComprobante: true,
      urlComprobante: nombreArchivo,
    );

    setState(() {
      _donations[idx] = actualizado;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Comprobante adjuntado correctamente.',
                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF059669),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  // Dev: Selector para pruebas visuales en modo diseño
  Widget _buildDevTestSelector() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.tune_rounded, size: 16, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                'Vista previa del diseño (Modo desarrollador):',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF64748B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildTestChip(
                  label: '0. Vacío (Por defecto)',
                  index: 0,
                ),
                const SizedBox(width: 8),
                _buildTestChip(
                  label: '1. Apto para donar',
                  index: 1,
                ),
                const SizedBox(width: 8),
                _buildTestChip(
                  label: '2. No apto (Recuperando)',
                  index: 2,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTestChip({required String label, required int index}) {
    final isSelected = _testMode == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _testMode = index;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFCBD5E1),
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11.5,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}
