# DONAVIDA - Despliegue en VPS Ubuntu

## 1. Aplicar este patch
En tu laptop, en la rama feature/dashboard-integracion:
```
git checkout feature/dashboard-integracion
git apply DONAVIDA-fix.patch
git add -A
git commit -m "fix: api baseURL, CORS, DB por env, assets e imports faltantes"
git push
```

En la VPS:
```
cd /opt/donavida
git pull
```

## 2. Backend - .env
Crea `/opt/donavida/backend/.env` (NO lo subas a git) con tus valores reales:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_REAL
DB_NAME=donavida
DB_SSLMODE=disable
JWT_Secret=TU_JWT_REAL
PORT=8080
ALLOWED_ORIGINS=http://localhost:5173,http://159.173.138.239
```

Compila y arranca:
```
cd /opt/donavida/backend
go build -o app ./cmd/server
sudo cp ../deploy/donavida.service /etc/systemd/system/donavida.service
sudo systemctl daemon-reload
sudo systemctl enable --now donavida
sudo journalctl -u donavida -f
```

## 3. Frontend
```
cd /opt/donavida/frontend
npm install
npm run build
```
`VITE_API_URL` ya está en `.env.production` como
`http://159.173.138.239:8080/api`.
Si prefieres pasar por Nginx, cambia a `VITE_API_URL=/api` y reconstruye.

## 4. Nginx
```
sudo cp deploy/nginx-donavida.conf /etc/nginx/sites-available/donavida
sudo ln -s /etc/nginx/sites-available/donavida /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 80,443,22/tcp
```

## 5. Verificar
- `curl http://127.0.0.1:8080/` -> Bienvenido al back
- `curl -X POST http://127.0.0.1:8080/api/login -H 'Content-Type: application/json' -d '{"email":"tu@correo","password":"tu_password"}'`
- Abre http://159.173.138.239/ y revisa la consola del navegador: ya no debe haber 404 en /assets/ ni errores CORS.
