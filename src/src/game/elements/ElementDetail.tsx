
import type { ChemicalElement, ElementCategory } from './ChemicalElement';

type ElementDetailProps = {
  element: ChemicalElement | null;
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

export default function ElementDetail({ element }: ElementDetailProps) {
  if (!element) {
    return null;
  }

  return (
    <section
      className="element-detail"
      aria-label={`${element.name} details`}
    >
      <div className={`detail-symbol category-${element.category}`}>
        <span>{element.atomicNumber}</span>
        <strong>{element.symbol}</strong>
        <small>{element.name}</small>
      </div>

      <div className="detail-information">
        <h3>{element.name}</h3>

        <div className="detail-grid">
          <div>
            <span>Atomic number</span>
            <strong>{element.atomicNumber}</strong>
          </div>

          <div>
            <span>Atomic weight</span>
            <strong>{element.atomicWeight}</strong>
          </div>

          <div>
            <span>Group</span>
            <strong>{element.group ?? 'N/A'}</strong>
          </div>

          <div>
            <span>Period</span>
            <strong>{element.period}</strong>
          </div>

          <div>
            <span>Category</span>
            <strong>{CATEGORY_LABELS[element.category]}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
