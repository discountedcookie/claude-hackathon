"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DropdownMenu } from "radix-ui";
import Icon from "./Icon";
import Logo from "./Logo";
import { Avatar } from "./feed-types";
import { LangProvider, LangSwitcher, PICKED_LANG_KEY, useLang, useT, Lang } from "@/lib/i18n";
import EditProfile from "./EditProfile";

type Profile = {
  id: string;
  display_name: string;
  language: Lang;
};

function FrameInner({ me, children }: { me: Profile; children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useLang();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);

  async function signOut() {
    // The login page then opens in the language this person was using.
    try {
      localStorage.setItem(PICKED_LANG_KEY, lang);
    } catch {}
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const tabs = [
    { href: "/events", label: t("tabEvents") },
    { href: "/projects", label: t("tabProjects") },
  ] as const;

  return (
    <div className="min-h-screen bg-cnx-paper text-cnx-ink">
      <header className="sticky top-0 z-10 border-b border-cnx-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5 sm:gap-4 sm:px-6">
          <Link href="/events" className="shrink-0 text-lg" aria-label="With CNX">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:ml-4">
            {tabs.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm ${
                  pathname.startsWith(href) ? "bg-cnx-pale font-semibold text-cnx-green" : "text-cnx-muted hover:text-cnx-ink"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <LangSwitcher />
            <DropdownMenu.Root>
              <DropdownMenu.Trigger aria-label={me.display_name} className="rounded-full outline-offset-2">
                <Avatar name={me.display_name} small />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={8} className="cnx-pop z-30 min-w-44 rounded-2xl border border-cnx-line bg-white p-1.5 shadow-lg">
                  <DropdownMenu.Label className="truncate px-3 py-2 text-sm font-semibold">{me.display_name}</DropdownMenu.Label>
                  <DropdownMenu.Separator className="my-1 h-px bg-cnx-line" />
                  <DropdownMenu.Item
                    onSelect={() => setEditing(true)}
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-cnx-ink outline-none data-[highlighted]:bg-cnx-pale"
                  >
                    {t("editProfile")}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={signOut}
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-cnx-muted outline-none data-[highlighted]:bg-cnx-pale data-[highlighted]:text-cnx-ink"
                  >
                    <Icon name="logout" className="h-4 w-4" />
                    {t("signOut")}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <EditProfile me={me} open={editing} onOpenChange={setEditing} />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export default function AppFrame({ me, children }: { me: Profile; children: ReactNode }) {
  return (
    <LangProvider initial={me.language} userId={me.id}>
      <FrameInner me={me}>{children}</FrameInner>
    </LangProvider>
  );
}
