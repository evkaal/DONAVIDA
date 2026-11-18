package database

import (
	"bufio"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/lib/pq"
)

// variable global DB que guarda un puntero a un tipo de sql.DB
var DB *sql.DB

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// loadDotEnv carga un archivo .env sencillo (KEY=VALOR) si existe,
// sin depender de librerías externas. Busca .env en el directorio
// actual, en backend/ y en la raíz del proyecto. No sobrescribe
// variables que ya estén definidas en el entorno (systemd, etc.).
func loadDotEnv() {
	candidates := []string{".env", "../.env", "../../.env", "backend/.env"}
	for _, path := range candidates {
		f, err := os.Open(path)
		if err != nil {
			continue
		}
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) != 2 {
				continue
			}
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, `"'`)
			if os.Getenv(key) == "" {
				_ = os.Setenv(key, val)
			}
		}
		_ = f.Close()
	}
}

func InitDB() {
	loadDotEnv()

	// La conexión ahora sí usa las variables de entorno.
	// En local se pueden definir en backend/.env o en la raíz.
	// En la VPS se definen en el archivo EnvironmentFile de systemd
	// o directamente como variables de entorno del servicio.
	// Nunca se deja una contraseña fija en el código.
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := os.Getenv("DB_PASSWORD")
	dbname := getEnv("DB_NAME", "donavida")
	sslmode := getEnv("DB_SSLMODE", "disable")

	if password == "" {
		log.Fatal("Fatal: la variable de entorno DB_PASSWORD no está definida")
	}

	conStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode)

	var err error
	DB, err = sql.Open("postgres", conStr)
	if err != nil {
		log.Fatalf("Error con la conexión a la BD: %v", err)
	}

	// Comprobar que la conexión a la BD sea exitosa
	err = DB.Ping()
	if err != nil {
		log.Fatalf("No se pudo conectar a la BD: %v", err)
	}

	fmt.Println("La conexión a la BD fue todo un exito")
}
