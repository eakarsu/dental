'use client';

type Section = { label: string; value: string | number | boolean | null };

/** Readable labelled sections for grounded-AI JSON. Preserves false, 0, and empty values as recorded. */
export default function GroundedAiReport({ title, sections }: { title: string; sections: Section[] }) {
  if (!sections.length) return null;
  return (
    <section aria-label={title}>
      <h3>{title}</h3>
      <dl>
        {sections.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value === null ? 'Not supplied' : s.value === '' ? '(empty)' : String(s.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
