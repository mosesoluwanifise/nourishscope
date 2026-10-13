import { withBase } from '../../config/site';
import type { DataSource } from '../../lib/data/merge';

interface Props {
  source: DataSource | null;
  onChoose: (source: DataSource) => void;
}

const OPTIONS: { value: DataSource; title: string; text: string }[] = [
  {
    value: 'kentucky',
    title: 'Kentucky county data',
    text: 'Pick counties. Need, health and food-access figures come from public data; you add your budget and cost.',
  },
  {
    value: 'upload',
    title: 'Upload your own CSV',
    text: 'One row per community, matched to its Kentucky county. Your file never leaves this device.',
  },
  {
    value: 'sample',
    title: 'Try sample data',
    text: 'Six fictional communities, clearly labelled, to see how the tool works.',
  },
];

export default function DataSourcePicker({ source, onChoose }: Props) {
  return (
    <fieldset class="source-picker">
      <legend>Which data do you want to plan with?</legend>
      <div class="source-picker__options">
        {OPTIONS.map((o) => (
          <label class={`source-option${source === o.value ? ' source-option--selected' : ''}`} key={o.value}>
            <input
              type="radio"
              name="data-source"
              value={o.value}
              checked={source === o.value}
              onChange={() => onChoose(o.value)}
            />
            <span class="source-option__title">{o.title}</span>
            <span class="source-option__text">{o.text}</span>
          </label>
        ))}
      </div>
      <p class="field__hint">
        Uploading? <a href={withBase('/downloads/nourishscope_upload_template.csv')} download>Download the CSV template</a>.
        Upload program totals by community only. Do not include names, addresses or other personal details.
      </p>
    </fieldset>
  );
}
