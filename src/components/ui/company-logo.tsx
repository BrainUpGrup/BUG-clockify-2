'use client';

import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { Company } from '@/types/database';
import { safeGetLocalStorage } from '@/lib/utils';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg';

const ICON_SIZES: Record<LogoSize, string> = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
};

const IMG_SIZES: Record<LogoSize, string> = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-full w-full',
};

interface CompanyLogoProps {
  company?: Pick<Company, 'id' | 'name' | 'logo_url'> | null;
  logoUrl?: string | null;
  companyId?: string;
  name?: string;
  size?: LogoSize;
  className?: string;
  iconClassName?: string;
}

/**
 * Muestra el logotipo corporativo (WebP/URL) de la empresa con ajuste contain
 * o el icono estándar Building2 si aún no tiene logotipo o falla la carga.
 * Si no recibe `logo_url` directo, intenta resolverlo por ID o nombre desde la caché local.
 */
export function CompanyLogo({
  company,
  logoUrl,
  companyId,
  name,
  size = 'sm',
  className = '',
  iconClassName = 'text-[#8E0E75]',
}: CompanyLogoProps) {
  const directSrc = logoUrl !== undefined ? logoUrl : company?.logo_url;
  const targetId = companyId ?? company?.id;
  const targetName = name ?? company?.name;
  const alt = targetName || 'Empresa';

  const [cachedSrc, setCachedSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (directSrc) {
      setCachedSrc(null);
      return;
    }
    if (!targetId && !targetName) {
      setCachedSrc(null);
      return;
    }

    const resolveFromCache = () => {
      const cached = safeGetLocalStorage<Company[]>('bug_clockify_cache_companies', []);
      const normalized = targetName?.trim().toLowerCase();
      const match = cached.find(
        (c) =>
          (targetId && c.id === targetId) ||
          (normalized && c.name.trim().toLowerCase() === normalized)
      );
      setCachedSrc(match?.logo_url || null);
    };

    resolveFromCache();

    const handleUpdate = (ev: Event) => {
      const updated = (ev as CustomEvent<Company>).detail;
      if (!updated) return;
      const matchesId = targetId && updated.id === targetId;
      const matchesName =
        targetName && updated.name.trim().toLowerCase() === targetName.trim().toLowerCase();
      if (matchesId || matchesName) {
        setCachedSrc(updated.logo_url || null);
        setHasError(false);
      }
    };

    window.addEventListener('bug-company-updated', handleUpdate);
    return () => window.removeEventListener('bug-company-updated', handleUpdate);
  }, [directSrc, targetId, targetName]);

  const src = directSrc || cachedSrc;

  if (src && !hasError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={`${IMG_SIZES[size]} object-contain rounded-xs shrink-0 ${className}`.trim()}
      />
    );
  }

  return <Building2 className={`${ICON_SIZES[size]} shrink-0 ${iconClassName} ${className}`.trim()} />;
}
