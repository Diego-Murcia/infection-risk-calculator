package risk

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCalculate(t *testing.T) {
	low := Input{Genero: "femenino", Edad: 30, Localizacion: "msd", TipoFractura: "cerrada", ManejoQuirurgico: "osteosintesis_definitiva"}
	if err := Validate(low); err != nil {
		t.Fatal(err)
	}
	if r := Calculate(low); r.Puntaje != 1 || r.Categoria != "bajo" {
		t.Errorf("low: got %+v", r)
	}

	high := Input{Genero: "masculino", Edad: 82, Comorbilidades: []string{"diabetes"}, Localizacion: "mii",
		TipoFractura: "abierta", Gustilo: "IIIB", MinutosHastaIngreso: 400, ManejoQuirurgico: "tutor_externo"}
	// 2 edad + 1 sexo + 2 dm + 1 mi + 4 gustilo + 2 sin atb + 2 tiempo + 2 tutor = 16
	if maxPuntaje != 25 {
		t.Errorf("maxPuntaje: got %d", maxPuntaje)
	}
	if r := Calculate(high); r.Puntaje != 16 || r.Categoria != "alto" || r.Porcentaje != 64 {
		t.Errorf("high: got %+v", r)
	}

	if Validate(Input{Genero: "masculino", Edad: 40, Localizacion: "mii", TipoFractura: "abierta", ManejoQuirurgico: "tutor_externo"}) == nil {
		t.Error("open fracture without Gustilo should fail")
	}

	dup := low
	dup.Comorbilidades = []string{"diabetes", "diabetes"}
	if Validate(dup) == nil {
		t.Error("repeated comorbidity should fail")
	}

	acentos := low
	acentos.Segmento = strings.Repeat("á", 500)
	if err := Validate(acentos); err != nil {
		t.Errorf("500 accented chars should pass: %v", err)
	}
}

func TestHandler(t *testing.T) {
	body := `{"genero":"femenino","edad":30,"localizacion":"msd","tipoFractura":"cerrada","manejoQuirurgico":"osteosintesis_definitiva"}`
	cases := []struct {
		method, body string
		want         int
	}{
		{http.MethodPost, body, http.StatusOK},
		{http.MethodPost, `{"genero":"x"}`, http.StatusBadRequest},
		{http.MethodPost, `{"campoDesconocido":1}`, http.StatusBadRequest},
		{http.MethodGet, "", http.StatusMethodNotAllowed},
	}
	for _, c := range cases {
		rec := httptest.NewRecorder()
		Handler(rec, httptest.NewRequest(c.method, "/api/calcular", strings.NewReader(c.body)))
		if rec.Code != c.want {
			t.Errorf("%s %s: got %d, want %d", c.method, c.body, rec.Code, c.want)
		}
	}
}
