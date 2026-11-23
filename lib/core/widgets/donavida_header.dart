import 'dart:math' show min;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../constants/app_assets.dart';
import '../constants/app_colors.dart';

/// WIDGET REUTILIZABLE: CABECERA / HERO BANNER DE DONAVIDA
class DonavidaHeader extends StatelessWidget {
  final String? title;

  /// Widget personalizado para el título (ej. Image.asset con el logo)
  /// Si se proporciona, tiene prioridad sobre [title].
  final Widget? titleWidget;

  /// Subtítulo opcional (ej. 'Inicia sesión con tu cuenta de donante')
  final String? subtitle;

  /// Si muestra la flecha para volver a la pantalla anterior
  final bool showBackButton;

  /// Acción personalizada al presionar la flecha de regreso (por defecto pop)
  final VoidCallback? onBackPressed;

  /// Altura personalizada del header (por defecto 31% del alto de la pantalla)
  final double? height;

  const DonavidaHeader({
    super.key,
    this.title,
    this.titleWidget,
    this.subtitle,
    this.showBackButton = false,
    this.onBackPressed,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final headerHeight = height ?? (size.height * 0.31);

    return Container(
      width: double.infinity,
      height: headerHeight,
      decoration: const BoxDecoration(
        // [DEGRADADO OFICIAL FIGMA: 0% #D81B3A | 55% #A50E27 | 100% #5E0A18]
        gradient: AppColors.heroGradient,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: Stack(
        children: [
          // ── 1. MARCA DE AGUA DE LA GOTA ───────────────────────────────────
          Positioned(
            right: -min(size.width * 0.20, 130.0),
            bottom: -size.height * 0.08,
            child: IgnorePointer(
              child: Opacity(
                opacity: 0.12,
                child: Image.asset(
                  AppAssets.splashGota,
                  width: min(size.width * 0.50, 300),
                  height: min(size.width * 0.50, 300),
                  fit: BoxFit.contain,
                ),
              ),
            ),
          ),

          // ── 2. CÍRCULO TENUE DECORATIVO SUPERIOR ──────────────────────────
          Positioned(
            top: -20,
            left: -min(size.width * 0.10, 65.0),
            child: IgnorePointer(
              child: Container(
                width: 170,
                height: 170,
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

          // ── 3. BOTÓN DE REGRESO (OPCIONAL) ────────────────────────────────
          if (showBackButton)
            Positioned(
              top: 0,
              left: 0,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10.0,
                    vertical: 4.0,
                  ),
                  child: IconButton(
                    icon: Image.asset(
                      AppAssets.icVolver,
                      width: 22,
                      height: 22,
                      color: Colors.white,
                    ),
                    onPressed:
                        onBackPressed ?? () => Navigator.of(context).maybePop(),
                  ),
                ),
              ),
            ),

          // ── 4. CONTENIDO DE TEXTOS / TÍTULO ──────────────────────────────
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 24.0,
                vertical: 20.0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Espacio extra si hay botón de regreso para que no se encime
                  if (showBackButton) const SizedBox(height: 24),

                  // TÍTULO: Sea widget personalizado o texto
                  if (titleWidget != null)
                    titleWidget!
                  else if (title != null)
                    Text(
                      title!,
                      style: GoogleFonts.inter(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.3,
                      ),
                    ),

                  // SUBTÍTULO (Si existe)
                  if (subtitle != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      subtitle!,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: Colors.white.withOpacity(0.92),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
