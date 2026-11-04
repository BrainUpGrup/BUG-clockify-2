'use client';

import React, { useState } from 'react';

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  imgClassName?: string;
  showOnline?: boolean;
  isOnline?: boolean;
  alt?: string;
}

const SIZE_MAP: Record<string, { container: string; text: string; online: string }> = {
  xs: {
    container: 'h-6 w-6',
    text: 'text-[11px] font-black',
    online: 'h-1.5 w-1.5 ring-1',
  },
  sm: {
    container: 'h-8 w-8',
    text: 'text-xs font-black',
    online: 'h-2 w-2 ring-1.5',
  },
  md: {
    container: 'h-10 w-10 sm:h-11 sm:w-11',
    text: 'text-sm sm:text-base font-black',
    online: 'h-3 w-3 ring-2',
  },
  lg: {
    container: 'h-12 w-12',
    text: 'text-base font-black',
    online: 'h-3.5 w-3.5 ring-2',
  },
  xl: {
    container: 'h-16 w-16',
    text: 'text-xl font-black',
    online: 'h-4 w-4 ring-2',
  },
  '2xl': {
    container: 'h-24 w-24',
    text: 'text-3xl font-black',
    online: 'h-5 w-5 ring-2',
  },
};

export function UserAvatar({
  src,
  name,
  size = 'md',
  className = '',
  imgClassName = '',
  showOnline = false,
  isOnline = true,
  alt,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  // Obtiene la primera letra del nombre en mayúscula (ej. "Alejandro" -> "A")
  const firstLetter = name && name.trim().length > 0
    ? name.trim().charAt(0).toUpperCase()
    : 'U';

  // Si existe una fotografía cargada por el usuario (no la viñeta genérica anterior), se renderiza la imagen.
  // En caso contrario, se muestra la primera letra del nombre sobre el degradado corporativo Brain Up.
  const hasCustomPhoto = Boolean(
    src &&
    src.trim().length > 0 &&
    src !== '/abuela-avatar.png' &&
    !hasError
  );

  return (
    <div
      className={`relative shrink-0 rounded-full select-none ${sizeConfig.container} ${className}`}
      title={name || 'Perfil de usuario'}
    >
      <div className="relative h-full w-full rounded-full overflow-hidden bg-gradient-to-tr from-[#191654] via-[#700B5C] to-[#8E0E75] flex items-center justify-center ring-2 ring-[#8E0E75]/25 shadow-2xs">
        {hasCustomPhoto && src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={alt || name || 'Foto de perfil'}
            className={`h-full w-full object-cover object-center ${imgClassName}`}
            onError={() => setHasError(true)}
            loading="lazy"
          />
        ) : (
          <span className={`text-white font-black uppercase leading-none select-none ${sizeConfig.text}`}>
            {firstLetter}
          </span>
        )}
      </div>

      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-white ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-400'
          } ${sizeConfig.online}`}
          title={isOnline ? 'En línea' : 'Desconectado'}
        />
      )}
    </div>
  );
}
