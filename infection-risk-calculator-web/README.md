# infection-risk-calculator-web

Formulario en React + TypeScript (Vite) para la calculadora de riesgo de infección.

- Instalar: `npx npm@11 install` (el npm 10 falla con `Cannot read properties of null (reading 'edgesOut')`)
- Desarrollo: `npm run dev` → http://localhost:5173
- Build: `npm run build` (salida en `dist/`)

Necesita el backend (`../infection-risk-calculator-be`) corriendo en el puerto 8080: en desarrollo Vite redirige `/api` a `http://localhost:8080` (ver `vite.config.ts`).

Todo el formulario está en `src/App.tsx`.
