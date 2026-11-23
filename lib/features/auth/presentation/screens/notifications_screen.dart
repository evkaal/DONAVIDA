import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import 'map_screen.dart';

// Front/Back: Tipos de notificación según eventos del sistema
enum NotificationType {
  bloodAlert,
  reminder,
  donation,
  available,
  profile,
}

// Backend: Modelo de notificación parseable desde GET /notificaciones
class NotificationItem {
  final String id;
  final String title;
  final String description;
  final String time;
  final bool isRead;
  final bool isToday;
  final NotificationType type;
  final String? actionButtonText;

  const NotificationItem({
    required this.id,
    required this.title,
    required this.description,
    required this.time,
    required this.isRead,
    required this.isToday,
    required this.type,
    this.actionButtonText,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    NotificationType parseType(String? val) {
      switch (val) {
        case 'bloodAlert':
        case 'urgente':
          return NotificationType.bloodAlert;
        case 'reminder':
        case 'recordatorio':
          return NotificationType.reminder;
        case 'donation':
        case 'donacion':
          return NotificationType.donation;
        case 'available':
        case 'disponible':
          return NotificationType.available;
        case 'profile':
        case 'perfil':
        default:
          return NotificationType.profile;
      }
    }

    return NotificationItem(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? json['titulo'] ?? '',
      description: json['description'] ?? json['descripcion'] ?? '',
      time: json['time'] ?? json['fecha_hora'] ?? '',
      isRead: json['is_read'] ?? json['leida'] ?? false,
      isToday: json['is_today'] ?? json['es_hoy'] ?? false,
      type: parseType(json['type'] ?? json['tipo']),
      actionButtonText: json['action_button_text'] ?? json['boton_accion'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'time': time,
      'is_read': isRead,
      'is_today': isToday,
      'type': type.name,
      if (actionButtonText != null) 'action_button_text': actionButtonText,
    };
  }

  /// Datos de ejemplo listos basados en notificaciones.png
  static List<NotificationItem> get sampleList => [
        const NotificationItem(
          id: '1',
          title: 'Se necesita sangre O+',
          description:
              'Hospital General solicita donantes O+ con urgencia. Tu tipo de sangre es compatible.',
          time: '10:24',
          isRead: false,
          isToday: true,
          type: NotificationType.bloodAlert,
          actionButtonText: 'Ver bancos cercanos →',
        ),
        const NotificationItem(
          id: '2',
          title: 'Recordatorio de donación',
          description:
              'Mañana a las 9:00 en Banco de Sangre Central. Recuerda ir en ayunas.',
          time: '08:00',
          isRead: false,
          isToday: true,
          type: NotificationType.reminder,
        ),
        const NotificationItem(
          id: '3',
          title: 'Donación registrada',
          description:
              'Gracias por donar. Tu donación puede ayudar a salvar hasta 3 vidas.',
          time: 'Ayer',
          isRead: false,
          isToday: false,
          type: NotificationType.donation,
        ),
        const NotificationItem(
          id: '4',
          title: 'Ya puedes volver a donar',
          description:
              'Ya puedes agendar una nueva donación en el banco de sangre más cercano.',
          time: '15 oct',
          isRead: true,
          isToday: false,
          type: NotificationType.available,
        ),
        const NotificationItem(
          id: '5',
          title: 'Actualiza tus datos',
          description:
              'Confirma tu teléfono y tu colonia para recibir alertas cercanas.',
          time: '12 oct',
          isRead: true,
          isToday: false,
          type: NotificationType.profile,
        ),
      ];
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  // Front: 0 = Todas, 1 = Sin leer
  int _selectedFilter = 0;

  // Backend: Lista de notificaciones del donante
  List<NotificationItem> _notifications = [];

  // Dev: Alternar datos de prueba
  bool _useSampleData = false;

  List<NotificationItem> get _activeList {
    final list = _useSampleData ? NotificationItem.sampleList : _notifications;
    if (_selectedFilter == 1) {
      return list.where((item) => !item.isRead).toList();
    }
    return list;
  }

  int get _totalCount =>
      (_useSampleData ? NotificationItem.sampleList : _notifications).length;

  int get _unreadCount =>
      (_useSampleData ? NotificationItem.sampleList : _notifications)
          .where((item) => !item.isRead)
          .length;

  // Backend: Marcar todas como leídas en PUT /notificaciones/marcar-leidas
  void _markAllAsRead() {
    setState(() {
      if (_useSampleData) {
        _useSampleData = false;
      }
      _notifications = _notifications
          .map((n) => NotificationItem(
                id: n.id,
                title: n.title,
                description: n.description,
                time: n.time,
                isRead: true,
                isToday: n.isToday,
                type: n.type,
                actionButtonText: n.actionButtonText,
              ))
          .toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );

    final currentList = _activeList;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          _buildStaticTopSection(),
          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 650),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 18.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 10),
                        if (currentList.isEmpty)
                          _buildEmptyState()
                        else ...[
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'HOY',
                                style: GoogleFonts.inter(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF64748B),
                                  letterSpacing: 0.5,
                                ),
                              ),
                              GestureDetector(
                                onTap: _markAllAsRead,
                                child: Text(
                                  'Marcar todas como leídas',
                                  style: GoogleFonts.inter(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ...currentList
                              .where((item) => item.isToday)
                              .map((item) => Padding(
                                    padding:
                                        const EdgeInsets.only(bottom: 12.0),
                                    child: _buildNotificationCard(item),
                                  )),
                          if (currentList.any((item) => !item.isToday)) ...[
                            const SizedBox(height: 10),
                            Text(
                              'ANTERIORES',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF64748B),
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 12),
                            ...currentList
                                .where((item) => !item.isToday)
                                .map((item) => Padding(
                                      padding:
                                          const EdgeInsets.only(bottom: 12.0),
                                      child: _buildNotificationCard(item),
                                    )),
                          ],
                        ],
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

  // Front: Cabecera superior fija con pestañas
  Widget _buildStaticTopSection() {
    final topPadding = MediaQuery.of(context).padding.top;
    final bannerHeight = topPadding + 85.0;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        // Fondo hero superior con gradiente y marca de agua
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
                // Círculo translúcido decorativo
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

                // Marca de agua de la gota
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

        // Front: Encabezado con botón volver y pestañas
        SafeArea(
          bottom: false,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 650),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),

                    // Fila del encabezado: Botón Volver + Título
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
                            'Notificaciones',
                            style: GoogleFonts.inter(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Tarjeta de pestañas estática (Fija sobre el límite del fondo)
                    _buildFilterTabsCard(),

                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PESTAÑAS: Todas | Sin leer
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildFilterTabsCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 16,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          // Pestaña Todas
          Expanded(
            child: _buildTabButton(
              index: 0,
              label: 'Todas',
              count: _totalCount,
            ),
          ),
          const SizedBox(width: 6),
          // Pestaña Sin leer
          Expanded(
            child: _buildTabButton(
              index: 1,
              label: 'Sin leer',
              count: _unreadCount,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton({
    required int index,
    required String label,
    required int count,
  }) {
    final isSelected = _selectedFilter == index;

    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primarySoft : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? AppColors.primary : const Color(0xFF64748B),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary
                    : const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '$count',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : const Color(0xFF64748B),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Front: Estado vacío sin notificaciones
  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 50.0, horizontal: 20.0),
        child: Column(
          children: [
            // Icono de campana suave
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Image.asset(
                  AppAssets.icNoti,
                  width: 38,
                  height: 38,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'No tienes notificaciones',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Te avisaremos cuando haya solicitudes de sangre o novedades sobre tus donaciones.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 13.5,
                color: const Color(0xFF64748B),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 30),
            // Botón rápido para alternar y ver el diseño con datos de ejemplo
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: BorderSide(color: AppColors.primary.withOpacity(0.3)),
                padding:
                    const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: () {
                setState(() {
                  _useSampleData = !_useSampleData;
                });
              },
              icon: const Icon(Icons.visibility_outlined, size: 18),
              label: Text(
                'Ver diseño con datos de ejemplo',
                style: GoogleFonts.inter(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Front: Tarjeta de notificación individual
  Widget _buildNotificationCard(NotificationItem item) {
    // Configuración visual según el tipo de notificación
    final _VisualConfig config = _getConfigForType(item.type);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: !item.isRead
              ? const Color(0xFFFFE4E6)
              : const Color(0xFFF1F5F9),
          width: 1.4,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Front: Icono según tipo de notificación
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: config.backgroundColor,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: Image.asset(
                config.iconAsset,
                width: 22,
                height: 22,
                color: config.iconColor,
              ),
            ),
          ),
          const SizedBox(width: 14),

          // Front: Título, hora, descripción y acción
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Fila: Título + Hora + Punto rojo si no está leída
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        item.title,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      item.time,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: const Color(0xFF94A3B8),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (!item.isRead) ...[
                      const SizedBox(width: 6),
                      Container(
                        width: 7,
                        height: 7,
                        margin: const EdgeInsets.only(top: 4),
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ],
                ),

                const SizedBox(height: 4),

                // Descripción
                Text(
                  item.description,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: const Color(0xFF64748B),
                    height: 1.35,
                  ),
                ),

                // Botón de acción opcional (ej. "Ver bancos cercanos →")
                if (item.actionButtonText != null) ...[
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const MapScreen(),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        item.actionButtonText!,
                        style: GoogleFonts.inter(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Retorna icono y color según el tipo de notificación
  _VisualConfig _getConfigForType(NotificationType type) {
    switch (type) {
      case NotificationType.bloodAlert:
        return _VisualConfig(
          iconAsset: AppAssets.splashGota,
          iconColor: const Color(0xFFC8102E),
          backgroundColor: const Color(0xFFFDE8EC),
        );
      case NotificationType.reminder:
        return _VisualConfig(
          iconAsset: AppAssets.icCalendario,
          iconColor: const Color(0xFF2563EB),
          backgroundColor: const Color(0xFFEFF6FF),
        );
      case NotificationType.donation:
        return _VisualConfig(
          iconAsset: AppAssets.icCheckCir,
          iconColor: const Color(0xFF16A34A),
          backgroundColor: const Color(0xFFDCFCE7),
        );
      case NotificationType.available:
        return _VisualConfig(
          iconAsset: AppAssets.icCorazon,
          iconColor: const Color(0xFFD97706),
          backgroundColor: const Color(0xFFFEF3C7),
        );
      case NotificationType.profile:
        return _VisualConfig(
          iconAsset: AppAssets.icUsuario,
          iconColor: const Color(0xFF64748B),
          backgroundColor: const Color(0xFFF1F5F9),
        );
    }
  }
}

class _VisualConfig {
  final String iconAsset;
  final Color iconColor;
  final Color backgroundColor;

  const _VisualConfig({
    required this.iconAsset,
    required this.iconColor,
    required this.backgroundColor,
  });
}
