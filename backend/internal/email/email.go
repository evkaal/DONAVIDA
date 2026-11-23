// Package email envía correos transaccionales con Resend (https://resend.com)
// usando SOLO la librería estándar de Go: no agrega dependencias nuevas al
// proyecto, así que el build funciona sin internet.
//
// Configuración (variables de entorno, ver backend/.env.example):
//
//	RESEND_API_KEY — clave de API de Resend (empieza con re_...). Sin ella
//	  no se envía nada: Send devuelve un error claro.
//	EMAIL_FROM     — remitente, opcional. Por defecto
//	  "DONAVIDA <onboarding@resend.dev>" (remitente de prueba de Resend).
//
// Advertencia: con el remitente de prueba Resend SOLO entrega al correo
// con el que se creó la cuenta Resend. Para enviar a cualquier usuario
// hay que verificar el dominio donavida.casa en el panel de Resend
// (registros DNS TXT/SPF/DKIM) y poner
// EMAIL_FROM="DONAVIDA <noreply@donavida.casa>" en el .env del servidor.
//
// Seguridad: el correo de bienvenida NUNCA incluye la contraseña del
// usuario. La contraseña la asigna el administrador y el usuario debe
// pedírsela a él.
package email

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const resendAPIURL = "https://api.resend.com/emails"

// Remitente por defecto (dominio de prueba de Resend).
const defaultFrom = "DONAVIDA <onboarding@resend.dev>"

func apiKey() string {
	return strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
}

func from() string {
	if v := strings.TrimSpace(os.Getenv("EMAIL_FROM")); v != "" {
		return v
	}
	return defaultFrom
}

// Send envía un correo con la API de Resend (POST /emails).
// Devuelve error si la clave no está configurada, si el destinatario no
// es válido, si Resend no responde o si responde con un error (4xx/5xx).
func Send(to, subject, htmlBody, textBody string) error {
	key := apiKey()
	if key == "" {
		return errors.New("RESEND_API_KEY no configurada en el .env del servidor")
	}
	to = strings.TrimSpace(to)
	if to == "" || !strings.Contains(to, "@") {
		return errors.New("correo destinatario inválido")
	}

	payload := map[string]interface{}{
		"from":    from(),
		"to":      []string{to},
		"subject": subject,
		"html":    htmlBody,
		"text":    textBody,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("no se pudo armar el correo: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, resendAPIURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("no se pudo crear la petición a Resend: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("no se pudo contactar a Resend: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	return fmt.Errorf("Resend respondió %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
}

// SendBienvenida envía el correo de bienvenida al usuario recién creado.
// mensajeAdmin es el mensaje opcional que escribió el admin general en el
// modal: se escapa (html.EscapeString) y nunca se inserta crudo.
// NUNCA se incluye la contraseña en el correo.
func SendBienvenida(to, nombreUsuario, mensajeAdmin string) error {
	subject := "Tu cuenta DONAVIDA fue creada"

	nombre := html.EscapeString(strings.TrimSpace(nombreUsuario))
	if nombre == "" {
		nombre = html.EscapeString(to)
	}

	var mensajeHTML, mensajeTexto string
	if m := strings.TrimSpace(mensajeAdmin); m != "" {
		// El mensaje se escapa y los saltos de línea se convierten en <br>.
		mensajeHTML = "<p><strong>Mensaje del administrador:</strong></p><p>" +
			strings.ReplaceAll(html.EscapeString(m), "\n", "<br>") + "</p>"
		mensajeTexto = "Mensaje del administrador:\n" + m + "\n\n"
	}

	htmlBody := `<div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 560px;">
  <h2 style="color: #9e1329;">¡Bienvenido a DONAVIDA!</h2>
  <p>Hola <strong>` + nombre + `</strong>,</p>
  <p>Tu cuenta en el sistema DONAVIDA fue creada. Ya puedes entrar con tu correo y la contraseña que te asignó el administrador.</p>
` + mensajeHTML + `
  <p>Entra al sistema aquí: <a href="https://donavida.casa">https://donavida.casa</a></p>
  <p>Si no conoces tu contraseña, pídela al administrador que creó tu cuenta.</p>
  <p style="color: #64748b; font-size: 0.85rem;">Este es un correo automático, por favor no respondas a este mensaje.</p>
</div>`

	textBody := "¡Bienvenido a DONAVIDA!\n\n" +
		"Hola " + strings.TrimSpace(nombreUsuario) + ",\n\n" +
		"Tu cuenta en el sistema DONAVIDA fue creada. Ya puedes entrar con tu correo y la contraseña que te asignó el administrador.\n\n" +
		mensajeTexto +
		"Entra al sistema aquí: https://donavida.casa\n\n" +
		"Si no conoces tu contraseña, pídela al administrador que creó tu cuenta.\n"

	return Send(to, subject, htmlBody, textBody)
}

// SendPrueba envía un correo corto para comprobar que Resend está
// configurado (lo usa POST /api/admin/test-email).
func SendPrueba(to string) error {
	subject := "Correo de prueba DONAVIDA"
	htmlBody := `<div style="font-family: Arial, sans-serif; color: #1e293b;">
  <h2 style="color: #9e1329;">Correo de prueba DONAVIDA</h2>
  <p>Si recibiste este correo, Resend está configurado correctamente en el servidor de DONAVIDA.</p>
</div>`
	textBody := "Correo de prueba DONAVIDA\n\nSi recibiste este correo, Resend está configurado correctamente en el servidor de DONAVIDA.\n"
	return Send(to, subject, htmlBody, textBody)
}
