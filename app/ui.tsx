"use client";

import { ReactNode } from "react";
import { Accordion, Dialog } from "radix-ui";
import { useT } from "@/lib/i18n";
import Icon from "./Icon";

// Collapsible sections inside a card: one line each until opened.
export function Sections({ children, defaultValue = [] }: { children: ReactNode; defaultValue?: string[] }) {
  return (
    <Accordion.Root type="multiple" defaultValue={defaultValue} className="divide-y divide-cnx-line border-t border-cnx-line">
      {children}
    </Accordion.Root>
  );
}

export function Section({ value, title, children }: { value: string; title: ReactNode; children: ReactNode }) {
  return (
    <Accordion.Item value={value}>
      <Accordion.Header>
        <Accordion.Trigger className="group flex w-full items-center justify-between py-3 text-left text-sm font-semibold">
          {title}
          <Icon name="chevron" className="h-4 w-4 text-cnx-muted transition group-data-[state=open]:rotate-180" />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="pb-4 text-sm">{children}</Accordion.Content>
    </Accordion.Item>
  );
}

// "How it works": a bottom sheet on phones, a centered dialog on larger screens.
export function Faq({ prefix, count }: { prefix: "faqEv" | "faqPr"; count: number }) {
  const t = useT();
  return (
    <Dialog.Root>
      <Dialog.Trigger className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cnx-line bg-white px-3 py-1.5 text-xs font-semibold text-cnx-green">
        <Icon name="help" className="h-4 w-4" />
        {t("howItWorks")}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 bg-cnx-ink/30" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-30 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[28rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <Dialog.Title className="mb-4 text-lg font-bold">{t("howItWorks")}</Dialog.Title>
          <Dialog.Description className="sr-only">{t("howItWorks")}</Dialog.Description>
          <dl className="space-y-4">
            {Array.from({ length: count }, (_, i) => (
              <div key={i}>
                <dt className="font-semibold">{t(`${prefix}Q${i + 1}`)}</dt>
                <dd className="mt-1 text-sm text-cnx-muted">{t(`${prefix}A${i + 1}`)}</dd>
              </div>
            ))}
          </dl>
          <Dialog.Close className="cnx-btn mt-6 w-full">{t("close")}</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
