import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/constants/app_assets.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../../../core/widgets/donavida_sliver_header.dart';
import '../../data/models/user_model.dart';
import 'select_account_screen.dart';

// Front/Back: Pantalla de perfil y actualización de datos del donante
class UserDataScreen extends StatefulWidget {
  // Backend: Modelo del usuario autenticado
  final UserModel? user;

  const UserDataScreen({super.key, this.user});

  @override
  State<UserDataScreen> createState() => _UserDataScreenState();
}

class _UserDataScreenState extends State<UserDataScreen> {
  final _apiClient = ApiClient();

  late final TextEditingController _nameController;
  late final TextEditingController _birthDateController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;

  // Sin valores inventados: si el usuario no tiene sexo/colonia, quedan
  // en "Selecciona" (null); si no tiene tipo de sangre, queda sin elegir.
  String? _selectedGender;
  String? _selectedColonia;
  String _selectedBloodType = '';

  // Backend: Perfil real del servidor (lo usa la cabecera para
  // "Donante desde {año}") y marca de que ya se aplicó: el respaldo
  // local no debe pisarlo después.
  UserModel? _perfil;
  bool _perfilCargado = false;

  // Front: Bloqueo de campos para evitar ediciones accidentales
  bool _isBloodTypeLocked = true;
  bool _isNameLocked = true;

  bool _isSaving = false;

  final List<String> _genderOptions = ['Mujer', 'Hombre', 'Otro'];
  final List<String> _coloniaOptions = [
    'Centro',
    'Reforma',
    'San Felipe',
    'Cinco Señores',
    'Otra',
  ];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.user?.nombre ?? '');
    _birthDateController = TextEditingController(
      text: _fechaADisplay(widget.user?.fechaNacimiento),
    );
    _phoneController = TextEditingController(text: widget.user?.telefono ?? '');
    _emailController = TextEditingController(text: widget.user?.correo ?? '');

    // Sin valores inventados: solo se toma lo que el usuario ya tiene
    // guardado; lo demás queda en "Selecciona" / sin elegir.
    _selectedGender = (widget.user?.sexo != null &&
            _genderOptions.contains(widget.user!.sexo))
        ? widget.user!.sexo
        : null;
    _selectedColonia = (widget.user?.colonia != null &&
            _coloniaOptions.contains(widget.user!.colonia))
        ? widget.user!.colonia
        : null;
    _selectedBloodType = (widget.user != null &&
            _tiposSangreValidos.contains(widget.user!.tipoSangre))
        ? widget.user!.tipoSangre
        : '';

    // Backend: Cargar datos guardados del usuario si no se pasaron por constructor
    _loadUserSession();
    // Backend: Cargar el perfil real del servidor (es el que manda).
    _cargarPerfilServidor();
  }

  // Backend: Cargar datos guardados de la sesión para sincronizar el perfil
  // (respaldo cuando el servidor no responde). No pisa el perfil del
  // servidor si este ya se aplicó.
  Future<void> _loadUserSession() async {
    if (widget.user != null) return;
    try {
      final userJson = await SecureStorageService().getUserData();
      if (userJson != null && userJson.isNotEmpty) {
        final user = UserModel.fromJson(jsonDecode(userJson));
        if (_perfilCargado) return;
        if (mounted) {
          setState(() {
            if (_nameController.text.isEmpty && user.nombre.isNotEmpty) {
              _nameController.text = user.nombre;
            }
            if (_birthDateController.text.isEmpty &&
                user.fechaNacimiento != null &&
                user.fechaNacimiento!.isNotEmpty) {
              _birthDateController.text =
                  _fechaADisplay(user.fechaNacimiento);
            }
            if (_emailController.text.isEmpty && user.correo.isNotEmpty) {
              _emailController.text = user.correo;
            }
            if (_phoneController.text.isEmpty && user.telefono != null) {
              _phoneController.text = user.telefono!;
            }
            if (user.tipoSangre.isNotEmpty &&
                _tiposSangreValidos.contains(user.tipoSangre)) {
              _selectedBloodType = user.tipoSangre;
            }
            if (user.sexo != null && _genderOptions.contains(user.sexo)) {
              _selectedGender = user.sexo!;
            }
            if (user.colonia != null &&
                _coloniaOptions.contains(user.colonia)) {
              _selectedColonia = user.colonia!;
            }
          });
        }
      }
    } catch (_) {}
  }

  // Backend: Meses abreviados en español, como los devuelve el backend
  // en fecha_nacimiento ("15 ene 1990").
  static const Map<String, String> _mesesEspanol = {
    'ene': '01',
    'feb': '02',
    'mar': '03',
    'abr': '04',
    'may': '05',
    'jun': '06',
    'jul': '07',
    'ago': '08',
    'sep': '09',
    'oct': '10',
    'nov': '11',
    'dic': '12',
  };

  static const List<String> _tiposSangreValidos = [
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-',
  ];

  /// Convierte una fecha del backend/local a dd/mm/aaaa para mostrarla:
  /// acepta ISO ("1990-01-15"), texto del backend ("15 ene 1990") y
  /// dd/mm/aaaa (pasa tal cual).
  String _fechaADisplay(String? raw) {
    if (raw == null) return '';
    final value = raw.trim();
    if (value.isEmpty) return '';
    if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) {
      final parts = value.split('-');
      return '${parts[2]}/${parts[1]}/${parts[0]}';
    }
    final match =
        RegExp(r'^(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{4})$').firstMatch(value);
    if (match != null) {
      final mes = _mesesEspanol[match.group(2)!.toLowerCase()];
      if (mes != null) {
        final dia = match.group(1)!.padLeft(2, '0');
        return '$dia/$mes/${match.group(3)}';
      }
    }
    return value;
  }

  /// Convierte dd/mm/aaaa (lo que muestra el campo) a ISO yyyy-MM-dd
  /// para mandar al backend.
  String _fechaAIso(String display) {
    final parts = display.split('/');
    final dia = parts[0].padLeft(2, '0');
    final mes = parts[1].padLeft(2, '0');
    return '${parts[2]}-$mes-$dia';
  }

  /// Construye el UserModel desde el JSON del perfil del backend.
  /// NO usar UserModel.fromJson aquí: el perfil trae fecha_nacimiento
  /// ("15 ene 1990") y fecha_nacimiento_iso ("1990-01-15"), y fromJson
  /// lee la primera, que el campo dd/mm/aaaa no entiende. Se usa la ISO
  /// (initState/_fechaADisplay la convierten a dd/mm/aaaa).
  UserModel _perfilDesdeJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      nombre: json['nombre'] as String? ?? '',
      correo: json['correo'] as String? ?? '',
      tipoSangre: json['tipo_sangre'] as String? ?? '',
      fechaNacimiento: json['fecha_nacimiento_iso'] as String?,
      sexo: json['sexo'] as String?,
      telefono: json['telefono'] as String?,
      colonia: json['colonia'] as String?,
      fechaRegistro: json['fecha_registro']?.toString(),
      token: json['token'] as String?,
    );
  }

  /// Aplica un perfil al formulario (el del servidor manda: los nulos
  /// quedan vacíos o en "Selecciona", nunca se inventan valores).
  void _aplicarPerfil(UserModel p) {
    _nameController.text = p.nombre;
    _emailController.text = p.correo;
    _phoneController.text = p.telefono ?? '';
    _birthDateController.text = _fechaADisplay(p.fechaNacimiento);
    _selectedGender =
        (p.sexo != null && _genderOptions.contains(p.sexo)) ? p.sexo : null;
    _selectedColonia =
        (p.colonia != null && _coloniaOptions.contains(p.colonia))
            ? p.colonia
            : null;
    _selectedBloodType =
        _tiposSangreValidos.contains(p.tipoSangre) ? p.tipoSangre : '';
    _perfil = p;
  }

  // Backend: Cargar el perfil real del servidor (GET /api/auth/profile)
  // al abrir la pantalla. El servidor manda: los nulos quedan vacíos o
  // en "Selecciona". Si falla (sin red), quedan los datos guardados en
  // el dispositivo y se avisa.
  Future<void> _cargarPerfilServidor() async {
    try {
      final perfilJson = await _apiClient.getProfile();
      final perfil = _perfilDesdeJson(perfilJson);
      // Guardar el perfil del servidor en local (sin tocar el token:
      // el perfil no trae token salvo cambio de correo).
      final tokenActual = await SecureStorageService().getToken();
      final paraGuardar = UserModel(
        id: perfil.id,
        nombre: perfil.nombre,
        correo: perfil.correo,
        tipoSangre: perfil.tipoSangre,
        fechaNacimiento: perfil.fechaNacimiento,
        sexo: perfil.sexo,
        telefono: perfil.telefono,
        colonia: perfil.colonia,
        fechaRegistro: perfil.fechaRegistro,
        token: perfil.token ?? tokenActual,
      );
      await SecureStorageService().saveUserData(
        jsonEncode(paraGuardar.toJson()),
      );
      if (!mounted) return;
      setState(() {
        _perfilCargado = true;
        _aplicarPerfil(paraGuardar);
      });
    } catch (_) {
      if (!mounted) return;
      final hayDatosLocales = _nameController.text.trim().isNotEmpty ||
          _emailController.text.trim().isNotEmpty;
      _showFeedback(
        hayDatosLocales
            ? 'No se pudo cargar tu perfil del servidor. Se muestran los datos guardados en este dispositivo.'
            : 'No se pudo cargar tu perfil. Revisa tu conexión a internet.',
        isError: true,
      );
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _birthDateController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  // Front: Obtener iniciales del nombre para el avatar
  String get _avatarInitials {
    final name = _nameController.text.trim();
    if (name.isEmpty) return '--';
    final parts = name.split(RegExp(r'\s+'));
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '--';
  }

  // Front: Selector de fecha formateado a dd/mm/aaaa
  Future<void> _pickBirthDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().subtract(const Duration(days: 365 * 20)),
      firstDate: DateTime(1930),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      final day = picked.day.toString().padLeft(2, '0');
      final month = picked.month.toString().padLeft(2, '0');
      final year = picked.year.toString();
      setState(() {
        _birthDateController.text = '$day/$month/$year';
      });
    }
  }

  void _showFeedback(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: Colors.white,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: GoogleFonts.inter(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: isError
            ? const Color(0xFFE11D48)
            : const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  // Backend: Validar y enviar datos actualizados del donante a PUT /donantes/perfil
  Future<void> _saveChanges() async {
    if (_isSaving) return;

    final name = _nameController.text.trim();
    final birthDateStr = _birthDateController.text.trim();
    final phone = _phoneController.text.trim();

    // Front: Validación de nombre completo
    if (name.isEmpty) {
      _showFeedback('Por favor ingresa tu nombre completo', isError: true);
      return;
    }
    if (name.length < 3) {
      _showFeedback(
        'El nombre debe tener al menos 3 caracteres',
        isError: true,
      );
      return;
    }

    // Front: Validación de fecha de nacimiento dd/mm/aaaa y mayoría de edad
    if (birthDateStr.isEmpty) {
      _showFeedback(
        'Por favor selecciona tu fecha de nacimiento',
        isError: true,
      );
      return;
    }
    final dateParts = birthDateStr.split('/');
    if (dateParts.length != 3) {
      _showFeedback('El formato de fecha debe ser dd/mm/aaaa', isError: true);
      return;
    }
    final day = int.tryParse(dateParts[0]);
    final month = int.tryParse(dateParts[1]);
    final year = int.tryParse(dateParts[2]);
    if (day == null || month == null || year == null) {
      _showFeedback('La fecha de nacimiento no es válida', isError: true);
      return;
    }
    try {
      final birthDate = DateTime(year, month, day);
      final now = DateTime.now();
      var age = now.year - birthDate.year;
      if (now.month < birthDate.month ||
          (now.month == birthDate.month && now.day < birthDate.day)) {
        age--;
      }
      if (age < 18) {
        _showFeedback(
          'Debes tener al menos 18 años para ser donante',
          isError: true,
        );
        return;
      }
      if (age > 65) {
        _showFeedback(
          'La edad máxima para donar sangre es de 65 años',
          isError: true,
        );
        return;
      }
    } catch (_) {
      _showFeedback(
        'La fecha de nacimiento ingresada no es válida',
        isError: true,
      );
      return;
    }

    // Front: Validación de teléfono (10 dígitos)
    final cleanPhone = phone.replaceAll(RegExp(r'\D'), '');
    if (cleanPhone.isEmpty) {
      _showFeedback('Por favor ingresa tu número de teléfono', isError: true);
      return;
    }
    if (cleanPhone.length != 10) {
      _showFeedback(
        'El teléfono debe tener exactamente 10 dígitos',
        isError: true,
      );
      return;
    }

    // Front: Validación de colonia
    if (_selectedColonia == null || _selectedColonia!.trim().isEmpty) {
      _showFeedback('Por favor selecciona tu colonia', isError: true);
      return;
    }

    // Front: Validación de tipo de sangre
    if (_selectedBloodType.trim().isEmpty) {
      _showFeedback('Por favor selecciona tu tipo de sangre', isError: true);
      return;
    }

    setState(() => _isSaving = true);

    try {
      // Backend: Guardar en el servidor (PUT /donantes/perfil). El
      // correo no se manda: está bloqueado en la UI. El sexo solo se
      // manda si el usuario eligió uno (en "Selecciona", el servidor
      // lo deja como está). La fecha va en ISO (yyyy-MM-dd).
      final fechaIso = _fechaAIso(birthDateStr);
      final perfilJson = await _apiClient.updateProfile({
        'nombre': name,
        'fecha_nacimiento': fechaIso,
        'telefono': cleanPhone,
        'colonia': _selectedColonia,
        'tipo_sangre': _selectedBloodType,
        if (_selectedGender != null && _selectedGender!.isNotEmpty)
          'sexo': _selectedGender,
      });

      // Backend: Guardar en local el perfil DEVUELTO por el servidor
      // (id real del servidor) sin perder el token actual: el
      // PUT solo trae token nuevo si cambia el correo, y la app no lo
      // permite cambiar.
      final perfil = _perfilDesdeJson(perfilJson);
      final tokenActual = await SecureStorageService().getToken();
      final actualizado = UserModel(
        id: perfil.id,
        nombre: perfil.nombre,
        correo: perfil.correo,
        tipoSangre: perfil.tipoSangre,
        fechaNacimiento: perfil.fechaNacimiento,
        sexo: perfil.sexo,
        telefono: perfil.telefono,
        colonia: perfil.colonia,
        fechaRegistro: perfil.fechaRegistro,
        token: perfil.token ?? tokenActual,
      );
      await SecureStorageService().saveUserData(
        jsonEncode(actualizado.toJson()),
      );

      if (mounted) {
        setState(() {
          _perfilCargado = true;
          _aplicarPerfil(actualizado);
          _isBloodTypeLocked = true;
          _isNameLocked = true;
        });
        _showFeedback('Cambios guardados correctamente', isError: false);
      }
    } on ApiException catch (e) {
      if (mounted) {
        _showFeedback(e.message, isError: true);
      }
    } catch (_) {
      if (mounted) {
        _showFeedback('Error al guardar cambios. Intenta de nuevo.',
            isError: true);
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  // Backend: Cerrar sesión en POST /auth/logout, limpiar tokens en storage y redirigir
  Future<void> _handleLogout() async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          '¿Cerrar sesión?',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w700,
            fontSize: 18,
            color: const Color(0xFF0F172A),
          ),
        ),
        content: Text(
          '¿Estás seguro de que deseas salir de tu cuenta?',
          style: GoogleFonts.inter(
            fontSize: 14,
            color: const Color(0xFF64748B),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(
              'Cancelar',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w600,
                color: const Color(0xFF64748B),
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE11D48),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              elevation: 0,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(
              'Cerrar sesión',
              style: GoogleFonts.inter(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );

    if (shouldLogout == true && mounted) {
      // Backend: Llamar a ApiConstants.logout y limpiar almacenamiento local
      await SecureStorageService().clearSession();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const SelectAccountScreen()),
          (route) => false,
        );
      }
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

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: [
          DonavidaSliverHeader(
            title: 'Datos del usuario',
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
                    children: [
                      const SizedBox(height: 16),
                      _buildUserHeaderCard(),
                      const SizedBox(height: 16),
                      _buildPersonalInfoCard(),
                      const SizedBox(height: 16),
                      _buildBloodTypeCard(),
                      const SizedBox(height: 24),
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
                          onPressed: _isSaving ? null : _saveChanges,
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
                              : Text(
                                  'Guardar cambios',
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      // Front: Botón de cerrar sesión con diálogo de confirmación
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFE11D48),
                            side: const BorderSide(
                              color: Color(0xFFFECDD3),
                              width: 1.4,
                            ),
                            backgroundColor: const Color(0xFFFFF1F2),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: _handleLogout,
                          icon: const Icon(Icons.logout_rounded, size: 20),
                          label: Text(
                            'Cerrar sesión',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
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

  // Front: Cabecera con avatar, iniciales y badge de grupo sanguíneo
  Widget _buildUserHeaderCard() {
    final displayName = _nameController.text.trim().isNotEmpty
        ? _nameController.text.trim()
        : 'Nombre del donante';

    final fechaRegistro = _perfil?.fechaRegistro ?? widget.user?.fechaRegistro;
    final registerText = fechaRegistro != null
        ? 'Donante desde $fechaRegistro'
        : 'Donante registrado';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
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
      child: Row(
        children: [
          // Avatar con lápiz de edición
          Stack(
            children: [
              Container(
                width: 58,
                height: 58,
                decoration: const BoxDecoration(
                  color: Color(0xFFA50E27),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    _avatarInitials,
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.12),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.edit_outlined,
                    size: 13,
                    color: Color(0xFFC8102E),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 14),

          // Nombre y subtítulo
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  style: GoogleFonts.inter(
                    fontSize: 16.5,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  registerText,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),

          // Badge Tipo de sangre
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Text(
                  _selectedBloodType,
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
                Text(
                  'Sangre',
                  style: GoogleFonts.inter(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Front: Tarjeta de información personal
  Widget _buildPersonalInfoCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Información personal',
            style: GoogleFonts.inter(
              fontSize: 16.5,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 16),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(children: [_buildFieldLabel('Nombre completo')]),
              GestureDetector(
                onTap: () {
                  setState(() {
                    _isNameLocked = !_isNameLocked;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _isNameLocked
                        ? AppColors.primarySoft
                        : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _isNameLocked
                          ? AppColors.primary.withOpacity(0.2)
                          : const Color(0xFFCBD5E1),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isNameLocked
                            ? Icons.edit_outlined
                            : Icons.lock_outline_rounded,
                        size: 13,
                        color: _isNameLocked
                            ? AppColors.primary
                            : const Color(0xFF475569),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _isNameLocked ? 'Editar' : 'Bloquear',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: _isNameLocked
                              ? AppColors.primary
                              : const Color(0xFF475569),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _nameController,
            readOnly: _isNameLocked,
            onTap: _isNameLocked
                ? () {
                    _showFeedback(
                      'Presiona "Editar" para modificar tu nombre',
                      isError: true,
                    );
                  }
                : null,
            onChanged: (_) => setState(() {}),
            style: GoogleFonts.inter(
              fontSize: 14,
              color: _isNameLocked
                  ? const Color(0xFF64748B)
                  : const Color(0xFF0F172A),
              fontWeight: FontWeight.w500,
            ),
            inputFormatters: [
              FilteringTextInputFormatter.allow(
                RegExp(r'[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]'),
              ),
            ],
            decoration: _inputDecoration(
              hint: 'Ingresa tu nombre completo',
              isLocked: _isNameLocked,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Fecha de nacimiento'),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _birthDateController,
                      readOnly: true,
                      onTap: _pickBirthDate,
                      decoration: _inputDecoration(
                        hint: 'dd/mm/aaaa',
                        suffixIcon: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Image.asset(
                            AppAssets.icCalendario,
                            width: 18,
                            height: 18,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Sexo'),
                    const SizedBox(height: 6),
                    _buildDropdown(
                      value: _selectedGender,
                      items: _genderOptions,
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedGender = val);
                      },
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Define tu tiempo de espera',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: const Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Teléfono'),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(10),
                      ],
                      decoration: _inputDecoration(hint: '10 dígitos'),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Colonia'),
                    const SizedBox(height: 6),
                    _buildDropdown(
                      value: _selectedColonia,
                      items: _coloniaOptions,
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedColonia = val);
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _buildFieldLabel('Correo electrónico'),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _emailController,
            readOnly: true,
            decoration: _inputDecoration(
              hint: 'correo@ejemplo.com',
              suffixIcon: Padding(
                padding: const EdgeInsets.all(12.0),
                child: Image.asset(
                  AppAssets.icCandado,
                  width: 18,
                  height: 18,
                  color: const Color(0xFF94A3B8),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBloodTypeCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    'Tipo de sangre',
                    style: GoogleFonts.inter(
                      fontSize: 16.5,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
              ),
              // Front: Botón para editar / desbloquear tipo de sangre
              GestureDetector(
                onTap: () {
                  setState(() {
                    _isBloodTypeLocked = !_isBloodTypeLocked;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: _isBloodTypeLocked
                        ? AppColors.primarySoft
                        : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _isBloodTypeLocked
                          ? AppColors.primary.withOpacity(0.2)
                          : const Color(0xFFCBD5E1),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isBloodTypeLocked
                            ? Icons.edit_outlined
                            : Icons.lock_outline_rounded,
                        size: 14,
                        color: _isBloodTypeLocked
                            ? AppColors.primary
                            : const Color(0xFF475569),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        _isBloodTypeLocked ? 'Editar' : 'Bloquear',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: _isBloodTypeLocked
                              ? AppColors.primary
                              : const Color(0xFF475569),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Fila 1: A+ | A- | B+ | B-
          Row(
            children: [
              Expanded(child: _buildBloodOption('A+')),
              const SizedBox(width: 8),
              Expanded(child: _buildBloodOption('A-')),
              const SizedBox(width: 8),
              Expanded(child: _buildBloodOption('B+')),
              const SizedBox(width: 8),
              Expanded(child: _buildBloodOption('B-')),
            ],
          ),
          const SizedBox(height: 10),

          // Fila 2: AB+ | AB- | O+ | O-
          Row(
            children: [
              Expanded(child: _buildBloodOption('AB+')),
              const SizedBox(width: 8),
              Expanded(child: _buildBloodOption('AB-')),
              const SizedBox(width: 8),
              Expanded(child: _buildBloodOption('O+')),
              const SizedBox(width: 8),
              Expanded(child: _buildBloodOption('O-')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBloodOption(String type) {
    final isSelected = _selectedBloodType == type;

    return GestureDetector(
      onTap: () {
        if (_isBloodTypeLocked) {
          _showFeedback(
            'Presiona "Editar" para cambiar el tipo de sangre',
            isError: true,
          );
          return;
        }
        setState(() {
          _selectedBloodType = type;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        height: 42,
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primarySoft
              : (_isBloodTypeLocked ? const Color(0xFFF8FAFC) : Colors.white),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFE2E8F0),
            width: isSelected ? 1.6 : 1.2,
          ),
        ),
        child: Center(
          child: Text(
            type,
            style: GoogleFonts.inter(
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
              color: isSelected
                  ? AppColors.primary
                  : (_isBloodTypeLocked
                        ? const Color(0xFF94A3B8)
                        : const Color(0xFF0F172A)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Text(
      label,
      style: GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: const Color(0xFF0F172A),
      ),
    );
  }

  InputDecoration _inputDecoration({
    required String hint,
    Widget? suffixIcon,
    bool isLocked = false,
  }) {
    return InputDecoration(
      hintText: hint,
      filled: isLocked,
      fillColor: isLocked ? const Color(0xFFF8FAFC) : Colors.white,
      hintStyle: GoogleFonts.inter(
        fontSize: 14,
        color: const Color(0xFF94A3B8),
        fontWeight: FontWeight.w400,
      ),
      suffixIcon: suffixIcon,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: isLocked ? const Color(0xFFCBD5E1) : AppColors.primary,
          width: isLocked ? 1.0 : 1.5,
        ),
      ),
    );
  }

  Widget _buildDropdown({
    required String? value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          hint: Text(
            'Selecciona',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              color: const Color(0xFF94A3B8),
            ),
          ),
          isExpanded: true,
          icon: const Icon(
            Icons.keyboard_arrow_down_rounded,
            color: Color(0xFF64748B),
            size: 20,
          ),
          borderRadius: BorderRadius.circular(14),
          items: items.map((item) {
            return DropdownMenuItem<String>(
              value: item,
              child: Text(
                item,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF0F172A),
                ),
              ),
            );
          }).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }
}
