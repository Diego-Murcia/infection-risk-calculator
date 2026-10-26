package risk

import (
	"errors"
	"maps"
	"slices"
	"unicode/utf8"
)

type Input struct {
	Genero              string   `json:"genero"`
	Edad                int      `json:"edad"`
	Comorbilidades      []string `json:"comorbilidades"`
	Localizacion        string   `json:"localizacion"`
	Segmento            string   `json:"segmento"`
	TipoFractura        string   `json:"tipoFractura"`
	Gustilo             string   `json:"gustilo"`
	Fernandez           string   `json:"fernandez"`
	Schatzker           string   `json:"schatzker"`
	MinutosHastaIngreso int      `json:"minutosHastaIngreso"`
	AntibioticoPrevio   bool     `json:"antibioticoPrevio"`
	ManejoQuirurgico    string   `json:"manejoQuirurgico"`
}

type Factor struct {
	Descripcion string `json:"descripcion"`
	Puntos      int    `json:"puntos"`
}

type Result struct {
	Puntaje   int      `json:"puntaje"`
	Categoria string   `json:"categoria"`
	Factores  []Factor `json:"factores"`
	// Porcentaje is the score relative to maxPuntaje, not an infection probability.
	Porcentaje int `json:"porcentaje"`
}

// shortcut: point weights are illustrative, not a validated clinical score; replace with published weights before any real use.
var comorbilidadPuntos = map[string]int{
	"diabetes": 2, "insuficiencia_cardiaca": 1, "epoc": 1, "demencia": 1, "inmunosupresion": 2, "otro": 1,
}
var gustiloPuntos = map[string]int{"I": 1, "II": 2, "IIIA": 3, "IIIB": 4, "IIIC": 5}
var fernandezPuntos = map[string]int{"I": 0, "II": 1, "III": 1, "IV": 1, "V": 2}
var schatzkerPuntos = map[string]int{"I": 1, "II": 1, "III": 1, "IV": 2, "V": 3, "VI": 3}
var quirurgicoPuntos = map[string]int{"tutor_externo": 2, "osteosintesis_definitiva": 1}
var localizaciones = []string{"msi", "msd", "mii", "mid"}

func maxOf(m map[string]int) int { return slices.Max(slices.Collect(maps.Values(m))) }

// Fixed terms mirror Calculate: edad 2, sexo 1, miembro inferior 1, sin antibiótico 2, tiempo 2.
// Gustilo, Fernandez and Schatzker are mutually exclusive, so only the largest of them counts.
var maxPuntaje = func() int {
	m := 2 + 1 + 1 + 2 + 2
	for _, p := range comorbilidadPuntos {
		m += p
	}
	return m + max(maxOf(gustiloPuntos), maxOf(fernandezPuntos), maxOf(schatzkerPuntos)) + maxOf(quirurgicoPuntos)
}()
var nombres = map[string]string{
	"diabetes": "diabetes mellitus", "insuficiencia_cardiaca": "insuficiencia cardiaca", "epoc": "EPOC", "demencia": "demencia",
	"inmunosupresion": "inmunosupresión", "otro": "otra", "tutor_externo": "tutor externo", "osteosintesis_definitiva": "osteosíntesis definitiva",
}

func Validate(in Input) error {
	superior := in.Localizacion == "msi" || in.Localizacion == "msd"
	switch {
	case in.Genero != "masculino" && in.Genero != "femenino":
		return errors.New("genero inválido")
	case in.Edad < 0 || in.Edad > 120:
		return errors.New("edad fuera de rango (0-120)")
	case !slices.Contains(localizaciones, in.Localizacion):
		return errors.New("localización inválida")
	case utf8.RuneCountInString(in.Segmento) > 500:
		return errors.New("segmento demasiado largo")
	case in.TipoFractura != "abierta" && in.TipoFractura != "cerrada":
		return errors.New("tipo de fractura inválido")
	case in.TipoFractura == "abierta" && gustiloPuntos[in.Gustilo] == 0:
		return errors.New("clasificación Gustilo requerida para fractura abierta")
	case in.Fernandez != "" && !hasKey(fernandezPuntos, in.Fernandez):
		return errors.New("clasificación Fernandez inválida")
	case in.Fernandez != "" && (in.TipoFractura != "cerrada" || !superior):
		return errors.New("Fernandez solo aplica a fractura cerrada de miembro superior")
	case in.Schatzker != "" && !hasKey(schatzkerPuntos, in.Schatzker):
		return errors.New("clasificación Schatzker inválida")
	case in.Schatzker != "" && (in.TipoFractura != "cerrada" || superior):
		return errors.New("Schatzker solo aplica a fractura cerrada de miembro inferior")
	case in.MinutosHastaIngreso < 0:
		return errors.New("tiempo hasta ingreso inválido")
	case !hasKey(quirurgicoPuntos, in.ManejoQuirurgico):
		return errors.New("manejo quirúrgico inválido")
	}
	for i, c := range in.Comorbilidades {
		if !hasKey(comorbilidadPuntos, c) {
			return errors.New("comorbilidad inválida: " + c)
		}
		if slices.Contains(in.Comorbilidades[:i], c) {
			return errors.New("comorbilidad repetida: " + c)
		}
	}
	return nil
}

func hasKey(m map[string]int, k string) bool { _, ok := m[k]; return ok }

func Calculate(in Input) Result {
	var f []Factor
	add := func(d string, p int) {
		if p > 0 {
			f = append(f, Factor{d, p})
		}
	}

	switch {
	case in.Edad >= 80:
		add("Edad ≥ 80", 2)
	case in.Edad >= 65:
		add("Edad ≥ 65", 1)
	}
	if in.Genero == "masculino" {
		add("Sexo masculino", 1)
	}
	for _, c := range in.Comorbilidades {
		add("Comorbilidad: "+nombres[c], comorbilidadPuntos[c])
	}
	if in.Localizacion == "mii" || in.Localizacion == "mid" {
		add("Miembro inferior", 1)
	}
	if in.TipoFractura == "abierta" {
		add("Fractura abierta Gustilo "+in.Gustilo, gustiloPuntos[in.Gustilo])
		if !in.AntibioticoPrevio {
			add("Fractura abierta sin antibiótico previo", 2)
		}
	}
	add("Fernandez tipo "+in.Fernandez, fernandezPuntos[in.Fernandez])
	add("Schatzker tipo "+in.Schatzker, schatzkerPuntos[in.Schatzker])
	switch {
	case in.MinutosHastaIngreso > 360:
		add("Ingreso > 6 h tras trauma", 2)
	case in.MinutosHastaIngreso > 180:
		add("Ingreso > 3 h tras trauma", 1)
	}
	add("Manejo: "+nombres[in.ManejoQuirurgico], quirurgicoPuntos[in.ManejoQuirurgico])

	total := 0
	for _, x := range f {
		total += x.Puntos
	}
	cat := "bajo"
	switch {
	case total >= 10:
		cat = "alto"
	case total >= 5:
		cat = "moderado"
	}
	return Result{Puntaje: total, Categoria: cat, Factores: f, Porcentaje: (total*100 + maxPuntaje/2) / maxPuntaje}
}
