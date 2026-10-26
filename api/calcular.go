// Vercel serverless function: served at /api/calcular.
package handler

import (
	"net/http"

	"infection-risk-calculator-be/risk"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	risk.Handler(w, r)
}
