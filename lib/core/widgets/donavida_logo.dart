import 'package:flutter/material.dart';
import '../constants/app_assets.dart';

/// Widget oficial del Logo de DONAVIDA
/// Combina el isotipo (donavida_gota.png) y el texto institucional (donavida_texto.png).
class DonavidaLogo extends StatelessWidget {
  /// Tamaño de la gota (alto y ancho proporcional)
  final double gotaSize;

  /// Ancho del texto institucional
  final double? textWidth;

  /// Espacio entre la gota y el texto
  final double spacing;

  /// Si se organiza verticalmente (uno arriba del otro) u horizontalmente
  final bool isVertical;

  /// Color de tinte opcional (por defecto usa los colores originales de los assets)
  final Color? colorFilter;

  const DonavidaLogo({
    super.key,
    this.gotaSize = 110,
    this.textWidth = 230,
    this.spacing = 16,
    this.isVertical = true,
    this.colorFilter,
  });

  @override
  Widget build(BuildContext context) {
    final gotaWidget = Image.asset(
      AppAssets.gota,
      width: gotaSize,
      height: gotaSize,
      fit: BoxFit.contain,
      color: colorFilter,
    );

    final textWidget = Image.asset(
      AppAssets.texto,
      width: textWidth,
      fit: BoxFit.contain,
      color: colorFilter,
    );

    if (isVertical) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          gotaWidget,
          SizedBox(height: spacing),
          textWidget,
        ],
      );
    } else {
      return Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          gotaWidget,
          SizedBox(width: spacing),
          textWidget,
        ],
      );
    }
  }
}

