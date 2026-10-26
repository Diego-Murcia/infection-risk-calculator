import { useEffect, useState, type FormEvent } from 'react'

type Result = {
  puntaje: number
  porcentaje: number
  categoria: 'bajo' | 'moderado' | 'alto'
  factores: { descripcion: string; puntos: number }[]
}

const comorbilidades = [
  ['diabetes', 'Diabetes mellitus'],
  ['insuficiencia_cardiaca', 'Insuficiencia cardiaca'],
  ['epoc', 'EPOC'],
  ['demencia', 'Demencia'],
  ['inmunosupresion', 'Inmunosupresión'],
  ['otro', 'Otro'],
]

const iconos = { bajo: '✓', moderado: '!', alto: '▲' }

// Native radios can't be unchecked; a second click on the selected option clears it.
function Choice({ name, options, required, initial = '', onChange }: {
  name: string
  options: [string, string][]
  required?: boolean
  initial?: string
  onChange?: (v: string) => void
}) {
  const [value, setValue] = useState(initial)
  const pick = (v: string) => {
    const next = v === value ? '' : v
    setValue(next)
    onChange?.(next)
  }
  return (
    <div className="choice">
      {options.map(([v, l], i) => (
        <label key={v} className={value === v ? 'on' : undefined}>
          <input type="radio" name={name} value={v} required={required && i === 0} checked={value === v} onClick={() => pick(v)} onChange={() => {}} />
          <span>{l}</span>
        </label>
      ))}
    </div>
  )
}

// Selected look comes from a state-driven class: Safari doesn't always restyle `:checked + span` until hover.
function Chips({ name, options }: { name: string; options: string[][] }) {
  const [on, setOn] = useState<string[]>([])
  const toggle = (v: string) => setOn((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))
  return (
    <div className="chips">
      {options.map(([v, l]) => (
        <label key={v} className={on.includes(v) ? 'on' : undefined}>
          <input type="checkbox" name={name} value={v} checked={on.includes(v)} onChange={() => toggle(v)} />
          <span>{l}</span>
        </label>
      ))}
    </div>
  )
}

function Ring({ pct, cat }: { pct: number; cat: Result['categoria'] }) {
  const r = 70
  const c = 2 * Math.PI * r
  // Count up from 0 so the arc and the number fill together.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const [v, setV] = useState(reduced ? pct : 0)
  useEffect(() => {
    if (reduced) return
    const start = performance.now()
    let id = 0
    const tick = (t: number) => {
      const k = Math.min((t - start) / 900, 1)
      setV(pct * (1 - (1 - k) ** 3))
      if (k < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [pct, reduced])
  return (
    <svg className="ring" viewBox="0 0 180 180" role="img" aria-label={`Riesgo estimado ${pct}%, ${cat}`}>
      <title>{`Riesgo estimado: ${pct}%`}</title>
      <circle cx="90" cy="90" r={r} className="ring-track" />
      <circle cx="90" cy="90" r={r} className={`ring-arc arc-${cat}`} strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 90 90)" />
      <text x="90" y="92" className="ring-pct">{Math.round(v)}%</text>
      <text x="90" y="120" className="ring-sub">riesgo estimado</text>
    </svg>
  )
}

function ResultPanel({ result }: { result: Result }) {
  const maxFactor = Math.max(...result.factores.map((f) => f.puntos), 1)
  return (
    <div className="result" aria-live="polite">
      <Ring pct={result.porcentaje} cat={result.categoria} />
      <p className={`status status-${result.categoria}`}>
        <span className="status-icon" aria-hidden>{iconos[result.categoria]}</span> Riesgo {result.categoria} · {result.puntaje} puntos
      </p>
      <p className="muted note">Porcentaje del puntaje máximo; no es una probabilidad validada.</p>

      <h3>Contribución por factor</h3>
      {result.factores.length === 0 ? (
        <p className="muted">Ningún factor de riesgo sumó puntos.</p>
      ) : (
        <ul className="bars">
          {result.factores.map((f, i) => (
            <li key={f.descripcion} title={`${f.descripcion}: +${f.puntos}`} style={{ animationDelay: `${300 + i * 60}ms` }}>
              <span className="bar-label">{f.descripcion}</span>
              <span className="bar-track">
                <span className="bar" style={{ width: `${(f.puntos / maxFactor) * 100}%` }} />
              </span>
              <span className="bar-value">+{f.puntos}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function App() {
  const [tipo, setTipo] = useState('cerrada')
  const [result, setResult] = useState<Result>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Remounting the form resets the uncontrolled inputs and each Choice's own state.
  const [formKey, setFormKey] = useState(0)

  function reset() {
    setFormKey((k) => k + 1)
    setTipo('cerrada')
    setResult(undefined)
    setError('')
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const body = {
      genero: f.get('genero'),
      edad: Number(f.get('edad')),
      comorbilidades: f.getAll('comorbilidades'),
      localizacion: f.get('localizacion'),
      segmento: f.get('segmento'),
      tipoFractura: f.get('tipoFractura'),
      gustilo: tipo === 'abierta' ? f.get('gustilo') : '',
      fernandez: f.get('fernandez'),
      minutosHastaIngreso: Number(f.get('minutos')),
      antibioticoPrevio: f.get('antibiotico') === 'si',
      manejoQuirurgico: f.get('manejo'),
    }
    setError('')
    setResult(undefined)
    setLoading(true)
    try {
      // Minimum delay so the loading state is visible; the API answers in a few ms.
      const [res] = await Promise.all([
        fetch('/api/calcular', { method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(10000) }),
        new Promise((r) => setTimeout(r, 600)),
      ])
      // Only 400s carry a validation message; a 5xx body is the proxy's HTML error page.
      if (res.status === 400) throw new Error(await res.text())
      if (!res.ok) throw new Error('El servidor no está disponible. Intente de nuevo en unos segundos.')
      setResult(await res.json())
    } catch (err) {
      const sinConexion = err instanceof TypeError || (err instanceof DOMException && err.name === 'TimeoutError')
      setError(sinConexion ? 'No se pudo conectar con el servidor.' : err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="hero-band">
        <div className="hero-inner">
          <span className="badge">Prototipo</span>
          <h1>Calculadora de riesgo de infección</h1>
          <p>Estimación para pacientes con fractura · puntajes ilustrativos, no validados clínicamente</p>
        </div>
      </header>

      <main className="layout">
        <form key={formKey} onSubmit={submit} className="form">
          <section className="card">
            <h2><span className="step">1</span>Paciente</h2>
            <div className="row">
              <div className="field">
                <span className="field-label">Género</span>
                <Choice name="genero" required options={[['masculino', 'Masculino'], ['femenino', 'Femenino']]} />
              </div>
              <label className="field">
                <span className="field-label">Edad (años)</span>
                <input type="number" name="edad" min={0} max={120} required />
              </label>
            </div>
            <fieldset className="field">
              <legend className="field-label">Comorbilidades</legend>
              <Chips name="comorbilidades" options={comorbilidades} />
            </fieldset>
          </section>

          <section className="card">
            <h2><span className="step">2</span>Fractura</h2>
            <label className="field">
              <span className="field-label">Localización</span>
              <select name="localizacion" required defaultValue="">
                <option value="">Seleccione…</option>
                <option value="msi">Miembro superior izquierdo</option>
                <option value="msd">Miembro superior derecho</option>
                <option value="mii">Miembro inferior izquierdo</option>
                <option value="mid">Miembro inferior derecho</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Descripción del segmento</span>
              <textarea name="segmento" maxLength={500} rows={2} placeholder="Ej. tercio distal de tibia" />
            </label>
            <div className="row">
              <div className="field">
                <span className="field-label">Tipo</span>
                <Choice name="tipoFractura" required initial="cerrada" onChange={setTipo} options={[['abierta', 'Abierta'], ['cerrada', 'Cerrada']]} />
              </div>
              {tipo === 'abierta' && (
                <label className="field">
                  <span className="field-label">Gustilo</span>
                  <select name="gustilo" required defaultValue="">
                    <option value="">Seleccione…</option>
                    {['I', 'II', 'IIIA', 'IIIB', 'IIIC'].map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>
              )}
              <label className="field">
                <span className="field-label">Fernandez</span>
                <select name="fernandez" defaultValue="">
                  <option value="">No aplica</option>
                  {['I', 'II', 'III', 'IV', 'V'].map((t) => <option key={t} value={t}>Tipo {t}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="card">
            <h2><span className="step">3</span>Atención</h2>
            <label className="field">
              <span className="field-label">Tiempo entre trauma e ingreso (minutos)</span>
              <input type="number" name="minutos" min={0} required />
            </label>
            <div className="row">
              <div className="field">
                <span className="field-label">Antibiótico previo</span>
                <Choice name="antibiotico" required options={[['si', 'Sí'], ['no', 'No']]} />
              </div>
              <div className="field">
                <span className="field-label">Manejo quirúrgico</span>
                <Choice name="manejo" required options={[['tutor_externo', 'Tutor externo'], ['osteosintesis_definitiva', 'Osteosíntesis definitiva']]} />
              </div>
            </div>
          </section>

          <div className="actions">
            <button type="submit" disabled={loading}>{loading ? 'Calculando…' : 'Calcular riesgo'}</button>
            <button type="button" className="secondary" onClick={reset} disabled={loading}>Limpiar formulario</button>
          </div>
        </form>

        <aside className="card panel">
          <h2>Resultado</h2>
          {error && <p className="error" role="alert">{error}</p>}
          {loading ? (
            <div className="loading" role="status">
              <span className="spinner" aria-hidden />
              Calculando…
            </div>
          ) : result ? <ResultPanel result={result} /> : !error && (
            <p className="muted empty">Complete los datos y pulse <strong>Calcular riesgo</strong> para ver el puntaje.</p>
          )}
        </aside>
      </main>
    </>
  )
}
