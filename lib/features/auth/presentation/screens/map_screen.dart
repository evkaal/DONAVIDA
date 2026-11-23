import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/institution_model.dart';
import 'documents_screen.dart';

// Front/Back: Pantalla de mapa con geolocalización e instituciones cercanas
class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final _searchController = TextEditingController();
  final _mapController = MapController();
  final _sheetController = DraggableScrollableController();

  // Front: Coordenadas de centro y ubicación del usuario
  static const _defaultCenter = LatLng(17.0650, -96.7200);
  static const _userLocation = LatLng(17.0620, -96.7230);

  // Front: Filtros (0: Cercanos, 1: Abiertos, 2: 24 horas)
  int _selectedFilterIndex = 0;

  InstitutionModel? _selectedInstitution;

  // Backend: Lista de instituciones cargadas desde GET /instituciones
  List<InstitutionModel> _institutions = InstitutionModel.sampleList;

  @override
  void dispose() {
    _searchController.dispose();
    _mapController.dispose();
    _sheetController.dispose();
    super.dispose();
  }

  List<InstitutionModel> get _filteredInstitutions {
    var list = _institutions;

    final query = _searchController.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      list = list.where((inst) {
        return inst.nombre.toLowerCase().contains(query) ||
            inst.direccion.toLowerCase().contains(query) ||
            (inst.colonia?.toLowerCase().contains(query) ?? false);
      }).toList();
    }

    if (_selectedFilterIndex == 1) {
      list = list.where((inst) => inst.estaAbierto).toList();
    } else if (_selectedFilterIndex == 2) {
      list = list
          .where((inst) => inst.estadoHorario.toLowerCase().contains('24'))
          .toList();
    }

    return list;
  }

  /// Selecciona una institución y anima suavemente el mapa y el panel
  void _selectInstitution(InstitutionModel inst) {
    setState(() {
      _selectedInstitution = inst;
    });
    _mapController.move(LatLng(inst.latitud, inst.longitud), 15.6);
    if (_sheetController.isAttached) {
      _sheetController.animateTo(
        0.60,
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOutCubic,
      );
    }
  }

  /// Vuelve a la lista general de instituciones
  void _closeDetailView() {
    setState(() {
      _selectedInstitution = null;
    });
    _mapController.move(_defaultCenter, 14.2);
    if (_sheetController.isAttached) {
      _sheetController.animateTo(
        0.45,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
      );
    }
  }

  /// Arrastre vertical directo desde la barra superior (Soporta ratón en Web y dedo en móvil)
  void _onHandleVerticalDragUpdate(
      DragUpdateDetails details, double screenHeight) {
    if (!_sheetController.isAttached || screenHeight <= 0) return;
    final delta = -details.primaryDelta! / screenHeight;
    final newSize = (_sheetController.size + delta).clamp(0.05, 0.90);
    _sheetController.jumpTo(newSize);
  }

  /// Finalización del arrastre con inercia y salto al punto más cercano
  void _onHandleVerticalDragEnd(DragEndDetails details) {
    if (!_sheetController.isAttached) return;
    final current = _sheetController.size;
    final velocity = details.primaryVelocity ?? 0;

    double target;
    if (velocity < -300) {
      // Arrastró rápido hacia arriba
      target = current > 0.45 ? 0.90 : 0.45;
    } else if (velocity > 300) {
      // Arrastró rápido hacia abajo (ocultar)
      target = current > 0.65 ? 0.45 : 0.05;
    } else {
      // Ajuste magnético al punto más cercano (0.05, 0.45, 0.90)
      if (current < 0.22) {
        target = 0.05;
      } else if (current < 0.68) {
        target = 0.45;
      } else {
        target = 0.90;
      }
    }

    _sheetController.animateTo(
      target,
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
    );
  }

  /// Alterna el tamaño del panel si el usuario da un toque simple
  void _toggleSheetSize() {
    if (!_sheetController.isAttached) return;
    final current = _sheetController.size;
    if (current < 0.20) {
      _sheetController.animateTo(
        0.45,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    } else if (current < 0.65) {
      _sheetController.animateTo(
        0.90,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    } else {
      _sheetController.animateTo(
        0.05,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
      ),
    );

    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // ── 1. MAPA REAL CON OPENSTREETMAP ───────────────────────────────
          Positioned.fill(
            child: FlutterMap(
              mapController: _mapController,
              options: const MapOptions(
                initialCenter: _defaultCenter,
                initialZoom: 14.2,
                minZoom: 11.0,
                maxZoom: 18.0,
                interactionOptions: InteractionOptions(
                  flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate:
                      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.donavida.app',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _userLocation,
                      width: 50,
                      height: 50,
                      alignment: Alignment.center,
                      child: IgnorePointer(
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFF3B82F6).withOpacity(0.20),
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Container(
                              width: 16,
                              height: 16,
                              decoration: BoxDecoration(
                                color: const Color(0xFF2563EB),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: 2.5,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.18),
                                    blurRadius: 6,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    ..._filteredInstitutions.map((inst) {
                      final isSelected =
                          _selectedInstitution?.id == inst.id;
                      return Marker(
                        point: LatLng(inst.latitud, inst.longitud),
                        width: 44,
                        height: 52,
                        alignment: Alignment.topCenter,
                        child: GestureDetector(
                          onTap: () => _selectInstitution(inst),
                          child: AnimatedScale(
                            scale: isSelected ? 1.25 : 1.0,
                            duration: const Duration(milliseconds: 220),
                            curve: Curves.easeOutBack,
                            child: _BloodPinWidget(isSelected: isSelected),
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ],
            ),
          ),
          Positioned(
            right: 16,
            bottom: 72,
            child: FloatingActionButton.small(
              heroTag: 'map_gps_fab',
              backgroundColor: Colors.white,
              foregroundColor: AppColors.primary,
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              onPressed: () {
                _mapController.move(_userLocation, 15.5);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Ubicación centrada en tu posición'),
                    duration: Duration(seconds: 1),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              child: const Icon(Icons.my_location_rounded, size: 20),
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 650),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16.0,
                      vertical: 8.0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_selectedInstitution != null)
                          _buildBackToMapPill()
                        else ...[
                          _buildTopSearchBar(),
                          const SizedBox(height: 12),
                          _buildFilterChips(),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // ── 4. PANEL INFERIOR DINÁMICO DESLIZABLE (DraggableScrollableSheet) ──
          DraggableScrollableSheet(
            controller: _sheetController,
            initialChildSize: 0.45,
            minChildSize: 0.05, // Se oculta al 5%, dejando ver el 95% del mapa
            maxChildSize: 0.90,
            snap: true,
            snapSizes: const [0.05, 0.45, 0.90],
            builder: (context, scrollController) {
              return ScrollConfiguration(
                // Habilita arrastre con ratón (Web/Desktop) y táctil (Móvil)
                behavior: const MaterialScrollBehavior().copyWith(
                  dragDevices: {
                    PointerDeviceKind.mouse,
                    PointerDeviceKind.touch,
                    PointerDeviceKind.trackpad,
                    PointerDeviceKind.stylus,
                  },
                ),
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 650),
                    child: Container(
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(28),
                          topRight: Radius.circular(28),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Color(0x1F000000),
                            blurRadius: 20,
                            offset: Offset(0, -4),
                          ),
                        ],
                      ),
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 250),
                        child: _selectedInstitution != null
                            ? _buildInstitutionDetailView(
                                _selectedInstitution!,
                                scrollController,
                                size.height,
                              )
                            : _buildInstitutionsListView(
                                scrollController,
                                size.height,
                              ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BARRA SUPERIOR Y BUSCADOR
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildTopSearchBar() {
    return Row(
      children: [
        // Botón redondo volver
        GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Center(
              child: Image.asset(
                AppAssets.icVolver,
                width: 18,
                height: 18,
                color: const Color(0xFF0F172A),
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),

        // Barra de búsqueda con botón GPS
        Expanded(
          child: Container(
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.search_rounded,
                  color: Color(0xFF94A3B8),
                  size: 22,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Buscar colonia o dirección',
                      hintStyle: GoogleFonts.inter(
                        fontSize: 14,
                        color: const Color(0xFF94A3B8),
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                // Botón GPS diana para centrar en la ubicación del usuario
                GestureDetector(
                  onTap: () {
                    _mapController.move(_userLocation, 15.0);
                  },
                  child: Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Icon(
                        Icons.my_location_rounded,
                        color: AppColors.primary,
                        size: 18,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChips() {
    final filters = ['Más cercanos', 'Abierto ahora', '24 horas'];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: List.generate(filters.length, (index) {
          final isSelected = _selectedFilterIndex == index;
          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedFilterIndex = index;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: isSelected
                          ? AppColors.primary.withOpacity(0.3)
                          : Colors.black.withOpacity(0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Text(
                  filters[index],
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                    color: isSelected ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildBackToMapPill() {
    return GestureDetector(
      onTap: _closeDetailView,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.10),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              AppAssets.icVolver,
              width: 16,
              height: 16,
              color: const Color(0xFF0F172A),
            ),
            const SizedBox(width: 8),
            Text(
              'Volver al mapa',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF0F172A),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PANEL 1: LISTA DE BANCOS DE SANGRE CERCANOS (Draggable & Scrollable)
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildInstitutionsListView(
    ScrollController scrollController,
    double screenHeight,
  ) {
    final list = _filteredInstitutions;

    return CustomScrollView(
      key: const ValueKey('institutions_list_view'),
      controller: scrollController,
      physics: const BouncingScrollPhysics(
        parent: AlwaysScrollableScrollPhysics(),
      ),
      slivers: [
        // Zona del tirador y encabezado: sensible al arrastre vertical
        SliverToBoxAdapter(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onVerticalDragUpdate: (details) =>
                _onHandleVerticalDragUpdate(details, screenHeight),
            onVerticalDragEnd: _onHandleVerticalDragEnd,
            onTap: _toggleSheetSize,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Tirador superior gris ancho (Fácil de agarrar y arrastrar)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 10, bottom: 8),
                    child: Container(
                      width: 52,
                      height: 5,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),

                // Títulos del encabezado
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20.0,
                    vertical: 4.0,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Bancos de sangre cercanos',
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                              letterSpacing: -0.2,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${list.length} resultados cerca de ti',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),

                      // Indicador visual de deslizamiento
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.unfold_more_rounded,
                          size: 18,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 10),
              ],
            ),
          ),
        ),

        // Lista de tarjetas de bancos de sangre con scroll continuo
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 28),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final inst = list[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: _buildInstitutionCard(inst, isPrimary: index == 0),
                );
              },
              childCount: list.length,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInstitutionCard(InstitutionModel inst, {bool isPrimary = false}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isPrimary ? const Color(0xFFFFE4E6) : const Color(0xFFF1F5F9),
          width: 1.4,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => _selectInstitution(inst),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        inst.nombre,
                        style: GoogleFonts.inter(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    _buildStatusBadge(inst.estaAbierto),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 16,
                      color: Color(0xFF94A3B8),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        inst.direccion,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 12.5,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      Icons.near_me_outlined,
                      size: 15,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${inst.distanciaKm} km',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Icon(
                      Icons.access_time_rounded,
                      size: 15,
                      color: Color(0xFF94A3B8),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        inst.estadoHorario,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: () => _selectInstitution(inst),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFE4E6),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Cómo llegar',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
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

  // ══════════════════════════════════════════════════════════════════════════
  // PANEL 2: DETALLE DE INSTITUCIÓN (mapa_info_institucion_selec.png)
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildInstitutionDetailView(
    InstitutionModel inst,
    ScrollController scrollController,
    double screenHeight,
  ) {
    return CustomScrollView(
      key: ValueKey('institution_detail_${inst.id}'),
      controller: scrollController,
      physics: const BouncingScrollPhysics(
        parent: AlwaysScrollableScrollPhysics(),
      ),
      slivers: [
        SliverToBoxAdapter(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onVerticalDragUpdate: (details) =>
                _onHandleVerticalDragUpdate(details, screenHeight),
            onVerticalDragEnd: _onHandleVerticalDragEnd,
            onTap: _toggleSheetSize,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Tirador superior gris
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 10, bottom: 8),
                    child: Container(
                      width: 52,
                      height: 5,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),

                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Nombre y botón de cerrar detalle (X)
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              inst.nombre,
                              style: GoogleFonts.inter(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                                letterSpacing: -0.2,
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: _closeDetailView,
                            child: Container(
                              width: 34,
                              height: 34,
                              decoration: const BoxDecoration(
                                color: Color(0xFFF1F5F9),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.close_rounded,
                                size: 18,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Badges: Abierto/Cerrado + Pública/Privada
                      Row(
                        children: [
                          _buildStatusBadge(inst.estaAbierto),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              inst.esPublica
                                  ? 'Institución pública'
                                  : 'Institución privada',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF475569),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      // Filas de detalle
                      _buildDetailRow(
                        icon: Icons.location_on_outlined,
                        label: 'Dirección',
                        value: inst.direccion,
                      ),
                      const SizedBox(height: 14),
                      _buildDetailRow(
                        icon: Icons.phone_outlined,
                        label: 'Teléfono',
                        value: inst.telefono,
                        trailing: GestureDetector(
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Llamando a ${inst.telefono}...'),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primarySoft,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Llamar',
                              style: GoogleFonts.inter(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      _buildDetailRow(
                        icon: Icons.access_time_rounded,
                        label: 'Horario',
                        value: inst.horario,
                      ),
                      const SizedBox(height: 14),
                      _buildDetailRow(
                        icon: Icons.directions_car_outlined,
                        label: 'Distancia',
                        value:
                            '${inst.distanciaKm} km · aprox. ${inst.tiempoMinutosAuto ?? 12} min en auto',
                      ),
                      const SizedBox(height: 20),

                      // Botones de acción: Cómo llegar | Qué llevar
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF0F172A),
                                side: const BorderSide(color: Color(0xFFCBD5E1)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      'Ruta trazada hacia ${inst.nombre}',
                                    ),
                                    duration: const Duration(seconds: 1),
                                  ),
                                );
                              },
                              icon: const Icon(Icons.near_me_outlined, size: 18),
                              label: Text(
                                'Cómo llegar',
                                style: GoogleFonts.inter(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF0F172A),
                                side: const BorderSide(color: Color(0xFFCBD5E1)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => const DocumentsScreen(),
                                  ),
                                );
                              },
                              icon: const Icon(Icons.description_outlined, size: 18),
                              label: Text(
                                'Qué llevar',
                                style: GoogleFonts.inter(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Botón principal rojo: Sacar cita
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            elevation: 2,
                            shadowColor: AppColors.primary.withOpacity(0.35),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: () {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                title: Text(
                                  'Agendar cita',
                                  style: GoogleFonts.inter(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                content: Text(
                                  'Se conectará con el portal oficial de citas de ${inst.nombre}.',
                                  style: GoogleFonts.inter(fontSize: 14),
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.of(ctx).pop(),
                                    child: Text(
                                      'Entendido',
                                      style: GoogleFonts.inter(
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                          icon: const Icon(Icons.calendar_today_rounded, size: 18),
                          label: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Sacar cita',
                                style: GoogleFonts.inter(
                                  fontSize: 15.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(Icons.link_rounded, size: 18),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Center(
                        child: Text(
                          'Se abrirá el sitio web de la institución',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            color: const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS DE DISEÑO
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildStatusBadge(bool estaAbierto) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color:
            estaAbierto ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: estaAbierto
                  ? const Color(0xFF16A34A)
                  : const Color(0xFF64748B),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            estaAbierto ? 'Abierto' : 'Cerrado',
            style: GoogleFonts.inter(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: estaAbierto
                  ? const Color(0xFF15803D)
                  : const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    Widget? trailing,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.primarySoft,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.primary, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: const Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF0F172A),
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
        if (trailing != null) trailing,
      ],
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// WIDGET DEL PIN ROJO CON LA GOTA DE SANGRE (Figma)
// ════════════════════════════════════════════════════════════════════════════
class _BloodPinWidget extends StatelessWidget {
  final bool isSelected;

  const _BloodPinWidget({this.isSelected = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 38,
          height: 46,
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFF88081C)
                : const Color(0xFFC8102E),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
              bottomLeft: Radius.circular(20),
              bottomRight: Radius.circular(4),
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFC8102E).withOpacity(0.35),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          transform: Matrix4.rotationZ(-0.785398),
          child: Center(
            child: Transform.rotate(
              angle: 0.785398,
              child: Container(
                width: 22,
                height: 22,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.water_drop_rounded,
                    color: Color(0xFFC8102E),
                    size: 15,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
