import { router } from "@inertiajs/react";

export function reloadWorkspace(): Promise<void> {
  return new Promise(resolve => router.reload({ onFinish: () => resolve() }));
}

const navigation = {
  refresh: reloadWorkspace,
  replace: (url: string, options?: { scroll?: boolean }): Promise<void> =>
    new Promise(resolve => router.visit(url, { replace: true, preserveState: true, preserveScroll: options?.scroll === false, onFinish: () => resolve() })),
};

export function useRouter() {
  return navigation;
}
