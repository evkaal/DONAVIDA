package handlers

import (
	"database/sql"
	"donavida-backend/internal/database"
	"donavida-backend/internal/email"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// ---------------------------------------------------------------------------
// Endpoints de la app móvil DONAVIDA (Flutter, rama feature/frontend-movil).
//
// Arquitectura v2 (2026-11-27): la identidad móvil vive en la tabla
// `usuarios_moviles` (migración 000005) con el rol 'usuario_movil'.
// NO existe tabla de donantes separada: la migración 000004, que la
// creaba, NUNCA se aplicó y NO debe aplicarse.
//
// La app define sus rutas en lib/core/constants/api_constants.dart con
// baseUrl .../api: /auth/login, /auth/register, /auth/profile,
// /auth/logout, /donantes/perfil, /donaciones, /donantes/aptitud,
// /instituciones y /notificaciones. Los handlers de este archivo atienden
// esas rutas (las de /api/login y /api/notificaciones ya existían y se
// reutilizan: /api/auth/login es un alias de Login, que busca primero en
// `usuarios` y si no, en `usuarios_moviles`).
//
// Contrato JSON: los campos usan los mismos nombres que los modelos Dart
// (UserModel, DonationRecordModel, DonorEligibilityModel, InstitutionModel,
// NotificationItem): "correo" (no "email"), "tipo_sangre", "fecha_nacimiento"
// ("15 ene 1990", como la escribe el selector de fecha de la app),
// "tipo_donacion" ("Sangre total" | "Plaquetas" | "Plasma"),
// "institucion" (nombre) o "institucion_id".
// ---------------------------------------------------------------------------

const (
	rolUsuarioMovil = "usuario_movil"
	rolAdminMovil   = "admin_movil"
)

// REGLA PROVISIONAL de aptitud (a confirmar por el equipo): intervalo
// mínimo en días entre dos donaciones del mismo tipo. La app muestra
// "Apto" o "Faltan N días" a partir de la última donación registrada.
// Si el equipo decide otra regla (p. ej. 90 días para sangre total o
// distinto por sexo), solo cambia este mapa.
var intervalosAptitudDias = map[string]int{
	"Sangre total":  120, // 4 meses
	"Plaquetas":     15,  // 2 semanas
	"Plasma fresco": 15,  // 2 semanas
}

var mesesEspanol = map[string]time.Month{
	"ene": time.January, "feb": time.February, "mar": time.March,
	"abr": time.April, "may": time.May, "jun": time.June,
	"jul": time.July, "ago": time.August, "sep": time.September,
	"oct": time.October, "nov": time.November, "dic": time.December,
}

var nombresMesEspanol = []string{
	"", "ene", "feb", "mar", "abr", "may", "jun",
	"jul", "ago", "sep", "oct", "nov", "dic",
}

// tiposSangreMovil son los 8 valores que acepta la columna
// usuarios_moviles.tipo_sangre (CHECK en la migración 000005) y que
// manda la app ('O+', 'A-', ...). Se guarda el texto tal cual, sin
// pasar por tipos_sangre: el registro móvil no hace lookup de catálogo.
var tiposSangreMovil = map[string]bool{
	"A+": true, "A-": true, "B+": true, "B-": true,
	"AB+": true, "AB-": true, "O+": true, "O-": true,
}

// tipoSangreMovilValido normaliza el tipo que manda la app (mayúsculas,
// sin espacios) y dice si es uno de los 8 válidos.
func tipoSangreMovilValido(s string) (string, bool) {
	s = strings.ToUpper(strings.TrimSpace(s))
	return s, tiposSangreMovil[s]
}

// resolveRolID busca el id de un rol por su nombre. Los ids de los roles
// nuevos ('usuario_movil', 'admin_movil') NO se fijan en código: dependen
// del orden en que se sembraron, así que siempre se resuelven por nombre.
func resolveRolID(nombre string) (int, error) {
	var id int
	err := database.DB.QueryRow(`SELECT id FROM roles WHERE nombre = $1`, nombre).Scan(&id)
	return id, err
}

// parseFechaMovil acepta los formatos que manda la app:
//   - ISO: "1990-01-15" (fecha_iso de RegistrarDonacion)
//   - Display: "15 ene 1990" (el selector de fecha de la app escribe el
//     mes abreviado en español)
//
// Devuelve la fecha a medianoche UTC.
func parseFechaMovil(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, fmt.Errorf("fecha vacía")
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t, nil
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
	}
	partes := strings.Fields(s)
	if len(partes) == 3 {
		dia, errDia := strconv.Atoi(partes[0])
		mes, okMes := mesesEspanol[strings.ToLower(partes[1])]
		anio, errAnio := strconv.Atoi(partes[2])
		if errDia == nil && okMes && errAnio == nil {
			return time.Date(anio, mes, dia, 0, 0, 0, 0, time.UTC), nil
		}
	}
	return time.Time{}, fmt.Errorf("fecha no válida: %s (usa AAAA-MM-DD o '15 ene 1990')", s)
}

// formatFechaMovil escribe una fecha como la muestra la app:
// "28 jul 2026" (día con dos dígitos, mes abreviado en español).
func formatFechaMovil(t time.Time) string {
	return fmt.Sprintf("%02d %s %d", t.Day(), nombresMesEspanol[int(t.Month())], t.Year())
}

// fechaSolo deja un time.Time a medianoche UTC (comparaciones por día).
func fechaSolo(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

// sexoValido normaliza el sexo que manda la app a su forma canónica.
func sexoValido(s string) (string, bool) {
	switch normalizarNombre(s) {
	case "mujer":
		return "Mujer", true
	case "hombre":
		return "Hombre", true
	case "otro":
		return "Otro", true
	}
	return "", false
}

// distanciaKm calcula la distancia en línea recta entre dos puntos
// (fórmula de Haversine). La usa el mapa de la app (?lat= &lon=).
func distanciaKm(lat1, lon1, lat2, lon2 float64) float64 {
	const radioTierraKm = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*math.Sin(dLon/2)*math.Sin(dLon/2)
	return 2 * radioTierraKm * math.Asin(math.Sqrt(a))
}

// zonaMexico es la zona horaria de Oaxaca para calcular si un banco está
// abierto. Si el sistema no tiene la base tzdata, cae a UTC-6 fijo.
func zonaMexico() *time.Location {
	if loc, err := time.LoadLocation("America/Mexico_City"); err == nil {
		return loc
	}
	return time.FixedZone("CST", -6*3600)
}

// ---------------------------------------------------------------------------
// Perfil del usuario móvil (modelo UserModel de la app).
// ---------------------------------------------------------------------------

type usuarioMovilPerfil struct {
	ID                 int     `json:"id"`
	Nombre             string  `json:"nombre"`
	Correo             string  `json:"correo"`
	TipoSangre         string  `json:"tipo_sangre"`
	FechaNacimiento    *string `json:"fecha_nacimiento"`
	FechaNacimientoISO *string `json:"fecha_nacimiento_iso"`
	Sexo               *string `json:"sexo"`
	Telefono           *string `json:"telefono"`
	Colonia            *string `json:"colonia"`
	FechaRegistro      string  `json:"fecha_registro"`
	RolID              int     `json:"rol_id"`
	Rol                string  `json:"rol"`
	Token              string  `json:"token,omitempty"`
}

func textoONulo(s sql.NullString) *string {
	if s.Valid && strings.TrimSpace(s.String) != "" {
		v := s.String
		return &v
	}
	return nil
}

// cargarPerfilMovil lee la fila de `usuarios_moviles` (con el nombre del
// rol). El tipo de sangre y la colonia son texto directo en esa tabla,
// no llaves a catálogos.
func cargarPerfilMovil(usuarioMovilID int) (*usuarioMovilPerfil, error) {
	var p usuarioMovilPerfil
	var fechaNac sql.NullTime
	var sexo, telefono, colonia sql.NullString
	var creado time.Time
	err := database.DB.QueryRow(`
		SELECT um.id, um.nombre, um.correo, um.tipo_sangre,
		       um.fecha_nacimiento, um.sexo, um.telefono, um.colonia,
		       um.rol_id, r.nombre, um.created_at
		FROM usuarios_moviles um
		LEFT JOIN roles r ON r.id = um.rol_id
		WHERE um.id = $1`, usuarioMovilID).Scan(
		&p.ID, &p.Nombre, &p.Correo, &p.TipoSangre,
		&fechaNac, &sexo, &telefono, &colonia,
		&p.RolID, &p.Rol, &creado)
	if err != nil {
		return nil, err
	}
	if fechaNac.Valid {
		f := formatFechaMovil(fechaNac.Time)
		p.FechaNacimiento = &f
		iso := fechaNac.Time.Format("2006-01-02")
		p.FechaNacimientoISO = &iso
	}
	p.Sexo = textoONulo(sexo)
	p.Telefono = textoONulo(telefono)
	p.Colonia = textoONulo(colonia)
	p.FechaRegistro = fmt.Sprintf("%d", creado.Year())
	return &p, nil
}

// sesionMovilExige resuelve la sesión y exige que sea de un usuario
// móvil (rol 'usuario_movil'). Devuelve false con el error HTTP ya
// escrito si no hay sesión (401) o si es un usuario web (403): los
// endpoints de la app no sirven para cuentas de la web.
func sesionMovilExige(w http.ResponseWriter, r *http.Request) (sesionUsuario, bool) {
	sesion, ok := sesionDesdeToken(r)
	if !ok {
		http.Error(w, "Token de autorización requerido", http.StatusUnauthorized)
		return sesion, false
	}
	if !sesion.EsMovil {
		http.Error(w, "Este endpoint es solo para usuarios de la app móvil", http.StatusForbidden)
		return sesion, false
	}
	return sesion, true
}

// ---------------------------------------------------------------------------
// POST /api/auth/register — registro de usuario móvil desde la app.
// Inserta en `usuarios_moviles` con rol 'usuario_movil' (resuelto por
// nombre). Devuelve el perfil + token JWT (la app guarda la sesión
// y entra directo al menú). Misma política de contraseña que el registro
// web (mínimo 8, mayúscula, minúscula, número) y mismo correo de
// bienvenida (fire-and-forget, nunca incluye la contraseña).
// El correo se rechaza si ya existe en `usuarios_moviles` O en `usuarios`
// (las dos tablas comparten el espacio de correos: el login busca
// primero en la web).
// ---------------------------------------------------------------------------

func RegisterUsuarioMovil(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var input struct {
		Nombre          string `json:"nombre"`
		Correo          string `json:"correo"`
		Email           string `json:"email"`
		Password        string `json:"password"`
		TipoSangre      string `json:"tipo_sangre"`
		FechaNacimiento string `json:"fecha_nacimiento"`
		Sexo            string `json:"sexo"`
		Telefono        string `json:"telefono"`
		Colonia         string `json:"colonia"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Error al leer los datos: "+err.Error(), http.StatusBadRequest)
		return
	}

	correo := strings.TrimSpace(input.Correo)
	if correo == "" {
		correo = strings.TrimSpace(input.Email)
	}
	if correo == "" || !strings.Contains(correo, "@") {
		http.Error(w, "Se requiere un correo electrónico válido", http.StatusBadRequest)
		return
	}
	if contieneDigito(input.Nombre) {
		http.Error(w, "El nombre de usuario no puede contener números.", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(input.Nombre) == "" {
		http.Error(w, "El nombre es obligatorio", http.StatusBadRequest)
		return
	}
	if !contrasenaSegura(input.Password) {
		http.Error(w, "La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas y números.", http.StatusBadRequest)
		return
	}

	// El tipo de sangre es obligatorio en el registro móvil (la columna
	// es NOT NULL) y debe ser uno de los 8 valores del CHECK.
	tipoSangre, okSangre := tipoSangreMovilValido(input.TipoSangre)
	if !okSangre {
		http.Error(w, "Tipo sanguíneo no válido: usa uno de A+, A-, B+, B-, AB+, AB-, O+, O-", http.StatusBadRequest)
		return
	}

	// Campos opcionales del perfil (la app los pide después, en
	// "Datos del usuario", pero si ya vienen se guardan).
	var fechaNac interface{}
	if strings.TrimSpace(input.FechaNacimiento) != "" {
		f, err := parseFechaMovil(input.FechaNacimiento)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		fechaNac = f.Format("2006-01-02")
	}
	var sexo interface{}
	if strings.TrimSpace(input.Sexo) != "" {
		s, ok := sexoValido(input.Sexo)
		if !ok {
			http.Error(w, "Sexo no válido: usa Mujer, Hombre u Otro", http.StatusBadRequest)
			return
		}
		sexo = s
	}
	var telefono interface{}
	if strings.TrimSpace(input.Telefono) != "" {
		telefono = strings.TrimSpace(input.Telefono)
	}
	var colonia interface{}
	if strings.TrimSpace(input.Colonia) != "" {
		colonia = strings.TrimSpace(input.Colonia)
	}

	rolID, err := resolveRolID(rolUsuarioMovil)
	if err != nil {
		log.Printf("Rol '%s' no sembrado: %v", rolUsuarioMovil, err)
		http.Error(w, "Los roles de la app móvil no están sembrados en la base de datos. Aplica la migración 000005.", http.StatusInternalServerError)
		return
	}

	// El correo no puede existir en ninguna de las dos tablas de usuarios.
	for _, q := range []string{
		`SELECT COUNT(*) FROM usuarios_moviles WHERE correo = $1`,
		`SELECT COUNT(*) FROM usuarios WHERE email = $1`,
	} {
		var existe int
		if err := database.DB.QueryRow(q, correo).Scan(&existe); err != nil {
			http.Error(w, "Error al verificar el correo", http.StatusInternalServerError)
			return
		}
		if existe > 0 {
			http.Error(w, "Ya existe una cuenta con ese correo", http.StatusConflict)
			return
		}
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error al encriptar la contraseña", http.StatusInternalServerError)
		return
	}

	var nuevoID int
	err = database.DB.QueryRow(`
		INSERT INTO usuarios_moviles (nombre, correo, password_hash, tipo_sangre, fecha_nacimiento, sexo, telefono, colonia, rol_id, estado)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
		RETURNING id`,
		strings.TrimSpace(input.Nombre), correo, string(hashedPassword), tipoSangre,
		fechaNac, sexo, telefono, colonia, rolID).Scan(&nuevoID)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			http.Error(w, "Ya existe una cuenta con ese correo", http.StatusConflict)
			return
		}
		log.Printf("Error al registrar usuario móvil: %v", err)
		http.Error(w, "Error al registrar el usuario en la base de datos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Correo de bienvenida (mismo que el registro web, en goroutine).
	go func() {
		if err := email.SendBienvenida(correo, input.Nombre, ""); err != nil {
			log.Printf("No se pudo enviar el correo de bienvenida a %s: %v", correo, err)
		}
	}()

	// Token JWT para que la app entre directo (mismo formato que Login).
	expirationTime := time.Now().Add(24 * time.Hour)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
		Email: correo,
		RolID: rolID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Error al generar el token de acceso", http.StatusInternalServerError)
		return
	}

	perfil, err := cargarPerfilMovil(nuevoID)
	if err != nil {
		log.Printf("Usuario móvil %d creado pero no se pudo leer su perfil: %v", nuevoID, err)
		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"mensaje": "Usuario registrado con éxito",
			"token":   tokenString,
			"id":      nuevoID,
			"correo":  correo,
			"rol_id":  rolID,
			"rol":     rolUsuarioMovil,
		})
		return
	}
	perfil.Token = tokenString
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje": "Usuario registrado con éxito",
		"token":   tokenString,
		"usuario": perfil,
	})
}

// ---------------------------------------------------------------------------
// GET /api/auth/profile — perfil del usuario móvil de la sesión (modelo
// UserModel). La app lo usa para llenar "Datos del usuario" y el menú.
// ---------------------------------------------------------------------------

func GetPerfilMovil(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	sesion, ok := sesionMovilExige(w, r)
	if !ok {
		return
	}
	perfil, err := cargarPerfilMovil(sesion.ID)
	if err != nil {
		http.Error(w, "Usuario no encontrado", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, perfil)
}

// ---------------------------------------------------------------------------
// PUT /donantes/perfil — actualiza los datos del usuario móvil ("Datos
// del usuario" en la app). Solo el propio usuario. Solo se tocan los
// campos que vienen en el cuerpo. Si cambia el correo, se devuelve un
// token nuevo (el token viejo lleva el correo anterior) y se verifica
// que el correo nuevo no exista en `usuarios_moviles` ni en `usuarios`.
// ---------------------------------------------------------------------------

func ActualizarPerfilMovil(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	sesion, ok := sesionMovilExige(w, r)
	if !ok {
		return
	}

	var input struct {
		Nombre          *string `json:"nombre"`
		Correo          *string `json:"correo"`
		Email           *string `json:"email"`
		TipoSangre      *string `json:"tipo_sangre"`
		FechaNacimiento *string `json:"fecha_nacimiento"`
		Sexo            *string `json:"sexo"`
		Telefono        *string `json:"telefono"`
		Colonia         *string `json:"colonia"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Error al leer los datos: "+err.Error(), http.StatusBadRequest)
		return
	}

	nuevoCorreo := ""
	if input.Correo != nil {
		nuevoCorreo = strings.TrimSpace(*input.Correo)
	} else if input.Email != nil {
		nuevoCorreo = strings.TrimSpace(*input.Email)
	}
	if nuevoCorreo != "" && !strings.Contains(nuevoCorreo, "@") {
		http.Error(w, "Se requiere un correo electrónico válido", http.StatusBadRequest)
		return
	}
	if input.Nombre != nil {
		if strings.TrimSpace(*input.Nombre) == "" || contieneDigito(*input.Nombre) {
			http.Error(w, "El nombre de usuario no puede contener números.", http.StatusBadRequest)
			return
		}
	}
	var tipoSangre *string
	if input.TipoSangre != nil && strings.TrimSpace(*input.TipoSangre) != "" {
		v, ok := tipoSangreMovilValido(*input.TipoSangre)
		if !ok {
			http.Error(w, "Tipo sanguíneo no válido: usa uno de A+, A-, B+, B-, AB+, AB-, O+, O-", http.StatusBadRequest)
			return
		}
		tipoSangre = &v
	}
	var fechaNac *string
	if input.FechaNacimiento != nil && strings.TrimSpace(*input.FechaNacimiento) != "" {
		f, err := parseFechaMovil(*input.FechaNacimiento)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		v := f.Format("2006-01-02")
		fechaNac = &v
	}
	var sexo *string
	if input.Sexo != nil && strings.TrimSpace(*input.Sexo) != "" {
		s, ok := sexoValido(*input.Sexo)
		if !ok {
			http.Error(w, "Sexo no válido: usa Mujer, Hombre u Otro", http.StatusBadRequest)
			return
		}
		sexo = &s
	}

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Error al guardar los cambios", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	if input.Nombre != nil {
		if _, err := tx.Exec(`UPDATE usuarios_moviles SET nombre = $1 WHERE id = $2`,
			strings.TrimSpace(*input.Nombre), sesion.ID); err != nil {
			http.Error(w, "Error al guardar los cambios", http.StatusInternalServerError)
			return
		}
	}
	tokenNuevo := ""
	if nuevoCorreo != "" && nuevoCorreo != sesion.Email {
		// Unicidad en las dos tablas de usuarios.
		for _, q := range []struct {
			sql  string
			args []interface{}
		}{
			{`SELECT COUNT(*) FROM usuarios_moviles WHERE correo = $1 AND id <> $2`, []interface{}{nuevoCorreo, sesion.ID}},
			{`SELECT COUNT(*) FROM usuarios WHERE email = $1`, []interface{}{nuevoCorreo}},
		} {
			var existe int
			if err := tx.QueryRow(q.sql, q.args...).Scan(&existe); err != nil || existe > 0 {
				if err != nil {
					http.Error(w, "Error al verificar el correo", http.StatusInternalServerError)
					return
				}
				http.Error(w, "Ya existe una cuenta con ese correo", http.StatusConflict)
				return
			}
		}
		if _, err := tx.Exec(`UPDATE usuarios_moviles SET correo = $1 WHERE id = $2`,
			nuevoCorreo, sesion.ID); err != nil {
			http.Error(w, "Error al guardar los cambios", http.StatusInternalServerError)
			return
		}
		// Token nuevo con el correo nuevo (el viejo queda inválido porque
		// la sesión se resuelve por el correo del token).
		expirationTime := time.Now().Add(24 * time.Hour)
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
			Email: nuevoCorreo,
			RolID: sesion.RolID,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(expirationTime),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
			},
		})
		tokenNuevo, err = token.SignedString(jwtKey)
		if err != nil {
			http.Error(w, "Error al generar el token de acceso", http.StatusInternalServerError)
			return
		}
	}

	actualizaciones := []string{}
	args := []interface{}{}
	n := 1
	add := func(columna string, valor interface{}) {
		actualizaciones = append(actualizaciones, fmt.Sprintf("%s = $%d", columna, n))
		args = append(args, valor)
		n++
	}
	if tipoSangre != nil {
		add("tipo_sangre", *tipoSangre)
	}
	if fechaNac != nil {
		add("fecha_nacimiento", *fechaNac)
	}
	if sexo != nil {
		add("sexo", *sexo)
	}
	if input.Telefono != nil {
		add("telefono", strings.TrimSpace(*input.Telefono))
	}
	if input.Colonia != nil {
		add("colonia", strings.TrimSpace(*input.Colonia))
	}
	if len(actualizaciones) > 0 {
		args = append(args, sesion.ID)
		q := fmt.Sprintf(`UPDATE usuarios_moviles SET %s WHERE id = $%d`,
			strings.Join(actualizaciones, ", "), n)
		if _, err := tx.Exec(q, args...); err != nil {
			log.Printf("Error al actualizar usuario móvil %d: %v", sesion.ID, err)
			http.Error(w, "Error al guardar los cambios", http.StatusInternalServerError)
			return
		}
	}
	if err := tx.Commit(); err != nil {
		log.Printf("Error al confirmar perfil móvil: %v", err)
		http.Error(w, "Error al guardar los cambios", http.StatusInternalServerError)
		return
	}

	perfil, err := cargarPerfilMovil(sesion.ID)
	if err != nil {
		http.Error(w, "Usuario no encontrado", http.StatusNotFound)
		return
	}
	if tokenNuevo != "" {
		perfil.Token = tokenNuevo
	}
	writeJSON(w, http.StatusOK, perfil)
}

// ---------------------------------------------------------------------------
// Historial de donaciones (modelo DonationRecordModel de la app).
// ---------------------------------------------------------------------------

type donacionRegistro struct {
	ID               int     `json:"id"`
	Fecha            string  `json:"fecha"`
	TipoDonacion     string  `json:"tipo_donacion"`
	Institucion      string  `json:"institucion"`
	TieneComprobante bool    `json:"tiene_comprobante"`
	URLComprobante   *string `json:"url_comprobante"`
}

// componenteADonacion traduce el nombre del catálogo al que muestra la
// app: "Plasma fresco" se ve como "Plasma"; los demás, igual.
func componenteADonacion(componente string) string {
	if normalizarNombre(componente) == "plasma fresco" {
		return "Plasma"
	}
	return componente
}

// GET /api/donaciones — historial del usuario móvil de la sesión, de la
// más reciente a la más antigua.
func GetDonaciones(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	sesion, ok := sesionMovilExige(w, r)
	if !ok {
		return
	}
	lista := []donacionRegistro{}
	rows, err := database.DB.Query(`
		SELECT d.id, d.fecha, th.componente, i.nombre, COALESCE(d.comprobante, '')
		FROM donaciones d
		JOIN tipos_hemocomponente th ON th.id = d.tipo_hemocomponente_id
		JOIN instituciones i ON i.id = d.institucion_id
		WHERE d.usuario_movil_id = $1
		ORDER BY d.fecha DESC, d.id DESC`, sesion.ID)
	if err != nil {
		http.Error(w, "Error al obtener el historial de donaciones", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var reg donacionRegistro
		var fecha time.Time
		var componente, comprobante string
		if err := rows.Scan(&reg.ID, &fecha, &componente, &reg.Institucion, &comprobante); err != nil {
			continue
		}
		reg.Fecha = formatFechaMovil(fecha)
		reg.TipoDonacion = componenteADonacion(componente)
		if strings.TrimSpace(comprobante) != "" {
			reg.TieneComprobante = true
			v := comprobante
			reg.URLComprobante = &v
		}
		lista = append(lista, reg)
	}
	writeJSON(w, http.StatusOK, lista)
}

// POST /api/donaciones — registra una donación que el usuario móvil ya
// hizo (la app la registra como historial, no como inventario: NO
// descuenta stock ni crea unidades). El tipo de sangre es el del perfil
// del usuario móvil. No se valida aptitud aquí: la donación ya ocurrió.
// Crea además una notificación "Donación registrada" para el usuario
// móvil (columna usuario_movil_id de la migración 000006).
func RegistrarDonacion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	sesion, ok := sesionMovilExige(w, r)
	if !ok {
		return
	}
	perfil, err := cargarPerfilMovil(sesion.ID)
	if err != nil {
		http.Error(w, "Usuario no encontrado", http.StatusNotFound)
		return
	}
	tipoSangreID, err := resolveTipoSangreID(perfil.TipoSangre)
	if err != nil {
		http.Error(w, "Completa tu tipo de sangre en tu perfil antes de registrar donaciones", http.StatusBadRequest)
		return
	}

	var input struct {
		Fecha            string `json:"fecha"`
		FechaISO         string `json:"fecha_iso"`
		TipoDonacion     string `json:"tipo_donacion"`
		Institucion      string `json:"institucion"`
		InstitucionID    int    `json:"institucion_id"`
		TieneComprobante bool   `json:"tiene_comprobante"`
		URLComprobante   string `json:"url_comprobante"`
		Comprobante      string `json:"comprobante"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Error al leer los datos: "+err.Error(), http.StatusBadRequest)
		return
	}

	fecha := fechaSolo(time.Now())
	if strings.TrimSpace(input.FechaISO) != "" {
		f, err := parseFechaMovil(input.FechaISO)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		fecha = fechaSolo(f)
	} else if strings.TrimSpace(input.Fecha) != "" {
		f, err := parseFechaMovil(input.Fecha)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		fecha = fechaSolo(f)
	}
	if fecha.After(fechaSolo(time.Now())) {
		http.Error(w, "La fecha de la donación no puede ser futura", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(input.TipoDonacion) == "" {
		http.Error(w, "El tipo de donación es obligatorio (Sangre total, Plaquetas o Plasma)", http.StatusBadRequest)
		return
	}
	tipoHemoID, err := resolveHemocomponenteID(input.TipoDonacion)
	if err != nil {
		http.Error(w, "Tipo de donación no válido: "+input.TipoDonacion, http.StatusBadRequest)
		return
	}

	institucionID := input.InstitucionID
	var institucionNombre string
	if institucionID > 0 {
		err := database.DB.QueryRow(
			`SELECT nombre FROM instituciones WHERE id = $1`, institucionID).Scan(&institucionNombre)
		if err != nil {
			http.Error(w, "Institución no encontrada", http.StatusBadRequest)
			return
		}
	} else if strings.TrimSpace(input.Institucion) != "" {
		err := database.DB.QueryRow(
			`SELECT id, nombre FROM instituciones WHERE nombre ILIKE $1 AND activo ORDER BY id LIMIT 1`,
			strings.TrimSpace(input.Institucion)).Scan(&institucionID, &institucionNombre)
		if err != nil {
			http.Error(w, "No encontramos una institución con ese nombre. Elige una de la lista del mapa.", http.StatusBadRequest)
			return
		}
	} else {
		http.Error(w, "La institución es obligatoria", http.StatusBadRequest)
		return
	}

	comprobante := strings.TrimSpace(input.URLComprobante)
	if comprobante == "" {
		comprobante = strings.TrimSpace(input.Comprobante)
	}

	var nuevoID int
	err = database.DB.QueryRow(`
		INSERT INTO donaciones (usuario_movil_id, institucion_id, fecha, tipo_sangre_id, tipo_hemocomponente_id, comprobante)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`,
		sesion.ID, institucionID, fecha.Format("2006-01-02"), tipoSangreID, tipoHemoID, comprobante).Scan(&nuevoID)
	if err != nil {
		log.Printf("Error al registrar donación del usuario móvil %d: %v", sesion.ID, err)
		http.Error(w, "Error al registrar la donación", http.StatusInternalServerError)
		return
	}

	// Aviso al usuario móvil (best-effort: si falla, la donación ya quedó).
	go notificarDonacionRegistradaMovil(sesion.ID, institucionID, institucionNombre)

	reg := donacionRegistro{
		ID:           nuevoID,
		Fecha:        formatFechaMovil(fecha),
		TipoDonacion: componenteADonacion(input.TipoDonacion),
		Institucion:  institucionNombre,
	}
	if comprobante != "" {
		reg.TieneComprobante = true
		reg.URLComprobante = &comprobante
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(reg)
}

// notificarDonacionRegistradaMovil crea la alerta + notificación
// "Donación registrada" para el usuario móvil (se ve en la pantalla de
// notificaciones de la app). Usa la columna usuario_movil_id de la
// migración 000006; cada alerta es nueva, así que no hay conflicto de
// unicidad. Si algo falla solo queda en el log.
func notificarDonacionRegistradaMovil(usuarioMovilID, institucionID int, institucionNombre string) {
	tipoID, err := findOrCreateTipoAlerta("donacion_registrada", "El usuario móvil registró una donación desde la app")
	if err != nil {
		log.Printf("No se pudo resolver el tipo de alerta donacion_registrada: %v", err)
		return
	}
	var alertaID int
	mensaje := fmt.Sprintf("Gracias por donar en %s. Tu donación puede ayudar a salvar hasta 3 vidas.", institucionNombre)
	err = database.DB.QueryRow(
		`INSERT INTO alertas (tipo_alerta_id, institucion_id, mensaje) VALUES ($1, $2, $3) RETURNING id`,
		tipoID, institucionID, mensaje).Scan(&alertaID)
	if err != nil {
		log.Printf("No se pudo crear la alerta de donación registrada: %v", err)
		return
	}
	if _, err := database.DB.Exec(
		`INSERT INTO notificaciones (alerta_id, usuario_movil_id) VALUES ($1, $2)`,
		alertaID, usuarioMovilID); err != nil {
		log.Printf("No se pudo crear la notificación de donación registrada: %v", err)
	}
}

// ---------------------------------------------------------------------------
// GET /api/donantes/aptitud — estado de aptitud del usuario móvil (modelo
// DonorEligibilityModel de la app): si ya puede volver a donar o cuántos
// días le faltan, según su última donación y la regla provisional de
// intervalosAptitudDias.
// ---------------------------------------------------------------------------

func GetAptitudMovil(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	sesion, ok := sesionMovilExige(w, r)
	if !ok {
		return
	}

	type aptitud struct {
		EsApto      bool    `json:"es_apto"`
		Titulo      string  `json:"titulo"`
		Mensaje     string  `json:"mensaje"`
		TextoEstado string  `json:"texto_estado"`
		TextoFecha  string  `json:"texto_fecha"`
		Progreso    float64 `json:"progreso"`
	}

	sinDonaciones := aptitud{
		EsApto:      true,
		Titulo:      "¡Felicidades!",
		Mensaje:     "Aún no registras donaciones. Cuando dones, aquí verás cuándo podrás volver a hacerlo.",
		TextoEstado: "Listo para donar",
		TextoFecha:  "Sin donaciones registradas",
		Progreso:    1.0,
	}
	var ultimaFecha time.Time
	var componente string
	err := database.DB.QueryRow(`
		SELECT d.fecha, th.componente
		FROM donaciones d
		JOIN tipos_hemocomponente th ON th.id = d.tipo_hemocomponente_id
		WHERE d.usuario_movil_id = $1
		ORDER BY d.fecha DESC, d.id DESC LIMIT 1`, sesion.ID).Scan(&ultimaFecha, &componente)
	if err != nil {
		writeJSON(w, http.StatusOK, sinDonaciones)
		return
	}

	intervalo, ok := intervalosAptitudDias[componente]
	if !ok {
		intervalo = 120
	}
	hoy := fechaSolo(time.Now())
	ultima := fechaSolo(ultimaFecha)
	diasPasados := int(hoy.Sub(ultima).Hours() / 24)
	if diasPasados < 0 {
		diasPasados = 0
	}
	proxima := ultima.AddDate(0, 0, intervalo)

	if diasPasados >= intervalo {
		writeJSON(w, http.StatusOK, aptitud{
			EsApto:      true,
			Titulo:      "¡Felicidades!",
			Mensaje:     "Ya eres apto para volver a donar y salvar vidas.",
			TextoEstado: "Listo para donar",
			TextoFecha:  "Apto desde el " + formatFechaMovil(proxima),
			Progreso:    1.0,
		})
		return
	}
	faltan := intervalo - diasPasados
	progreso := float64(diasPasados) / float64(intervalo)
	if progreso < 0 {
		progreso = 0
	}
	if progreso > 1 {
		progreso = 1
	}
	textoEstado := fmt.Sprintf("Faltan %d días", faltan)
	if faltan == 1 {
		textoEstado = "Falta 1 día"
	}
	writeJSON(w, http.StatusOK, aptitud{
		EsApto:      false,
		Titulo:      "Aún no puedes donar",
		Mensaje:     "Tu cuerpo se está recuperando.",
		TextoEstado: textoEstado,
		TextoFecha:  "Podrás donar el " + formatFechaMovil(proxima),
		Progreso:    progreso,
	})
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout — la app lo llama al cerrar sesión. El JWT no
// tiene estado en el servidor (no hay lista de revocación), así que el
// cierre real lo hace la app borrando el token del almacenamiento seguro;
// este endpoint solo confirma la operación.
// ---------------------------------------------------------------------------

func LogoutMovil(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"mensaje": "Sesión cerrada"})
}
