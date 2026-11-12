import SelectField from '@/components/SelectField';

// One filter of the labour list: the criterion stays readable above the dropdown,
// even once a value is picked.
export default function FilterSelect({ label, ...props }) {
  return (
    <div className="space-y-1">
      <p className="truncate px-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <SelectField {...props} />
    </div>
  );
}