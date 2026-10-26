package main

import (
	"log"
	"net/http"

	"infection-risk-calculator-be/risk"
)

func main() {
	http.HandleFunc("/api/calcular", risk.Handler)
	log.Println("backend en http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
