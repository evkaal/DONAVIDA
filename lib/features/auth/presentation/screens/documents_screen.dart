import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/donavida_sliver_header.dart';

// Front: Pantalla informativa de requisitos y documentos para donación
class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  // Front: 0: General, 1: Pública, 2: Privada
  int _selectedTabIndex = 0;

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
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: [
          DonavidaSliverHeader(
            title: 'Documentos necesarios',
            showBackButton: true,
            onBackPressed: () => Navigator.of(context).pop(),
          ),
          SliverToBoxAdapter(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 650),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 16),
                      _buildAyunasHeaderCard(),
                      const SizedBox(height: 18),
                      _buildTabBar(),
                      const SizedBox(height: 20),
                      _buildSectionHeader(),
                      const SizedBox(height: 14),
                      _buildRequirementsCard(),
                      const SizedBox(height: 36),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAyunasHeaderCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
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
          // Cuadrado redondeado carmesí con icono de reloj
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: Image.asset(
                AppAssets.icReloj,
                width: 22,
                height: 22,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 14),

          // Textos
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cuando acudas, ve en ayunas',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'De 4 a 8 horas antes. Puedes tomar agua, jugos o café sin leche.',
                  style: GoogleFonts.inter(
                    fontSize: 12.5,
                    color: const Color(0xFF64748B),
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      height: 46,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFE2E8F0).withOpacity(0.55),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          _buildTabItem(index: 0, label: 'General'),
          _buildTabItem(index: 1, label: 'Pública'),
          _buildTabItem(index: 2, label: 'Privada'),
        ],
      ),
    );
  }

  Widget _buildTabItem({required int index, required String label}) {
    final isSelected = _selectedTabIndex == index;

    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedTabIndex = index;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? AppColors.primary : const Color(0xFF64748B),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader() {
    if (_selectedTabIndex == 0) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'REQUISITOS GENERALES PARA DONAR SANGRE',
            style: GoogleFonts.inter(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF64748B),
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Para poder donar, debes cumplir con este perfil básico de salud:',
            style: GoogleFonts.inter(
              fontSize: 13.5,
              color: const Color(0xFF0F172A),
              height: 1.35,
            ),
          ),
        ],
      );
    } else if (_selectedTabIndex == 1) {
      return Text(
        'SI VAS A UNA INSTITUCIÓN PÚBLICA',
        style: GoogleFonts.inter(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF64748B),
          letterSpacing: 0.3,
        ),
      );
    } else {
      return Text(
        'SI VAS A UNA INSTITUCIÓN PRIVADA',
        style: GoogleFonts.inter(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF64748B),
          letterSpacing: 0.3,
        ),
      );
    }
  }

  Widget _buildRequirementsCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 16,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(children: _buildItemsForTab()),
    );
  }

  List<Widget> _buildItemsForTab() {
    if (_selectedTabIndex == 0) {
      return [
        _buildRequirementItem(
          icon: AppAssets.icUsuario,
          title: 'Edad',
          description: 'Tener entre 18 y 65 años.',
        ),
        _buildRequirementItem(
          icon: AppAssets.icBascula,
          title: 'Peso',
          description: 'Mayor a 50 kg.',
        ),
        _buildRequirementItem(
          icon: AppAssets.icReloj,
          title: 'Ayuno',
          description: 'De 4 a 8 horas. Evita grasas y lácteos la noche anterior y en la mañana de la donación. Puedes tomar agua, jugos o café sin leche antes de ir.',
        ),
        _buildRequirementItem(
          icon: AppAssets.icCorazon,
          title: 'Salud',
          description: 'Sentirte bien: sin gripe, tos, diarrea o infecciones recientes, ni haber tomado medicamentos en los últimos 5 días.',
        ),
        _buildRequirementItem(
          icon: AppAssets.icEstiloV,
          title: 'Estilo de vida',
          description: 'Sin alcohol en las últimas 72 horas. Tatuajes, perforaciones o micropigmentación con más de 12 meses de antigüedad.',
        ),
      ];
    } else if (_selectedTabIndex == 1) {
      return [
        _buildRequirementItem(
          icon: AppAssets.icTarjetaId,
          title: 'Identificación oficial',
          description:
              'Vigente y en original (INE o pasaporte). No se aceptan copias.',
        ),
        _buildRequirementItem(
          icon: AppAssets.icDocFirmado,
          title: 'Formatos',
          description: 'El hospital te dará el cuestionario médico y la hoja de consentimiento al llegar. No necesitas llevar formatos impresos.',
        ),
        _buildRequirementItem(
          icon: AppAssets.icCita,
          title: 'Cita o fila',
          description: 'Si el hospital tiene sistema digital (como el IMSS), lleva el comprobante de cita en tu celular. Si no hay citas, llega muy temprano: las fichas suelen ser limitadas.',
        ),
        _buildRequirementItem(
          icon: AppAssets.icUsuarioArchivo,
          title: 'Datos del paciente',
          description: 'Si vas a un hospital, lleva el nombre completo del paciente, su número de cama y el servicio o piso donde está internado.',
        ),
      ];
    } else {
      return [
        _buildRequirementItem(
          icon: AppAssets.icTarjetaId,
          title: 'Identificación oficial',
          description: 'Vigente y en original (INE o pasaporte).',
        ),
        _buildRequirementItem(
          icon: AppAssets.icDocFirmado,
          title: 'Formatos',
          description: 'Te los entrega el hospital al llegar; a veces se llenan de forma digital en una tableta.',
        ),
        _buildRequirementItem(
          icon: AppAssets.icCita,
          title: 'Cita previa',
          description: 'Es obligatoria: agéndala por teléfono o en la página del hospital. Lleva la confirmación o el código que te envíen al celular.',
        ),
        _buildRequirementItem(
          icon: AppAssets.icEstacionamiento,
          title: 'Estacionamiento',
          description: 'Guarda tu boleto: la mayoría de los hospitales privados lo sellan para que sea gratis para donadores.',
        ),
        _buildRequirementItem(
          icon: AppAssets.icUsuarioArchivo,
          title: 'Datos del paciente',
          description: 'Si vas a un hospital, ten a la mano el nombre completo del paciente y el número de habitación.',
        ),
      ];
    }
  }

  Widget _buildRequirementItem({
    required String icon,
    required String title,
    required String description,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icono en caja rosa suave
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Center(
              child: Image.asset(
                icon,
                width: 22,
                height: 22,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(width: 14),

          // Título y descripción
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  description,
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
    );
  }
}
