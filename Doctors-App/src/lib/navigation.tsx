'use client';

// The screens were written for react-router. This adapter gives them the same
// small API (useNavigate, useParams, useLocation, useSearchParams, Link, NavLink)
// on top of the Next.js App Router, so they work unchanged. New code can use
// next/link and next/navigation directly.

import NextLink from 'next/link';
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';
import { type ComponentProps, type ReactNode, useCallback } from 'react';

// react-router could hand data to the next screen with navigate(to, { state }).
// Next has no equivalent, so it's kept here until the next navigation.
let navigationState: unknown;

type NavigateOptions = { state?: unknown; replace?: boolean };

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        if (to < 0) router.back();
        else router.forward();
        return;
      }
      navigationState = options?.state;
      if (options?.replace) router.replace(to);
      else router.push(to);
    },
    [router],
  );
}

export function useLocation() {
  return { pathname: usePathname(), state: navigationState };
}

/** Route params, URL-decoded (e.g. "General physician", not "General%20physician"). */
export function useParams<T extends Record<string, string | undefined>>(): T {
  const params = useNextParams() ?? {};
  const decoded: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const raw = Array.isArray(value) ? value.join('/') : value;
    if (raw !== undefined) decoded[key] = decodeURIComponent(raw);
  }
  return decoded as T;
}

export function useSearchParams() {
  return [useNextSearchParams()] as const;
}

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { to: string };

export function Link({ to, ...props }: LinkProps) {
  return <NextLink href={to} {...props} />;
}

type NavLinkProps = Omit<LinkProps, 'className' | 'children'> & {
  className?: string | ((state: { isActive: boolean }) => string);
  children?: ReactNode | ((state: { isActive: boolean }) => ReactNode);
};

/** A Link that knows whether it points at the current page. */
export function NavLink({ to, className, children, ...props }: NavLinkProps) {
  const pathname = usePathname() ?? '/';
  const isActive = pathname === to || (to !== '/' && pathname.startsWith(`${to}/`));
  return (
    <NextLink
      href={to}
      className={typeof className === 'function' ? className({ isActive }) : className}
      {...props}
    >
      {typeof children === 'function' ? children({ isActive }) : children}
    </NextLink>
  );
}
