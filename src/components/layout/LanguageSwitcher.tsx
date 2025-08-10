"use client";
import { usePathname, Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";


export default function LanguageSwitcher() {
    const pathname = usePathname();
    
    return (
        <div className="flex gap-2">
            {routing.locales.map((locale) => (
                <Link
                key={locale}
                href={pathname}
                locale={locale}
                className="px-3 py-1 rounded border"
                >
                    {locale.toUpperCase()}
                </Link>
            ))}
        </div>
    )
}