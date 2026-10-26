# infection-risk-calculator-be

API en Go (solo librería estándar) que calcula el riesgo de infección de una fractura. La lógica y el handler HTTP están en `risk/`; `main.go` solo levanta el servidor local. En Vercel, `../api/calcular.go` usa el mismo `risk.Handler`.

- Correr: `go run .` → http://localhost:8080
- Tests: `go test ./...`

## Endpoint

`POST /api/calcular`

```json
{
  "genero": "masculino",
  "edad": 82,
  "comorbilidades": ["diabetes"],
  "localizacion": "mii",
  "segmento": "tibia distal",
  "tipoFractura": "abierta",
  "gustilo": "IIIB",
  "fernandez": "",
  "schatzker": "",
  "minutosHastaIngreso": 400,
  "antibioticoPrevio": false,
  "manejoQuirurgico": "tutor_externo"
}
```

Valores aceptados:
- `genero`: `masculino` | `femenino`
- `comorbilidades`: `diabetes`, `insuficiencia_cardiaca`, `epoc`, `demencia`, `inmunosupresion`, `otro`
- `localizacion`: `msi` | `msd` | `mii` | `mid`
- `tipoFractura`: `abierta` | `cerrada` (si es abierta, `gustilo` es obligatorio: `I`, `II`, `IIIA`, `IIIB`, `IIIC`)
- `fernandez`: `""` (no aplica), `I`–`V`; solo con fractura cerrada de miembro superior
- `schatzker` (platillos tibiales): `""` (no aplica), `I`–`VI`; solo con fractura cerrada de miembro inferior
- `manejoQuirurgico`: `tutor_externo` | `osteosintesis_definitiva`

Respuesta: `{ "puntaje": 16, "porcentaje": 70, "categoria": "alto", "factores": [{ "descripcion": "...", "puntos": 2 }] }`.
Entrada inválida → `400` con el mensaje de error en texto plano.

## Puntaje

Los pesos están en `risk/risk.go`. Son **ilustrativos, no validados clínicamente**.
Categorías: 0–4 bajo, 5–9 moderado, ≥10 alto. `porcentaje` = puntaje / puntaje máximo (23; Gustilo, Fernandez y Schatzker son excluyentes), redondeado; no es una probabilidad.
