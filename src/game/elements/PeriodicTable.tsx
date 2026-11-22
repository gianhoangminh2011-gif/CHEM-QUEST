
import { useMemo, useState } from 'react';
import type { ChemicalElement, ElementCategory } from './ChemicalElement';
import { PERIODIC_TABLE_DATA } from './PeriodicTableData';
import './PeriodicTable.css';

type PeriodicTableProps = {
  onElementSelect?: (element: ChemicalElement) => void;
};

const CATEGORY_LABELS: Record<ElementCategory, string> = {
  'alkali-metal': 'Alkali metal',
  'alkaline-earth-metal': 'Alkaline earth metal',
  'transition-metal': 'Transition metal',
  'post-transition-metal': 'Post-transition metal',
  metalloid: 'Metalloid',
  'reactive-nonmetal': 'Reactive nonmetal',
  halogen: 'Halogen',
  'noble-gas': 'Noble gas',
  lanthanoid: 'Lanthanoid',
  actinoid: 'Actinoid',
  unknown: 'Unknown',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ElementCategory[];

function matchesSearch(element: ChemicalElement, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return true;

  return (
    element.name.toLowerCase().includes(normalized) ||
    element.symbol.toLowerCase().includes(normalized) ||
    String(element.atomicNumber) === normalized
  );
}

function ElementCell({
  element,
  selected,
  onClick,
}: {
  element: ChemicalElement;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        'periodic-element',
        `category-${element.category}`,
        selected ? 'selected' : '',
      ].filter(Boolean).join(' ')}
      style={{
        gridColumn: element.group ?? undefined,
        gridRow: element.period + 1,
      }}
      onClick={onClick}
      aria-label={`${element.name}, ${element.symbol}, atomic number ${element.atomicNumber}`}
      aria-pressed={selected}
      title={`${element.name} (${element.symbol})`}
    >
      <span className="element-number">{element.atomicNumber}</span>
      <strong className="element-symbol">{element.symbol}</strong>
      <span className="element-name">{element.name}</span>
    </button>
  );
}

export default function PeriodicTable({
  onElementSelect,
}: PeriodicTableProps) {
  const [search, setSearch] = useState('');
  const [selectedNumber, setSelectedNumber] = useState<number | null>(1);

  const selectedElement = PERIODIC_TABLE_DATA.find(
    (element) => element.atomicNumber === selectedNumber,
  );

  const visibleElements = useMemo(
    () => PERIODIC_TABLE_DATA.filter((element) => matchesSearch(element, search)),
    [search],
  );

  const visibleNumbers = new Set(
    visibleElements.map((element) => element.atomicNumber),
  );

  const mainElements = visibleElements.filter(
    (element) => element.category !== 'lanthanoid' &&
      element.category !== 'actinoid',
  );

  const lanthanoids = visibleElements.filter(
    (element) => element.category === 'lanthanoid',
  );

  const actinoids = visibleElements.filter(
    (element) => element.category === 'actinoid',
  );

  const selectElement = (element: ChemicalElement) => {
    setSelectedNumber(element.atomicNumber);
    onElementSelect?.(element);
  };

  return (
    <section className="periodic-table-panel">
      <header className="periodic-table-header">
        <div>
          <p className="periodic-eyebrow">CHEMISTRY DATABASE</p>
          <h2>Periodic Table</h2>
          <p className="periodic-subtitle">
            Explore all 118 recognized chemical elements.
          </p>
        </div>

        <label className="periodic-search">
          <span>Search elements</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, symbol or atomic number..."
            aria-label="Search elements"
          />
        </label>
      </header>

      <div className="periodic-legend" aria-label="Element categories">
        {CATEGORIES.filter((category) => category !== 'unknown').map(
          (category) => (
            <span className="legend-item" key={category}>
              <i className={`legend-dot category-${category}`} />
              {CATEGORY_LABELS[category]}
            </span>
          ),
        )}
      </div>

      <div className="periodic-scroll">
        <div className="periodic-main-grid">
          {Array.from({ length: 18 }, (_, index) => (
            <span
              className="periodic-group-number"
              style={{ gridColumn: index + 1, gridRow: 1 }}
              key={index + 1}
            >
              {index + 1}
            </span>
          ))}

          {mainElements.map((element) => (
            <ElementCell
              key={element.atomicNumber}
              element={element}
              selected={selectedNumber === element.atomicNumber}
              onClick={() => selectElement(element)}
            />
          ))}

          {visibleNumbers.has(57) || search.trim() === '' ? (
            <span className="periodic-placeholder lanthanoid-placeholder">
              57–71
              <small>Lanthanoids</small>
            </span>
          ) : null}

          {visibleNumbers.has(89) || search.trim() === '' ? (
            <span className="periodic-placeholder actinoid-placeholder">
              89–103
              <small>Actinoids</small>
            </span>
          ) : null}
        </div>

        <div className="periodic-f-block">
          <div className="f-block-label">Lanthanoids</div>
          <div className="f-block-elements">
            {lanthanoids.map((element) => (
              <ElementCell
                key={element.atomicNumber}
                element={element}
                selected={selectedNumber === element.atomicNumber}
                onClick={() => selectElement(element)}
              />
            ))}
          </div>

          <div className="f-block-label">Actinoids</div>
          <div className="f-block-elements">
            {actinoids.map((element) => (
              <ElementCell
                key={element.atomicNumber}
                element={element}
                selected={selectedNumber === element.atomicNumber}
                onClick={() => selectElement(element)}
              />
            ))}
          </div>
        </div>
      </div>

      {visibleElements.length === 0 && (
        <p className="periodic-empty">No matching elements found.</p>
      )}

      {selectedElement && (
        <section className="element-detail" aria-live="polite">
          <div className={`detail-symbol category-${selectedElement.category}`}>
            <span>{selectedElement.atomicNumber}</span>
            <strong>{selectedElement.symbol}</strong>
            <small>{selectedElement.name}</small>
          </div>

          <div className="detail-information">
            <p className="periodic-eyebrow">ELEMENT DETAILS</p>
            <h3>{selectedElement.name}</h3>
            <div className="detail-grid">
              <div>
                <span>Atomic number</span>
                <strong>{selectedElement.atomicNumber}</strong>
              </div>
              <div>
                <span>Atomic weight</span>
                <strong>{selectedElement.atomicWeight}</strong>
              </div>
              <div>
                <span>Group</span>
                <strong>{selectedElement.group ?? '—'}</strong>
              </div>
              <div>
                <span>Period</span>
                <strong>{selectedElement.period}</strong>
              </div>
              <div>
                <span>Category</span>
                <strong>{CATEGORY_LABELS[selectedElement.category]}</strong>
              </div>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
