import { FormSelect, FormSelectOption } from '@patternfly/react-core';

type FeedbackSelectProps = {
  label: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  value: string;
};

export const FeedbackSelect = ({ label, onChange, options, value }: FeedbackSelectProps) => (
  <FormSelect aria-label={label} value={value} onChange={(_e, val) => onChange(val)}>
    {options.map(opt => (
      <FormSelectOption key={opt.value} label={opt.label} value={opt.value} />
    ))}
  </FormSelect>
);
