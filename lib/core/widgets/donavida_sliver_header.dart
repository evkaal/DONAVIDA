import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../constants/app_assets.dart';
import '../constants/app_colors.dart';

/// Header / Hero Banner colapsable para DONAVIDA
/// Basado en el diseño oficial de Figma:
/// - Cuando está arriba: Banner hero amplio con curvatura inferior, gota translúcida y círculos.
/// - Cuando se hace scroll: Se encoge suavemente en una barra de navegación fija y delgada.
/// - El botón para volver atrás permanece SIEMPRE visible, fijo y activo en todo momento.
class DonavidaSliverHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final bool showBackButton;
  final VoidCallback? onBackPressed;
  final List<Widget>? actions;
  final double expandedHeight;
  final double collapsedHeight;

  const DonavidaSliverHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.showBackButton = true,
    this.onBackPressed,
    this.actions,
    this.expandedHeight = 140.0,
    this.collapsedHeight = 64.0,
  });

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    final maxExt = topPadding + expandedHeight;
    final minExt = topPadding + collapsedHeight;

    return SliverPersistentHeader(
      pinned: true,
      delegate: _DonavidaSliverHeaderDelegate(
        title: title,
        subtitle: subtitle,
        showBackButton: showBackButton,
        onBackPressed: onBackPressed ?? () => Navigator.of(context).pop(),
        actions: actions,
        topPadding: topPadding,
        maxExtentHeight: maxExt,
        minExtentHeight: minExt,
      ),
    );
  }
}

class _DonavidaSliverHeaderDelegate extends SliverPersistentHeaderDelegate {
  final String title;
  final String? subtitle;
  final bool showBackButton;
  final VoidCallback onBackPressed;
  final List<Widget>? actions;
  final double topPadding;
  final double maxExtentHeight;
  final double minExtentHeight;

  _DonavidaSliverHeaderDelegate({
    required this.title,
    this.subtitle,
    required this.showBackButton,
    required this.onBackPressed,
    this.actions,
    required this.topPadding,
    required this.maxExtentHeight,
    required this.minExtentHeight,
  });

  @override
  double get maxExtent => maxExtentHeight;

  @override
  double get minExtent => minExtentHeight;

  @override
  bool shouldRebuild(covariant _DonavidaSliverHeaderDelegate oldDelegate) {
    return oldDelegate.title != title ||
        oldDelegate.subtitle != subtitle ||
        oldDelegate.showBackButton != showBackButton ||
        oldDelegate.maxExtentHeight != maxExtentHeight ||
        oldDelegate.minExtentHeight != minExtentHeight;
  }

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    final deltaExtent = maxExtent - minExtent;
    final progress = deltaExtent > 0
        ? (shrinkOffset / deltaExtent).clamp(0.0, 1.0)
        : 0.0;

    // Curvatura inferior: 32px cuando está expandido, 0px cuando está colapsado
    final currentRadius = Radius.circular(32.0 * (1.0 - progress));

    return Container(
      decoration: BoxDecoration(
        gradient: AppColors.heroGradient,
        borderRadius: BorderRadius.only(
          bottomLeft: currentRadius,
          bottomRight: currentRadius,
        ),
        boxShadow: progress > 0.1
            ? [
                BoxShadow(
                  color: Colors.black.withOpacity(0.18 * progress),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // ── 1. CÍRCULO TRANSLÚCIDO DECORATIVO (Se desvanece al colapsar) ──
          Positioned(
            top: -20,
            right: 40,
            child: IgnorePointer(
              child: Opacity(
                opacity: ((1.0 - progress) * 0.08).clamp(0.0, 1.0),
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white,
                      width: 1.5,
                    ),
                  ),
                ),
              ),
            ),
          ),

          // ── 2. MARCA DE AGUA DE LA GOTA (Se desvanece al colapsar) ────────
          Positioned(
            top: 5,
            right: -30,
            child: IgnorePointer(
              child: Opacity(
                opacity: ((1.0 - progress) * 0.12).clamp(0.0, 1.0),
                child: Image.asset(
                  AppAssets.splashGota,
                  width: 200,
                  height: 200,
                  fit: BoxFit.contain,
                ),
              ),
            ),
          ),

          // ── 3. CONTENIDO SUPERIOR FIJO (BOTÓN REGRESAR + TÍTULO) ──────────
          Positioned(
            top: topPadding + 8,
            left: 16,
            right: 16,
            child: Row(
              children: [
                // BOTÓN VOLVER ATRÁS (SIEMPRE ACTIVO Y VISIBLE)
                if (showBackButton) ...[
                  GestureDetector(
                    onTap: onBackPressed,
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
                ],

                // TÍTULO DE LA PANTALLA
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 18.0 + (3.0 * (1.0 - progress)),
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: -0.3,
                        ),
                      ),
                      if (subtitle != null && progress < 0.3)
                        Opacity(
                          opacity: (1.0 - (progress / 0.3)).clamp(0.0, 1.0),
                          child: Text(
                            subtitle!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 12.5,
                              color: Colors.white.withOpacity(0.85),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                // ACCIONES ADICIONALES (SI LAS HAY)
                if (actions != null) ...actions!,
              ],
            ),
          ),
        ],
      ),
    );
  }
}
