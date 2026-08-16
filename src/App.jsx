import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const POKEMON_SETS = [
  {
    key: 'kanto',
    label: 'Kanto Classics',
    description: 'Iconic first-generation favorites with a balanced mix of types.',
    ids: [1, 4, 7, 25, 39, 52, 54, 58, 63, 66, 92, 133],
  },
  {
    key: 'johto',
    label: 'Johto Journey',
    description: 'A gold-and-silver inspired lineup built for exploration and variety.',
    ids: [152, 155, 158, 169, 172, 175, 179, 183, 196, 197, 207, 228],
  },
  {
    key: 'power',
    label: 'Power Squad',
    description: 'High-impact battlers with standout stats for the featured carousel.',
    ids: [6, 9, 65, 68, 94, 130, 143, 149, 212, 248, 257, 445],
  },
]

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'explore', label: 'Card Grid' },
  { key: 'analytics', label: 'Analytics' },
]

const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

function formatName(value) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizePokemon(data) {
  const stats = Object.fromEntries(data.stats.map((entry) => [entry.stat.name, entry.base_stat]))

  return {
    id: data.id,
    name: data.name,
    displayName: formatName(data.name),
    image:
      data.sprites.other['official-artwork'].front_default ||
      data.sprites.other.home.front_default ||
      data.sprites.front_default,
    types: data.types.map((entry) => entry.type.name),
    abilities: data.abilities.map((entry) => formatName(entry.ability.name)),
    height: Number((data.height / 10).toFixed(1)),
    weight: Number((data.weight / 10).toFixed(1)),
    stats,
    totalStat: Object.values(stats).reduce((total, value) => total + value, 0),
  }
}

function SearchBar({ query, onChange }) {
  return (
    <label className="search-shell" htmlFor="pokemon-search">
      <span className="search-icon" aria-hidden="true">
        ⌕
      </span>
      <input
        id="pokemon-search"
        className="search-input"
        type="search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search Pokémon by name, type, or ability"
      />
    </label>
  )
}

function PokemonCard({ pokemon }) {
  return (
    <article className="pokemon-card">
      <div className="pokemon-card__header">
        <span className="pokemon-card__id">#{String(pokemon.id).padStart(3, '0')}</span>
        <div className="type-pills">
          {pokemon.types.map((type) => (
            <span key={type} className={`type-pill type-pill--${type}`}>
              {formatName(type)}
            </span>
          ))}
        </div>
      </div>
      <img className="pokemon-card__image" src={pokemon.image} alt={pokemon.displayName} loading="lazy" />
      <h3>{pokemon.displayName}</h3>
      <p className="pokemon-card__meta">{pokemon.abilities.slice(0, 2).join(' • ')}</p>
      <dl className="pokemon-card__details">
        <div>
          <dt>Height</dt>
          <dd>{pokemon.height} m</dd>
        </div>
        <div>
          <dt>Weight</dt>
          <dd>{pokemon.weight} kg</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{pokemon.totalStat}</dd>
        </div>
      </dl>
    </article>
  )
}

function Carousel({ items, index, onPrevious, onNext }) {
  if (!items.length) {
    return (
      <section className="panel carousel-panel">
        <p>No featured Pokémon match this search yet.</p>
      </section>
    )
  }

  const active = items[index]

  return (
    <section className="panel carousel-panel">
      <div className="carousel-copy">
        <span className="eyebrow">Featured Spotlight</span>
        <h2>{active.displayName}</h2>
        <p>
          {active.displayName} leads this collection with {active.totalStat} total base stats and
          signature abilities like {active.abilities.slice(0, 2).join(' and ')}.
        </p>
        <div className="type-pills">
          {active.types.map((type) => (
            <span key={type} className={`type-pill type-pill--${type}`}>
              {formatName(type)}
            </span>
          ))}
        </div>
        <div className="carousel-actions">
          <button type="button" onClick={onPrevious}>
            Previous
          </button>
          <button type="button" onClick={onNext}>
            Next
          </button>
        </div>
      </div>
      <div className="carousel-visual">
        <img src={active.image} alt={active.displayName} />
        <div className="stat-badges">
          {STAT_ORDER.slice(0, 3).map((stat) => (
            <span key={stat}>
              {STAT_LABELS[stat]} <strong>{active.stats[stat]}</strong>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function StatBars({ title, values }) {
  const maxValue = Math.max(...values.map((entry) => entry.value), 1)

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
      </div>
      <div className="stat-bars" role="img" aria-label={title}>
        {values.map((entry) => (
          <div key={entry.label} className="stat-bar-row">
            <div className="stat-bar-row__header">
              <span>{entry.label}</span>
              <strong>{entry.value}</strong>
            </div>
            <div className="stat-bar-track">
              <div
                className="stat-bar-fill"
                style={{ width: `${(entry.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [activeSet, setActiveSet] = useState(POKEMON_SETS[0].key)
  const [pokemon, setPokemon] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [carouselIndex, setCarouselIndex] = useState(0)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const loadSet = async () => {
      const currentSet = POKEMON_SETS.find((entry) => entry.key === activeSet)
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setStatus('loading')
      setError('')

      try {
        const responses = await Promise.all(
          currentSet.ids.map((id) => fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)),
        )

        if (responses.some((response) => !response.ok)) {
          throw new Error('Unable to reach PokéAPI right now.')
        }

        const payload = await Promise.all(responses.map((response) => response.json()))

        if (requestIdRef.current === requestId) {
          setPokemon(payload.map(normalizePokemon))
          setStatus('success')
          setCarouselIndex(0)
        }
      } catch (loadError) {
        if (requestIdRef.current === requestId) {
          setPokemon([])
          setStatus('error')
          setError(loadError instanceof Error ? loadError.message : 'Unexpected error while loading data.')
        }
      }
    }

    loadSet()
  }, [activeSet])

  const currentSet = useMemo(
    () => POKEMON_SETS.find((entry) => entry.key === activeSet),
    [activeSet],
  )

  const filteredPokemon = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return pokemon
    }

    return pokemon.filter((entry) => {
      const searchTarget = [entry.name, entry.types.join(' '), entry.abilities.join(' ')].join(' ')
      return searchTarget.toLowerCase().includes(normalizedQuery)
    })
  }, [pokemon, query])

  const featuredPokemon = useMemo(
    () => [...filteredPokemon].sort((left, right) => right.totalStat - left.totalStat).slice(0, 5),
    [filteredPokemon],
  )

  const safeCarouselIndex = featuredPokemon.length ? carouselIndex % featuredPokemon.length : 0

  const metrics = useMemo(() => {
    if (!filteredPokemon.length) {
      return []
    }

    const averageTotal = Math.round(
      filteredPokemon.reduce((total, entry) => total + entry.totalStat, 0) / filteredPokemon.length,
    )
    const fastest = [...filteredPokemon].sort((left, right) => right.stats.speed - left.stats.speed)[0]
    const heaviest = [...filteredPokemon].sort((left, right) => right.weight - left.weight)[0]

    return [
      { label: 'Cards loaded', value: filteredPokemon.length, helper: currentSet.label },
      { label: 'Average total', value: averageTotal, helper: 'Base stat score' },
      { label: 'Fastest', value: fastest.displayName, helper: `${fastest.stats.speed} speed` },
      { label: 'Heaviest', value: heaviest.displayName, helper: `${heaviest.weight} kg` },
    ]
  }, [currentSet.label, filteredPokemon])

  const typeDistribution = useMemo(() => {
    const counts = new Map()

    filteredPokemon.forEach((entry) => {
      entry.types.forEach((type) => {
        counts.set(type, (counts.get(type) || 0) + 1)
      })
    })

    return [...counts.entries()]
      .map(([type, count]) => ({ label: formatName(type), value: count }))
      .sort((left, right) => right.value - left.value)
  }, [filteredPokemon])

  const averageStats = useMemo(() => {
    if (!filteredPokemon.length) {
      return []
    }

    return STAT_ORDER.map((stat) => ({
      label: STAT_LABELS[stat],
      value: Math.round(
        filteredPokemon.reduce((total, entry) => total + entry.stats[stat], 0) / filteredPokemon.length,
      ),
    }))
  }, [filteredPokemon])

  const strongestCards = useMemo(
    () => [...filteredPokemon].sort((left, right) => right.totalStat - left.totalStat).slice(0, 6),
    [filteredPokemon],
  )

  const isEmpty = status === 'success' && !filteredPokemon.length

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <nav className="top-nav" aria-label="Dashboard pages">
          <div>
            <p className="brand-kicker">PokéPulse</p>
            <h1>PokéPulse Dashboard</h1>
          </div>
          <div className="nav-actions">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.key === activePage ? 'is-active' : ''}
                onClick={() => setActivePage(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <section className="hero-content">
          <div className="hero-copy">
            <span className="eyebrow">Live data from PokéAPI</span>
            <h2>Search, compare, and spotlight Pokémon in a clean Google-inspired dashboard.</h2>
            <p>
              Use the collection buttons to fetch curated rosters, search across names, types, and
              abilities, then explore the same dataset as a grid, carousel, and stat-driven charts.
            </p>
            <SearchBar query={query} onChange={setQuery} />
            <div className="collection-buttons" aria-label="Pokémon collections">
              {POKEMON_SETS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className={entry.key === activeSet ? 'is-active' : ''}
                  onClick={() => setActiveSet(entry.key)}
                >
                  <strong>{entry.label}</strong>
                  <span>{entry.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="hero-aside panel">
            <p className="eyebrow">Current collection</p>
            <h3>{currentSet.label}</h3>
            <p>{currentSet.description}</p>
            <div className="status-chip-list">
              <span className="status-chip">{status === 'loading' ? 'Loading live data' : 'Live data ready'}</span>
              <span className="status-chip">{filteredPokemon.length} matching cards</span>
            </div>
          </div>
        </section>
      </header>

      <main className="content-stack">
        {status === 'error' ? <div className="panel error-panel">{error}</div> : null}

        {status === 'loading' ? <div className="panel loading-panel">Loading Pokémon from the API…</div> : null}

        {activePage === 'dashboard' && status === 'success' ? (
          <>
            <section className="metrics-grid">
              {metrics.map((metric) => (
                <article key={metric.label} className="panel metric-card">
                  <p>{metric.label}</p>
                  <h3>{metric.value}</h3>
                  <span>{metric.helper}</span>
                </article>
              ))}
            </section>
            <Carousel
              items={featuredPokemon}
              index={safeCarouselIndex}
              onPrevious={() =>
                setCarouselIndex((current) =>
                  current === 0 ? featuredPokemon.length - 1 : current - 1,
                )
              }
              onNext={() => setCarouselIndex((current) => (current + 1) % featuredPokemon.length)}
            />
            <section className="panel">
              <div className="panel-heading">
                <h2>Quick grid preview</h2>
                <p>The first six cards from the active search results.</p>
              </div>
              {isEmpty ? (
                <p>No Pokémon match the current search.</p>
              ) : (
                <div className="card-grid">
                  {filteredPokemon.slice(0, 6).map((entry) => (
                    <PokemonCard key={entry.id} pokemon={entry} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}

        {activePage === 'explore' && status === 'success' ? (
          <section className="panel">
            <div className="panel-heading">
              <h2>Full card grid</h2>
              <p>Browse the entire fetched roster as responsive cards with artwork and stat summaries.</p>
            </div>
            {isEmpty ? (
              <p>No Pokémon match the current search.</p>
            ) : (
              <div className="card-grid">
                {filteredPokemon.map((entry) => (
                  <PokemonCard key={entry.id} pokemon={entry} />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {activePage === 'analytics' && status === 'success' ? (
          <section className="analytics-layout">
            <StatBars title="Type distribution" values={typeDistribution} />
            <StatBars title="Average team stats" values={averageStats} />
            <section className="panel">
              <div className="panel-heading">
                <h2>Top power cards</h2>
                <p>Highest total base stats in the active, searchable roster.</p>
              </div>
              {isEmpty ? (
                <p>No Pokémon match the current search.</p>
              ) : (
                <div className="compact-list">
                  {strongestCards.map((entry, position) => (
                    <div key={entry.id} className="compact-list__row">
                      <span>#{position + 1}</span>
                      <strong>{entry.displayName}</strong>
                      <span>{entry.totalStat} total</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
