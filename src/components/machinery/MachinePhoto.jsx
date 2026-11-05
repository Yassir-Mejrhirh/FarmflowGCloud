import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { cn } from '@/lib/utils';

export default function MachinePhoto({ file_uri, alt = '', className }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    setUrl('');
    if (!file_uri) return undefined;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 3600 }).then((res) => {
      if (active) setUrl(res?.signed_url || '');
    });
    return () => {
      active = false;
    };
  }, [file_uri]);

  if (!file_uri) return null;
  if (!url) return <div className={cn('animate-pulse rounded-xl bg-muted', className)} />;
  return <Image src={url} alt={alt} className={className} />;
}