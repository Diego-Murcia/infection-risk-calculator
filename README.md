# Calculadora de riesgo de infección (prototipo)

| Carpeta / archivo | Qué es |
|---|---|
| [`infection-risk-calculator-be`](infection-risk-calculator-be/README.md) | Backend en Go. La lógica vive en `risk/` (puntaje + handler HTTP) |
| [`infection-risk-calculator-web`](infection-risk-calculator-web/README.md) | Web en React + TypeScript |
| `api/calcular.go`, `go.mod`, `vercel.json` | Solo para Vercel: función serverless que reutiliza `risk.Handler` |

Los pesos del puntaje son ilustrativos, **no validados clínicamente**.

## Modo local (desarrollo)

Dos terminales:

```
cd infection-risk-calculator-be && go run .                              # API en :8080
cd infection-risk-calculator-web && npx npm@11 install && npm run dev    # http://localhost:5173
```

## Modo local con Docker

```
docker compose up -d --build   # http://localhost:8000
docker compose down            # detener
```

La web (nginx) sirve el build de React y redirige `/api` al contenedor del backend; el backend no se expone al host.

## Modo Vercel

En Vercel la web se sirve como sitio estático y `/api/calcular` es una función Go (`api/calcular.go`) que llama al mismo `risk.Handler` que usa el servidor local. No hay nginx ni contenedores.

### Desplegar paso a paso

1. **Subir el proyecto a GitHub** (desde la carpeta raíz del proyecto):
   ```
   git init
   git add .
   git commit -m "Calculadora de riesgo de infección"
   ```
   Crea un repositorio vacío en https://github.com/new (sin README) y sigue las instrucciones de "push an existing repository":
   ```
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git branch -M main
   git push -u origin main
   ```
2. **Crear la cuenta en Vercel**: https://vercel.com/signup → "Continue with GitHub" → plan **Hobby** (gratis).
3. **Importar el proyecto**: en el panel de Vercel → **Add New… → Project** → elige tu repositorio → **Import**.
4. **Configuración** (pantalla "Configure Project"):
   - **Root Directory**: déjalo en la raíz (`./`). No elijas la carpeta del backend ni la de la web.
   - **Framework Preset**: `Other`.
   - Build/Install/Output: no los toques; los toma de `vercel.json`.
5. **Deploy**. En 1–2 minutos te da una URL tipo `https://<tu-repo>.vercel.app`.
6. **Probar**: abre la URL, llena el formulario y pulsa *Calcular riesgo*. Si falla, revisa en Vercel → tu proyecto → **Deployments → (el último) → Build Logs**, y para la API la pestaña **Logs**.

Cada `git push` a `main` vuelve a desplegar automáticamente; los push a otras ramas crean URLs de vista previa.
