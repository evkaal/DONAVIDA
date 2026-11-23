import 'package:donavida_app/features/auth/presentation/screens/create_account_screen.dart';
import 'package:donavida_app/features/auth/presentation/screens/documents_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/donavida_header.dart';
import 'select_account_screen.dart';
import 'user_data_screen.dart';
import 'map_screen.dart';
import 'notifications_screen.dart';
import 'history_screen.dart';

// Front: Menú principal de la app con vista adaptada para usuario o invitado
class MainMenuScreen extends StatelessWidget {
  // Backend: true para modo invitado, false para donante autenticado
  final bool isGuest;

  const MainMenuScreen({super.key, this.isGuest = false});

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
              title: isGuest ? 'Hola, bienvenido' : 'Bienvenido Usuario',
              subtitle: isGuest ? null : 'Elige una opción para comenzar',
              showBackButton: isGuest,
              onBackPressed: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(
                    builder: (_) => const SelectAccountScreen(),
                  ),
                );
              },
            ),

            const SizedBox(height: 24),

            // TÍTULO "Menú" centrado y con ancho máximo
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 650),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text(
                    'Menú',
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // GRID DE TARJETAS centrado y con ancho máximo
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 650),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: isGuest
                      ? _buildGuestGrid(context)
                      : _buildUserGrid(context),
                ),
              ),
            ),

            if (isGuest) ...[
              const SizedBox(height: 20),
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 650),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _buildAlertBanner(),
                  ),
                ),
              ),
            ],

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  // Front: Grid para usuario no registrado
  Widget _buildGuestGrid(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _buildMapaCard(context)),
            const SizedBox(width: 14),
            Expanded(child: _buildDocsCard(context)),
          ],
        ),
        const SizedBox(height: 14),
        _buildCrearCuentaCard(context),
      ],
    );
  }

  // Front: Grid para donante autenticado
  Widget _buildUserGrid(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _buildMapaCard(context)),
            const SizedBox(width: 14),
            Expanded(child: _buildDatosCard(context)),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(child: _buildDocsCard(context)),
            const SizedBox(width: 14),
            Expanded(child: _buildNotificacionesCard(context)),
          ],
        ),
        const SizedBox(height: 14),
        _buildHistorialCard(context),
      ],
    );
  }

  Widget _buildMapaCard(BuildContext context) {
    return _MenuCard(
      onTap: () {
        Navigator.of(context)
            .push(MaterialPageRoute(builder: (_) => const MapScreen()));
      },
      isRed: true,
      height: 180,
      icon: AppAssets.icMapa,
      title: 'Mapa',
      subtitle: 'Encuentra bancos de sangre cerca de ti',
    );
  }

  Widget _buildDatosCard(BuildContext context) {
    return _MenuCard(
      onTap: () {
        Navigator.of(context)
            .push(MaterialPageRoute(builder: (_) => const UserDataScreen()));
      },
      height: 180,
      icon: AppAssets.icUsuario,
      title: 'Datos del usuario',
      subtitle: 'Consulta y actualiza tu información',
    );
  }

  Widget _buildDocsCard(BuildContext context) {
    return _MenuCard(
      onTap: () {
        Navigator.of(context)
            .push(MaterialPageRoute(builder: (_) => const DocumentsScreen()));
      },
      height: 180,
      icon: AppAssets.icDoc,
      title: 'Documentos necesarios',
      subtitle: 'Qué llevar cuando acudas a donar',
    );
  }

  Widget _buildNotificacionesCard(BuildContext context) {
    return _MenuCard(
      onTap: () {
        Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
      },
      height: 180,
      icon: AppAssets.icNoti,
      title: 'Notificaciones',
      subtitle: '¿Hay alguna novedad?',
    );
  }

  Widget _buildHistorialCard(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            Navigator.of(context)
                .push(MaterialPageRoute(builder: (_) => const HistoryScreen()));
          },
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: Image.asset(
                      AppAssets.icHistorial,
                      width: 26,
                      height: 26,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Historial de donaciones',
                        style: GoogleFonts.inter(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Revise las aportaciones y donaciones realizadas',
                        style: GoogleFonts.inter(
                          fontSize: 12.5,
                          color: const Color(0xFF64748B),
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 16,
                  color: Color(0xFF94A3B8),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCrearCuentaCard(BuildContext context) {
    return Container(
      height: 190,
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CreateAccountScreen()),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Center(
                    child: Image.asset(
                      AppAssets.icCrearC,
                      width: 24,
                      height: 24,
                      color: AppColors.primary,
                    ),
                  ),
                ),

                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Crear una cuenta',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Cree una cuenta para participar activamente y recibir notificaciones',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: const Color(0xFF64748B),
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Banner de aviso inferior (solo invitado)
  Widget _buildAlertBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.primarySoft,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Image.asset(
            AppAssets.icAviso,
            width: 20,
            height: 20,
            color: AppColors.primary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Antes de acudir, revisa qué documentos necesitas llevar.',
              style: GoogleFonts.inter(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// TARJETAS REUTILIZABLE
class _MenuCard extends StatelessWidget {
  final VoidCallback onTap;
  final String icon;
  final String title;
  final String subtitle;
  final bool isRed;
  final double height;

  const _MenuCard({
    required this.onTap,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.isRed = false,
    this.height = 180,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        gradient: isRed ? AppColors.cardGradient : null,
        color: isRed ? null : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: isRed
                ? AppColors.primary.withOpacity(0.25)
                : Colors.black.withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: isRed
                        ? Colors.white.withOpacity(0.18)
                        : AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Center(
                    child: Image.asset(
                      icon,
                      width: 24,
                      height: 24,
                      color: isRed ? Colors.white : AppColors.primary,
                    ),
                  ),
                ),

                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: isRed ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: isRed
                            ? Colors.white.withOpacity(0.80)
                            : const Color(0xFF64748B),
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
