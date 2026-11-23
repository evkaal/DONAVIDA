import 'package:flutter/material.dart';

class AppColors {
  static const Color redGradientStart = Color(
    0xFFD81B3A,
  ); // 0% (Arriba / Inicio)
  static const Color redGradientMiddle = Color(0xFFA50E27); // 55% (Centro)
  static const Color redGradientEnd = Color(0xFF5E0A18); // 100% (Abajo / Fin)

  /// Degradado oficial vertical para Splash Screen, Banners y Headers Hero
  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    stops: [0.0, 0.55, 1.0],
    colors: [redGradientStart, redGradientMiddle, redGradientEnd],
  );

  /// Degradado diagonal para tarjetas interactivas (ej. Tarjeta Iniciar sesión)
  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    stops: [0.0, 0.55, 1.0],
    colors: [redGradientStart, redGradientMiddle, redGradientEnd],
  );

  // ── [2. MARCA INSTITUCIONAL] ─────────────────────────────────────────────
  static const Color primary = redGradientMiddle; // #A50E27
  static const Color primaryLight = redGradientStart; // #D81B3A
  static const Color primaryDark = redGradientEnd; // #5E0A18
  static const Color primarySoft = Color(
    0xFFFEE2E2,
  ); // Fondo suave rosa/carmesí

  // ── [3. FONDOS Y SUPERFICIES] ────────────────────────────────────────────
  static const Color background = Color(
    0xFFF8FAFC,
  ); // Fondo general pantallas (Slate 50)
  static const Color surface = Color(
    0xFFFFFFFF,
  ); // Fondo tarjetas y contenedores
  static const Color surfaceDark = Color(0xFF0F172A); // Fondo oscuro

  // ── [4. BORDES Y DIVISORES] ──────────────────────────────────────────────
  static const Color border = Color(0xFFE2E8F0); // Borde claro (Slate 200)
  static const Color borderFocused =
      redGradientMiddle; // Borde al enfocar input

  // ── [5. TEXTOS Y CONTRASTES] ─────────────────────────────────────────────
  static const Color textPrimary = Color(
    0xFF0F172A,
  ); // Texto títulos y principal
  static const Color textSecondary = Color(
    0xFF64748B,
  ); // Texto secundario y etiquetas
  static const Color textMuted = Color(
    0xFF94A3B8,
  ); // Texto deshabilitado o placeholder
  static const Color textWhite = Color(0xFFFFFFFF); // Texto blanco

  // ── [6. ESTADOS DEL SISTEMA] ─────────────────────────────────────────────
  static const Color success = Color(0xFF10B981); // Éxito / disponible
  static const Color warning = Color(0xFFF59E0B); // Alerta
  static const Color error = Color(0xFFEF4444); // Error
  static const Color errorBackground = Color(0xFFFEF2F2); // Fondo suave error

  // Alias de compatibilidad
  static const LinearGradient brandGradient = heroGradient;
  static const Color splashBackground = redGradientMiddle;
}
