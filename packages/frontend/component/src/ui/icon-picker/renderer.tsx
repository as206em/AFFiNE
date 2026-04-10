import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { AffineIconRenderer } from './renderer/affine-icon';
import { type IconData, IconType } from './type';

const BlobIconRenderer = ({ blob }: { blob: Blob }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) {
    return null;
  }

  return (
    <img
      src={url}
      alt=""
      draggable={false}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
};

export const IconRenderer = ({
  data,
  fallback,
}: {
  data?: IconData;
  fallback?: ReactNode;
}) => {
  if (!data) {
    return fallback ?? null;
  }

  if (data.type === IconType.Emoji && data.unicode) {
    return data.unicode;
  }
  if (data.type === IconType.AffineIcon && data.name) {
    return <AffineIconRenderer name={data.name} color={data.color} />;
  }
  if (data.type === IconType.Blob) {
    return <BlobIconRenderer blob={data.blob} />;
  }

  return fallback ?? null;
};
