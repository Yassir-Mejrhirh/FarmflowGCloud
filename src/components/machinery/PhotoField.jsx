import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ImagePlus, Loader2, X } from 'lucide-react';
import Field from '@/components/Field';
import MachinePhoto from '@/components/machinery/MachinePhoto';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/I18nContext';

export default function PhotoField({ value, onChange }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => inputRef.current?.click();

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    setUploading(false);
    if (file_uri) onChange(file_uri);
  };

  return (
    <Field label={t('machDialog.photo')}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={upload} />
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-2">
          <MachinePhoto file_uri={value} className="h-20 w-28 rounded-lg object-cover" />
          <div className="flex flex-col items-start gap-1">
            <Button type="button" variant="outline" size="sm" onClick={pick} disabled={uploading}>
              {t('machDialog.photoChange')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onChange('')}
            >
              <X className="mr-1 h-3.5 w-3.5" /> {t('machDialog.photoRemove')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-auto w-full justify-start gap-2 rounded-xl border-dashed py-5 text-xs font-medium text-muted-foreground"
          onClick={pick}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? t('machDialog.photoUploading') : t('machDialog.photoAdd')}
        </Button>
      )}
    </Field>
  );
}